-- Fix: mentors couldn't Accept/Decline a coach request ("new row violates
-- row-level security policy for table coach2mentor_requests").
--
-- The live UPDATE policy required status = 'pending' in USING. With no
-- explicit WITH CHECK, Postgres re-applies USING to the NEW row, which now
-- has status 'accepted'/'declined', so every response was rejected.
--
-- Fix: keep "only a pending request can be responded to" in USING, but give
-- WITH CHECK ownership only. protect_c2m_request_fields() (trigger) still
-- pins every other column and limits status changes to pending -> accepted
-- or declined, and enforces the mentee-capacity limit.
drop policy if exists "mentor or admin can respond to request" on coach2mentor_requests;
create policy "mentor or admin can respond to request"
  on coach2mentor_requests for update
  using (
    is_admin_caller()
    or (
      status = 'pending'
      and exists (
        select 1 from coach2mentor_mentor_listings ml
        where ml.id = coach2mentor_requests.mentor_listing_id and ml.person_id = my_person_id()
      )
    )
  )
  with check (
    is_admin_caller()
    or exists (
      select 1 from coach2mentor_mentor_listings ml
      where ml.id = coach2mentor_requests.mentor_listing_id and ml.person_id = my_person_id()
    )
  );
