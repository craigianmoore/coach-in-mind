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

-- Permanently deletes a person's shared identity record — cascades to
-- every listing/vacancy they hold on either product (club2coach_*,
-- coach2mentor_*), their shares/requests, and any coach_credit_requests
-- (all FK'd "on delete cascade"); support_queries are kept but their
-- person_id is nulled out. Their auth.users login is untouched — this
-- only removes the `people` profile row, not the ability to sign in —
-- so if they ever log back in, RequireProfile sends them to /profile
-- to start a fresh one, same as any brand-new signup.
--
-- Refuses outright if the person has ANY payments ledger row AS THE
-- PAYER (payments.person_id, which cascades on delete same as
-- everything else) — letting that happen would silently erase real
-- payment history, which every other delete path in this app
-- (soft-delete-first for listings) is deliberately built to avoid.
-- Use the Listings tab's own delete controls for a person who has
-- ever actually paid; this function is for cleaning up bare/junk
-- signups and unpaid listings only.
--
-- A person can also show up as marked_by_person_id on OTHER people's
-- payments (they were the admin who clicked "mark as paid" on that
-- listing) — that column has no cascade, so it would otherwise block
-- the delete with a raw FK error despite carrying no financial
-- record of its own. Cleared to null instead: the payment row, its
-- amount, and its person_id (the actual payer) are untouched: this
-- only loses the "who processed it" attribution for that one row.
--
-- Master-only, like the other irreversible/platform-wide admin
-- actions (admin PIN management, the Stripe payments switch).
create or replace function admin_delete_person(target_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  has_payment_history boolean;
begin
  if not is_master_caller() then
    raise exception 'Only a master PIN can delete a person.';
  end if;

  select exists(
    select 1 from payments where person_id = target_person_id
  ) into has_payment_history;

  if has_payment_history then
    raise exception 'Cannot delete: this person has payment history. Delete their paid listing(s) individually instead - that keeps the payments ledger intact.';
  end if;

  update payments set marked_by_person_id = null where marked_by_person_id = target_person_id;

  delete from people where id = target_person_id;
end;
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
  agreed_to_terms boolean not null default false,
  -- Refund-window reminder tracking (Terms of Service §5): if no
  -- introduction (an approved club2coach_shares row) has been made
  -- within 4 months of paid_at, the coach is entitled to a refund.
  -- Set once each reminder has actually been sent, so the daily cron
  -- job never re-sends the same reminder.
  refund_reminder_sent_at timestamptz, -- "coming up in 2 weeks" admin reminder
  refund_window_notified_at timestamptz, -- "4 months reached" admin reminder
  refunded_at timestamptz -- set by the Stripe webhook (charge.refunded) or an admin action; status flips to 'refunded' at the same time
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

-- Permanent (hard) delete is admin-only — the owner-facing "delete"
-- action only ever soft-deletes via deleted_at above. This is for the
-- admin's own "permanently delete" action on an already soft-deleted
-- entry.
create policy "admin can permanently delete coach listing"
  on club2coach_coach_listings for delete
  using (is_admin_caller());

-- ---------------------------------------------------------
-- CLUBS — a lightweight directory of clubs, linked from vacancies so
-- the same club's open-vacancy count can be queried without scanning
-- free-text club_name values. club_name on the vacancy itself stays
-- authoritative for display; club_id is an optional link on top of it.
-- ---------------------------------------------------------
create table clubs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now(),
  state text not null default 'VIC',
  unique (name, state)
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
  agreed_to_terms boolean not null default false,
  -- Refund-window reminder tracking — see the matching columns on
  -- club2coach_coach_listings above.
  refund_reminder_sent_at timestamptz,
  refund_window_notified_at timestamptz,
  refunded_at timestamptz,
  -- Admin-only override of the global Club2Coach matching weights, scoped to
  -- this single vacancy row. Null = use the global default from
  -- admin_settings. Never exposed in club-facing UI.
  personal_weights jsonb,
  -- Set on the OLD row when a club reposts it with edits (status flips to
  -- 'superseded' at the same time) — points at the new row that replaced
  -- it, so the two never compete for the same coaches but the history
  -- stays linked rather than disappearing.
  superseded_by uuid references club2coach_club_vacancies(id)
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

create policy "admin can permanently delete vacancy"
  on club2coach_club_vacancies for delete
  using (is_admin_caller());

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
  -- Set by the club once an approved introduction has run its course:
  -- 'pending' (default) | 'filled' | 'not_filled'. The admin UI and the
  -- auto-match sweep both skip a vacancy with any approved share still
  -- 'pending' — every match is paid for regardless of outcome, but the
  -- club must say what happened with the last one before another is
  -- offered.
  outcome text not null default 'pending',
  unique (coach_listing_id, club_vacancy_id)
);
alter table club2coach_shares add constraint club2coach_shares_outcome_check
  check (outcome in ('pending', 'filled', 'not_filled'));

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

-- Lets the club record the outcome of their own approved introduction
-- (filled / not filled) — the only field this policy is meant to let
-- the club change; like other owner-update policies in this schema, it
-- doesn't column-restrict, so protection of the rest of the row relies
-- on the client (the club page) only ever sending { outcome }.
create policy club_record_share_outcome
  on club2coach_shares for update
  using (
    status = 'approved'
    and exists (
      select 1 from club2coach_club_vacancies cv
      where cv.id = club_vacancy_id and cv.person_id = my_person_id()
    )
  )
  with check (
    status = 'approved'
    and exists (
      select 1 from club2coach_club_vacancies cv
      where cv.id = club_vacancy_id and cv.person_id = my_person_id()
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
  agreed_to_terms boolean not null default false,
  -- Refund-window reminder tracking — see the matching columns on
  -- club2coach_coach_listings above.
  refund_reminder_sent_at timestamptz,
  refund_window_notified_at timestamptz,
  refunded_at timestamptz
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

create policy "admin can permanently delete coach2mentor coach listing"
  on coach2mentor_coach_listings for delete
  using (is_admin_caller());

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
  agreed_to_terms boolean not null default false,
  -- Evidence of the claimed licence (a photo or PDF of the certificate),
  -- required before an admin will mark the listing paid/active. The file
  -- itself lives in the private `mentor-evidence` storage bucket, at
  -- `{person_id}/{listing_id}-{original filename}` — not automatically
  -- verified, an admin opens it via a signed URL and eyeballs it against
  -- the claimed `licence` before approving.
  accreditation_evidence_path text,
  accreditation_evidence_filename text,
  accreditation_evidence_uploaded_at timestamptz,
  refunded_at timestamptz -- set by the Stripe webhook (charge.refunded) or an admin action; status flips to 'refunded' at the same time
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

create policy "admin can permanently delete mentor listing"
  on coach2mentor_mentor_listings for delete
  using (is_admin_caller());

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
  stripe_payment_intent_id text,
  -- Set when Stripe reports this charge refunded (charge.refunded webhook
  -- event). status flips to 'refunded' at the same time, and the same
  -- timestamp is mirrored onto the listing row so admin views and the
  -- refund-reminder cron both pick it up without a join.
  refunded_at timestamptz
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

-- How many open (not filled/expired/superseded) vacancies a given club
-- currently has, via the clubs directory link
-- (club2coach_club_vacancies.club_id). A superseded vacancy is a retired
-- prior version of a reposted role — the new row is what's actually open.
create or replace function get_c2c_open_vacancy_count(target_club_id uuid)
returns integer
language sql
security definer
set search_path = public
set row_security = off
as $$
  select count(*)::integer from club2coach_club_vacancies
  where club_id = target_club_id and status not in ('filled', 'expired', 'superseded');
$$;

-- ---------------------------------------------------------
-- STORAGE: mentor accreditation evidence
-- ---------------------------------------------------------
-- Private bucket (not public) holding the photo/PDF a Coach2Mentor
-- mentor uploads as evidence of their claimed licence. An admin views
-- these via a signed URL from the admin page before marking a mentor
-- listing paid/active — see coach2mentor_mentor_listings.
-- accreditation_evidence_path above.
insert into storage.buckets (id, name, public)
values ('mentor-evidence', 'mentor-evidence', false)
on conflict (id) do nothing;

create policy "mentor evidence: owner can upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'mentor-evidence'
    and (storage.foldername(name))[1] = my_person_id()::text
  );

create policy "mentor evidence: owner or admin can view"
  on storage.objects for select
  using (
    bucket_id = 'mentor-evidence'
    and (
      is_admin_caller()
      or (storage.foldername(name))[1] = my_person_id()::text
    )
  );

create policy "mentor evidence: owner can replace own"
  on storage.objects for update
  using (
    bucket_id = 'mentor-evidence'
    and (storage.foldername(name))[1] = my_person_id()::text
  );

create policy "mentor evidence: owner or admin can delete"
  on storage.objects for delete
  using (
    bucket_id = 'mentor-evidence'
    and (
      is_admin_caller()
      or (storage.foldername(name))[1] = my_person_id()::text
    )
  );

-- ---------------------------------------------------------
-- CLUB CONTACTS: admin-only outreach emails per club (kept out of `clubs`
-- so ordinary authenticated users can't read them).
-- ---------------------------------------------------------
create table if not exists club_contacts (club_id uuid primary key references clubs(id) on delete cascade, email text not null, source text, confidence text, created_at timestamptz not null default now());
alter table club_contacts enable row level security;
drop policy if exists "admin can view club contacts" on club_contacts;
create policy "admin can view club contacts" on club_contacts for select using (is_admin_caller());
drop policy if exists "admin can manage club contacts" on club_contacts;
create policy "admin can manage club contacts" on club_contacts for all using (is_admin_caller()) with check (is_admin_caller());

-- Outreach tracking on club_contacts: when an admin last marked the club
-- as contacted, and a permanent opt-out flag.
alter table club_contacts add column if not exists contacted_at timestamptz, add column if not exists do_not_contact boolean not null default false;

-- ---------------------------------------------------------
-- FIRST-INTRODUCTION-FREE + COACH REFERRALS
-- ---------------------------------------------------------
-- Normalisers used as claim keys, so cosmetic variations of the same
-- identity (gmail dots / +tags, "61" vs "0" mobiles, "FC" vs "SC" club
-- names) can't be used to claim a second free introduction.
create or replace function norm_email(e text) returns text language sql immutable as $$
  select case
    when split_part(lower(trim(e)), '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(trim(e)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else split_part(split_part(lower(trim(e)), '@', 1), '+', 1) || '@' || split_part(lower(trim(e)), '@', 2)
  end;
$$;

create or replace function norm_mobile(m text) returns text language sql immutable as $$
  select regexp_replace(regexp_replace(coalesce(m, ''), '\D', '', 'g'), '^61', '0');
$$;

create or replace function norm_club_name(n text) returns text language sql immutable as $$
  select trim(regexp_replace(regexp_replace(regexp_replace(lower(replace(coalesce(n, ''), '&', ' and ')), '[^a-z0-9 ]', ' ', 'g'), '\m(fc|sc|jfc|jsc|afc|football|soccer|club|inc|the)\M', '', 'g'), '\s+', ' ', 'g'));
$$;

create table if not exists free_first_claims (
  key text primary key,
  person_id uuid,
  listing_table text not null,
  listing_id uuid not null,
  claimed_at timestamptz not null default now()
);
alter table free_first_claims enable row level security;
create policy "admin can view free first claims" on free_first_claims for select using (is_admin_caller());

-- Grants (or, with dry_run, just checks) the one free introduction for a
-- club (keyed by club) or a coach (keyed by email AND mobile, shared
-- across Club2Coach and Coach2Mentor). Automatic — no admin step.
create or replace function claim_free_first_credit(target_table text, target_listing_id uuid, dry_run boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare
  me uuid := my_person_id();
  p people%rowtype;
  v club2coach_club_vacancies%rowtype;
  l_person uuid; l_paid boolean; l_deleted timestamptz; l_status text;
  keys text[]; prod text; rl text;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select * into p from people where id = me;

  if target_table = 'club2coach_club_vacancies' then
    select * into v from club2coach_club_vacancies where id = target_listing_id for update;
    if not found or v.person_id <> me then raise exception 'Not your listing'; end if;
    if v.paid or v.deleted_at is not null or v.status in ('filled', 'expired', 'superseded', 'refunded') then
      return jsonb_build_object('granted', false, 'reason', 'not_eligible');
    end if;
    keys := array['club:' || coalesce(v.club_id::text, 'n:' || norm_club_name(v.club_name))];
    prod := 'club2coach'; rl := 'club';
  elsif target_table in ('club2coach_coach_listings', 'coach2mentor_coach_listings') then
    execute format('select person_id, paid, deleted_at, status from %I where id = $1 for update', target_table)
      into l_person, l_paid, l_deleted, l_status using target_listing_id;
    if l_person is null or l_person <> me then raise exception 'Not your listing'; end if;
    if l_paid or l_deleted is not null or l_status in ('placed', 'refunded') then
      return jsonb_build_object('granted', false, 'reason', 'not_eligible');
    end if;
    keys := array['coach-email:' || norm_email(p.email)];
    if norm_mobile(p.mobile) <> '' then keys := keys || ('coach-mobile:' || norm_mobile(p.mobile)); end if;
    prod := case when target_table = 'club2coach_coach_listings' then 'club2coach' else 'coach2mentor' end;
    rl := 'coach';
  else
    raise exception 'Free first introduction does not apply to this listing type';
  end if;

  if exists (select 1 from free_first_claims where key = any(keys)) then
    return jsonb_build_object('granted', false, 'reason', 'already_used');
  end if;
  if dry_run then return jsonb_build_object('granted', false, 'eligible', true); end if;

  begin
    insert into free_first_claims (key, person_id, listing_table, listing_id)
    select k, me, target_table, target_listing_id from unnest(keys) as k;
  exception when unique_violation then
    return jsonb_build_object('granted', false, 'reason', 'already_used');
  end;

  execute format(
    'update %I set paid = true, paid_at = now(), price_aud = 0, status = ''active'', included_introductions = 1 where id = $1',
    target_table) using target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, notes)
  values (me, prod, rl, target_table, target_listing_id, 0, 'Free first introduction (automatic)');

  return jsonb_build_object('granted', true);
end;
$$;

-- Referrals ------------------------------------------------
create table if not exists referral_codes (
  person_id uuid primary key references people(id) on delete cascade,
  code text not null unique
);
create table if not exists referrals (
  referee_person_id uuid primary key references people(id) on delete cascade,
  referrer_person_id uuid not null references people(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists referral_rewards (
  id uuid primary key default uuid_generate_v4(),
  referrer_person_id uuid not null references people(id) on delete cascade,
  referee_person_id uuid not null unique references people(id) on delete cascade,
  credits integer not null,
  status text not null, -- pending (waiting for a paid coach listing to credit) | granted | capped (referrer already at 3) | rejected (same person)
  reason text,
  applied_table text,
  applied_listing_id uuid,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);
alter table referral_codes enable row level security;
alter table referrals enable row level security;
alter table referral_rewards enable row level security;
create policy "own or admin can view referral code" on referral_codes for select using (person_id = my_person_id() or is_admin_caller());
create policy "referrer or admin can view referrals" on referrals for select using (referrer_person_id = my_person_id() or is_admin_caller());
create policy "referrer or admin can view referral rewards" on referral_rewards for select using (referrer_person_id = my_person_id() or is_admin_caller());

create or replace function get_my_referral_code() returns text language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare me uuid := my_person_id(); c text; tries int := 0;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select code into c from referral_codes where person_id = me;
  if c is not null then return c; end if;
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 7));
    begin
      insert into referral_codes (person_id, code) values (me, c);
      return c;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 10 then raise; end if;
    end;
  end loop;
end;
$$;

-- Called once by a new person (within 14 days of signing up, before they
-- have paid anything) to record who referred them.
create or replace function apply_referral_code(input_code text) returns text language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare me uuid := my_person_id(); referrer uuid; me_created timestamptz;
begin
  if me is null then return 'not_signed_in'; end if;
  if exists (select 1 from referrals where referee_person_id = me) then return 'already_applied'; end if;
  select person_id into referrer from referral_codes where code = upper(trim(input_code));
  if referrer is null then return 'invalid_code'; end if;
  if referrer = me then return 'invalid_code'; end if;
  select created_at into me_created from people where id = me;
  if me_created < now() - interval '14 days' then return 'too_late'; end if;
  if exists (select 1 from payments where person_id = me and amount_aud > 0) then return 'too_late'; end if;
  insert into referrals (referee_person_id, referrer_person_id) values (me, referrer);
  return 'ok';
end;
$$;

-- Credits any pending rewards onto the referrer's paid coach listing
-- (Club2Coach first, else Coach2Mentor).
create or replace function apply_pending_referral_rewards(target_referrer uuid) returns void language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare r record; lid uuid; tbl text;
begin
  for r in select * from referral_rewards where referrer_person_id = target_referrer and status = 'pending' order by created_at loop
    lid := null;
    select id into lid from club2coach_coach_listings where person_id = target_referrer and paid and deleted_at is null and refunded_at is null order by paid_at limit 1;
    tbl := 'club2coach_coach_listings';
    if lid is null then
      select id into lid from coach2mentor_coach_listings where person_id = target_referrer and paid and deleted_at is null and refunded_at is null order by paid_at limit 1;
      tbl := 'coach2mentor_coach_listings';
    end if;
    if lid is null then exit; end if;
    execute format('update %I set included_introductions = coalesce(included_introductions, 0) + $1 where id = $2', tbl) using r.credits, lid;
    update referral_rewards set status = 'granted', applied_table = tbl, applied_listing_id = lid, applied_at = now() where id = r.id;
  end loop;
end;
$$;

-- Fires on EVERY payment row (admin mark-paid, Stripe webhook, top-ups).
-- A reward is created only on the referee's first payment above $0 as a
-- coach or club (so the free introduction and gifts never count):
-- 1 credit for a coach, 2 for a club, max 3 rewards per referrer.
create or replace function referral_reward_on_payment() returns trigger language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare ref referrals%rowtype; rr people%rowtype; re people%rowtype; n int; cr int;
begin
  if new.amount_aud is null or new.amount_aud <= 0 or new.role not in ('coach', 'club') then return new; end if;
  if exists (select 1 from payments where person_id = new.person_id and amount_aud > 0 and id <> new.id) then return new; end if;
  select * into ref from referrals where referee_person_id = new.person_id;
  if not found then return new; end if;
  if exists (select 1 from referral_rewards where referee_person_id = new.person_id) then return new; end if;
  select * into rr from people where id = ref.referrer_person_id;
  select * into re from people where id = new.person_id;
  cr := case when new.role = 'club' then 2 else 1 end;
  if norm_email(rr.email) = norm_email(re.email) or (norm_mobile(rr.mobile) <> '' and norm_mobile(rr.mobile) = norm_mobile(re.mobile)) then
    insert into referral_rewards (referrer_person_id, referee_person_id, credits, status, reason) values (ref.referrer_person_id, new.person_id, cr, 'rejected', 'Same email or mobile as referrer');
    return new;
  end if;
  select count(*) into n from referral_rewards where referrer_person_id = ref.referrer_person_id and status in ('pending', 'granted');
  if n >= 3 then
    insert into referral_rewards (referrer_person_id, referee_person_id, credits, status, reason) values (ref.referrer_person_id, new.person_id, cr, 'capped', 'Referrer already has 3 rewards');
    return new;
  end if;
  insert into referral_rewards (referrer_person_id, referee_person_id, credits, status) values (ref.referrer_person_id, new.person_id, cr, 'pending');
  perform apply_pending_referral_rewards(ref.referrer_person_id);
  return new;
end;
$$;
drop trigger if exists referral_reward_on_payment_trg on payments;
create trigger referral_reward_on_payment_trg after insert on payments for each row execute function referral_reward_on_payment();

-- When a referrer's coach listing becomes paid (incl. via the free
-- introduction), credit any rewards that were waiting for it.
create or replace function referral_apply_on_listing_paid() returns trigger language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  if new.paid and not old.paid then perform apply_pending_referral_rewards(new.person_id); end if;
  return new;
end;
$$;
drop trigger if exists c2c_coach_referral_apply on club2coach_coach_listings;
create trigger c2c_coach_referral_apply after update of paid on club2coach_coach_listings for each row execute function referral_apply_on_listing_paid();
drop trigger if exists c2m_coach_referral_apply on coach2mentor_coach_listings;
create trigger c2m_coach_referral_apply after update of paid on coach2mentor_coach_listings for each row execute function referral_apply_on_listing_paid();

-- Same club name allowed in different states (unique per name+state).
alter table clubs drop constraint if exists clubs_name_key;
alter table clubs drop constraint if exists clubs_name_state_key;
alter table clubs add constraint clubs_name_state_key unique (name, state);

-- Gifts free introductions to a Club2Coach coach listing or club vacancy.
-- Unpaid listings are activated at $0; already-paid ones get extra
-- introductions added. Recorded in payments at $0 for the audit trail.
create or replace function gift_club2coach_introductions(listing_table text, target_listing_id uuid, extra integer)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_person_id uuid;
  target_person_id uuid;
  listing_role text;
begin
  if not is_admin_caller() then
    raise exception 'Admin session required';
  end if;
  if extra is null or extra < 1 or extra > 3 then
    raise exception 'Gift between 1 and 3 introductions';
  end if;

  select id into admin_person_id from people where user_id = auth.uid();

  if listing_table = 'club2coach_coach_listings' then
    listing_role := 'coach';
    select person_id into target_person_id from club2coach_coach_listings where id = target_listing_id;
    update club2coach_coach_listings
    set included_introductions = case when paid then coalesce(included_introductions, 0) + extra else extra end,
        paid_at = coalesce(paid_at, now()),
        price_aud = coalesce(price_aud, 0),
        paid = true,
        status = 'active'
    where id = target_listing_id;
  elsif listing_table = 'club2coach_club_vacancies' then
    listing_role := 'club';
    select person_id into target_person_id from club2coach_club_vacancies where id = target_listing_id;
    update club2coach_club_vacancies
    set included_introductions = case when paid then coalesce(included_introductions, 0) + extra else extra end,
        paid_at = coalesce(paid_at, now()),
        price_aud = coalesce(price_aud, 0),
        paid = true,
        status = 'active',
        is_charity = is_charity or not paid
    where id = target_listing_id;
  else
    raise exception 'Unknown listing table';
  end if;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
  values (target_person_id, 'club2coach', listing_role, listing_table, target_listing_id, 0, admin_person_id,
          'Complimentary — gifted ' || extra || ' introduction(s), not a real payment');
end;
$$;

-- Match emails: stamped once both parties have been emailed about an
-- approved introduction, so nobody is ever emailed twice. Existing
-- approved shares are marked as already notified (no back-emailing).
alter table club2coach_shares add column if not exists participants_notified_at timestamptz;
update club2coach_shares set participants_notified_at = now() where status = 'approved' and participants_notified_at is null;

-- Returns the other party's contact details for each APPROVED introduction
-- on a listing the caller owns. Never returns anything for suggested
-- (unapproved) matches, or for listings that aren't the caller's.
create or replace function get_my_c2c_introductions(listing_table text, target_listing_id uuid)
returns table (share_id uuid, shared_at timestamptz, summary text, contact_name text, contact_email text, contact_mobile text)
language plpgsql
security definer
set search_path = public, extensions
set row_security = off
as $$
declare
  me uuid := my_person_id();
begin
  if me is null then
    return;
  end if;

  if listing_table = 'club2coach_coach_listings' then
    return query
      select s.id, s.shared_at,
             (cv.club_name || ' — ' || cv.role_being_recruited || ' (' || cv.competition_level || ')')::text,
             p.full_name::text, p.email::text, p.mobile::text
      from club2coach_shares s
      join club2coach_coach_listings cl on cl.id = s.coach_listing_id
      join club2coach_club_vacancies cv on cv.id = s.club_vacancy_id
      join people p on p.id = cv.person_id
      where s.status = 'approved' and cl.id = target_listing_id and cl.person_id = me
      order by s.shared_at desc;
  elsif listing_table = 'club2coach_club_vacancies' then
    return query
      select s.id, s.shared_at,
             ('Coach seeking ' || cl.role_sought)::text,
             p.full_name::text, p.email::text, p.mobile::text
      from club2coach_shares s
      join club2coach_club_vacancies cv on cv.id = s.club_vacancy_id
      join club2coach_coach_listings cl on cl.id = s.coach_listing_id
      join people p on p.id = cl.person_id
      where s.status = 'approved' and cv.id = target_listing_id and cv.person_id = me
      order by s.shared_at desc;
  end if;
end;
$$;
grant execute on function get_my_c2c_introductions(text, uuid) to authenticated;

-- Let admins delete a club from the directory (blocked by foreign keys
-- if any vacancy still points at it; its club_contacts row cascades).
drop policy if exists "admin can delete clubs" on clubs;
create policy "admin can delete clubs" on clubs for delete using (is_admin_caller());

-- Coach2Mentor "matched" emails: stamped once each so nobody is emailed twice.
alter table coach2mentor_requests add column if not exists pending_notified_at timestamptz;
alter table coach2mentor_requests add column if not exists accepted_notified_at timestamptz;
-- Don't email about requests that already existed before this feature.
update coach2mentor_requests set pending_notified_at = now() where status <> 'suggested' and pending_notified_at is null;
update coach2mentor_requests set accepted_notified_at = now() where status = 'accepted' and accepted_notified_at is null;

-- ── Postcodes (to see "hot" areas) and the Founding Member offer ──────
alter table people add column if not exists postcode text;
alter table club2coach_club_vacancies add column if not exists postcode text;

alter table platform_settings add column if not exists founding_enabled boolean not null default true;
alter table platform_settings add column if not exists founding_coach_limit integer not null default 60;
alter table club2coach_coach_listings add column if not exists founding_member boolean not null default false;

-- Public counter for the sign-up banner (numbers only).
create or replace function founding_status()
returns table(enabled boolean, lim integer, used integer)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce((select founding_enabled from platform_settings limit 1), true),
         coalesce((select founding_coach_limit from platform_settings limit 1), 60),
         (select count(*)::int from club2coach_coach_listings where founding_member);
$$;
grant execute on function founding_status() to anon, authenticated;

-- A coach claims their one free founding introduction on their own,
-- unpaid listing. Returns true if it was granted. Safe to call repeatedly.
create or replace function claim_founding_introduction(target_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
set row_security = off
as $$
declare
  me uuid := my_person_id();
  l club2coach_coach_listings%rowtype;
  s record;
begin
  if me is null then return false; end if;
  perform pg_advisory_xact_lock(60060);
  select * into l from club2coach_coach_listings where id = target_listing_id and person_id = me and deleted_at is null;
  if not found or l.paid or l.founding_member then return false; end if;
  if exists (select 1 from club2coach_coach_listings where person_id = me and founding_member) then return false; end if;
  select * into s from founding_status();
  if not s.enabled or s.used >= s.lim then return false; end if;

  update club2coach_coach_listings
  set included_introductions = 1, paid = true, paid_at = now(), price_aud = 0,
      status = 'active', founding_member = true
  where id = target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
  values (me, 'club2coach', 'coach', 'club2coach_coach_listings', target_listing_id, 0, me,
          'Founding member — free introduction, not a real payment');
  return true;
end;
$$;
grant execute on function claim_founding_introduction(uuid) to authenticated;

-- Referrals: a club can only ever earn a referral reward ONCE, no matter
-- how many people at that club sign up or who referred them.
alter table referral_rewards add column if not exists referee_club_id uuid;

create or replace function referral_reward_on_payment() returns trigger language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare ref referrals%rowtype; rr people%rowtype; re people%rowtype; n int; cr int; cid uuid;
begin
  if new.amount_aud is null or new.amount_aud <= 0 or new.role not in ('coach', 'club') then return new; end if;
  if exists (select 1 from payments where person_id = new.person_id and amount_aud > 0 and id <> new.id) then return new; end if;
  select * into ref from referrals where referee_person_id = new.person_id;
  if not found then return new; end if;
  if exists (select 1 from referral_rewards where referee_person_id = new.person_id) then return new; end if;
  select * into rr from people where id = ref.referrer_person_id;
  select * into re from people where id = new.person_id;
  cr := case when new.role = 'club' then 2 else 1 end;
  if new.role = 'club' and new.listing_table = 'club2coach_club_vacancies' then
    select club_id into cid from club2coach_club_vacancies where id = new.listing_id;
  end if;
  if norm_email(rr.email) = norm_email(re.email) or (norm_mobile(rr.mobile) <> '' and norm_mobile(rr.mobile) = norm_mobile(re.mobile)) then
    insert into referral_rewards (referrer_person_id, referee_person_id, credits, status, reason, referee_club_id) values (ref.referrer_person_id, new.person_id, cr, 'rejected', 'Same email or mobile as referrer', cid);
    return new;
  end if;
  if cid is not null and exists (select 1 from referral_rewards where referee_club_id = cid and status in ('pending', 'granted')) then
    insert into referral_rewards (referrer_person_id, referee_person_id, credits, status, reason, referee_club_id) values (ref.referrer_person_id, new.person_id, cr, 'rejected', 'This club has already earned a referral reward', cid);
    return new;
  end if;
  select coalesce(sum(credits), 0) into n from referral_rewards where referrer_person_id = ref.referrer_person_id and status in ('pending', 'granted');
  if n + cr > 6 then
    insert into referral_rewards (referrer_person_id, referee_person_id, credits, status, reason, referee_club_id) values (ref.referrer_person_id, new.person_id, cr, 'capped', 'Referrer already at the 6-credit referral maximum', cid);
    return new;
  end if;
  insert into referral_rewards (referrer_person_id, referee_person_id, credits, status, referee_club_id) values (ref.referrer_person_id, new.person_id, cr, 'pending', cid);
  perform apply_pending_referral_rewards(ref.referrer_person_id);
  return new;
end;
$$;

-- Referral credits only go to a referrer who has a paid listing at the time
-- of the referee's payment; otherwise no credit is given (nothing waits).
create or replace function referral_reward_on_payment() returns trigger language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare ref referrals%rowtype; rr people%rowtype; re people%rowtype; n int; cr int; cid uuid;
begin
  if new.amount_aud is null or new.amount_aud <= 0 or new.role not in ('coach', 'club') then return new; end if;
  if exists (select 1 from payments where person_id = new.person_id and amount_aud > 0 and id <> new.id) then return new; end if;
  select * into ref from referrals where referee_person_id = new.person_id;
  if not found then return new; end if;
  if exists (select 1 from referral_rewards where referee_person_id = new.person_id) then return new; end if;
  select * into rr from people where id = ref.referrer_person_id;
  select * into re from people where id = new.person_id;
  cr := case when new.role = 'club' then 2 else 1 end;
  if new.role = 'club' and new.listing_table = 'club2coach_club_vacancies' then
    select club_id into cid from club2coach_club_vacancies where id = new.listing_id;
  end if;
  if norm_email(rr.email) = norm_email(re.email) or (norm_mobile(rr.mobile) <> '' and norm_mobile(rr.mobile) = norm_mobile(re.mobile)) then
    insert into referral_rewards (referrer_person_id, referee_person_id, credits, status, reason, referee_club_id) values (ref.referrer_person_id, new.person_id, cr, 'rejected', 'Same email or mobile as referrer', cid);
    return new;
  end if;
  if cid is not null and exists (select 1 from referral_rewards where referee_club_id = cid and status in ('pending', 'granted')) then
    insert into referral_rewards (referrer_person_id, referee_person_id, credits, status, reason, referee_club_id) values (ref.referrer_person_id, new.person_id, cr, 'rejected', 'This club has already earned a referral reward', cid);
    return new;
  end if;
  if not exists (select 1 from club2coach_coach_listings where person_id = ref.referrer_person_id and paid and deleted_at is null and refunded_at is null)
     and not exists (select 1 from coach2mentor_coach_listings where person_id = ref.referrer_person_id and paid and deleted_at is null and refunded_at is null) then
    insert into referral_rewards (referrer_person_id, referee_person_id, credits, status, reason, referee_club_id) values (ref.referrer_person_id, new.person_id, cr, 'rejected', 'Referrer has no paid listing to credit', cid);
    return new;
  end if;
  select coalesce(sum(credits), 0) into n from referral_rewards where referrer_person_id = ref.referrer_person_id and status in ('pending', 'granted');
  if n + cr > 6 then
    insert into referral_rewards (referrer_person_id, referee_person_id, credits, status, reason, referee_club_id) values (ref.referrer_person_id, new.person_id, cr, 'capped', 'Referrer already at the 6-credit referral maximum', cid);
    return new;
  end if;
  insert into referral_rewards (referrer_person_id, referee_person_id, credits, status, referee_club_id) values (ref.referrer_person_id, new.person_id, cr, 'pending', cid);
  perform apply_pending_referral_rewards(ref.referrer_person_id);
  return new;
end;
$$;


-- ── Founding offer v2: coaches only, explicit Activate, 60-day expiry ─────
-- The old "free first introduction" button no longer applies to coaches
-- (clubs keep theirs). The ONLY free route for a coach is the Founding
-- offer, claimed by pressing Activate, valid for 60 days.
alter table club2coach_coach_listings add column if not exists founding_expires_at timestamptz;

create or replace function claim_free_first_credit(target_table text, target_listing_id uuid, dry_run boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare
  me uuid := my_person_id();
  p people%rowtype;
  v club2coach_club_vacancies%rowtype;
  keys text[]; prod text; rl text;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select * into p from people where id = me;

  if target_table = 'club2coach_club_vacancies' then
    select * into v from club2coach_club_vacancies where id = target_listing_id for update;
    if not found or v.person_id <> me then raise exception 'Not your listing'; end if;
    if v.paid or v.deleted_at is not null or v.status in ('filled', 'expired', 'superseded', 'refunded') then
      return jsonb_build_object('granted', false, 'reason', 'not_eligible');
    end if;
    keys := array['club:' || coalesce(v.club_id::text, 'n:' || norm_club_name(v.club_name))];
    prod := 'club2coach'; rl := 'club';
  elsif target_table in ('club2coach_coach_listings', 'coach2mentor_coach_listings') then
    -- Coaches: free introduction is the Founding offer only.
    return jsonb_build_object('granted', false, 'reason', 'founding_only');
  else
    raise exception 'Free first introduction does not apply to this listing type';
  end if;

  if exists (select 1 from free_first_claims where key = any(keys)) then
    return jsonb_build_object('granted', false, 'reason', 'already_used');
  end if;
  if dry_run then return jsonb_build_object('granted', false, 'eligible', true); end if;

  begin
    insert into free_first_claims (key, person_id, listing_table, listing_id)
    select k, me, target_table, target_listing_id from unnest(keys) as k;
  exception when unique_violation then
    return jsonb_build_object('granted', false, 'reason', 'already_used');
  end;

  execute format(
    'update %I set paid = true, paid_at = now(), price_aud = 0, status = ''active'', included_introductions = 1 where id = $1',
    target_table) using target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, notes)
  values (me, prod, rl, target_table, target_listing_id, 0, 'Free first introduction (automatic)');

  return jsonb_build_object('granted', true);
end;
$$;

-- Activate the founding introduction (or, with dry_run, just check).
drop function if exists claim_founding_introduction(uuid);
create or replace function claim_founding_introduction(target_listing_id uuid, dry_run boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare
  me uuid := my_person_id();
  p people%rowtype;
  l club2coach_coach_listings%rowtype;
  s record;
  keys text[];
begin
  if me is null then return jsonb_build_object('granted', false, 'reason', 'not_signed_in'); end if;
  perform pg_advisory_xact_lock(60060);
  select * into p from people where id = me;
  select * into l from club2coach_coach_listings where id = target_listing_id and person_id = me and deleted_at is null;
  if not found or l.paid or l.founding_member or l.status in ('placed', 'refunded') then
    return jsonb_build_object('granted', false, 'reason', 'not_eligible');
  end if;
  select * into s from founding_status();
  if not s.enabled or s.used >= s.lim then
    return jsonb_build_object('granted', false, 'reason', 'offer_closed');
  end if;
  keys := array['coach-email:' || norm_email(p.email)];
  if norm_mobile(p.mobile) <> '' then keys := keys || ('coach-mobile:' || norm_mobile(p.mobile)); end if;
  if exists (select 1 from free_first_claims where key = any(keys))
     or exists (select 1 from club2coach_coach_listings where person_id = me and founding_member) then
    return jsonb_build_object('granted', false, 'reason', 'already_used');
  end if;
  if dry_run then return jsonb_build_object('granted', false, 'eligible', true); end if;

  insert into free_first_claims (key, person_id, listing_table, listing_id)
  select k, me, 'club2coach_coach_listings', target_listing_id from unnest(keys) as k
  on conflict do nothing;

  update club2coach_coach_listings
  set included_introductions = 1, paid = true, paid_at = now(), price_aud = 0,
      status = 'active', founding_member = true, founding_expires_at = now() + interval '60 days'
  where id = target_listing_id;

  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
  values (me, 'club2coach', 'coach', 'club2coach_coach_listings', target_listing_id, 0, me,
          'Founding member — free introduction (valid 60 days), not a real payment');
  return jsonb_build_object('granted', true);
end;
$$;
grant execute on function claim_founding_introduction(uuid, boolean) to authenticated;

-- Coaches choose when they are looking: pause / resume a paid listing.
create or replace function set_coach_listing_active(target_listing_id uuid, make_active boolean)
returns boolean language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare me uuid := my_person_id();
begin
  if me is null then return false; end if;
  update club2coach_coach_listings
  set status = case when make_active then 'active' else 'paused' end
  where id = target_listing_id and person_id = me and paid and deleted_at is null
    and status in ('active', 'paused');
  return found;
end;
$$;
grant execute on function set_coach_listing_active(uuid, boolean) to authenticated;

-- Run daily by the cron (service role only): an unused founding introduction
-- lapses 60 days after activation; the listing returns to unpaid so the
-- coach can choose a package. Returns who was expired so they can be emailed.
create or replace function expire_founding_introductions()
returns table(expired_person_id uuid) language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  return query
  with due as (
    select l.id, l.person_id from club2coach_coach_listings l
    where l.founding_member and l.paid and l.founding_expires_at is not null and l.founding_expires_at < now()
      and coalesce(l.price_aud, 0) = 0 and coalesce(l.included_introductions, 0) <= 1
      and not exists (select 1 from club2coach_shares s where s.coach_listing_id = l.id and s.status = 'approved')
  ), clr as (
    delete from club2coach_shares s using due where s.coach_listing_id = due.id and s.status = 'suggested'
  ), upd as (
    update club2coach_coach_listings l
    set paid = false, paid_at = null, price_aud = null, included_introductions = 0, status = 'draft'
    from due where l.id = due.id
    returning l.person_id
  )
  select upd.person_id as expired_person_id from upd;
end;
$$;
revoke all on function expire_founding_introductions() from public, anon, authenticated;
grant execute on function expire_founding_introductions() to service_role;


-- ── Founding offer v3: Club2Coach OR Coach2Mentor (coach chooses), no pause,
-- 7-day expiry reminder; test listings expire when the next one is activated.
alter table coach2mentor_coach_listings add column if not exists founding_member boolean not null default false;
alter table coach2mentor_coach_listings add column if not exists founding_expires_at timestamptz;
alter table club2coach_coach_listings add column if not exists founding_reminder_sent_at timestamptz;
alter table coach2mentor_coach_listings add column if not exists founding_reminder_sent_at timestamptz;

drop function if exists set_coach_listing_active(uuid, boolean);

-- Spots used = founding introductions across BOTH services.
create or replace function founding_status()
returns table(enabled boolean, lim integer, used integer)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce((select founding_enabled from platform_settings limit 1), true),
         coalesce((select founding_coach_limit from platform_settings limit 1), 60),
         ((select count(*) from club2coach_coach_listings where founding_member)
          + (select count(*) from coach2mentor_coach_listings where founding_member))::int;
$$;
grant execute on function founding_status() to anon, authenticated;

drop function if exists claim_founding_introduction(uuid, boolean);
create or replace function claim_founding_introduction(target_table text, target_listing_id uuid, dry_run boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare
  me uuid := my_person_id();
  p people%rowtype;
  s record;
  keys text[];
  l_person uuid; l_paid boolean; l_deleted timestamptz; l_status text; l_founding boolean;
  prod text;
begin
  if me is null then return jsonb_build_object('granted', false, 'reason', 'not_signed_in'); end if;
  if target_table not in ('club2coach_coach_listings', 'coach2mentor_coach_listings') then
    return jsonb_build_object('granted', false, 'reason', 'not_eligible');
  end if;
  perform pg_advisory_xact_lock(60060);
  select * into p from people where id = me;
  execute format('select person_id, paid, deleted_at, status, founding_member from %I where id = $1', target_table)
    into l_person, l_paid, l_deleted, l_status, l_founding using target_listing_id;
  if l_person is null or l_person <> me or l_paid or l_deleted is not null or l_founding or l_status in ('placed', 'refunded') then
    return jsonb_build_object('granted', false, 'reason', 'not_eligible');
  end if;
  select * into s from founding_status();
  if not s.enabled or s.used >= s.lim then
    return jsonb_build_object('granted', false, 'reason', 'offer_closed');
  end if;
  keys := array['coach-email:' || norm_email(p.email)];
  if norm_mobile(p.mobile) <> '' then keys := keys || ('coach-mobile:' || norm_mobile(p.mobile)); end if;
  if exists (select 1 from free_first_claims where key = any(keys))
     or exists (select 1 from club2coach_coach_listings where person_id = me and founding_member)
     or exists (select 1 from coach2mentor_coach_listings where person_id = me and founding_member) then
    return jsonb_build_object('granted', false, 'reason', 'already_used');
  end if;
  if dry_run then return jsonb_build_object('granted', false, 'eligible', true); end if;

  insert into free_first_claims (key, person_id, listing_table, listing_id)
  select k, me, target_table, target_listing_id from unnest(keys) as k
  on conflict do nothing;

  execute format(
    'update %I set included_introductions = 1, paid = true, paid_at = now(), price_aud = 0, status = ''active'', founding_member = true, founding_expires_at = now() + interval ''60 days'' where id = $1',
    target_table) using target_listing_id;

  prod := case when target_table = 'club2coach_coach_listings' then 'club2coach' else 'coach2mentor' end;
  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
  values (me, prod, 'coach', target_table, target_listing_id, 0, me,
          'Founding member — free introduction (valid 60 days), not a real payment');

  -- Earlier (test) founding listings that were created before expiry dates
  -- existed expire now, as this next one goes live.
  update club2coach_coach_listings set founding_expires_at = now() where founding_member and founding_expires_at is null;
  update coach2mentor_coach_listings set founding_expires_at = now() where founding_member and founding_expires_at is null;
  return jsonb_build_object('granted', true);
end;
$$;
grant execute on function claim_founding_introduction(text, uuid, boolean) to authenticated;

-- Daily (service role only): a week-before reminder, stamped so it is sent once.
create or replace function founding_reminders_due()
returns table(reminder_person_id uuid, reminder_product text, reminder_expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  return query
  with a as (
    update club2coach_coach_listings l set founding_reminder_sent_at = now()
    where l.founding_member and l.paid and l.founding_reminder_sent_at is null
      and l.founding_expires_at is not null and l.founding_expires_at > now() and l.founding_expires_at <= now() + interval '7 days'
      and coalesce(l.price_aud, 0) = 0 and coalesce(l.included_introductions, 0) <= 1
      and not exists (select 1 from club2coach_shares s where s.coach_listing_id = l.id and s.status = 'approved')
    returning l.person_id as pid, 'club2coach'::text as prod, l.founding_expires_at as exp
  ), b as (
    update coach2mentor_coach_listings l set founding_reminder_sent_at = now()
    where l.founding_member and l.paid and l.founding_reminder_sent_at is null
      and l.founding_expires_at is not null and l.founding_expires_at > now() and l.founding_expires_at <= now() + interval '7 days'
      and coalesce(l.price_aud, 0) = 0 and coalesce(l.included_introductions, 0) <= 1
      and not exists (select 1 from coach2mentor_requests r where r.coach_listing_id = l.id and r.status in ('pending', 'accepted'))
    returning l.person_id as pid, 'coach2mentor'::text as prod, l.founding_expires_at as exp
  )
  select pid, prod, exp from a union all select pid, prod, exp from b;
end;
$$;
revoke all on function founding_reminders_due() from public, anon, authenticated;
grant execute on function founding_reminders_due() to service_role;

drop function if exists expire_founding_introductions();
create or replace function expire_founding_introductions()
returns table(expired_person_id uuid, expired_product text)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  return query
  with due as (
    select l.id, l.person_id from club2coach_coach_listings l
    where l.founding_member and l.paid and l.founding_expires_at is not null and l.founding_expires_at <= now()
      and coalesce(l.price_aud, 0) = 0 and coalesce(l.included_introductions, 0) <= 1
      and not exists (select 1 from club2coach_shares s where s.coach_listing_id = l.id and s.status = 'approved')
  ), clr as (
    delete from club2coach_shares s using due where s.coach_listing_id = due.id and s.status = 'suggested'
  ), upd as (
    update club2coach_coach_listings l
    set paid = false, paid_at = null, price_aud = null, included_introductions = 0, status = 'draft'
    from due where l.id = due.id
    returning l.person_id
  )
  select upd.person_id, 'club2coach'::text from upd;

  return query
  with due as (
    select l.id, l.person_id from coach2mentor_coach_listings l
    where l.founding_member and l.paid and l.founding_expires_at is not null and l.founding_expires_at <= now()
      and coalesce(l.price_aud, 0) = 0 and coalesce(l.included_introductions, 0) <= 1
      and not exists (select 1 from coach2mentor_requests r where r.coach_listing_id = l.id and r.status in ('pending', 'accepted'))
  ), clr as (
    delete from coach2mentor_requests r using due where r.coach_listing_id = due.id and r.status = 'suggested'
  ), upd as (
    update coach2mentor_coach_listings l
    set paid = false, paid_at = null, price_aud = null, included_introductions = 0, status = 'draft'
    from due where l.id = due.id
    returning l.person_id
  )
  select upd.person_id, 'coach2mentor'::text from upd;
end;
$$;
revoke all on function expire_founding_introductions() from public, anon, authenticated;
grant execute on function expire_founding_introductions() to service_role;

-- ===== Shared coach credit pool (one pool across Club 2 Coach + Coach 2 Mentor) =====
create or replace function coach_pool_totals()
returns table(person_id uuid, entitled int, used int, any_paid boolean)
language sql stable security definer set search_path = public as $$
  with l as (
    select id, person_id, paid, status, deleted_at, included_introductions, 'c2c'::text as src from club2coach_coach_listings
    union all
    select id, person_id, paid, status, deleted_at, included_introductions, 'c2m'::text from coach2mentor_coach_listings
  ),
  ent as (
    select l.person_id,
           coalesce(sum(coalesce(included_introductions,0)) filter (where paid and status <> 'refunded' and deleted_at is null),0)::int as entitled,
           coalesce(bool_or(paid and status <> 'refunded' and deleted_at is null),false) as any_paid
    from l group by l.person_id
  ),
  u as (
    select l.person_id, count(*)::int as used from club2coach_shares s join l on l.src='c2c' and l.id = s.coach_listing_id group by l.person_id
    union all
    select l.person_id, count(*)::int from coach2mentor_requests r join l on l.src='c2m' and l.id = r.coach_listing_id where r.status <> 'declined' group by l.person_id
  )
  select ent.person_id, ent.entitled, coalesce((select sum(used) from u where u.person_id = ent.person_id),0)::int, ent.any_paid
  from ent
  where is_admin_caller() or auth.role() = 'service_role' or ent.person_id = my_person_id();
$$;
grant execute on function coach_pool_totals() to authenticated, anon, service_role;
-- ===== Credit bank + Activate (replaces the earlier pooled-credit and founding functions) =====
alter table club2coach_coach_listings add column if not exists activated_at timestamptz;
alter table club2coach_coach_listings add column if not exists active_until timestamptz;
alter table club2coach_coach_listings add column if not exists activations_used int not null default 0;
alter table coach2mentor_coach_listings add column if not exists activated_at timestamptz;
alter table coach2mentor_coach_listings add column if not exists active_until timestamptz;
alter table coach2mentor_coach_listings add column if not exists activations_used int not null default 0;

-- Listings already live get a fresh clock so nothing drops out of matching today.
update club2coach_coach_listings set activated_at = now(), active_until = now() + interval '60 days', activations_used = 1
 where paid and status = 'active' and deleted_at is null and active_until is null;
update coach2mentor_coach_listings set activated_at = now(), active_until = now() + interval '180 days', activations_used = 1
 where paid and status = 'active' and deleted_at is null and active_until is null;

drop function if exists claim_founding_introduction(text, uuid, boolean);
drop function if exists founding_reminders_due();
drop function if exists expire_founding_introductions();

-- Credit bank per coach = credits bought/gifted/referred on either listing minus credits already spent.
create or replace function coach_pool_totals()
returns table(person_id uuid, entitled int, used int, any_paid boolean)
language sql stable security definer set search_path = public as $$
  with l as (
    select person_id, paid, status, included_introductions, activations_used from club2coach_coach_listings
    union all
    select person_id, paid, status, included_introductions, activations_used from coach2mentor_coach_listings
  )
  select l.person_id,
         coalesce(sum(coalesce(l.included_introductions,0)) filter (where l.paid and l.status <> 'refunded'),0)::int,
         coalesce(sum(l.activations_used) filter (where l.paid and l.status <> 'refunded'),0)::int,
         coalesce(bool_or(l.paid and l.status <> 'refunded'),false)
  from l
  where is_admin_caller() or auth.role() = 'service_role' or l.person_id = my_person_id()
  group by l.person_id;
$$;
grant execute on function coach_pool_totals() to authenticated, anon, service_role;

-- The Activate button. Spends ONE credit (or the one-off founding credit) to put this listing
-- into matching: 60 days on Club 2 Coach, 180 days on Coach 2 Mentor.
create or replace function activate_coach_listing(target_table text, target_listing_id uuid, use_founding boolean default false, dry_run boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare
  me uuid := my_person_id();
  p people%rowtype; s record; keys text[];
  l_person uuid; l_deleted timestamptz; l_status text; l_until timestamptz; l_paid boolean;
  bank int; days int; src text; prod text; founding_ok boolean := false; new_until timestamptz;
begin
  if me is null then return jsonb_build_object('activated', false, 'reason', 'not_signed_in'); end if;
  if target_table not in ('club2coach_coach_listings', 'coach2mentor_coach_listings') then
    return jsonb_build_object('activated', false, 'reason', 'not_eligible');
  end if;
  perform pg_advisory_xact_lock(60060);
  select * into p from people where id = me;
  execute format('select person_id, deleted_at, status, active_until, paid from %I where id = $1', target_table)
    into l_person, l_deleted, l_status, l_until, l_paid using target_listing_id;
  if l_person is null or l_person <> me or l_deleted is not null or l_status in ('placed', 'refunded') then
    return jsonb_build_object('activated', false, 'reason', 'not_eligible');
  end if;
  if l_status = 'active' and l_until is not null and l_until > now() then
    return jsonb_build_object('activated', false, 'reason', 'already_active');
  end if;

  select coalesce(sum(coalesce(included_introductions,0) - activations_used),0)::int into bank from (
    select included_introductions, activations_used from club2coach_coach_listings where person_id = me and paid and status <> 'refunded'
    union all
    select included_introductions, activations_used from coach2mentor_coach_listings where person_id = me and paid and status <> 'refunded'
  ) x;
  days := case when target_table = 'club2coach_coach_listings' then 60 else 180 end;
  prod := case when target_table = 'club2coach_coach_listings' then 'club2coach' else 'coach2mentor' end;

  select * into s from founding_status();
  keys := array['coach-email:' || norm_email(p.email)];
  if norm_mobile(p.mobile) <> '' then keys := keys || ('coach-mobile:' || norm_mobile(p.mobile)); end if;
  founding_ok := s.enabled and s.used < s.lim
    and not exists (select 1 from free_first_claims where key = any(keys))
    and not exists (select 1 from club2coach_coach_listings where person_id = me and founding_member)
    and not exists (select 1 from coach2mentor_coach_listings where person_id = me and founding_member);

  if dry_run then
    return jsonb_build_object('eligible', bank >= 1 or founding_ok, 'bank', bank, 'founding_available', founding_ok, 'days', days);
  end if;

  if bank >= 1 and not use_founding then src := 'credit';
  elsif founding_ok and (use_founding or bank < 1) then src := 'founding';
  else return jsonb_build_object('activated', false, 'reason', 'no_credits', 'founding_available', founding_ok);
  end if;
  new_until := now() + make_interval(days => days);

  if src = 'founding' then
    insert into free_first_claims (key, person_id, listing_table, listing_id)
    select k, me, target_table, target_listing_id from unnest(keys) as k on conflict do nothing;
    -- founding credit lands on this listing (replacing an unpaid listing's "requested package" number), then is spent below
    execute format('update %I set included_introductions = case when paid then coalesce(included_introductions,0) + 1 else 1 end, paid = true, paid_at = coalesce(paid_at, now()), price_aud = coalesce(price_aud, 0), founding_member = true where id = $1', target_table) using target_listing_id;
    insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
    values (me, prod, 'coach', target_table, target_listing_id, 0, me, 'Founding member — free credit (not a real payment)');
  elsif not l_paid then
    -- credits live on the coach's other listing; this one just becomes "live"
    execute format('update %I set paid = true, paid_at = now(), price_aud = 0, included_introductions = 0 where id = $1', target_table) using target_listing_id;
  end if;

  execute format('update %I set activations_used = activations_used + 1, activated_at = now(), active_until = $2, status = ''active'', founding_reminder_sent_at = null where id = $1', target_table)
    using target_listing_id, new_until;
  return jsonb_build_object('activated', true, 'source', src, 'active_until', new_until);
end;
$$;
grant execute on function activate_coach_listing(text, uuid, boolean, boolean) to authenticated;

-- Daily (service role): remind a week before an activation ends, once per activation.
create or replace function coach_expiry_reminders_due()
returns table(reminder_person_id uuid, reminder_product text, reminder_expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  return query
  with a as (
    update club2coach_coach_listings l set founding_reminder_sent_at = now()
    where l.status = 'active' and l.founding_reminder_sent_at is null and l.active_until > now() and l.active_until <= now() + interval '7 days'
    returning l.person_id as pid, 'club2coach'::text as prod, l.active_until as exp
  ), b as (
    update coach2mentor_coach_listings l set founding_reminder_sent_at = now()
    where l.status = 'active' and l.founding_reminder_sent_at is null and l.active_until > now() and l.active_until <= now() + interval '7 days'
    returning l.person_id as pid, 'coach2mentor'::text as prod, l.active_until as exp
  )
  select pid, prod, exp from a union all select pid, prod, exp from b;
end;
$$;
revoke all on function coach_expiry_reminders_due() from public, anon, authenticated;
grant execute on function coach_expiry_reminders_due() to service_role;

-- Daily (service role): activations whose window has ended leave matching; that credit is gone.
create or replace function expire_coach_activations()
returns table(expired_person_id uuid, expired_product text)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  return query
  with due as (
    update club2coach_coach_listings l set status = 'expired'
    where l.status = 'active' and l.active_until is not null and l.active_until <= now()
    returning l.id, l.person_id
  ), clr as (
    delete from club2coach_shares s using due where s.coach_listing_id = due.id and s.status = 'suggested'
  )
  select due.person_id, 'club2coach'::text from due;
  return query
  with due as (
    update coach2mentor_coach_listings l set status = 'expired'
    where l.status = 'active' and l.active_until is not null and l.active_until <= now()
    returning l.id, l.person_id
  ), clr as (
    delete from coach2mentor_requests r using due where r.coach_listing_id = due.id and r.status = 'suggested'
  )
  select due.person_id, 'coach2mentor'::text from due;
end;
$$;
revoke all on function expire_coach_activations() from public, anon, authenticated;
grant execute on function expire_coach_activations() to service_role;

-- ===== v5: Coach 2 Mentor window is 60 days too; refund clock restarts on each Activate =====
create or replace function activate_coach_listing(target_table text, target_listing_id uuid, use_founding boolean default false, dry_run boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare
  me uuid := my_person_id();
  p people%rowtype; s record; keys text[];
  l_person uuid; l_deleted timestamptz; l_status text; l_until timestamptz; l_paid boolean;
  bank int; days int; src text; prod text; founding_ok boolean := false; new_until timestamptz;
begin
  if me is null then return jsonb_build_object('activated', false, 'reason', 'not_signed_in'); end if;
  if target_table not in ('club2coach_coach_listings', 'coach2mentor_coach_listings') then
    return jsonb_build_object('activated', false, 'reason', 'not_eligible');
  end if;
  perform pg_advisory_xact_lock(60060);
  select * into p from people where id = me;
  execute format('select person_id, deleted_at, status, active_until, paid from %I where id = $1', target_table)
    into l_person, l_deleted, l_status, l_until, l_paid using target_listing_id;
  if l_person is null or l_person <> me or l_deleted is not null or l_status in ('placed', 'refunded') then
    return jsonb_build_object('activated', false, 'reason', 'not_eligible');
  end if;
  if l_status = 'active' and l_until is not null and l_until > now() then
    return jsonb_build_object('activated', false, 'reason', 'already_active');
  end if;

  select coalesce(sum(coalesce(included_introductions,0) - activations_used),0)::int into bank from (
    select included_introductions, activations_used from club2coach_coach_listings where person_id = me and paid and status <> 'refunded'
    union all
    select included_introductions, activations_used from coach2mentor_coach_listings where person_id = me and paid and status <> 'refunded'
  ) x;
  days := 60;
  prod := case when target_table = 'club2coach_coach_listings' then 'club2coach' else 'coach2mentor' end;

  select * into s from founding_status();
  keys := array['coach-email:' || norm_email(p.email)];
  if norm_mobile(p.mobile) <> '' then keys := keys || ('coach-mobile:' || norm_mobile(p.mobile)); end if;
  founding_ok := s.enabled and s.used < s.lim
    and not exists (select 1 from free_first_claims where key = any(keys))
    and not exists (select 1 from club2coach_coach_listings where person_id = me and founding_member)
    and not exists (select 1 from coach2mentor_coach_listings where person_id = me and founding_member);

  if dry_run then
    return jsonb_build_object('eligible', bank >= 1 or founding_ok, 'bank', bank, 'founding_available', founding_ok, 'days', days);
  end if;

  if bank >= 1 and not use_founding then src := 'credit';
  elsif founding_ok and (use_founding or bank < 1) then src := 'founding';
  else return jsonb_build_object('activated', false, 'reason', 'no_credits', 'founding_available', founding_ok);
  end if;
  new_until := now() + make_interval(days => days);

  if src = 'founding' then
    insert into free_first_claims (key, person_id, listing_table, listing_id)
    select k, me, target_table, target_listing_id from unnest(keys) as k on conflict do nothing;
    -- founding credit lands on this listing (replacing an unpaid listing's "requested package" number), then is spent below
    execute format('update %I set included_introductions = case when paid then coalesce(included_introductions,0) + 1 else 1 end, paid = true, paid_at = coalesce(paid_at, now()), price_aud = coalesce(price_aud, 0), founding_member = true where id = $1', target_table) using target_listing_id;
    insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
    values (me, prod, 'coach', target_table, target_listing_id, 0, me, 'Founding member — free credit (not a real payment)');
  elsif not l_paid then
    -- credits live on the coach's other listing; this one just becomes "live"
    execute format('update %I set paid = true, paid_at = now(), price_aud = 0, included_introductions = 0 where id = $1', target_table) using target_listing_id;
  end if;

  execute format('update %I set activations_used = activations_used + 1, activated_at = now(), active_until = $2, status = ''active'', founding_reminder_sent_at = null, refund_reminder_sent_at = null, refund_window_notified_at = null where id = $1', target_table)
    using target_listing_id, new_until;
  return jsonb_build_object('activated', true, 'source', src, 'active_until', new_until);
end;
$$;
grant execute on function activate_coach_listing(text, uuid, boolean, boolean) to authenticated;
update coach2mentor_coach_listings set active_until = activated_at + interval '60 days' where activated_at is not null and status = 'active';
-- ===== v6: club adverts run 90 days; no introduction = credit returned automatically =====
alter table club2coach_club_vacancies add column if not exists recredited_at timestamptz;
alter table club2coach_club_vacancies add column if not exists from_recredit boolean not null default false;

create table if not exists club_recredits (
  id uuid primary key default uuid_generate_v4(),
  person_id uuid not null references people(id) on delete cascade,
  introductions int not null default 1,
  source_vacancy_id uuid references club2coach_club_vacancies(id) on delete set null,
  created_at timestamptz not null default now(),
  used_vacancy_id uuid references club2coach_club_vacancies(id) on delete set null,
  used_at timestamptz
);
alter table club_recredits enable row level security;
drop policy if exists "owner or admin can view recredits" on club_recredits;
create policy "owner or admin can view recredits" on club_recredits for select
  using (person_id = my_person_id() or is_admin_caller());

-- Daily (service role): adverts past 90 days end. If no coach was introduced, the credit is returned.
create or replace function expire_club_vacancies()
returns table(expired_person_id uuid, expired_club text, expired_role text, was_recredited boolean)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare v record; recr boolean;
begin
  for v in
    select * from club2coach_club_vacancies
    where paid and paid_at is not null and paid_at <= now() - interval '90 days'
      and deleted_at is null and status not in ('filled', 'expired', 'refunded', 'superseded')
    for update
  loop
    update club2coach_club_vacancies set status = 'expired' where id = v.id;
    recr := false;
    if not exists (select 1 from club2coach_shares s where s.club_vacancy_id = v.id)
       and not coalesce(v.is_charity, false) and v.refunded_at is null and v.recredited_at is null
       and (coalesce(v.price_aud, 0) > 0 or v.from_recredit) then
      insert into club_recredits (person_id, introductions, source_vacancy_id)
      values (v.person_id, greatest(coalesce(v.included_introductions, 1), 1), v.id);
      update club2coach_club_vacancies set recredited_at = now() where id = v.id;
      recr := true;
    end if;
    expired_person_id := v.person_id; expired_club := v.club_name; expired_role := v.role_being_recruited; was_recredited := recr;
    return next;
  end loop;
end;
$$;
revoke all on function expire_club_vacancies() from public, anon, authenticated;
grant execute on function expire_club_vacancies() to service_role;

-- Club presses "use my returned credit" on a saved, unpaid vacancy.
create or replace function use_club_recredit(target_vacancy_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare me uuid := my_person_id(); v record; r record;
begin
  if me is null then return jsonb_build_object('used', false, 'reason', 'not_signed_in'); end if;
  perform pg_advisory_xact_lock(60061);
  select * into v from club2coach_club_vacancies where id = target_vacancy_id;
  if not found or v.person_id <> me or v.paid or v.deleted_at is not null or v.status in ('filled', 'expired', 'refunded', 'superseded') then
    return jsonb_build_object('used', false, 'reason', 'not_eligible');
  end if;
  select * into r from club_recredits where person_id = me and used_at is null order by created_at limit 1;
  if not found then return jsonb_build_object('used', false, 'reason', 'no_credit'); end if;
  update club_recredits set used_vacancy_id = v.id, used_at = now() where id = r.id;
  update club2coach_club_vacancies
    set paid = true, paid_at = now(), price_aud = 0, status = 'active', included_introductions = r.introductions, from_recredit = true,
        refund_reminder_sent_at = null, refund_window_notified_at = null
    where id = v.id;
  insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
  values (me, 'club2coach', 'club', 'club2coach_club_vacancies', v.id, 0, me, 'Returned credit used (no introduction on the previous advert)');
  return jsonb_build_object('used', true, 'introductions', r.introductions);
end;
$$;
grant execute on function use_club_recredit(uuid) to authenticated;
-- ===== v7: security + review fixes =====
-- 1. Users must not be able to edit billing / credit / clock fields on their own rows.
create or replace function protect_listing_billing_fields() returns trigger language plpgsql as $$
declare n jsonb := to_jsonb(new); o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end; k text; dflt jsonb;
begin
  if current_user in ('authenticated', 'anon') and not coalesce(is_admin_caller(), false) then
    foreach k in array array['paid','paid_at','price_aud','refunded_at','activated_at','active_until','activations_used','founding_member','recredited_at','from_recredit','is_charity'] loop
      if n ? k then
        dflt := case k when 'paid' then 'false'::jsonb when 'activations_used' then '0'::jsonb when 'founding_member' then 'false'::jsonb
                       when 'from_recredit' then 'false'::jsonb when 'is_charity' then 'false'::jsonb else 'null'::jsonb end;
        n := jsonb_set(n, array[k], coalesce(o -> k, dflt));
      end if;
    end loop;
    -- a coach/club can request a package size, but never raise credits on an already-paid row
    if n ? 'included_introductions' then
      if tg_op = 'UPDATE' and coalesce((o ->> 'paid')::boolean, false) then
        n := jsonb_set(n, array['included_introductions'], coalesce(o -> 'included_introductions', 'null'::jsonb));
      elsif (n ->> 'included_introductions') is not null then
        n := jsonb_set(n, array['included_introductions'], to_jsonb(least(greatest((n ->> 'included_introductions')::int, 0), 5)));
      end if;
    end if;
    -- status: users cannot make a listing active/expired/refunded themselves
    if n ? 'status' then
      if tg_op = 'INSERT' then n := jsonb_set(n, array['status'], '"draft"'::jsonb);
      elsif (n ->> 'status') in ('active', 'expired', 'refunded') and (n ->> 'status') is distinct from (o ->> 'status') then
        n := jsonb_set(n, array['status'], o -> 'status');
      end if;
    end if;
    new := jsonb_populate_record(new, n);
  end if;
  return new;
end;
$$;
drop trigger if exists protect_billing_c2c_coach on club2coach_coach_listings;
create trigger protect_billing_c2c_coach before insert or update on club2coach_coach_listings for each row execute function protect_listing_billing_fields();
drop trigger if exists protect_billing_c2m_coach on coach2mentor_coach_listings;
create trigger protect_billing_c2m_coach before insert or update on coach2mentor_coach_listings for each row execute function protect_listing_billing_fields();
drop trigger if exists protect_billing_vacancy on club2coach_club_vacancies;
create trigger protect_billing_vacancy before insert or update on club2coach_club_vacancies for each row execute function protect_listing_billing_fields();
drop trigger if exists protect_billing_mentor on coach2mentor_mentor_listings;
create trigger protect_billing_mentor before insert or update on coach2mentor_mentor_listings for each row execute function protect_listing_billing_fields();

-- 2. Re-credit only when no introduction was actually MADE (approved); unapproved suggestions are cleared.
create or replace function expire_club_vacancies()
returns table(expired_person_id uuid, expired_club text, expired_role text, was_recredited boolean)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare v record; recr boolean;
begin
  for v in
    select * from club2coach_club_vacancies
    where paid and paid_at is not null and paid_at <= now() - interval '90 days'
      and deleted_at is null and status not in ('filled', 'expired', 'refunded', 'superseded')
    for update
  loop
    update club2coach_club_vacancies set status = 'expired' where id = v.id;
    recr := false;
    if not exists (select 1 from club2coach_shares s where s.club_vacancy_id = v.id and s.status = 'approved')
       and not coalesce(v.is_charity, false) and v.refunded_at is null and v.recredited_at is null
       and (coalesce(v.price_aud, 0) > 0 or v.from_recredit) then
      insert into club_recredits (person_id, introductions, source_vacancy_id)
      values (v.person_id, least(greatest(coalesce(v.included_introductions, 1), 1), 5), v.id);
      update club2coach_club_vacancies set recredited_at = now() where id = v.id;
      recr := true;
    end if;
    delete from club2coach_shares s where s.club_vacancy_id = v.id and s.status = 'suggested';
    expired_person_id := v.person_id; expired_club := v.club_name; expired_role := v.role_being_recruited; was_recredited := recr;
    return next;
  end loop;
end;
$$;
revoke all on function expire_club_vacancies() from public, anon, authenticated;
grant execute on function expire_club_vacancies() to service_role;

-- 3. Reposting a paid advert that never introduced anyone must not burn the club's credit: it is returned.
create or replace function recredit_on_supersede() returns trigger language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  if new.status = 'superseded' and old.status is distinct from 'superseded' and old.paid and old.recredited_at is null
     and not coalesce(old.is_charity, false) and old.refunded_at is null and (coalesce(old.price_aud, 0) > 0 or old.from_recredit)
     and not exists (select 1 from club2coach_shares s where s.club_vacancy_id = old.id and s.status = 'approved') then
    insert into club_recredits (person_id, introductions, source_vacancy_id)
    values (old.person_id, least(greatest(coalesce(old.included_introductions, 1), 1), 5), old.id);
    new.recredited_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists recredit_superseded on club2coach_club_vacancies;
create trigger recredit_superseded before update of status on club2coach_club_vacancies for each row execute function recredit_on_supersede();

-- 4. Old founding / pause functions must not stay callable.
drop function if exists claim_founding_introduction(uuid, boolean);
drop function if exists claim_founding_introduction(uuid);
drop function if exists set_coach_listing_active(uuid, boolean);
-- ===== v8: admin PIN hardening =====
-- 1. Nobody can grant themselves an admin session (or reset their own PIN-attempt counter) by editing their own people row.
create or replace function protect_people_admin_fields() returns trigger language plpgsql as $$
declare n jsonb := to_jsonb(new); o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end; k text;
begin
  if current_user in ('authenticated', 'anon') then
    foreach k in array array['admin_session_until','admin_session_granted_at','admin_session_pin_id','failed_admin_pin_attempts','admin_pin_locked_until'] loop
      if n ? k then
        n := jsonb_set(n, array[k], coalesce(o -> k, case k when 'failed_admin_pin_attempts' then '0'::jsonb else 'null'::jsonb end));
      end if;
    end loop;
    new := jsonb_populate_record(new, n);
  end if;
  return new;
end;
$$;
drop trigger if exists protect_people_admin on people;
create trigger protect_people_admin before insert or update on people for each row execute function protect_people_admin_fields();

-- 2. PIN-setting functions are not for the browser.
revoke execute on function set_admin_pin(text) from public, anon, authenticated;
revoke execute on function change_admin_pin(text, text) from public, anon, authenticated;

create or replace function list_admin_pins()
returns table(id uuid, label text, created_at timestamptz, is_master boolean)
language sql security definer set search_path = public, extensions as $$
  select id, label, created_at, is_master from admin_pins where is_admin_caller() order by is_master desc, created_at asc;
$$;

-- 3. Lock-out on wrong guesses: 3 wrong = locked 15 min, then 30 min, 1 h ... (max 24 h); plus a global brake.
do $$ begin
  if not exists (select 1 from pg_proc where proname = 'grant_admin_pin_session_inner') then
    alter function grant_admin_pin_session(text) rename to grant_admin_pin_session_inner;
  end if;
end $$;
revoke execute on function grant_admin_pin_session_inner(text) from public, anon, authenticated;

create table if not exists admin_pin_failures (
  id bigserial primary key,
  person_id uuid,
  at timestamptz not null default now()
);
alter table admin_pin_failures enable row level security;

create or replace function grant_admin_pin_session(input_pin text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare p people%rowtype; ok boolean; recent int; f int; lock_mins int;
begin
  select * into p from people where user_id = auth.uid();
  if not found then return false; end if;
  if p.admin_pin_locked_until is not null and p.admin_pin_locked_until > now() then
    raise exception 'Too many incorrect PIN attempts. Try again after % (Melbourne time).',
      to_char(p.admin_pin_locked_until at time zone 'Australia/Melbourne', 'HH24:MI');
  end if;
  select count(*) into recent from admin_pin_failures where at > now() - interval '1 hour';
  if recent >= 15 then
    raise exception 'Admin sign-in is paused for a while after repeated incorrect PINs. Please try again later.';
  end if;
  ok := grant_admin_pin_session_inner(input_pin);
  if ok then
    update people set failed_admin_pin_attempts = 0, admin_pin_locked_until = null where id = p.id;
    return true;
  end if;
  f := coalesce(p.failed_admin_pin_attempts, 0) + 1;
  lock_mins := case when f % 3 = 0 then least((15 * power(2, (f / 3) - 1))::int, 1440) else 0 end;
  update people set failed_admin_pin_attempts = f,
    admin_pin_locked_until = case when lock_mins > 0 then now() + make_interval(mins => lock_mins) else null end
  where id = p.id;
  insert into admin_pin_failures (person_id) values (p.id);
  return false;
end;
$$;
grant execute on function grant_admin_pin_session(text) to authenticated;
-- ===== v9: final review fixes =====
-- max_mentees: users can choose capacity only while unpaid (1-10); frozen once paid (top-ups arrive via Stripe webhook).
-- A refunded listing can never be moved back out of 'refunded' by its owner (stops credit restore).
create or replace function protect_listing_billing_fields() returns trigger language plpgsql as $$
declare n jsonb := to_jsonb(new); o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end; k text; dflt jsonb;
begin
  if current_user in ('authenticated', 'anon') and not coalesce(is_admin_caller(), false) then
    foreach k in array array['paid','paid_at','price_aud','refunded_at','activated_at','active_until','activations_used','founding_member','recredited_at','from_recredit','is_charity'] loop
      if n ? k then
        dflt := case k when 'paid' then 'false'::jsonb when 'activations_used' then '0'::jsonb when 'founding_member' then 'false'::jsonb
                       when 'from_recredit' then 'false'::jsonb when 'is_charity' then 'false'::jsonb else 'null'::jsonb end;
        n := jsonb_set(n, array[k], coalesce(o -> k, dflt));
      end if;
    end loop;
    if n ? 'included_introductions' then
      if tg_op = 'UPDATE' and coalesce((o ->> 'paid')::boolean, false) then
        n := jsonb_set(n, array['included_introductions'], coalesce(o -> 'included_introductions', 'null'::jsonb));
      elsif (n ->> 'included_introductions') is not null then
        n := jsonb_set(n, array['included_introductions'], to_jsonb(least(greatest((n ->> 'included_introductions')::int, 0), 5)));
      end if;
    end if;
    if n ? 'max_mentees' then
      if tg_op = 'UPDATE' and coalesce((o ->> 'paid')::boolean, false) then
        n := jsonb_set(n, array['max_mentees'], coalesce(o -> 'max_mentees', 'null'::jsonb));
      elsif (n ->> 'max_mentees') is not null then
        n := jsonb_set(n, array['max_mentees'], to_jsonb(least(greatest((n ->> 'max_mentees')::int, 1), 10)));
      end if;
    end if;
    if n ? 'status' then
      if tg_op = 'INSERT' then n := jsonb_set(n, array['status'], '"draft"'::jsonb);
      elsif (o ->> 'status') = 'refunded' then n := jsonb_set(n, array['status'], o -> 'status');
      elsif (n ->> 'status') in ('active', 'expired', 'refunded') and (n ->> 'status') is distinct from (o ->> 'status') then
        n := jsonb_set(n, array['status'], o -> 'status');
      end if;
    end if;
    new := jsonb_populate_record(new, n);
  end if;
  return new;
end;
$$;
-- ===== v10: day-90 refund-window notice (once per activation) =====
alter table club2coach_coach_listings add column if not exists refund_window_notified_at timestamptz;
alter table coach2mentor_coach_listings add column if not exists refund_window_notified_at timestamptz;
create or replace function coach_refund_notices_due()
returns table(notice_person_id uuid, notice_product text, notice_activated_at timestamptz)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  return query
  with a as (
    update club2coach_coach_listings l set refund_window_notified_at = now()
    where l.paid and not coalesce(l.founding_member, false) and l.refunded_at is null and l.status <> 'refunded'
      and l.activated_at is not null and l.activated_at <= now() - interval '90 days' and l.refund_window_notified_at is null
      and not exists (select 1 from club2coach_shares s where s.coach_listing_id = l.id and s.status = 'approved')
    returning l.person_id as pid, 'club2coach'::text as prod, l.activated_at as act
  ), b as (
    update coach2mentor_coach_listings l set refund_window_notified_at = now()
    where l.paid and not coalesce(l.founding_member, false) and l.refunded_at is null and l.status <> 'refunded'
      and l.activated_at is not null and l.activated_at <= now() - interval '90 days' and l.refund_window_notified_at is null
      and not exists (select 1 from coach2mentor_requests r where r.coach_listing_id = l.id and r.status = 'accepted')
    returning l.person_id as pid, 'coach2mentor'::text as prod, l.activated_at as act
  )
  select pid, prod, act from a union all select pid, prod, act from b;
end;
$$;
revoke all on function coach_refund_notices_due() from public, anon, authenticated;
grant execute on function coach_refund_notices_due() to service_role;
-- Don't email coaches whose 90 days already passed before launch (test data): mark existing ones as notified.
update club2coach_coach_listings set refund_window_notified_at = now() where activated_at is not null and activated_at <= now() - interval '90 days' and refund_window_notified_at is null;
update coach2mentor_coach_listings set refund_window_notified_at = now() where activated_at is not null and activated_at <= now() - interval '90 days' and refund_window_notified_at is null;

-- ===== v11: close the mentor-request / share row-level holes found in the final review =====
-- 1) Only admins (or the server) create mentor requests; nothing in the app lets a coach insert one directly.
drop policy if exists "coach can create a request from their own listing" on coach2mentor_requests;
drop policy if exists "admin can create requests" on coach2mentor_requests;
create policy "admin can create requests"
  on coach2mentor_requests for insert
  with check (is_admin_caller());

-- 2) A mentor may only accept/decline a pending request (and only while they have free places);
--    every other column is pinned. Admin and the server (service role) are unaffected.
create or replace function protect_c2m_request_fields() returns trigger language plpgsql as $$
declare cap int; acc int;
begin
  if current_user in ('authenticated', 'anon') and not coalesce(is_admin_caller(), false) then
    new.coach_listing_id := old.coach_listing_id;
    new.mentor_listing_id := old.mentor_listing_id;
    new.score := old.score;
    new.message := old.message;
    new.admin_notes := old.admin_notes;
    new.created_at := old.created_at;
    new.pending_notified_at := old.pending_notified_at;
    new.accepted_notified_at := old.accepted_notified_at;
    if new.status is distinct from old.status then
      if old.status = 'pending' and new.status in ('accepted', 'declined') then
        if new.status = 'accepted' then
          select coalesce(max_mentees, 0) into cap from coach2mentor_mentor_listings where id = old.mentor_listing_id;
          select count(*) into acc from coach2mentor_requests where mentor_listing_id = old.mentor_listing_id and status = 'accepted' and id <> old.id;
          if acc >= coalesce(cap, 0) then
            raise exception 'You have no free mentee places left';
          end if;
        end if;
      else
        new.status := old.status;
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_c2m_request on coach2mentor_requests;
create trigger protect_c2m_request before update on coach2mentor_requests for each row execute function protect_c2m_request_fields();

-- 3) A club may only record the outcome of its own introduction; the rest of the share row is pinned.
create or replace function protect_c2c_share_fields() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not coalesce(is_admin_caller(), false) then
    new.coach_listing_id := old.coach_listing_id;
    new.club_vacancy_id := old.club_vacancy_id;
    new.score := old.score;
    new.admin_notes := old.admin_notes;
    new.shared_at := old.shared_at;
    new.status := old.status;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_c2c_share on club2coach_shares;
create trigger protect_c2c_share before update on club2coach_shares for each row execute function protect_c2c_share_fields();

-- 4) Helper functions that nobody signed-in or anonymous needs to call.
-- (the app and RLS call coach2mentor_has_active_link as the signed-in user, so it must stay executable by authenticated)
grant execute on function coach2mentor_has_active_link(uuid, uuid) to authenticated;

-- ===== v12: mentors must be verified (accreditation evidence checked) before they can buy places or be matched =====
alter table coach2mentor_mentor_listings add column if not exists verified_at timestamptz;
-- Mentors who were already live when this shipped count as verified.
update coach2mentor_mentor_listings set verified_at = now() where paid and verified_at is null;

-- Pin verified_at against client edits (same trigger as the billing fields; latest definition replaces v9).
create or replace function protect_listing_billing_fields() returns trigger language plpgsql as $$
declare n jsonb := to_jsonb(new); o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end; k text; dflt jsonb;
begin
  if current_user in ('authenticated', 'anon') and not coalesce(is_admin_caller(), false) then
    foreach k in array array['paid','paid_at','price_aud','refunded_at','activated_at','active_until','activations_used','founding_member','recredited_at','from_recredit','is_charity','verified_at'] loop
      if n ? k then
        dflt := case k when 'paid' then 'false'::jsonb when 'activations_used' then '0'::jsonb when 'founding_member' then 'false'::jsonb
                       when 'from_recredit' then 'false'::jsonb when 'is_charity' then 'false'::jsonb else 'null'::jsonb end;
        n := jsonb_set(n, array[k], coalesce(o -> k, dflt));
      end if;
    end loop;
    if n ? 'included_introductions' then
      if tg_op = 'UPDATE' and coalesce((o ->> 'paid')::boolean, false) then
        n := jsonb_set(n, array['included_introductions'], coalesce(o -> 'included_introductions', 'null'::jsonb));
      elsif (n ->> 'included_introductions') is not null then
        n := jsonb_set(n, array['included_introductions'], to_jsonb(least(greatest((n ->> 'included_introductions')::int, 0), 5)));
      end if;
    end if;
    if n ? 'max_mentees' then
      if tg_op = 'UPDATE' and coalesce((o ->> 'paid')::boolean, false) then
        n := jsonb_set(n, array['max_mentees'], coalesce(o -> 'max_mentees', 'null'::jsonb));
      elsif (n ->> 'max_mentees') is not null then
        n := jsonb_set(n, array['max_mentees'], to_jsonb(least(greatest((n ->> 'max_mentees')::int, 1), 10)));
      end if;
    end if;
    if n ? 'status' then
      if tg_op = 'INSERT' then n := jsonb_set(n, array['status'], '"draft"'::jsonb);
      elsif (o ->> 'status') = 'refunded' then n := jsonb_set(n, array['status'], o -> 'status');
      elsif (n ->> 'status') in ('active', 'expired', 'refunded') and (n ->> 'status') is distinct from (o ->> 'status') then
        n := jsonb_set(n, array['status'], o -> 'status');
      end if;
    end if;
    new := jsonb_populate_record(new, n);
  end if;
  return new;
end;
$$;

-- Admin-only: verify (or un-verify) a mentor after checking their evidence.
create or replace function verify_mentor_listing(target uuid, verify boolean default true) returns void
language plpgsql security definer set search_path = public set row_security = off as $$
begin
  if not coalesce(is_admin_caller(), false) then raise exception 'Not allowed'; end if;
  update coach2mentor_mentor_listings set verified_at = case when verify then now() else null end where id = target;
end;
$$;
revoke all on function verify_mentor_listing(uuid, boolean) from public, anon;
grant execute on function verify_mentor_listing(uuid, boolean) to authenticated;

-- ===== v13: day-90 refund notice counts only introductions made during the CURRENT credit =====
create or replace function coach_refund_notices_due()
returns table(notice_person_id uuid, notice_product text, notice_activated_at timestamptz)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  return query
  with a as (
    update club2coach_coach_listings l set refund_window_notified_at = now()
    where l.paid and not coalesce(l.founding_member, false) and l.refunded_at is null and l.status <> 'refunded'
      and l.activated_at is not null and l.activated_at <= now() - interval '90 days' and l.refund_window_notified_at is null
      and not exists (
        select 1 from club2coach_shares s
        where s.coach_listing_id = l.id and s.status = 'approved' and s.shared_at >= l.activated_at
      )
    returning l.person_id as pid, 'club2coach'::text as prod, l.activated_at as act
  ), b as (
    update coach2mentor_coach_listings l set refund_window_notified_at = now()
    where l.paid and not coalesce(l.founding_member, false) and l.refunded_at is null and l.status <> 'refunded'
      and l.activated_at is not null and l.activated_at <= now() - interval '90 days' and l.refund_window_notified_at is null
      and not exists (select 1 from coach2mentor_requests r where r.coach_listing_id = l.id and r.status = 'accepted')
    returning l.person_id as pid, 'coach2mentor'::text as prod, l.activated_at as act
  )
  select pid, prod, act from a union all select pid, prod, act from b;
end;
$$;
revoke all on function coach_refund_notices_due() from public, anon, authenticated;
grant execute on function coach_refund_notices_due() to service_role;

-- ===== v14: Club 2 Coach credit = 30 days in front of clubs (up to 5 introductions); Coach 2 Mentor stays 60 days =====
-- Refund window for Club 2 Coach opens at day 35 (5 days after the window closes); Coach 2 Mentor stays at day 90.
create or replace function activate_coach_listing(target_table text, target_listing_id uuid, use_founding boolean default false, dry_run boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare
  me uuid := my_person_id();
  p people%rowtype; s record; keys text[];
  l_person uuid; l_deleted timestamptz; l_status text; l_until timestamptz; l_paid boolean;
  bank int; days int; src text; prod text; founding_ok boolean := false; new_until timestamptz;
begin
  if me is null then return jsonb_build_object('activated', false, 'reason', 'not_signed_in'); end if;
  if target_table not in ('club2coach_coach_listings', 'coach2mentor_coach_listings') then
    return jsonb_build_object('activated', false, 'reason', 'not_eligible');
  end if;
  perform pg_advisory_xact_lock(60060);
  select * into p from people where id = me;
  execute format('select person_id, deleted_at, status, active_until, paid from %I where id = $1', target_table)
    into l_person, l_deleted, l_status, l_until, l_paid using target_listing_id;
  if l_person is null or l_person <> me or l_deleted is not null or l_status in ('placed', 'refunded') then
    return jsonb_build_object('activated', false, 'reason', 'not_eligible');
  end if;
  if l_status = 'active' and l_until is not null and l_until > now() then
    return jsonb_build_object('activated', false, 'reason', 'already_active');
  end if;

  select coalesce(sum(coalesce(included_introductions,0) - activations_used),0)::int into bank from (
    select included_introductions, activations_used from club2coach_coach_listings where person_id = me and paid and status <> 'refunded'
    union all
    select included_introductions, activations_used from coach2mentor_coach_listings where person_id = me and paid and status <> 'refunded'
  ) x;
  days := case when target_table = 'club2coach_coach_listings' then 30 else 60 end;
  prod := case when target_table = 'club2coach_coach_listings' then 'club2coach' else 'coach2mentor' end;

  select * into s from founding_status();
  keys := array['coach-email:' || norm_email(p.email)];
  if norm_mobile(p.mobile) <> '' then keys := keys || ('coach-mobile:' || norm_mobile(p.mobile)); end if;
  founding_ok := s.enabled and s.used < s.lim
    and not exists (select 1 from free_first_claims where key = any(keys))
    and not exists (select 1 from club2coach_coach_listings where person_id = me and founding_member)
    and not exists (select 1 from coach2mentor_coach_listings where person_id = me and founding_member);

  if dry_run then
    return jsonb_build_object('eligible', bank >= 1 or founding_ok, 'bank', bank, 'founding_available', founding_ok, 'days', days);
  end if;

  if bank >= 1 and not use_founding then src := 'credit';
  elsif founding_ok and (use_founding or bank < 1) then src := 'founding';
  else return jsonb_build_object('activated', false, 'reason', 'no_credits', 'founding_available', founding_ok);
  end if;
  new_until := now() + make_interval(days => days);

  if src = 'founding' then
    insert into free_first_claims (key, person_id, listing_table, listing_id)
    select k, me, target_table, target_listing_id from unnest(keys) as k on conflict do nothing;
    execute format('update %I set included_introductions = case when paid then coalesce(included_introductions,0) + 1 else 1 end, paid = true, paid_at = coalesce(paid_at, now()), price_aud = coalesce(price_aud, 0), founding_member = true where id = $1', target_table) using target_listing_id;
    insert into payments (person_id, product, role, listing_table, listing_id, amount_aud, marked_by_person_id, notes)
    values (me, prod, 'coach', target_table, target_listing_id, 0, me, 'Founding member — free credit (not a real payment)');
  elsif not l_paid then
    execute format('update %I set paid = true, paid_at = now(), price_aud = 0, included_introductions = 0 where id = $1', target_table) using target_listing_id;
  end if;

  execute format('update %I set activations_used = activations_used + 1, activated_at = now(), active_until = $2, status = ''active'', founding_reminder_sent_at = null, refund_reminder_sent_at = null, refund_window_notified_at = null where id = $1', target_table)
    using target_listing_id, new_until;
  return jsonb_build_object('activated', true, 'source', src, 'active_until', new_until);
end;
$$;
grant execute on function activate_coach_listing(text, uuid, boolean, boolean) to authenticated;

create or replace function coach_refund_notices_due()
returns table(notice_person_id uuid, notice_product text, notice_activated_at timestamptz)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  return query
  with a as (
    update club2coach_coach_listings l set refund_window_notified_at = now()
    where l.paid and not coalesce(l.founding_member, false) and l.refunded_at is null and l.status <> 'refunded'
      and l.activated_at is not null and l.activated_at <= now() - interval '35 days' and l.refund_window_notified_at is null
      and not exists (
        select 1 from club2coach_shares s
        where s.coach_listing_id = l.id and s.status = 'approved' and s.shared_at >= l.activated_at
      )
    returning l.person_id as pid, 'club2coach'::text as prod, l.activated_at as act
  ), b as (
    update coach2mentor_coach_listings l set refund_window_notified_at = now()
    where l.paid and not coalesce(l.founding_member, false) and l.refunded_at is null and l.status <> 'refunded'
      and l.activated_at is not null and l.activated_at <= now() - interval '90 days' and l.refund_window_notified_at is null
      and not exists (select 1 from coach2mentor_requests r where r.coach_listing_id = l.id and r.status = 'accepted')
    returning l.person_id as pid, 'coach2mentor'::text as prod, l.activated_at as act
  )
  select pid, prod, act from a union all select pid, prod, act from b;
end;
$$;
revoke all on function coach_refund_notices_due() from public, anon, authenticated;
grant execute on function coach_refund_notices_due() to service_role;
