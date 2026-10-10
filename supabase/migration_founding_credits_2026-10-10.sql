-- Founding offer v3 (10 Oct 2026): a coach's free credit is claimed as soon as they open their coach page,
-- BEFORE they save a listing, and waits in their credit balance until they press Activate.
-- Replaces the listing-based claim_founding_credit(text, uuid, boolean) from migration_founding_claim_2026-10-10.sql.

begin;

drop function if exists claim_founding_credit(text, uuid, boolean);

create table if not exists founding_credits (
  person_id uuid primary key references people(id) on delete cascade,
  created_at timestamptz not null default now(),
  spent_at timestamptz,
  spent_listing_table text,
  spent_listing_id uuid
);
alter table founding_credits enable row level security;
drop policy if exists "owner or admin can view founding credits" on founding_credits;
create policy "owner or admin can view founding credits" on founding_credits for select
  using (person_id = my_person_id() or is_admin_caller());

-- Spots taken = credits claimed (spent or not) + any older-style founding listings that never had a credit row.
create or replace function founding_status()
returns table(enabled boolean, lim integer, used integer)
language sql stable security definer set search_path = public set row_security = off as $$
  select coalesce((select founding_enabled from platform_settings limit 1), true),
         coalesce((select founding_coach_limit from platform_settings limit 1), 60),
         ((select count(*) from founding_credits)
          + (select count(*) from (
               select person_id from club2coach_coach_listings where founding_member
               union
               select person_id from coach2mentor_coach_listings where founding_member
             ) x
             where x.person_id not in (select person_id from founding_credits)))::int;
$$;
grant execute on function founding_status() to anon, authenticated;

-- Claim the free credit for the signed-in coach. Safe to call repeatedly: it does nothing if they already have one,
-- if the offer is off or full, or if their email/mobile has claimed before.
create or replace function claim_founding_credit()
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare
  me uuid := my_person_id();
  p people%rowtype; s record; keys text[];
begin
  if me is null then return jsonb_build_object('claimed', false, 'reason', 'not_signed_in'); end if;
  perform pg_advisory_xact_lock(60060);
  if exists (select 1 from founding_credits where person_id = me) then
    return jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  end if;
  select * into p from people where id = me;
  select * into s from founding_status();
  keys := array['coach-email:' || norm_email(p.email)];
  if norm_mobile(p.mobile) <> '' then keys := keys || ('coach-mobile:' || norm_mobile(p.mobile)); end if;
  if not (s.enabled and s.used < s.lim)
     or exists (select 1 from free_first_claims where key = any(keys))
     or exists (select 1 from club2coach_coach_listings where person_id = me and founding_member)
     or exists (select 1 from coach2mentor_coach_listings where person_id = me and founding_member) then
    return jsonb_build_object('claimed', false, 'reason', 'not_available');
  end if;
  insert into founding_credits (person_id) values (me);
  insert into free_first_claims (key, person_id, listing_table, listing_id)
  select k, me, 'founding_credits', me from unnest(keys) as k on conflict do nothing;
  return jsonb_build_object('claimed', true);
end;
$$;
revoke all on function claim_founding_credit() from public, anon;
grant execute on function claim_founding_credit() to authenticated;

-- Credit balance: listing credits (as before) plus an unspent founding credit.
create or replace function coach_pool_totals()
returns table(person_id uuid, entitled int, used int, any_paid boolean)
language sql stable security definer set search_path = public as $$
  with l as (
    select person_id, paid, status, included_introductions, activations_used from club2coach_coach_listings
    union all
    select person_id, paid, status, included_introductions, activations_used from coach2mentor_coach_listings
  ),
  base as (
    select l.person_id,
           coalesce(sum(coalesce(l.included_introductions,0)) filter (where l.paid and l.status <> 'refunded'),0)::int as entitled,
           coalesce(sum(l.activations_used) filter (where l.paid and l.status <> 'refunded'),0)::int as used,
           coalesce(bool_or(l.paid and l.status <> 'refunded'),false) as any_paid
    from l group by l.person_id
  ),
  fc as (select f.person_id from founding_credits f where f.spent_at is null)
  select coalesce(b.person_id, f.person_id),
         coalesce(b.entitled,0) + (case when f.person_id is not null then 1 else 0 end),
         coalesce(b.used,0),
         coalesce(b.any_paid,false)
  from base b full join fc f on f.person_id = b.person_id
  where is_admin_caller() or auth.role() = 'service_role' or coalesce(b.person_id, f.person_id) = my_person_id();
$$;
grant execute on function coach_pool_totals() to authenticated, anon, service_role;

-- Activate: same as before, but an unspent founding credit counts as a credit and is spent on the listing being activated.
create or replace function activate_coach_listing(target_table text, target_listing_id uuid, use_founding boolean default false, dry_run boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare
  me uuid := my_person_id();
  p people%rowtype; s record; keys text[];
  l_person uuid; l_deleted timestamptz; l_status text; l_until timestamptz; l_paid boolean;
  bank int; credit_unspent int := 0; days int; src text; prod text; founding_ok boolean := false; new_until timestamptz;
begin
  if me is null then return jsonb_build_object('activated', false, 'reason', 'not_signed_in'); end if;
  if target_table not in ('club2coach_coach_listings', 'coach2mentor_coach_listings') then
    return jsonb_build_object('activated', false, 'reason', 'not_eligible');
  end if;
  perform pg_advisory_xact_lock(60060);
  select * into p from people where id = me;
  execute format('select person_id, deleted_at, status, active_until, paid from %I where id = $1', target_table)
    into l_person, l_deleted, l_status, l_until, l_paid using target_listing_id;
  if l_person is null or l_person <> me or l_deleted is not null or l_status in ('placed', 'refunded') then
    return jsonb_build_object('activated', false, 'reason', 'not_eligible');
  end if;
  if l_status = 'active' and l_until is not null and l_until > now() then
    return jsonb_build_object('activated', false, 'reason', 'already_active');
  end if;

  select coalesce(sum(coalesce(included_introductions,0) - activations_used),0)::int into bank from (
    select included_introductions, activations_used from club2coach_coach_listings where person_id = me and paid and status <> 'refunded'
    union all
    select included_introductions, activations_used from coach2mentor_coach_listings where person_id = me and paid and status <> 'refunded'
  ) x;
  select count(*)::int into credit_unspent from founding_credits where person_id = me and spent_at is null;
  days := case when target_table = 'club2coach_coach_listings' then 30 else 60 end;
  prod := case when target_table = 'club2coach_coach_listings' then 'club2coach' else 'coach2mentor' end;

  select * into s from founding_status();
  keys := array['coach-email:' || norm_email(p.email)];
  if norm_mobile(p.mobile) <> '' then keys := keys || ('coach-mobile:' || norm_mobile(p.mobile)); end if;
  founding_ok := s.enabled and s.used < s.lim
    and not exists (select 1 from free_first_claims where key = any(keys))
    and not exists (select 1 from club2coach_coach_listings where person_id = me and founding_member)
    and not exists (select 1 from coach2mentor_coach_listings where person_id = me and founding_member);

  if dry_run then
    return jsonb_build_object('eligible', (bank + credit_unspent) >= 1 or founding_ok, 'bank', bank + credit_unspent, 'founding_available', founding_ok, 'days', days);
  end if;

  if bank >= 1 and not use_founding then src := 'credit';
  elsif credit_unspent >= 1 then src := 'founding_credit';
  elsif founding_ok and (use_founding or bank < 1) then src := 'founding';
  else return jsonb_build_object('activated', false, 'reason', 'no_credits', 'founding_available', founding_ok);
  end if;
  new_until := now() + make_interval(days => days);

  if src in ('founding', 'founding_credit') then
    if src = 'founding' then
      insert into free_first_claims (key, person_id, listing_table, listing_id)
      select k, me, target_table, target_listing_id from unnest(keys) as k on conflict do nothing;
    else
      update founding_credits set spent_at = now(), spent_listing_table = target_table, spent_listing_id = target_listing_id
       where person_id = me and spent_at is null;
    end if;
    execute format('update %I set included_introductions = case when paid then coalesce(included_introductions,0) + 1 else 1 end, paid = true, paid_at = coalesce(paid_at, now()), price_aud = coalesce(price_aud, 0), founding_member = true where id = $1', target_table) using target_listing_id;
    insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
    values (me, prod, 'coach', target_table, target_listing_id, 0, me, 'Founding member — free credit (not a real payment)');
  elsif not l_paid then
    execute format('update %I set paid = true, paid_at = now(), price_aud = 0, included_introductions = 0 where id = $1', target_table) using target_listing_id;
  end if;

  execute format('update %I set activations_used = activations_used + 1, activated_at = now(), active_until = $2, status = ''active'', founding_reminder_sent_at = null, refund_reminder_sent_at = null, refund_window_notified_at = null where id = $1', target_table)
    using target_listing_id, new_until;
  return jsonb_build_object('activated', true, 'source', src, 'active_until', new_until);
end;
$$;
grant execute on function activate_coach_listing(text, uuid, boolean, boolean) to authenticated;

commit;
