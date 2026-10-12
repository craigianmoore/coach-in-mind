-- One-off coach invitation mail-out: who is still to be invited, who has been, and who said no thanks.
-- Written only by server code (service role). Only an admin session can read it.
create table if not exists invite_recipients (
  email text primary key,
  first_name text,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','optout')),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
alter table invite_recipients enable row level security;
drop policy if exists "admin can read invite recipients" on invite_recipients;
create policy "admin can read invite recipients" on invite_recipients
  for select using (is_admin_caller());
