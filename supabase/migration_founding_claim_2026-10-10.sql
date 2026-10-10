-- Founding offer: claim the free credit at sign-up (10 Oct 2026). Run once in the Supabase SQL editor.
--
-- Before: the free founding credit was only taken at the moment a coach pressed Activate.
-- Now:    saving a first coach listing claims one of the founding spots straight away and puts
--         ONE credit in the coach's credit balance. They press Activate whenever they like
--         (activate_coach_listing is unchanged; it simply spends the credit from the balance).
--
-- Same rules as before: one per coach (checked by email and mobile), counted against
-- platform_settings.founding_coach_limit via founding_status(), not available for mentor profiles,
-- serialised with the same advisory lock as activate_coach_listing so two people can't take the last spot.

create or replace function claim_founding_credit(target_table text, target_listing_id uuid, dry_run boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare
  me uuid := my_person_id();
  p people%rowtype; s record; keys text[];
  l_person uuid; l_deleted timestamptz; l_status text;
  prod text; founding_ok boolean := false;
begin
  if me is null then return jsonb_build_object('claimed', false, 'reason', 'not_signed_in'); end if;
  if target_table not in ('club2coach_coach_listings', 'coach2mentor_coach_listings') then
    return jsonb_build_object('claimed', false, 'reason', 'not_eligible');
  end if;
  perform pg_advisory_xact_lock(60060);
  select * into p from people where id = me;
  execute format('select person_id, deleted_at, status from %I where id = $1', target_table)
    into l_person, l_deleted, l_status using target_listing_id;
  if l_person is null or l_person <> me or l_deleted is not null or l_status in ('placed', 'refunded') then
    return jsonb_build_object('claimed', false, 'reason', 'not_eligible');
  end if;

  select * into s from founding_status();
  keys := array['coach-email:' || norm_email(p.email)];
  if norm_mobile(p.mobile) <> '' then keys := keys || ('coach-mobile:' || norm_mobile(p.mobile)); end if;
  founding_ok := s.enabled and s.used < s.lim
    and not exists (select 1 from free_first_claims where key = any(keys))
    and not exists (select 1 from club2coach_coach_listings where person_id = me and founding_member)
    and not exists (select 1 from coach2mentor_coach_listings where person_id = me and founding_member);

  if not founding_ok then return jsonb_build_object('claimed', false, 'reason', 'not_available'); end if;
  if dry_run then return jsonb_build_object('claimed', false, 'available', true); end if;

  prod := case when target_table = 'club2coach_coach_listings' then 'club2coach' else 'coach2mentor' end;

  insert into free_first_claims (key, person_id, listing_table, listing_id)
  select k, me, target_table, target_listing_id from unnest(keys) as k on conflict do nothing;

  -- One credit lands in the balance. The listing stays inactive (status unchanged, no activated_at/active_until),
  -- so it is not in matching until the coach presses Activate.
  execute format('update %I set included_introductions = case when paid then coalesce(included_introductions,0) + 1 else 1 end, paid = true, paid_at = coalesce(paid_at, now()), price_aud = coalesce(price_aud, 0), founding_member = true where id = $1', target_table)
    using target_listing_id;
  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
  values (me, prod, 'coach', target_table, target_listing_id, 0, me, 'Founding member — free credit (not a real payment)');

  return jsonb_build_object('claimed', true);
end;
$$;
revoke all on function claim_founding_credit(text, uuid, boolean) from public, anon;
grant execute on function claim_founding_credit(text, uuid, boolean) to authenticated;
