-- One-off: ask people whose indicative pay (entered before the "season total" wording) looks like a weekly / hourly
-- rate to update or confirm it. Picks listings created before 27 Oct 2026 09:00 Melbourne with a max figure under 1500.
alter table signup_reminders drop constraint if exists signup_reminders_kind_check;
alter table signup_reminders add constraint signup_reminders_kind_check check (kind in ('no_profile', 'not_live', 'pay_clarify'));

create or replace function pay_clarifications_due()
returns table (clarify_person_id uuid, clarify_side text)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  return query
  with c as (
    select l.person_id as pid, 'coach'::text as side from club2coach_coach_listings l
      where l.deleted_at is null and l.created_at < timestamptz '2026-10-26 22:00:00+00'
        and coalesce(l.salary_max, l.salary_min) is not null and coalesce(l.salary_max, l.salary_min) < 1500
    union
    select v.person_id, 'club' from club2coach_club_vacancies v
      where v.deleted_at is null and v.created_at < timestamptz '2026-10-26 22:00:00+00'
        and coalesce(v.salary_max, v.salary_min) is not null and coalesce(v.salary_max, v.salary_min) < 1500
  ), pick as (
    select distinct on (c.pid) c.pid, c.side from c
    where not exists (select 1 from signup_reminders r where r.person_id = c.pid and r.kind = 'pay_clarify')
    order by c.pid, c.side
  ), ins as (
    insert into signup_reminders (person_id, kind) select pid, 'pay_clarify' from pick returning person_id
  )
  select pid, side from pick;
end;
$$;
revoke all on function pay_clarifications_due() from public, anon, authenticated;
grant execute on function pay_clarifications_due() to service_role;
