-- "Recruits through Coach In Mind" badge. Process only, computed live from data; nothing stored.
-- Criteria: complete role description, pay stated, no approved introduction left unanswered >14 days, named reachable contact.

create or replace function compute_club_badge(vac_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
set row_security = off
as $$
  select jsonb_build_object(
    'description', (coalesce(btrim(v.role_being_recruited),'') <> '' and coalesce(btrim(v.competition_level),'') <> ''
                    and coalesce(btrim(v.age_group),'') <> '' and coalesce(btrim(v.region),'') <> ''
                    and coalesce(btrim(v.required_ability_level),'') <> '' and length(btrim(coalesce(v.overview,''))) >= 100),
    'pay', (v.salary_negotiable or v.salary_min is not null or v.salary_max is not null),
    'responsive', not exists (
        select 1 from club2coach_shares s
        where s.club_vacancy_id = v.id and s.status = 'approved' and s.outcome = 'pending'
          and s.shared_at < now() - interval '14 days'),
    'contact', (coalesce(btrim(p.full_name),'') <> '' and coalesce(btrim(p.mobile),'') <> '')
  )
  from club2coach_club_vacancies v
  join people p on p.id = v.person_id
  where v.id = vac_id and v.deleted_at is null;
$$;
revoke all on function compute_club_badge(uuid) from public, anon, authenticated;

-- The club owner checks their own vacancy.
create or replace function get_my_vacancy_badge(vac_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
set row_security = off
as $$
  select compute_club_badge(v.id)
  from club2coach_club_vacancies v
  where v.id = vac_id and v.person_id = my_person_id();
$$;
revoke all on function get_my_vacancy_badge(uuid) from public, anon;
grant execute on function get_my_vacancy_badge(uuid) to authenticated;

-- A coach sees only whether each of their approved introductions comes from a badged vacancy.
create or replace function get_my_intro_badges(target_listing_id uuid)
returns table (share_id uuid, earned boolean)
language sql
stable
security definer
set search_path = public, extensions
set row_security = off
as $$
  select s.id,
         coalesce((b ->> 'description')::boolean and (b ->> 'pay')::boolean
                  and (b ->> 'responsive')::boolean and (b ->> 'contact')::boolean, false)
  from club2coach_shares s
  join club2coach_coach_listings cl on cl.id = s.coach_listing_id
  cross join lateral compute_club_badge(s.club_vacancy_id) b
  where s.status = 'approved' and cl.id = target_listing_id and cl.person_id = my_person_id();
$$;
revoke all on function get_my_intro_badges(uuid) from public, anon;
grant execute on function get_my_intro_badges(uuid) to authenticated;
