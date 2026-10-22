-- Founding mentor price: a mentor's FIRST mentee place is $50 (instead of $100) while the founding coach offer is open.
--  * One per mentor, first purchase only (top-ups and extra places stay at the normal price).
--  * Ends automatically when the founding coach places run out or the offer is switched off (same rule as founding_status()).
--  * Mentors do not use up any of the founding coach places.
alter table coach2mentor_mentor_listings add column if not exists founding_mentor_price boolean not null default false;

-- Only the server (Stripe webhook) may set it.
create or replace function protect_founding_mentor_price() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not coalesce(is_admin_caller(), false) then
    new.founding_mentor_price := case when tg_op = 'UPDATE' then old.founding_mentor_price else false end;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_founding_mentor_price_trg on coach2mentor_mentor_listings;
create trigger protect_founding_mentor_price_trg before insert or update on coach2mentor_mentor_listings for each row execute function protect_founding_mentor_price();

-- Is the $50 first-place price available for this mentor listing right now?
create or replace function mentor_founding_price_available(target_listing_id uuid) returns boolean
language plpgsql stable security definer set search_path = public, extensions set row_security = off as $$
declare l coach2mentor_mentor_listings%rowtype; s record;
begin
  select * into l from coach2mentor_mentor_listings where id = target_listing_id;
  if not found then return false; end if;
  if l.person_id is distinct from my_person_id() and not coalesce(is_admin_caller(), false) then return false; end if;
  if l.paid or l.deleted_at is not null or l.verified_at is null or l.status in ('refunded') then return false; end if;
  if exists (select 1 from coach2mentor_mentor_listings o where o.person_id = l.person_id and o.founding_mentor_price) then return false; end if;
  select * into s from founding_status();
  return coalesce(s.enabled, false) and s.used < s.lim;
end;
$$;
grant execute on function mentor_founding_price_available(uuid) to authenticated;
