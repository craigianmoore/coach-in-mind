-- One reminder email each for people who signed up but can't be matched yet:
--  'no_profile' : signed up 3-30 days ago and has not started any coach / club / mentor profile.
--  'not_live'   : saved a profile 3-30 days ago that is still a draft (coach or club, not activated/paid),
--                 or a verified mentor who hasn't bought introductions yet. (A mentor still awaiting OUR
--                 verification is never nagged: they are waiting on us.)
-- Each person gets each kind at most once. Service role only.
create table if not exists signup_reminders (
  person_id uuid not null references people(id) on delete cascade,
  kind text not null check (kind in ('no_profile', 'not_live')),
  sent_at timestamptz not null default now(),
  primary key (person_id, kind)
);
alter table signup_reminders enable row level security;

create or replace function signup_reminders_due(max_rows integer default 40)
returns table (reminder_person_id uuid, reminder_kind text, reminder_product text)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  return query
  with empty as (
    select p.id from people p
    where p.created_at < now() - interval '3 days' and p.created_at > now() - interval '30 days'
      and coalesce(p.admin_session_until, 'epoch') < now()
      and not exists (select 1 from club2coach_coach_listings x where x.person_id = p.id and x.deleted_at is null)
      and not exists (select 1 from club2coach_club_vacancies x where x.person_id = p.id and x.deleted_at is null)
      and not exists (select 1 from coach2mentor_coach_listings x where x.person_id = p.id and x.deleted_at is null)
      and not exists (select 1 from coach2mentor_mentor_listings x where x.person_id = p.id and x.deleted_at is null)
      and not exists (select 1 from signup_reminders r where r.person_id = p.id and r.kind = 'no_profile')
    order by p.created_at limit max_rows
  ), ins1 as (
    insert into signup_reminders (person_id, kind) select id, 'no_profile' from empty returning person_id
  ), drafts as (
    select x.person_id, 'coach'::text as prod from club2coach_coach_listings x
      where x.status = 'draft' and x.deleted_at is null and x.created_at < now() - interval '3 days' and x.created_at > now() - interval '30 days'
    union
    select x.person_id, 'coach' from coach2mentor_coach_listings x
      where x.status = 'draft' and x.deleted_at is null and x.created_at < now() - interval '3 days' and x.created_at > now() - interval '30 days'
    union
    select x.person_id, 'club' from club2coach_club_vacancies x
      where x.status = 'draft' and x.paid = false and x.deleted_at is null and x.created_at < now() - interval '3 days' and x.created_at > now() - interval '30 days'
    union
    select x.person_id, 'mentor' from coach2mentor_mentor_listings x
      where x.paid = false and x.verified_at is not null and x.deleted_at is null and x.created_at < now() - interval '3 days' and x.created_at > now() - interval '30 days'
  ), pick as (
    select distinct on (d.person_id) d.person_id, d.prod from drafts d
    where not exists (select 1 from signup_reminders r where r.person_id = d.person_id and r.kind = 'not_live')
      and not exists (select 1 from club2coach_coach_listings a where a.person_id = d.person_id and a.status = 'active' and a.deleted_at is null)
      and not exists (select 1 from coach2mentor_coach_listings a where a.person_id = d.person_id and a.status = 'active' and a.deleted_at is null)
    order by d.person_id limit max_rows
  ), ins2 as (
    insert into signup_reminders (person_id, kind) select person_id, 'not_live' from pick returning person_id
  )
  select e.id, 'no_profile'::text, ''::text from empty e
  union all
  select k.person_id, 'not_live', k.prod from pick k;
end;
$$;
revoke all on function signup_reminders_due(integer) from public, anon, authenticated;
grant execute on function signup_reminders_due(integer) to service_role;
