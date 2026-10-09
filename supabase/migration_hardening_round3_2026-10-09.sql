-- Hardening round 3 (9 Oct 2026). Run once in the Supabase SQL editor.
-- M2: a stranger can no longer lock admins out of PIN entry
-- M3: the phone-number lookup is no longer callable by signed-out visitors
-- M4: people.email always equals the verified sign-in email

begin;

-- M2 ---------------------------------------------------------------------
-- The global brake (15 wrong PINs in an hour pauses everyone) stays, because
-- admin access is PIN-only and the brake stops guessing across many accounts.
-- But anyone who has held an admin session before is exempt from the global
-- brake (their own per-account lockout still applies), so strangers can't
-- freeze admins out by failing on purpose.
create or replace function grant_admin_pin_session(input_pin text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare p people%rowtype; ok boolean; recent int; f int; lock_mins int;
begin
  select * into p from people where user_id = auth.uid();
  if not found then return false; end if;
  if p.admin_pin_locked_until is not null and p.admin_pin_locked_until > now() then
    raise exception 'Too many incorrect PIN attempts. Try again after % (Melbourne time).',
      to_char(p.admin_pin_locked_until at time zone 'Australia/Melbourne', 'HH24:MI');
  end if;
  select count(*) into recent from admin_pin_failures where at > now() - interval '1 hour';
  if recent >= 15 and p.admin_session_granted_at is null then
    raise exception 'Admin sign-in is paused for a while after repeated incorrect PINs. Please try again later.';
  end if;
  ok := grant_admin_pin_session_inner(input_pin);
  if ok then
    update people set failed_admin_pin_attempts = 0, admin_pin_locked_until = null where id = p.id;
    return true;
  end if;
  f := coalesce(p.failed_admin_pin_attempts, 0) + 1;
  lock_mins := case when f % 3 = 0 then least((15 * power(2, (f / 3) - 1))::int, 1440) else 0 end;
  update people set failed_admin_pin_attempts = f,
    admin_pin_locked_until = case when lock_mins > 0 then now() + make_interval(mins => lock_mins) else null end
  where id = p.id;
  insert into admin_pin_failures (person_id) values (p.id);
  return false;
end;
$$;
grant execute on function grant_admin_pin_session(text) to authenticated;

-- M3 ---------------------------------------------------------------------
revoke execute on function is_mobile_registered(text, uuid) from public, anon;
grant execute on function is_mobile_registered(text, uuid) to authenticated;

-- M4 ---------------------------------------------------------------------
create or replace function sync_people_email_from_auth()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare au text;
begin
  select email into au from auth.users where id = new.user_id;
  if au is not null then new.email := au; end if;
  return new;
end;
$$;
revoke all on function sync_people_email_from_auth() from public, anon, authenticated;

drop trigger if exists sync_people_email on people;
create trigger sync_people_email before insert or update on people
  for each row execute function sync_people_email_from_auth();

-- Backfill: align existing rows with the verified sign-in email.
update people p set email = u.email
  from auth.users u
 where u.id = p.user_id and u.email is not null and p.email is distinct from u.email;

commit;
