-- Optional second contact for a club (a second person to invite and remind, separately from the main contact).
-- The main contact stays in club_contacts, one row per club, so nothing that reads or imports it changes.
create table if not exists club_extra_contacts (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references clubs(id) on delete cascade,
  email text not null,
  source text default 'manual',
  created_at timestamptz not null default now(),
  contacted_at timestamptz,
  do_not_contact boolean not null default false,
  invite_sent_at timestamptz,
  reminder_sent_at timestamptz,
  invite_error text
);
create unique index if not exists club_extra_contacts_club_email on club_extra_contacts (club_id, lower(email));
alter table club_extra_contacts enable row level security;
drop policy if exists "admin can view club extra contacts" on club_extra_contacts;
create policy "admin can view club extra contacts" on club_extra_contacts for select using (is_admin_caller());
drop policy if exists "admin can manage club extra contacts" on club_extra_contacts;
create policy "admin can manage club extra contacts" on club_extra_contacts for all using (is_admin_caller()) with check (is_admin_caller());
