-- Coach 2 Mentor: a coach can choose one mentor from their accepted matches.
-- Choosing marks that request as chosen and releases the coach's other
-- pending/accepted requests (set to 'declined'), which frees those mentors'
-- mentee places. Runs as the function owner so the request-protection
-- trigger (which only restricts the 'authenticated' role) doesn't block it;
-- ownership and state are checked explicitly below.
alter table coach2mentor_requests add column if not exists chosen_at timestamptz;

create or replace function choose_coach2mentor_mentor(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  me uuid := my_person_id();
  req coach2mentor_requests%rowtype;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  select r.* into req
  from coach2mentor_requests r
  join coach2mentor_coach_listings cl on cl.id = r.coach_listing_id
  where r.id = target_request_id and cl.person_id = me;

  if not found then
    raise exception 'Request not found';
  end if;
  if req.status <> 'accepted' then
    raise exception 'You can only choose a mentor who has accepted';
  end if;
  if exists (
    select 1 from coach2mentor_requests
    where coach_listing_id = req.coach_listing_id and chosen_at is not null
  ) then
    raise exception 'You have already chosen a mentor';
  end if;

  update coach2mentor_requests set chosen_at = now() where id = req.id;

  update coach2mentor_requests
  set status = 'declined', responded_at = coalesce(responded_at, now())
  where coach_listing_id = req.coach_listing_id
    and id <> req.id
    and status in ('pending', 'accepted');
end;
$$;

revoke all on function choose_coach2mentor_mentor(uuid) from public;
grant execute on function choose_coach2mentor_mentor(uuid) to authenticated;

revoke execute on function choose_coach2mentor_mentor(uuid) from anon;
