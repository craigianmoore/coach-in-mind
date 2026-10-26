-- Newest activity per admin tab for one product, so each admin page can show "unread activity" for the other product.
-- Mirrors the tabs the admin pages bold. Admin sessions only.
create or replace function admin_product_activity(prod text)
returns table (tab text, latest timestamptz)
language plpgsql security definer set search_path = public, extensions set row_security = off as $$
begin
  if not coalesce(is_admin_caller(), false) then
    raise exception 'Admin only.';
  end if;
  if prod = 'c2c' then
    return query select 'unpaid'::text, greatest(
        (select max(created_at) from club2coach_coach_listings where not paid and deleted_at is null),
        (select max(created_at) from club2coach_club_vacancies where not paid and deleted_at is null and status <> 'superseded'),
        (select max(updated_at) from club2coach_coach_listings where topup_requested is not null and deleted_at is null));
    return query select 'matches'::text, greatest((select max(shared_at) from club2coach_shares), (select max(coach_responded_at) from club2coach_shares));
    return query select 'listings'::text, greatest((select max(created_at) from club2coach_coach_listings), (select max(created_at) from club2coach_club_vacancies));
    return query select 'support'::text, (select max(created_at) from support_queries);
    return query select 'people'::text, (select max(created_at) from people);
    return query select 'payments'::text, (select max(created_at) from payments where product = 'club2coach');
  elsif prod = 'c2m' then
    return query select 'unpaid'::text, greatest(
        (select max(created_at) from coach2mentor_coach_listings where not paid and deleted_at is null),
        (select max(created_at) from coach2mentor_mentor_listings where not paid and deleted_at is null),
        (select max(updated_at) from coach2mentor_coach_listings where topup_requested is not null and deleted_at is null));
    return query select 'requests'::text, greatest((select max(created_at) from coach2mentor_requests), (select max(responded_at) from coach2mentor_requests));
    return query select 'listings'::text, greatest((select max(created_at) from coach2mentor_coach_listings), (select max(created_at) from coach2mentor_mentor_listings));
    return query select 'payments'::text, (select max(created_at) from payments where product = 'coach2mentor');
  else
    raise exception 'Unknown product.';
  end if;
end;
$$;
revoke all on function admin_product_activity(text) from public, anon;
grant execute on function admin_product_activity(text) to authenticated;
