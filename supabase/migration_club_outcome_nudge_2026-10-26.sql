-- One email nudge to the club, a week after an approved introduction, if it hasn't said whether the role was filled.
alter table club2coach_shares add column if not exists club_check_sent_at timestamptz;
-- Don't nudge about introductions made before this existed (the app still asks them).
update club2coach_shares set club_check_sent_at = now() where status = 'approved' and club_check_sent_at is null;

create or replace function protect_c2c_share_fields() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not coalesce(is_admin_caller(), false) then
    new.coach_listing_id := old.coach_listing_id;
    new.club_vacancy_id := old.club_vacancy_id;
    new.score := old.score;
    new.admin_notes := old.admin_notes;
    new.shared_at := old.shared_at;
    new.status := old.status;
    new.coach_response := old.coach_response;
    new.coach_responded_at := old.coach_responded_at;
    new.coach_check_sent_at := old.coach_check_sent_at;
    new.club_check_sent_at := old.club_check_sent_at;
  end if;
  return new;
end;
$$;
