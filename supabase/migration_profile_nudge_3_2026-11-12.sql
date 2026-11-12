-- Third, admin-triggered nudge to people who signed up but still have no coach / club / mentor profile:
-- "clubs are looking, finish your profile so we can match you". Once per person (kind 'no_profile_3').
-- Skips admins, anyone who replied "no thanks", and anyone nudged by the automatic follow-up in the last 2 days.
-- Service role only.
alter table signup_reminders drop constraint if exists signup_reminders_kind_check;
alter table signup_reminders add constraint signup_reminders_kind_check check (kind in ('no_profile', 'not_live', 'pay_clarify', 'no_profile_2', 'no_profile_3'));

create or replace function signup_nudge3_count()
returns integer
language sql security definer set search_path = public, extensions set row_security = off as $$
  select count(*)::integer from people p
  where coalesce(p.admin_session_until, 'epoch') < now()
    and p.email is not null
    and p.created_at < now() - interval '1 day'
    and not exists (select 1 from signup_reminders r where r.person_id = p.id and r.kind = 'no_profile_3')
    and not exists (select 1 from signup_reminders r where r.person_id = p.id and r.kind = 'no_profile_2' and r.sent_at > now() - interval '2 days')
    and not exists (select 1 from invite_recipients i where lower(i.email) = lower(p.email) and i.status = 'optout')
    and not exists (select 1 from club2coach_coach_listings x where x.person_id = p.id and x.deleted_at is null)
    and not exists (select 1 from club2coach_club_vacancies x where x.person_id = p.id and x.deleted_at is null)
    and not exists (select 1 from coach2mentor_coach_listings x where x.person_id = p.id and x.deleted_at is null)
    and not exists (select 1 from coach2mentor_mentor_listings x where x.person_id = p.id and x.deleted_at is null);
$$;

create or replace function signup_nudge3_due(max_rows integer default 40)
returns table (reminder_person_id uuid)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  return query
  with due as (
    select p.id from people p
    where coalesce(p.admin_session_until, 'epoch') < now()
      and p.email is not null
      and p.created_at < now() - interval '1 day'
      and not exists (select 1 from signup_reminders r where r.person_id = p.id and r.kind = 'no_profile_3')
      and not exists (select 1 from signup_reminders r where r.person_id = p.id and r.kind = 'no_profile_2' and r.sent_at > now() - interval '2 days')
      and not exists (select 1 from invite_recipients i where lower(i.email) = lower(p.email) and i.status = 'optout')
      and not exists (select 1 from club2coach_coach_listings x where x.person_id = p.id and x.deleted_at is null)
      and not exists (select 1 from club2coach_club_vacancies x where x.person_id = p.id and x.deleted_at is null)
      and not exists (select 1 from coach2mentor_coach_listings x where x.person_id = p.id and x.deleted_at is null)
      and not exists (select 1 from coach2mentor_mentor_listings x where x.person_id = p.id and x.deleted_at is null)
    order by p.created_at limit max_rows
  ), ins as (
    insert into signup_reminders (person_id, kind) select id, 'no_profile_3' from due returning person_id
  )
  select d.id from due d;
end;
$$;
revoke all on function signup_nudge3_count() from public, anon, authenticated;
revoke all on function signup_nudge3_due(integer) from public, anon, authenticated;
grant execute on function signup_nudge3_count() to service_role;
grant execute on function signup_nudge3_due(integer) to service_role;
