-- Once a club's postcode is confirmed, every vacancy for that club uses it
-- (so matching, the map and the club's own view all agree).

-- New/edited vacancies for a club with a confirmed postcode take the confirmed value.
create or replace function force_confirmed_club_postcode() returns trigger
language plpgsql security definer set search_path = public as $$
declare cp text;
begin
  if new.club_id is not null then
    select postcode into cp from clubs where id = new.club_id and postcode_confirmed;
    if cp is not null then new.postcode := cp; end if;
  end if;
  return new;
end $$;
drop trigger if exists force_club_postcode_trg on club2coach_club_vacancies;
create trigger force_club_postcode_trg before insert or update of postcode, club_id
  on club2coach_club_vacancies for each row execute function force_confirmed_club_postcode();

-- Confirming also corrects the club's existing vacancies.
create or replace function confirm_club_postcode(target_club_id uuid, new_postcode text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin_caller() then raise exception 'Admin only.'; end if;
  if new_postcode !~ '^\d{4}$' then raise exception 'Postcode must be 4 digits.'; end if;
  if (select postcode_confirmed from clubs where id = target_club_id) then
    raise exception 'Postcode already confirmed.';
  end if;
  update clubs set postcode = new_postcode, postcode_confirmed = true where id = target_club_id;
  update club2coach_club_vacancies set postcode = new_postcode
    where club_id = target_club_id and postcode is distinct from new_postcode;
  delete from club_postcode_conflicts where club_id = target_club_id;
end $$;
