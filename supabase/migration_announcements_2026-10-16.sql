-- In-app announcements: admin writes a notice, chooses who sees it (filters) and when; signed-in people
-- see it as a dismissible banner. Audience is JSON: {"roles":[...],"regions":[...],"payment":"any|paid|unpaid","activity":"any|active|inactive"}.
--  roles: coach (has a Club 2 Coach listing), club (has a vacancy), mentor, mentee (Coach 2 Mentor coach listing), none (no listing yet). Empty = everyone.
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null default '',
  link_url text,
  link_label text,
  audience jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists announcement_dismissals (
  announcement_id uuid not null references announcements(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (announcement_id, person_id)
);
alter table announcements enable row level security;
alter table announcement_dismissals enable row level security;
drop policy if exists "admin manages announcements" on announcements;
create policy "admin manages announcements" on announcements for all using (is_admin_caller()) with check (is_admin_caller());
drop policy if exists "admin reads dismissals" on announcement_dismissals;
create policy "admin reads dismissals" on announcement_dismissals for select using (is_admin_caller());

-- Does this person fall inside the audience filter?
create or replace function person_matches_announcement(pid uuid, aud jsonb)
returns boolean language plpgsql stable security definer set search_path = public, extensions set row_security = off as $$
declare
  p people%rowtype;
  roles text[]; regs text[]; pay text; act text;
  is_coach boolean; is_club boolean; is_mentor boolean; is_mentee boolean; is_none boolean;
  paid_real boolean; active_now boolean;
begin
  select * into p from people where id = pid;
  if not found then return false; end if;
  roles := array(select jsonb_array_elements_text(coalesce(aud->'roles', '[]'::jsonb)));
  regs := array(select jsonb_array_elements_text(coalesce(aud->'regions', '[]'::jsonb)));
  pay := coalesce(aud->>'payment', 'any');
  act := coalesce(aud->>'activity', 'any');

  is_coach := exists (select 1 from club2coach_coach_listings where person_id = pid and deleted_at is null);
  is_club := exists (select 1 from club2coach_club_vacancies where person_id = pid and deleted_at is null and status <> 'superseded');
  is_mentor := exists (select 1 from coach2mentor_mentor_listings where person_id = pid and deleted_at is null);
  is_mentee := exists (select 1 from coach2mentor_coach_listings where person_id = pid and deleted_at is null);
  is_none := not (is_coach or is_club or is_mentor or is_mentee);

  if array_length(roles, 1) is not null then
    if not ((is_coach and 'coach' = any(roles)) or (is_club and 'club' = any(roles)) or (is_mentor and 'mentor' = any(roles))
            or (is_mentee and 'mentee' = any(roles)) or (is_none and 'none' = any(roles))) then
      return false;
    end if;
  end if;

  if array_length(regs, 1) is not null and (p.region is null or not (p.region = any(regs))) then return false; end if;

  -- "Paid" means real money, never a free credit.
  paid_real :=
    exists (select 1 from club2coach_coach_listings where person_id = pid and deleted_at is null and paid and coalesce(price_aud, 0) > 0 and status <> 'refunded')
    or exists (select 1 from coach2mentor_coach_listings where person_id = pid and deleted_at is null and paid and coalesce(price_aud, 0) > 0 and status <> 'refunded')
    or exists (select 1 from coach2mentor_mentor_listings where person_id = pid and deleted_at is null and paid and coalesce(price_aud, 0) > 0 and status <> 'refunded')
    or exists (select 1 from club2coach_club_vacancies where person_id = pid and deleted_at is null and paid and (coalesce(price_aud, 0) > 0 or from_recredit) and status <> 'refunded');
  if pay = 'paid' and not paid_real then return false; end if;
  if pay = 'unpaid' and paid_real then return false; end if;

  -- "Active" means currently in matching / live.
  active_now :=
    exists (select 1 from club2coach_coach_listings where person_id = pid and deleted_at is null and status = 'active' and active_until > now())
    or exists (select 1 from coach2mentor_coach_listings where person_id = pid and deleted_at is null and status = 'active' and active_until > now())
    or exists (select 1 from coach2mentor_mentor_listings where person_id = pid and deleted_at is null and paid and status = 'active')
    or exists (select 1 from club2coach_club_vacancies where person_id = pid and deleted_at is null and paid and status = 'active');
  if act = 'active' and not active_now then return false; end if;
  if act = 'inactive' and active_now then return false; end if;
  return true;
end;
$$;
revoke all on function person_matches_announcement(uuid, jsonb) from public, anon, authenticated;

-- The signed-in person's current, undismissed announcements.
create or replace function my_announcements()
returns table(id uuid, title text, body text, link_url text, link_label text)
language plpgsql stable security definer set search_path = public, extensions set row_security = off as $$
declare me uuid := my_person_id();
begin
  if me is null then return; end if;
  return query
  select a.id, a.title, a.body, a.link_url, a.link_label
  from announcements a
  where a.active and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
    and not exists (select 1 from announcement_dismissals d where d.announcement_id = a.id and d.person_id = me)
    and person_matches_announcement(me, a.audience)
  order by a.created_at desc
  limit 3;
end;
$$;
grant execute on function my_announcements() to authenticated;

create or replace function dismiss_announcement(aid uuid)
returns void language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare me uuid := my_person_id();
begin
  if me is null then return; end if;
  insert into announcement_dismissals (announcement_id, person_id) values (aid, me) on conflict do nothing;
end;
$$;
grant execute on function dismiss_announcement(uuid) to authenticated;

-- Admin only: how many people would see an announcement with this audience.
create or replace function announcement_audience_count(aud jsonb)
returns integer language plpgsql stable security definer set search_path = public, extensions set row_security = off as $$
begin
  if not is_admin_caller() then return null; end if;
  return (select count(*) from people p where person_matches_announcement(p.id, aud))::integer;
end;
$$;
grant execute on function announcement_audience_count(jsonb) to authenticated;
