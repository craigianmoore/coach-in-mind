-- Database-level input checks, so the rules hold even if something bypasses the app's forms.
-- Each check runs only when that value is being inserted or changed, so existing rows that predate the rules are
-- never blocked from unrelated updates (admin edits, payment stamps, matching, etc.).

-- Whole number between 0 and hi (null is fine: the field is simply blank).
create or replace function cim_check_amount(val numeric, label text, hi numeric default 9999999) returns void
language plpgsql immutable as $$
begin
  if val is null then return; end if;
  if val < 0 or val > hi or val <> trunc(val) then
    raise exception '% must be a whole number between 0 and %.', label, hi using errcode = 'check_violation';
  end if;
end $$;

-- people: name (English letters), mobile, email, postcode.
create or replace function validate_person_input() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.full_name is distinct from old.full_name then
    if new.full_name is null or length(btrim(new.full_name)) < 2 or btrim(new.full_name) !~ '^[A-Za-z][A-Za-z ''’.-]*$' then
      raise exception 'Name must use English letters only (spaces, hyphens, apostrophes and full stops are fine).' using errcode = 'check_violation';
    end if;
  end if;
  if tg_op = 'INSERT' or new.mobile is distinct from old.mobile then
    if new.mobile is null or btrim(new.mobile) !~ '^\+?[0-9 ()-]+$' or length(regexp_replace(new.mobile, '\D', '', 'g')) not between 8 and 15 then
      raise exception 'Mobile must be 8 to 15 digits (spaces, +, hyphens and brackets allowed, no letters).' using errcode = 'check_violation';
    end if;
  end if;
  if tg_op = 'INSERT' or new.email is distinct from old.email then
    if new.email is null or btrim(new.email) !~ '^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$' then
      raise exception 'That is not a valid email address.' using errcode = 'check_violation';
    end if;
  end if;
  if (tg_op = 'INSERT' or new.postcode is distinct from old.postcode) and new.postcode is not null and btrim(new.postcode) !~ '^\d{4}$' then
    raise exception 'Postcode must be exactly 4 digits.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists validate_person_input_trg on people;
create trigger validate_person_input_trg before insert or update on people for each row execute function validate_person_input();

-- Coach listings and club vacancies: pay is a whole-dollar season total, minimum not above maximum.
create or replace function validate_c2c_input() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.salary_min is distinct from old.salary_min or new.salary_max is distinct from old.salary_max then
    perform cim_check_amount(new.salary_min, 'Pay minimum');
    perform cim_check_amount(new.salary_max, 'Pay maximum');
    if new.salary_min is not null and new.salary_max is not null and new.salary_min > new.salary_max then
      raise exception 'Pay minimum cannot be higher than the maximum.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists validate_c2c_input_trg on club2coach_coach_listings;
create trigger validate_c2c_input_trg before insert or update on club2coach_coach_listings for each row execute function validate_c2c_input();
drop trigger if exists validate_c2c_input_trg on club2coach_club_vacancies;
create trigger validate_c2c_input_trg before insert or update on club2coach_club_vacancies for each row execute function validate_c2c_input();

create or replace function validate_vacancy_postcode() returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT' or new.postcode is distinct from old.postcode) and new.postcode is not null and btrim(new.postcode) !~ '^\d{4}$' then
    raise exception 'Postcode must be exactly 4 digits.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists validate_vacancy_postcode_trg on club2coach_club_vacancies;
create trigger validate_vacancy_postcode_trg before insert or update on club2coach_club_vacancies for each row execute function validate_vacancy_postcode();

-- Mentees: meetings per year (0-365) and session budget.
create or replace function validate_c2m_coach_input() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.meet_min is distinct from old.meet_min or new.meet_max is distinct from old.meet_max then
    perform cim_check_amount(new.meet_min, 'Meetings per year minimum', 365);
    perform cim_check_amount(new.meet_max, 'Meetings per year maximum', 365);
    if new.meet_min is not null and new.meet_max is not null and new.meet_min > new.meet_max then
      raise exception 'Meetings per year minimum cannot be higher than the maximum.' using errcode = 'check_violation';
    end if;
  end if;
  if tg_op = 'INSERT' or new.budget_min is distinct from old.budget_min or new.budget_max is distinct from old.budget_max then
    perform cim_check_amount(new.budget_min, 'Budget minimum');
    perform cim_check_amount(new.budget_max, 'Budget maximum');
    if new.budget_min is not null and new.budget_max is not null and new.budget_min > new.budget_max then
      raise exception 'Budget minimum cannot be higher than the maximum.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists validate_c2m_coach_input_trg on coach2mentor_coach_listings;
create trigger validate_c2m_coach_input_trg before insert or update on coach2mentor_coach_listings for each row execute function validate_c2m_coach_input();

-- Mentors: FA# (8 digits), meetings per year, rates.
create or replace function validate_c2m_mentor_input() returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT' or new.fa_number is distinct from old.fa_number) and new.fa_number is not null and new.fa_number !~ '^\d{8}$' then
    raise exception 'FA# must be exactly 8 digits.' using errcode = 'check_violation';
  end if;
  if tg_op = 'INSERT' or new.meet_capacity_per_year is distinct from old.meet_capacity_per_year then
    perform cim_check_amount(new.meet_capacity_per_year, 'Meetings per year', 365);
  end if;
  if tg_op = 'INSERT' or new.rate_amount is distinct from old.rate_amount then
    perform cim_check_amount(new.rate_amount, 'Rate');
  end if;
  if tg_op = 'INSERT' or new.in_person_rate_amount is distinct from old.in_person_rate_amount then
    perform cim_check_amount(new.in_person_rate_amount, 'In-person rate');
  end if;
  return new;
end $$;
drop trigger if exists validate_c2m_mentor_input_trg on coach2mentor_mentor_listings;
create trigger validate_c2m_mentor_input_trg before insert or update on coach2mentor_mentor_listings for each row execute function validate_c2m_mentor_input();
