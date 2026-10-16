-- Coaches can hold several Club2Coach listings (one per role they'd consider).
-- Taking a role: that listing becomes 'placed' and the coach's other live listings go into
-- 'hibernating' (details kept, matching stopped). A hibernating listing whose activation window
-- is still open is "awaiting the coach's choice": keep advertising (status back to 'active', the
-- clock never stopped) or stop (window ends now, so that credit is gone). No schema change needed:
-- status is free text, and credits already live in the coach's shared bank.

create or replace function coach_declare_role_taken(target_listing_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare me uuid := my_person_id(); n int;
begin
  if me is null then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  update club2coach_coach_listings set status = 'placed'
   where id = target_listing_id and person_id = me and deleted_at is null and status in ('active', 'paused', 'draft', 'expired', 'hibernating');
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_eligible'); end if;
  delete from club2coach_shares where coach_listing_id = target_listing_id and status = 'suggested';
  with h as (
    update club2coach_coach_listings set status = 'hibernating'
     where person_id = me and id <> target_listing_id and deleted_at is null
       and status = 'active' and active_until is not null and active_until > now()
    returning id
  ), d as (
    delete from club2coach_shares s using h where s.coach_listing_id = h.id and s.status = 'suggested'
  )
  select count(*) into n from h;
  return jsonb_build_object('ok', true, 'hibernated', n);
end;
$$;
grant execute on function coach_declare_role_taken(uuid) to authenticated;

create or replace function coach_resolve_hibernation(target_listing_id uuid, keep boolean)
returns jsonb language plpgsql security definer set search_path = public, extensions set row_security = off as $$
declare me uuid := my_person_id(); changed boolean := false;
begin
  if me is null then return jsonb_build_object('ok', false, 'reason', 'not_signed_in'); end if;
  if keep then
    update club2coach_coach_listings set status = 'active'
     where id = target_listing_id and person_id = me and deleted_at is null and status = 'hibernating'
       and active_until is not null and active_until > now();
    changed := found;
  else
    update club2coach_coach_listings set active_until = now()
     where id = target_listing_id and person_id = me and deleted_at is null and status = 'hibernating';
    changed := found;
    delete from club2coach_shares where coach_listing_id = target_listing_id and status = 'suggested';
  end if;
  return jsonb_build_object('ok', changed);
end;
$$;
grant execute on function coach_resolve_hibernation(uuid, boolean) to authenticated;

-- A coach can hold at most two live Club2Coach listings (deleted ones don't count).
create or replace function enforce_max_two_coach_listings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from club2coach_coach_listings where person_id = new.person_id and deleted_at is null) >= 2 then
    raise exception 'A coach can advertise for at most two roles at once.';
  end if;
  return new;
end;
$$;
drop trigger if exists max_two_coach_listings on club2coach_coach_listings;
create trigger max_two_coach_listings before insert on club2coach_coach_listings
  for each row execute function enforce_max_two_coach_listings();
