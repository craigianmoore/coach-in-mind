-- Hardening round 2 (9 Oct 2026). Run once in the Supabase SQL editor.
-- 1. rate_limit_hit(): per-user rate limiting for API endpoints
-- 2. Mentor listings: only matched coaches (and owner/admin) can read a mentor's row
-- 3. admin_erase_person(): delete a person, or anonymise them if they have payment history

begin;

-- 1. RATE LIMITING ---------------------------------------------------------
create table if not exists api_rate_limits (
  id bigserial primary key,
  user_id uuid not null,
  endpoint text not null,
  at timestamptz not null default now()
);
create index if not exists api_rate_limits_lookup_idx on api_rate_limits (user_id, endpoint, at desc);
alter table api_rate_limits enable row level security;  -- no policies: only the function below touches it

-- Returns true if the call is allowed (and records it), false if over the limit.
create or replace function rate_limit_hit(p_endpoint text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  recent integer;
begin
  if uid is null then
    return false;
  end if;
  delete from api_rate_limits where at < now() - interval '1 day';
  select count(*) into recent
    from api_rate_limits
    where user_id = uid and endpoint = p_endpoint
      and at > now() - make_interval(secs => p_window_seconds);
  if recent >= p_max then
    return false;
  end if;
  insert into api_rate_limits (user_id, endpoint) values (uid, p_endpoint);
  return true;
end;
$$;
revoke all on function rate_limit_hit(text, integer, integer) from public, anon;
grant execute on function rate_limit_hit(text, integer, integer) to authenticated;

-- 2. MENTOR LISTING VISIBILITY ----------------------------------------------
-- Helper runs with definer rights so the policy below doesn't recurse into
-- coach2mentor_requests' own policy (which looks back at mentor listings).
create or replace function c2m_has_visible_request(p_mentor_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from coach2mentor_requests r
    join coach2mentor_coach_listings cl on cl.id = r.coach_listing_id
    where r.mentor_listing_id = p_mentor_listing_id
      and cl.person_id = my_person_id()
      and r.status <> 'suggested'
  );
$$;
revoke all on function c2m_has_visible_request(uuid) from public, anon;
grant execute on function c2m_has_visible_request(uuid) to authenticated;

drop policy if exists "authenticated users can browse open mentor listings" on coach2mentor_mentor_listings;
create policy "coaches can see mentors they are matched with"
  on coach2mentor_mentor_listings for select
  using (c2m_has_visible_request(id));

-- 3. ERASE / ANONYMISE A PERSON ---------------------------------------------
-- People with no payment history are deleted outright (as admin_delete_person
-- does). People who HAVE paid are anonymised instead, so the payments ledger
-- stays intact: their personal details are scrubbed, listings are hidden, and
-- mentor evidence references cleared. The API route /api/admin/erase-person
-- then removes the stored evidence files and blocks/renames their login.
create or replace function admin_erase_person(target_person_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  has_payments boolean;
begin
  if not is_master_caller() then
    raise exception 'Only a master PIN can erase a person.';
  end if;

  select exists(select 1 from payments where person_id = target_person_id) into has_payments;

  update payments set marked_by_person_id = null where marked_by_person_id = target_person_id;

  if not has_payments then
    delete from people where id = target_person_id;
    return 'deleted';
  end if;

  update club2coach_coach_listings set deleted_at = coalesce(deleted_at, now()) where person_id = target_person_id;
  update club2coach_club_vacancies set deleted_at = coalesce(deleted_at, now()) where person_id = target_person_id;
  update coach2mentor_coach_listings set deleted_at = coalesce(deleted_at, now()) where person_id = target_person_id;
  update coach2mentor_mentor_listings
     set deleted_at = coalesce(deleted_at, now()),
         bio = null, notes = null, intro_video_url = null, fa_number = null,
         accreditation_evidence_path = null, accreditation_evidence_filename = null,
         accreditation_evidence_uploaded_at = null
   where person_id = target_person_id;

  update support_queries
     set name = 'Deleted user', email = 'deleted@deleted.invalid', message = '[removed at the user''s request]'
   where person_id = target_person_id;

  update people
     set full_name = 'Deleted user',
         mobile = 'deleted-' || left(id::text, 8),
         email = 'deleted-' || id::text || '@deleted.invalid',
         gender = null, region = null, current_licence = null, postcode = null
   where id = target_person_id;

  return 'anonymised';
end;
$$;
revoke all on function admin_erase_person(uuid) from public, anon;
grant execute on function admin_erase_person(uuid) to authenticated;

commit;
