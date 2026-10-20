-- A club's postcode lives on the club record.
--  * First postcode posted on a vacancy for a club is stored on the club.
--  * If a later vacancy for the same club has a DIFFERENT postcode, the club keeps
--    its existing one and the new one is logged in club_postcode_conflicts for an
--    admin to review.
--  * An admin confirms the correct postcode via confirm_club_postcode(); once
--    confirmed it can never be changed again by the application.
alter table clubs add column if not exists postcode text;
alter table clubs add column if not exists postcode_confirmed boolean not null default false;

create table if not exists club_postcode_conflicts (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references clubs(id) on delete cascade,
  proposed_postcode text not null,
  vacancy_id uuid,
  created_at timestamptz not null default now(),
  unique (club_id, proposed_postcode)
);
alter table club_postcode_conflicts enable row level security;
drop policy if exists "admin can view postcode conflicts" on club_postcode_conflicts;
create policy "admin can view postcode conflicts" on club_postcode_conflicts for select using (is_admin_caller());

create or replace function sync_club_postcode() returns trigger
language plpgsql security definer set search_path = public as $$
declare cur text; locked boolean;
begin
  if new.club_id is null or new.postcode is null or new.postcode !~ '^\d{4}$' then
    return new;
  end if;
  select postcode, postcode_confirmed into cur, locked from clubs where id = new.club_id;
  if locked or cur = new.postcode then
    return new;
  elsif cur is null then
    update clubs set postcode = new.postcode where id = new.club_id;
  else
    insert into club_postcode_conflicts (club_id, proposed_postcode, vacancy_id)
    values (new.club_id, new.postcode, new.id)
    on conflict (club_id, proposed_postcode) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists sync_club_postcode_trg on club2coach_club_vacancies;
create trigger sync_club_postcode_trg after insert or update of postcode, club_id
  on club2coach_club_vacancies for each row execute function sync_club_postcode();

-- Once confirmed, the postcode is frozen for everyone (including the app's service role).
create or replace function guard_confirmed_club_postcode() returns trigger
language plpgsql as $$
begin
  if old.postcode_confirmed and (new.postcode is distinct from old.postcode or not new.postcode_confirmed) then
    raise exception 'This club''s postcode has been confirmed and cannot be changed.';
  end if;
  return new;
end $$;
drop trigger if exists guard_club_postcode_trg on clubs;
create trigger guard_club_postcode_trg before update on clubs for each row execute function guard_confirmed_club_postcode();

-- Admin confirms the proper postcode (also clears that club's conflicts).
create or replace function confirm_club_postcode(target_club_id uuid, new_postcode text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin_caller() then raise exception 'Admin only.'; end if;
  if new_postcode !~ '^\d{4}$' then raise exception 'Postcode must be 4 digits.'; end if;
  if (select postcode_confirmed from clubs where id = target_club_id) then
    raise exception 'Postcode already confirmed.';
  end if;
  update clubs set postcode = new_postcode, postcode_confirmed = true where id = target_club_id;
  delete from club_postcode_conflicts where club_id = target_club_id;
end $$;

-- Backfill from existing vacancies: most recent postcode is stored, any other
-- distinct postcodes for the same club are logged for review.
update clubs c set postcode = v.postcode
from (
  select distinct on (club_id) club_id, postcode
  from club2coach_club_vacancies
  where club_id is not null and postcode ~ '^\d{4}$'
  order by club_id, created_at desc
) v
where c.id = v.club_id and c.postcode is null;

insert into club_postcode_conflicts (club_id, proposed_postcode)
select distinct v.club_id, v.postcode
from club2coach_club_vacancies v join clubs c on c.id = v.club_id
where v.postcode ~ '^\d{4}$' and c.postcode is distinct from v.postcode
on conflict do nothing;
