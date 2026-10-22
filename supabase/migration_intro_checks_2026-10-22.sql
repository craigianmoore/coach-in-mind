-- 1) Coach-side check on each introduction: did the coach actually take the role?
--    Lets admin spot a club saying "not filled" when the coach says they were hired.
alter table club2coach_shares add column if not exists coach_response text;
alter table club2coach_shares add column if not exists coach_responded_at timestamptz;
alter table club2coach_shares add column if not exists coach_check_sent_at timestamptz;
alter table club2coach_shares drop constraint if exists club2coach_shares_coach_response_check;
alter table club2coach_shares add constraint club2coach_shares_coach_response_check check (coach_response in ('hired', 'not_hired'));
-- Don't email coaches about introductions made before this existed (the app will still ask them).
update club2coach_shares set coach_check_sent_at = now() where status = 'approved' and coach_check_sent_at is null;

-- Clubs (and coaches) can't edit these directly; coaches answer through coach_report_intro().
create or replace function protect_c2c_share_fields() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not coalesce(is_admin_caller(), false) then
    new.coach_listing_id := old.coach_listing_id;
    new.club_vacancy_id := old.club_vacancy_id;
    new.score := old.score;
    new.admin_notes := old.admin_notes;
    new.shared_at := old.shared_at;
    new.status := old.status;
    new.coach_response := old.coach_response;
    new.coach_responded_at := old.coach_responded_at;
    new.coach_check_sent_at := old.coach_check_sent_at;
  end if;
  return new;
end;
$$;

-- Introductions at least 7 days old that the signed-in coach hasn't answered yet.
create or replace function coach_pending_intro_checks()
returns table (share_id uuid, club_name text, role text)
language sql security definer set search_path = public, extensions set row_security = off as $$
  select s.id, v.club_name, v.role_being_recruited
  from club2coach_shares s
  join club2coach_coach_listings l on l.id = s.coach_listing_id
  join club2coach_club_vacancies v on v.id = s.club_vacancy_id
  where l.person_id = my_person_id() and s.status = 'approved'
    and s.coach_response is null and s.shared_at < now() - interval '7 days'
  order by s.shared_at;
$$;
grant execute on function coach_pending_intro_checks() to authenticated;

create or replace function coach_report_intro(target_share_id uuid, hired boolean)
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare me uuid := my_person_id();
begin
  if me is null then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  update club2coach_shares s
     set coach_response = case when hired then 'hired' else 'not_hired' end, coach_responded_at = now()
   where s.id = target_share_id and s.status = 'approved' and s.coach_response is null
     and exists (select 1 from club2coach_coach_listings l where l.id = s.coach_listing_id and l.person_id = me);
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_eligible'); end if;
  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function coach_report_intro(uuid, boolean) to authenticated;

-- 2) Auto-approve only above a minimum match score (Club 2 Coach). Lower scores wait for admin approval.
alter table admin_settings add column if not exists auto_approve_min_score numeric not null default 0.7;
alter table admin_settings drop constraint if exists admin_settings_auto_approve_min_score_check;
alter table admin_settings add constraint admin_settings_auto_approve_min_score_check check (auto_approve_min_score >= 0 and auto_approve_min_score <= 1);
