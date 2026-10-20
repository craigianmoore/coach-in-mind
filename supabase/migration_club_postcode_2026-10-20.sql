-- Store a club's postcode on the club record itself.
-- Whenever a vacancy is saved for a club, copy its postcode onto clubs.postcode
-- (latest value wins). Runs as security definer because clubs is admin-write only.
alter table clubs add column if not exists postcode text;

create or replace function sync_club_postcode() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.club_id is not null and new.postcode ~ '^\d{4}$' then
    update clubs set postcode = new.postcode
    where id = new.club_id and postcode is distinct from new.postcode;
  end if;
  return new;
end $$;

drop trigger if exists sync_club_postcode_trg on club2coach_club_vacancies;
create trigger sync_club_postcode_trg after insert or update of postcode, club_id
  on club2coach_club_vacancies for each row execute function sync_club_postcode();

-- Backfill from existing vacancies (most recent per club).
update clubs c set postcode = v.postcode
from (
  select distinct on (club_id) club_id, postcode
  from club2coach_club_vacancies
  where club_id is not null and postcode ~ '^\d{4}$'
  order by club_id, created_at desc
) v
where c.id = v.club_id and c.postcode is null;
