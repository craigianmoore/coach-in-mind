-- One-off second nudge for people who signed up, were sent the first "finish your profile" reminder, and still have
-- no coach / club / mentor profile. Once per person (kind 'no_profile_2'). Service role only.
alter table signup_reminders drop constraint if exists signup_reminders_kind_check;
alter table signup_reminders add constraint signup_reminders_kind_check check (kind in ('no_profile', 'not_live', 'pay_clarify', 'no_profile_2'));

create or replace function signup_followups_due(max_rows integer default 40)
returns table (reminder_person_id uuid)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  return query
  with due as (
    select p.id from people p
    where coalesce(p.admin_session_until, 'epoch') < now()
      and exists (select 1 from signup_reminders r where r.person_id = p.id and r.kind = 'no_profile' and r.sent_at < now() - interval '1 day')
      and not exists (select 1 from signup_reminders r where r.person_id = p.id and r.kind = 'no_profile_2')
      and not exists (select 1 from club2coach_coach_listings x where x.person_id = p.id and x.deleted_at is null)
      and not exists (select 1 from club2coach_club_vacancies x where x.person_id = p.id and x.deleted_at is null)
      and not exists (select 1 from coach2mentor_coach_listings x where x.person_id = p.id and x.deleted_at is null)
      and not exists (select 1 from coach2mentor_mentor_listings x where x.person_id = p.id and x.deleted_at is null)
    order by p.created_at limit max_rows
  ), ins as (
    insert into signup_reminders (person_id, kind) select id, 'no_profile_2' from due returning person_id
  )
  select d.id from due d;
end;
$$;
revoke all on function signup_followups_due(integer) from public, anon, authenticated;
grant execute on function signup_followups_due(integer) to service_role;
