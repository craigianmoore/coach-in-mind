-- =========================================================
-- Coach In Mind — unified schema for Club2Coach + Coach2Mentor
-- =========================================================
-- Design notes for future-you:
--
-- 1. ONE IDENTITY, MANY ROLES. `people` holds the shared profile
--    (name, mobile, email, gender, region, licence) tied to a single
--    Supabase Auth login. Each product-role a person activates
--    (Club2Coach coach, Club2Coach club, Coach2Mentor coach,
--    Coach2Mentor mentor) is its own listing row with its own `paid`
--    flag — paying for one does not unlock another.
--
-- 2. CONTACT DETAILS STAY PRIVATE. `people.mobile` and `people.email`
--    are never exposed by a broad SELECT policy. Club2Coach is fully
--    admin-mediated (admin reviews matches, then explicitly shares
--    both parties' contact info via `club2coach_shares`). Coach2Mentor
--    mentor listings ARE browsable (mentors opt in to this), but even
--    there, a coach only gains access to a mentor's actual contact
--    record once the mentor accepts their request.
--
-- 3. ADMIN PIN, NOT A SEPARATE LOGIN. There's no separate admin
--    account system. A logged-in person who enters the correct 6-digit
--    PIN gets a time-limited admin session flag on their own `people`
--    row (`admin_session_until`). RLS policies for admin-only actions
--    check that flag — so the PIN genuinely gates data access at the
--    database level, not just which buttons the UI shows.
--
-- 4. STATE-KEYED REFERENCE DATA. Region/competition-level values are
--    plain text columns validated by the app against lib/constants.ts,
--    not Postgres enums — deliberately, so bringing a state's list up
--    to date, or adding a new state, is a constants-file change, not a
--    schema migration.
--
-- 5. TWO ADMIN TIERS. On top of the ordinary admin PIN in #3, a PIN can
--    additionally be flagged `is_master` — a master PIN can add, revoke
--    and relabel other admin PINs, and run a full PIN reset, via
--    `is_master_caller()` and the functions in the MASTER ADMIN TIER
--    section below. There must always be at least one master PIN.
--
-- 6. TWO WAYS TO GET PAID. Payments can still be marked manually by an
--    admin (`mark_*_paid`, as in #3 originally), OR collected live via
--    Stripe Checkout (`/api/stripe/checkout` + `/api/stripe/webhook`),
--    gated by the `platform_settings.stripe_payments_enabled` kill
--    switch. Either path ends up as a row in `payments`.
-- =========================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto"; -- for PIN hashing (crypt/gen_salt)

-- ---------------------------------------------------------
-- PEOPLE — the shared identity behind every login
-- ---------------------------------------------------------
create table people (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  full_name text not null,
  mobile text not null,
  email text not null,
  gender text, -- 'Male' | 'Female' | free text — validated in app
  region text, -- one of lib/constants REGIONS
  current_licence text, -- one of lib/constants ACCREDITATION_LEVELS
  -- Set by grant_admin_pin_session(); checked by RLS policies below.
  -- Null / in the past = not currently an admin session.
  admin_session_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- PIN brute-force protection: a run of wrong PIN guesses locks the
  -- person out of retrying for a short window.
  failed_admin_pin_attempts integer not null default 0,
  admin_pin_locked_until timestamptz,
  admin_session_granted_at timestamptz,
  -- Which admin_pins row granted the current admin session — lets
  -- is_master_caller() below tell a master session from an ordinary one.
  -- FK added further down (admin_pins doesn't exist yet at this point
  -- in the file).
  admin_session_pin_id uuid
);

create index people_region_idx on people(region);

-- Helper used inside RLS policies: is the current caller in an active
-- admin session right now?
create or replace function is_admin_caller()
returns boolean
language sql
security definer
set search_path = public, extensions
set row_security = off
as $$
  select exists (
    select 1 from people
    where user_id = auth.uid()
      and admin_session_until is not null
      and admin_session_until > now()
  );
$$;

-- Looks up the current caller's own person.id, bypassing RLS on people
-- entirely (SECURITY DEFINER). Every other policy in this file that
-- needs "is this row mine?" calls this instead of subquerying `people`
-- directly — a plain inline subquery on `people` from within another
-- policy makes Postgres try to re-evaluate people's own RLS policies
-- to answer that subquery, which can spiral into "infinite recursion
-- detected in policy for relation" errors once policies reference
-- each other across tables.
create or replace function my_person_id()
returns uuid
language sql
security definer
set search_path = public
set row_security = off
as $$
  select id from people where user_id = auth.uid();
$$;

alter table people enable row level security;

create policy "people can view their own record"
  on people for select
  using (auth.uid() = user_id or is_admin_caller());

create policy "people can insert their own record"
  on people for insert
  with check (auth.uid() = user_id);

create policy "people can update their own record"
  on people for update
  using (auth.uid() = user_id or is_admin_caller());

-- Note: the two "reveals contact record" policies on `people` (one for
-- Club2Coach shares, one for accepted Coach2Mentor requests) are
-- defined near the end of this file, after the tables they reference
-- actually exist — Postgres won't let a policy reference a table that
-- hasn't been created yet.

-- ---------------------------------------------------------
-- ADMIN PIN
-- ---------------------------------------------------------
create table admin_pins (
  id uuid primary key default uuid_generate_v4(),
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  label text, -- optional human-readable name ("Craig's PIN", "Front desk")
  -- A second tier above ordinary admin PINs. A master PIN can add,
  -- revoke, and relabel other admin PINs, and run a full PIN reset —
  -- see is_master_caller() and the functions below. There must always
  -- be at least one master PIN (enforced in revoke_admin_pin).
  is_master boolean not null default false
);

-- Now that admin_pins exists, wire up the FK declared on people above.
alter table people
  add constraint people_admin_session_pin_id_fkey
  foreign key (admin_session_pin_id) references admin_pins(id);

-- Locked down completely — no policies means no direct access via the
-- anon/publishable key at all. Only the SECURITY DEFINER functions
-- below can read or write this table.
alter table admin_pins enable row level security;

-- Seed your PIN once, right after running this schema, e.g.:
--   select set_admin_pin('123456');
create or replace function set_admin_pin(new_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new_pin !~ '^[0-9]{6}$' then
    raise exception 'PIN must be exactly 6 digits';
  end if;
  delete from admin_pins;
  insert into admin_pins (pin_hash) values (extensions.crypt(new_pin, extensions.gen_salt('bf')));
end;
$$;

-- Call this from the app after the person is logged in. On success,
-- grants a 2-hour admin session on their own people row.
create or replace function grant_admin_pin_session(input_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  matched boolean;
begin
  select exists (
    select 1 from admin_pins where pin_hash = extensions.crypt(input_pin, pin_hash)
  ) into matched;

  if matched then
    update people
    set admin_session_until = now() + interval '2 hours'
    where user_id = auth.uid();
  end if;

  return matched;
end;
$$;

-- Extends an already-active admin session by another 2 hours. Called
-- on every admin page load and admin action, so the session behaves
-- like a real idle timeout ("2 hours of no activity") rather than a
-- fixed 2-hour window that expires mid-task. Does nothing if the
-- caller doesn't currently have an active session — this only extends,
-- it never grants a fresh one (that's what the PIN is for).
create or replace function refresh_admin_session()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update people
  set admin_session_until = now() + interval '2 hours'
  where user_id = auth.uid()
    and admin_session_until is not null
    and admin_session_until > now();
end;
$$;

create or replace function change_admin_pin(current_pin text, new_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  matched boolean;
begin
  select exists (
    select 1 from admin_pins where pin_hash = extensions.crypt(current_pin, pin_hash)
  ) into matched;

  if matched then
    perform set_admin_pin(new_pin);
  end if;

  return matched;
end;
$$;

-- ---------------------------------------------------------
-- MASTER ADMIN TIER
-- A second, higher tier of PIN. An ordinary admin PIN (added via
-- set_admin_pin/change_admin_pin above, back when there was only one)
-- can do everyday admin actions. A master PIN can additionally manage
-- OTHER admin PINs — add, revoke, relabel, or wipe them all — without
-- ever exposing pin_hash values. Which tier the CURRENT session has is
-- recorded on people.admin_session_pin_id when the PIN is granted (see
-- grant_admin_pin_session above, which every admin_pins row — master
-- or not — flows through the same way).
-- ---------------------------------------------------------
create or replace function is_master_caller()
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  session_is_master boolean;
begin
  if not is_admin_caller() then
    return false;
  end if;

  select ap.is_master into session_is_master
  from people p
  join admin_pins ap on ap.id = p.admin_session_pin_id
  where p.user_id = auth.uid();

  return coalesce(session_is_master, false);
end;
$$;

-- Convenience wrapper the app can call to decide whether to show
-- master-only admin UI.
create or replace function am_i_master_admin()
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select is_master_caller();
$$;

create or replace function list_admin_pins()
returns table(id uuid, label text, created_at timestamptz, is_master boolean)
language sql
security definer
set search_path = public, extensions
as $$
  select id, label, created_at, is_master from admin_pins order by is_master desc, created_at asc;
$$;

create or replace function add_admin_pin(new_pin text, new_label text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not is_master_caller() then
    raise exception 'Only a master PIN can add admin PINs.';
  end if;
  insert into admin_pins (pin_hash, label, is_master)
  values (extensions.crypt(new_pin, extensions.gen_salt('bf')), new_label, false);
end;
$$;

create or replace function update_admin_pin_label(target_id uuid, new_label text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not is_master_caller() then
    raise exception 'Only a master PIN can edit admin PINs.';
  end if;
  update admin_pins set label = new_label where id = target_id;
end;
$$;

-- Revokes one admin PIN. Refuses to revoke the last remaining master
-- PIN — there must always be at least one, or nobody could ever grant
-- another master PIN again.
create or replace function revoke_admin_pin(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_is_master boolean;
  master_count int;
begin
  if not is_master_caller() then
    raise exception 'Only a master PIN can revoke admin PINs.';
  end if;

  select is_master into target_is_master from admin_pins where id = target_id;

  if target_is_master then
    select count(*) into master_count from admin_pins where is_master = true;
    if master_count <= 1 then
      raise exception 'Cannot revoke the last master PIN — there must always be at least one.';
    end if;
  end if;

  delete from admin_pins where id = target_id;
end;
$$;

-- Wipes every ordinary admin PIN, keeping master PINs intact. For when
-- you suspect a PIN has leaked and want a clean slate without locking
-- yourself out of the master tier.
create or replace function full_pin_reset()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not is_master_caller() then
    raise exception 'Only a master PIN can run a full PIN reset.';
  end if;
  delete from admin_pins where is_master = false;
end;
$$;

-- ---------------------------------------------------------
-- CLUB2COACH: coach listings ("looking for a role")
-- ---------------------------------------------------------
create table club2coach_coach_listings (
  id uuid primary key default uuid_generate_v4(),
  person_id uuid not null references people(id) on delete cascade,
  role_sought text not null, -- COACHING_ROLES
  preferred_team_gender text,
  ability_levels text[] not null default '{}', -- ABILITY_LEVELS, multi
  preferred_competition_levels text[] not null default '{}',
  preferred_age_groups text[] not null default '{}',
  preferred_regions text[] not null default '{}',
  open_to_relocating boolean not null default false,
  salary_min numeric,
  salary_max numeric,
  salary_negotiable boolean not null default false,
  overview text,
  notes text,
  status text not null default 'draft', -- draft | active | paused | placed
  authorise_share boolean not null default false, -- consent to admin sharing once matched
  paid boolean not null default false,
  paid_at timestamptz,
  price_aud numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz, -- soft delete, so historic shares/payments still resolve
  included_introductions integer, -- how many admin-shared intros this listing's package covers
  topup_requested integer, -- set when the coach has asked to buy more intros; cleared by confirm_club2coach_coach_topup()
  state_preferences text[] not null default '{}', -- states (not just regions) the coach is open to, multi-state search
  agreed_to_terms boolean not null default false
);

create index c2c_coach_listings_person_idx on club2coach_coach_listings(person_id);
create index c2c_coach_listings_status_idx on club2coach_coach_listings(status);

alter table club2coach_coach_listings enable row level security;

create policy "owner or admin can view coach listing"
  on club2coach_coach_listings for select
  using (
    is_admin_caller()
    or person_id = my_person_id()
  );

create policy "owner can insert their coach listing"
  on club2coach_coach_listings for insert
  with check (person_id = my_person_id());

create policy "owner or admin can update coach listing"
  on club2coach_coach_listings for update
  using (
    is_admin_caller()
    or person_id = my_person_id()
  );

-- ---------------------------------------------------------
-- CLUBS — a lightweight directory of clubs, linked from vacancies so
-- the same club's open-vacancy count can be queried without scanning
-- free-text club_name values. club_name on the vacancy itself stays
-- authoritative for display; club_id is an optional link on top of it.
-- ---------------------------------------------------------
create table clubs (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz not null default now(),
  state text not null default 'VIC'
);

alter table clubs enable row level security;

create policy "anyone authenticated can view clubs"
  on clubs for select
  using (auth.role() = 'authenticated');

create policy "admin can insert clubs"
  on clubs for insert
  with check (is_admin_caller());

-- ---------------------------------------------------------
-- CLUB2COACH: club vacancies
-- ---------------------------------------------------------
create table club2coach_club_vacancies (
  id uuid primary key default uuid_generate_v4(),
  person_id uuid not null references people(id) on delete cascade, -- club contact
  club_id uuid references clubs(id), -- optional link into the clubs directory above
  club_name text not null,
  role_being_recruited text not null, -- COACHING_ROLES
  competition_level text not null, -- COMPETITION_LEVELS
  age_group text not null, -- AGE_GROUPS
  age_group_max text, -- TD roles only: upper end of an age-group range
  team_gender text,
  preferred_coach_gender text,
  region text not null,
  required_accreditation text not null default 'None / In Progress',
  required_ability_level text,
  salary_min numeric,
  salary_max numeric,
  salary_negotiable boolean not null default false,
  overview text,
  priority_hints text[] not null default '{}', -- optional hint for admin weighting
  notes text,
  status text not null default 'draft', -- draft | active | paused | filled
  authorise_share boolean not null default false,
  paid boolean not null default false,
  paid_at timestamptz,
  price_aud numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  shared_at timestamptz, -- set when the admin first shares this vacancy with a coach
  filled_at timestamptz,
  deleted_at timestamptz, -- soft delete, so historic shares/payments still resolve
  included_introductions integer, -- how many admin-shared intros this vacancy's package covers
  is_charity boolean not null default false, -- true for vacancies gifted via gift_club2coach_vacancy() rather than actually paid for
  state text, -- which state's competition/region lists this vacancy was created under
  agreed_to_terms boolean not null default false
);

create index c2c_vacancies_person_idx on club2coach_club_vacancies(person_id);
create index c2c_vacancies_status_idx on club2coach_club_vacancies(status);

alter table club2coach_club_vacancies enable row level security;

create policy "owner or admin can view vacancy"
  on club2coach_club_vacancies for select
  using (
    is_admin_caller()
    or person_id = my_person_id()
  );

create policy "owner can insert their vacancy"
  on club2coach_club_vacancies for insert
  with check (person_id = my_person_id());

create policy "owner or admin can update vacancy"
  on club2coach_club_vacancies for update
  using (
    is_admin_caller()
    or person_id = my_person_id()
  );

-- ---------------------------------------------------------
-- CLUB2COACH: admin-confirmed shares
-- Records when the admin has reviewed a coach listing + vacancy pair
-- and decided to share both parties' contact details with each other.
-- ---------------------------------------------------------
create table club2coach_shares (
  id uuid primary key default uuid_generate_v4(),
  coach_listing_id uuid not null references club2coach_coach_listings(id) on delete cascade,
  club_vacancy_id uuid not null references club2coach_club_vacancies(id) on delete cascade,
  score numeric,
  admin_notes text,
  shared_at timestamptz not null default now(),
  status text not null default 'approved', -- 'approved' | future statuses if a review step is added later
  unique (coach_listing_id, club_vacancy_id)
);

alter table club2coach_shares enable row level security;

create policy "admin can manage shares"
  on club2coach_shares for all
  using (is_admin_caller())
  with check (is_admin_caller());

create policy "involved parties can view their own share"
  on club2coach_shares for select
  using (
    status = 'approved'
    and (
      exists (
        select 1 from club2coach_coach_listings cl
        where cl.id = coach_listing_id and cl.person_id = my_person_id()
      )
      or exists (
        select 1 from club2coach_club_vacancies cv
        where cv.id = club_vacancy_id and cv.person_id = my_person_id()
      )
    )
  );

-- Once a share exists, both parties can see each other's contact
-- record — same pattern as the Coach2Mentor accepted-request policy.
create policy "club2coach share reveals contact record"
  on people for select
  using (
    exists (
      select 1 from club2coach_shares s
      join club2coach_coach_listings cl on cl.id = s.coach_listing_id
      join club2coach_club_vacancies cv on cv.id = s.club_vacancy_id
      where (cl.person_id = people.id and cv.person_id = my_person_id())
         or (cv.person_id = people.id and cl.person_id = my_person_id())
    )
  );

-- ---------------------------------------------------------
-- COACH2MENTOR: coach listings ("looking for a mentor")
-- ---------------------------------------------------------
create table coach2mentor_coach_listings (
  id uuid primary key default uuid_generate_v4(),
  person_id uuid not null references people(id) on delete cascade,
  preferred_mentor_gender text,
  availability text, -- AVAILABILITY_OPTIONS
  current_career_stage text, -- CAREER_STAGES
  support_areas text[] not null default '{}', -- MENTOR_SPECIALISMS, multi
  meet_min integer,
  meet_max integer,
  budget_min numeric,
  budget_max numeric,
  goals text,
  notes text,
  status text not null default 'draft', -- draft | active | paused
  paid boolean not null default false,
  paid_at timestamptz,
  price_aud numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz, -- soft delete, so historic requests/payments still resolve
  personal_weights jsonb, -- this coach's own scoring-weight overrides, if they've customised them
  included_introductions integer, -- how many admin-shared intros this listing's package covers
  topup_requested integer, -- set when the coach has asked to buy more intros; cleared by confirm_coach2mentor_coach_topup()
  preferred_regions text[] not null default '{}',
  state_preferences text[] not null default '{}', -- states (not just regions) the coach is open to, multi-state search
  agreed_to_terms boolean not null default false
);

create index c2m_coach_listings_person_idx on coach2mentor_coach_listings(person_id);

alter table coach2mentor_coach_listings enable row level security;

create policy "owner or admin can view coach2mentor coach listing"
  on coach2mentor_coach_listings for select
  using (
    is_admin_caller()
    or person_id = my_person_id()
  );

create policy "owner can insert their coach2mentor coach listing"
  on coach2mentor_coach_listings for insert
  with check (person_id = my_person_id());

create policy "owner or admin can update coach2mentor coach listing"
  on coach2mentor_coach_listings for update
  using (
    is_admin_caller()
    or person_id = my_person_id()
  );

-- ---------------------------------------------------------
-- COACH2MENTOR: mentor listings — the browsable side
-- ---------------------------------------------------------
create table coach2mentor_mentor_listings (
  id uuid primary key default uuid_generate_v4(),
  person_id uuid not null references people(id) on delete cascade,
  preferred_coach_gender text,
  availability text,
  regions_served text[] not null default '{}',
  fa_number text, -- Football Australia registration number; validated as 8 digits in the app
  licence text, -- ACCREDITATION_LEVELS (mentor's own)
  career_stage text, -- CAREER_STAGES
  specialisms text[] not null default '{}',
  meet_capacity_per_year integer,
  rate_type text not null default 'paid', -- 'paid' | 'free'
  rate_amount numeric,
  rate_unit text, -- RATE_UNITS
  rate_negotiable boolean not null default false,
  in_person_rate_differs boolean not null default false,
  in_person_rate_amount numeric,
  max_mentees integer,
  currently_open boolean not null default true,
  bio text,
  intro_video_url text, -- YouTube/Loom/Vimeo link, embedded on the coach-facing browse page
  notes text,
  status text not null default 'draft', -- draft | active | paused
  confirm_accurate boolean not null default false, -- "info is accurate" consent
  authorise_share boolean not null default false, -- "visible to coaches + contact on accept" consent
  paid boolean not null default false,
  paid_at timestamptz,
  price_aud numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz, -- soft delete, so historic requests/payments still resolve
  agreed_to_terms boolean not null default false
);

create index c2m_mentor_listings_person_idx on coach2mentor_mentor_listings(person_id);
create index c2m_mentor_listings_status_idx on coach2mentor_mentor_listings(status);

alter table coach2mentor_mentor_listings enable row level security;

create policy "owner or admin can view own mentor listing"
  on coach2mentor_mentor_listings for select
  using (
    is_admin_caller()
    or person_id = my_person_id()
  );

-- The browsable case: any authenticated person can see an ACTIVE, PAID,
-- share-authorised mentor listing (but not the underlying contact
-- record — that's gated separately via the accepted-request policy
-- on `people` above).
create policy "authenticated users can browse open mentor listings"
  on coach2mentor_mentor_listings for select
  using (
    auth.role() = 'authenticated'
    and status = 'active'
    and paid = true
    and authorise_share = true
    and currently_open = true
  );

create policy "owner can insert their mentor listing"
  on coach2mentor_mentor_listings for insert
  with check (person_id = my_person_id());

create policy "owner or admin can update mentor listing"
  on coach2mentor_mentor_listings for update
  using (
    is_admin_caller()
    or person_id = my_person_id()
  );

-- ---------------------------------------------------------
-- COACH2MENTOR: requests (coach -> specific mentor)
-- ---------------------------------------------------------
create table coach2mentor_requests (
  id uuid primary key default uuid_generate_v4(),
  coach_listing_id uuid not null references coach2mentor_coach_listings(id) on delete cascade,
  mentor_listing_id uuid not null references coach2mentor_mentor_listings(id) on delete cascade,
  status text not null default 'pending', -- pending | accepted | declined
  message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  score numeric, -- match score at the time the coach sent this request
  admin_notes text,
  unique (coach_listing_id, mentor_listing_id)
);

create index c2m_requests_coach_idx on coach2mentor_requests(coach_listing_id);
create index c2m_requests_mentor_idx on coach2mentor_requests(mentor_listing_id);

-- Used by the app to check whether a coach already has a live (not
-- merely 'suggested') request against a given mentor, before letting
-- them send another one.
create or replace function coach2mentor_has_active_link(target_coach_listing_id uuid, target_mentor_listing_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from coach2mentor_requests
    where coach_listing_id = target_coach_listing_id
      and mentor_listing_id = target_mentor_listing_id
      and status != 'suggested'
  );
$$;

alter table coach2mentor_requests enable row level security;

create policy "involved parties or admin can view request"
  on coach2mentor_requests for select
  using (
    is_admin_caller()
    or exists (
      select 1 from coach2mentor_coach_listings cl
      where cl.id = coach_listing_id and cl.person_id = my_person_id()
    )
    or exists (
      select 1 from coach2mentor_mentor_listings ml
      where ml.id = mentor_listing_id and ml.person_id = my_person_id()
    )
  );

create policy "coach can create a request from their own listing"
  on coach2mentor_requests for insert
  with check (
    exists (
      select 1 from coach2mentor_coach_listings cl
      where cl.id = coach_listing_id
        and cl.person_id = my_person_id()
        and cl.paid = true
        and cl.status = 'active'
    )
  );

-- Only the mentor being requested (or admin) can accept/decline.
create policy "mentor or admin can respond to request"
  on coach2mentor_requests for update
  using (
    is_admin_caller()
    or exists (
      select 1 from coach2mentor_mentor_listings ml
      where ml.id = mentor_listing_id and ml.person_id = my_person_id()
    )
  );

-- A coach gains visibility of a mentor's contact record once the
-- mentor has accepted their request. Defined here, not up near the
-- `people` table itself, because it needs coach2mentor_requests,
-- coach2mentor_mentor_listings, and coach2mentor_coach_listings to
-- already exist.
create policy "accepted mentor match reveals contact record"
  on people for select
  using (
    exists (
      select 1
      from coach2mentor_requests r
      join coach2mentor_mentor_listings ml on ml.id = r.mentor_listing_id
      join coach2mentor_coach_listings cl on cl.id = r.coach_listing_id
      where r.status = 'accepted'
        and (
          (ml.person_id = people.id and cl.person_id = my_person_id())
          or
          (cl.person_id = people.id and ml.person_id = my_person_id())
        )
    )
  );

-- ---------------------------------------------------------
-- PAYMENTS LEDGER
-- ---------------------------------------------------------
create table payments (
  id uuid primary key default uuid_generate_v4(),
  person_id uuid not null references people(id) on delete cascade,
  product text not null, -- 'club2coach' | 'coach2mentor'
  role text not null, -- 'coach' | 'club' | 'mentor'
  listing_table text not null,
  listing_id uuid not null,
  amount_aud numeric not null,
  status text not null default 'paid', -- kept simple for MVP: rows only exist once marked paid
  marked_by_person_id uuid references people(id),
  notes text,
  created_at timestamptz not null default now(),
  -- Set when this payment came through Stripe Checkout rather than a
  -- manual admin mark-paid — see the Stripe section further down.
  stripe_session_id text unique,
  stripe_payment_intent_id text
);

create index payments_person_idx on payments(person_id);

alter table payments enable row level security;

create policy "owner or admin can view payment"
  on payments for select
  using (
    is_admin_caller()
    or person_id = my_person_id()
  );

-- Payments are only ever written by the mark_*_paid functions below
-- (SECURITY DEFINER, admin-checked) — no direct insert/update policy
-- for regular users, deliberately: nobody should be able to mark
-- their own listing as paid.

-- ---------------------------------------------------------
-- Admin actions: mark a listing as paid (one function per listing
-- type — explicit and easy to read, rather than one dynamic-SQL
-- function reaching into an arbitrary table name).
-- ---------------------------------------------------------
create or replace function mark_club2coach_coach_paid(target_listing_id uuid, amount numeric)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_person_id uuid;
  target_person_id uuid;
begin
  if not is_admin_caller() then
    raise exception 'Admin session required';
  end if;

  select id into admin_person_id from people where user_id = auth.uid();
  select person_id into target_person_id from club2coach_coach_listings where id = target_listing_id;

  update club2coach_coach_listings
  set paid = true, paid_at = now(), price_aud = amount, status = 'active'
  where id = target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id)
  values (target_person_id, 'club2coach', 'coach', 'club2coach_coach_listings', target_listing_id, amount, admin_person_id);
end;
$$;

-- Overload: also sets the number of admin-shared introductions the
-- purchased package includes, for packages priced by introduction
-- count rather than a flat one-off fee.
create or replace function mark_club2coach_coach_paid(target_listing_id uuid, amount numeric, introductions integer)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_person_id uuid;
  target_person_id uuid;
begin
  if not is_admin_caller() then
    raise exception 'Admin session required';
  end if;

  select id into admin_person_id from people where user_id = auth.uid();
  select person_id into target_person_id from club2coach_coach_listings where id = target_listing_id;

  update club2coach_coach_listings
  set paid = true, paid_at = now(), price_aud = amount, status = 'active', included_introductions = introductions
  where id = target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id)
  values (target_person_id, 'club2coach', 'coach', 'club2coach_coach_listings', target_listing_id, amount, admin_person_id);
end;
$$;

create or replace function mark_club2coach_club_paid(target_listing_id uuid, amount numeric)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_person_id uuid;
  target_person_id uuid;
begin
  if not is_admin_caller() then
    raise exception 'Admin session required';
  end if;

  select id into admin_person_id from people where user_id = auth.uid();
  select person_id into target_person_id from club2coach_club_vacancies where id = target_listing_id;

  update club2coach_club_vacancies
  set paid = true, paid_at = now(), price_aud = amount, status = 'active'
  where id = target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id)
  values (target_person_id, 'club2coach', 'club', 'club2coach_club_vacancies', target_listing_id, amount, admin_person_id);
end;
$$;

-- Overload: also sets included_introductions, same idea as the coach
-- listing overload above.
create or replace function mark_club2coach_club_paid(target_listing_id uuid, amount numeric, introductions integer)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_person_id uuid;
  target_person_id uuid;
begin
  if not is_admin_caller() then
    raise exception 'Admin session required';
  end if;

  select id into admin_person_id from people where user_id = auth.uid();
  select person_id into target_person_id from club2coach_club_vacancies where id = target_listing_id;

  update club2coach_club_vacancies
  set paid = true, paid_at = now(), price_aud = amount, status = 'active', included_introductions = introductions
  where id = target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id)
  values (target_person_id, 'club2coach', 'club', 'club2coach_club_vacancies', target_listing_id, amount, admin_person_id);
end;
$$;

-- Gifts a club vacancy — marks it paid at $0 and flags it as a
-- charity/complimentary listing rather than a real payment, e.g. for a
-- community club that can't afford the standard fee.
create or replace function gift_club2coach_vacancy(target_listing_id uuid, introductions integer)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_person_id uuid;
  target_person_id uuid;
begin
  if not is_admin_caller() then
    raise exception 'Admin session required';
  end if;

  select id into admin_person_id from people where user_id = auth.uid();
  select person_id into target_person_id from club2coach_club_vacancies where id = target_listing_id;

  update club2coach_club_vacancies
  set paid = true, paid_at = now(), price_aud = 0, status = 'active', included_introductions = introductions, is_charity = true
  where id = target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
  values (target_person_id, 'club2coach', 'club', 'club2coach_club_vacancies', target_listing_id, 0, admin_person_id, 'Complimentary / charity — gifted, not a real payment');
end;
$$;

-- Confirms a coach's request to buy additional introductions on top of
-- an already-paid Club2Coach coach listing.
create or replace function confirm_club2coach_coach_topup(target_listing_id uuid, amount numeric, additional_introductions integer)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_person_id uuid;
  target_person_id uuid;
begin
  if not is_admin_caller() then
    raise exception 'Admin session required';
  end if;

  select id into admin_person_id from people where user_id = auth.uid();
  select person_id into target_person_id from club2coach_coach_listings where id = target_listing_id;

  update club2coach_coach_listings
  set included_introductions = coalesce(included_introductions, 0) + additional_introductions,
      topup_requested = null,
      status = 'active'
  where id = target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
  values (target_person_id, 'club2coach', 'coach', 'club2coach_coach_listings', target_listing_id, amount, admin_person_id, 'Top-up — additional introductions');
end;
$$;

create or replace function mark_coach2mentor_coach_paid(target_listing_id uuid, amount numeric)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_person_id uuid;
  target_person_id uuid;
begin
  if not is_admin_caller() then
    raise exception 'Admin session required';
  end if;

  select id into admin_person_id from people where user_id = auth.uid();
  select person_id into target_person_id from coach2mentor_coach_listings where id = target_listing_id;

  update coach2mentor_coach_listings
  set paid = true, paid_at = now(), price_aud = amount, status = 'active'
  where id = target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id)
  values (target_person_id, 'coach2mentor', 'coach', 'coach2mentor_coach_listings', target_listing_id, amount, admin_person_id);
end;
$$;

-- Overload: also sets included_introductions.
create or replace function mark_coach2mentor_coach_paid(target_listing_id uuid, amount numeric, introductions integer)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_person_id uuid;
  target_person_id uuid;
begin
  if not is_admin_caller() then
    raise exception 'Admin session required';
  end if;

  select id into admin_person_id from people where user_id = auth.uid();
  select person_id into target_person_id from coach2mentor_coach_listings where id = target_listing_id;

  update coach2mentor_coach_listings
  set paid = true, paid_at = now(), price_aud = amount, status = 'active', included_introductions = introductions
  where id = target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id)
  values (target_person_id, 'coach2mentor', 'coach', 'coach2mentor_coach_listings', target_listing_id, amount, admin_person_id);
end;
$$;

-- Confirms a coach's request to buy additional introductions on top of
-- an already-paid Coach2Mentor coach listing.
create or replace function confirm_coach2mentor_coach_topup(target_listing_id uuid, amount numeric, additional_introductions integer)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_person_id uuid;
  target_person_id uuid;
begin
  if not is_admin_caller() then
    raise exception 'Admin session required';
  end if;

  select id into admin_person_id from people where user_id = auth.uid();
  select person_id into target_person_id from coach2mentor_coach_listings where id = target_listing_id;

  update coach2mentor_coach_listings
  set included_introductions = coalesce(included_introductions, 0) + additional_introductions,
      topup_requested = null,
      status = 'active'
  where id = target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
  values (target_person_id, 'coach2mentor', 'coach', 'coach2mentor_coach_listings', target_listing_id, amount, admin_person_id, 'Top-up — additional introductions');
end;
$$;

create or replace function mark_coach2mentor_mentor_paid(target_listing_id uuid, amount numeric)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_person_id uuid;
  target_person_id uuid;
begin
  if not is_admin_caller() then
    raise exception 'Admin session required';
  end if;

  select id into admin_person_id from people where user_id = auth.uid();
  select person_id into target_person_id from coach2mentor_mentor_listings where id = target_listing_id;

  update coach2mentor_mentor_listings
  set paid = true, paid_at = now(), status = 'active'
  where id = target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id)
  values (target_person_id, 'coach2mentor', 'mentor', 'coach2mentor_mentor_listings', target_listing_id, amount, admin_person_id);
end;
$$;

-- Overload: also sets max_mentees, for mentor packages priced by
-- mentee capacity rather than a flat one-off fee.
create or replace function mark_coach2mentor_mentor_paid(target_listing_id uuid, amount numeric, capacity integer)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_person_id uuid;
  target_person_id uuid;
begin
  if not is_admin_caller() then
    raise exception 'Admin session required';
  end if;

  select id into admin_person_id from people where user_id = auth.uid();
  select person_id into target_person_id from coach2mentor_mentor_listings where id = target_listing_id;

  update coach2mentor_mentor_listings
  set paid = true, paid_at = now(), price_aud = amount, status = 'active', max_mentees = capacity
  where id = target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id)
  values (target_person_id, 'coach2mentor', 'mentor', 'coach2mentor_mentor_listings', target_listing_id, amount, admin_person_id);
end;
$$;

-- ---------------------------------------------------------
-- COACH CREDIT REQUESTS — a person buying introductions across BOTH
-- products in one combined purchase (e.g. "10 credits, some for
-- Club2Coach, some for Coach2Mentor") asks for a split here; the admin
-- reviews and confirms it via confirm_coach_credit_split(), which
-- allocates the amount pro-rata across both listings.
-- ---------------------------------------------------------
create table coach_credit_requests (
  id uuid primary key default uuid_generate_v4(),
  person_id uuid not null references people(id) on delete cascade,
  total_package integer not null,
  club2coach_count integer not null default 0,
  coach2mentor_count integer not null default 0,
  status text not null default 'pending', -- pending | confirmed
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table coach_credit_requests enable row level security;

create policy "owner or admin can view credit request"
  on coach_credit_requests for select
  using (
    is_admin_caller()
    or person_id = my_person_id()
  );

create policy "owner can create their own credit request"
  on coach_credit_requests for insert
  with check (person_id = my_person_id());

create or replace function confirm_coach_credit_split(request_id uuid, amount numeric)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_person_id uuid;
  req record;
  club_amount numeric := 0;
  mentor_amount numeric := 0;
  total_count integer;
begin
  if not is_admin_caller() then
    raise exception 'Admin session required';
  end if;

  select id into admin_person_id from people where user_id = auth.uid();
  select * into req from coach_credit_requests where id = request_id and status = 'pending';

  if req is null then
    raise exception 'Request not found or already processed';
  end if;

  total_count := req.club2coach_count + req.coach2mentor_count;
  if total_count = 0 then
    raise exception 'Split must allocate at least one introduction';
  end if;

  if req.club2coach_count > 0 then
    if not exists (select 1 from club2coach_coach_listings where person_id = req.person_id) then
      raise exception 'This person has no Club2Coach coach listing to apply credits to — they need to create one first';
    end if;

    club_amount := round(amount * req.club2coach_count::numeric / total_count, 2);

    update club2coach_coach_listings
    set included_introductions = coalesce(included_introductions, 0) + req.club2coach_count,
        paid = true, paid_at = now(), status = 'active'
    where person_id = req.person_id;

    insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
    select req.person_id, 'club2coach', 'coach', 'club2coach_coach_listings', id, club_amount, admin_person_id,
      'Part of a combined Club2Coach + Coach2Mentor credit purchase'
    from club2coach_coach_listings where person_id = req.person_id;
  end if;

  if req.coach2mentor_count > 0 then
    if not exists (select 1 from coach2mentor_coach_listings where person_id = req.person_id) then
      raise exception 'This person has no Coach2Mentor coach listing to apply credits to — they need to create one first';
    end if;

    mentor_amount := amount - club_amount;

    update coach2mentor_coach_listings
    set included_introductions = coalesce(included_introductions, 0) + req.coach2mentor_count,
        paid = true, paid_at = now(), status = 'active'
    where person_id = req.person_id;

    insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
    select req.person_id, 'coach2mentor', 'coach', 'coach2mentor_coach_listings', id, mentor_amount, admin_person_id,
      'Part of a combined Club2Coach + Coach2Mentor credit purchase'
    from coach2mentor_coach_listings where person_id = req.person_id;
  end if;

  update coach_credit_requests set status = 'confirmed', confirmed_at = now() where id = request_id;
end;
$$;

-- ---------------------------------------------------------
-- ADMIN SETTINGS — matching weights + salary benchmarks
-- One row per product. Weights are 1-10 sliders, normalised at
-- scoring time in the app (they don't need to sum to 100).
-- ---------------------------------------------------------
create table admin_settings (
  id uuid primary key default uuid_generate_v4(),
  product text not null unique, -- 'club2coach' | 'coach2mentor'
  weights jsonb not null default '{}'::jsonb,
  salary_benchmarks jsonb not null default '{}'::jsonb,
  auto_approve_matches boolean not null default false, -- when false (default), auto-matched suggestions need explicit admin approval before contact details are shared
  updated_at timestamptz not null default now()
);

alter table admin_settings enable row level security;

create policy "anyone authenticated can read admin settings"
  on admin_settings for select
  using (auth.role() = 'authenticated');

create policy "admin can update settings"
  on admin_settings for update
  using (is_admin_caller())
  with check (is_admin_caller());

create policy "admin can insert settings"
  on admin_settings for insert
  with check (is_admin_caller());

-- Seed default weights for each product. Run once after schema setup.
insert into admin_settings (product, weights, salary_benchmarks) values
(
  'club2coach',
  '{"accreditation": 7, "ability": 5, "competition_level": 5, "age_group": 5, "geography": 5, "salary": 7, "gender": 5}'::jsonb,
  '{
    "NPL Victoria": {"min": 25000, "max": 60000},
    "VPL1 & VPL2": {"min": 10000, "max": 35000},
    "NPL/VPL Development (U20-23)": {"min": 5000, "max": 15000},
    "State League 1 & 2": {"min": 6000, "max": 18000},
    "State League 3-7": {"min": 1500, "max": 12000},
    "Metropolitan League": {"min": 1000, "max": 4000},
    "Regional League": {"min": 1000, "max": 4000},
    "Community / Junior": {"min": 0, "max": 2000}
  }'::jsonb
),
(
  'coach2mentor',
  '{"specialism_overlap": 6, "career_stage": 5, "geography": 4, "availability": 5, "budget_fit": 6, "gender": 5}'::jsonb,
  '{}'::jsonb
)
on conflict (product) do nothing;

-- ---------------------------------------------------------
-- ADMIN MASTER STATE — a singleton row recording the last time someone
-- logged in with a master PIN (see the MASTER ADMIN TIER section
-- above), for a simple "last master login" line in the admin UI.
-- Locked down completely, same as admin_pins: no policies, so only
-- SECURITY DEFINER functions can touch it.
-- ---------------------------------------------------------
create table admin_master_state (
  id boolean primary key default true,
  constraint admin_master_state_singleton check (id), -- forces exactly one row, id = true
  last_master_login_at timestamptz,
  last_master_login_label text
);

alter table admin_master_state enable row level security;

insert into admin_master_state (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------
-- PLATFORM SETTINGS — another singleton row, this time for
-- platform-wide feature flags. Currently just the Stripe kill switch:
-- when false, /api/stripe/checkout refuses to create new Checkout
-- Sessions (existing paid listings are unaffected), letting you pause
-- live payment collection without a deploy.
-- ---------------------------------------------------------
create table platform_settings (
  id boolean primary key default true,
  constraint platform_settings_singleton check (id), -- forces exactly one row, id = true
  stripe_payments_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table platform_settings enable row level security;

create policy "anyone authenticated can read platform settings"
  on platform_settings for select
  using (auth.role() = 'authenticated');

create policy "master admin can update platform settings"
  on platform_settings for update
  using (is_master_caller())
  with check (is_master_caller());

insert into platform_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------
-- STRIPE INTEGRATION
-- Live payment collection alongside the manual "mark paid" flow above:
-- /api/stripe/checkout creates a Checkout Session (blocked if
-- platform_settings.stripe_payments_enabled is false) and
-- /api/stripe/webhook verifies Stripe's signature, then calls the
-- relevant mark_*_paid function and records the session/intent ids on
-- the resulting payments row (see the stripe_session_id /
-- stripe_payment_intent_id columns added to payments above).
--
-- stripe_processed_events is the webhook's idempotency guard — Stripe
-- can and does redeliver the same event, so the webhook inserts the
-- event id here FIRST and bails out if that insert hits a duplicate,
-- before doing anything else. No RLS policies: only the webhook
-- route's service-role key ever touches this table.
-- ---------------------------------------------------------
create table stripe_processed_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

alter table stripe_processed_events enable row level security;

-- ---------------------------------------------------------
-- SUPPORT QUERIES — a simple "contact us" / help-request inbox.
-- Anyone (logged in or not — person_id is nullable) can submit one;
-- only admin can see and triage the queue.
-- ---------------------------------------------------------
create table support_queries (
  id uuid primary key default uuid_generate_v4(),
  person_id uuid references people(id) on delete set null,
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'open', -- open | resolved
  admin_notes text,
  created_at timestamptz not null default now()
);

alter table support_queries enable row level security;

create policy "logged in user can submit a support query"
  on support_queries for insert
  with check (
    auth.role() = 'authenticated'
    and (person_id is null or person_id = my_person_id())
  );

create policy "owner or admin can view support query"
  on support_queries for select
  using (
    is_admin_caller()
    or person_id = my_person_id()
  );

create policy "admin can update support query"
  on support_queries for update
  using (is_admin_caller())
  with check (is_admin_caller());

-- ---------------------------------------------------------
-- MISC HELPERS
-- ---------------------------------------------------------

-- Used at signup to stop someone registering a second account against
-- a mobile number already in use (excluding their own current row,
-- for the "editing my own profile" case).
create or replace function is_mobile_registered(check_mobile text, exclude_person_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from people
    where lower(trim(mobile)) = lower(trim(check_mobile))
      and (exclude_person_id is null or id != exclude_person_id)
  );
$$;

-- How many open (not filled/expired) vacancies a given club currently
-- has, via the clubs directory link (club2coach_club_vacancies.club_id).
create or replace function get_c2c_open_vacancy_count(target_club_id uuid)
returns integer
language sql
security definer
set search_path = public
set row_security = off
as $$
  select count(*)::integer from club2coach_club_vacancies
  where club_id = target_club_id and status not in ('filled', 'expired');
$$;
