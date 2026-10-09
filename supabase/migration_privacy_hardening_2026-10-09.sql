-- Pre-launch hardening (9 Oct 2026). Run once in the Supabase SQL editor.
-- B1: contact records only visible once the introduction is APPROVED.
-- H1: mentor requests still in 'suggested' (not yet approved by an admin) are not visible to the coach or mentor.

begin;

drop policy if exists "club2coach share reveals contact record" on people;
create policy "club2coach share reveals contact record"
  on people for select
  using (
    exists (
      select 1 from club2coach_shares s
      join club2coach_coach_listings cl on cl.id = s.coach_listing_id
      join club2coach_club_vacancies cv on cv.id = s.club_vacancy_id
      where s.status = 'approved'
        and ((cl.person_id = people.id and cv.person_id = my_person_id())
          or (cv.person_id = people.id and cl.person_id = my_person_id()))
    )
  );

drop policy if exists "involved parties or admin can view request" on coach2mentor_requests;
create policy "involved parties or admin can view request"
  on coach2mentor_requests for select
  using (
    is_admin_caller()
    or (
      status <> 'suggested'
      and (
        exists (
          select 1 from coach2mentor_coach_listings cl
          where cl.id = coach_listing_id and cl.person_id = my_person_id()
        )
        or exists (
          select 1 from coach2mentor_mentor_listings ml
          where ml.id = mentor_listing_id and ml.person_id = my_person_id()
        )
      )
    )
  );

commit;
