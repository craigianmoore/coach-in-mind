-- Records emails Resend refused (daily/monthly limit, rate limit, outage) so the
-- admin pages can show a warning. The email alert path uses the same provider, so
-- a failed send can't reliably email you; this is the fallback.
-- Written by server code with the service role (bypasses RLS); only an admin session can read.
create table if not exists email_failures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  http_status int,
  detail text
);
alter table email_failures enable row level security;
drop policy if exists "admin can read email failures" on email_failures;
create policy "admin can read email failures" on email_failures
  for select using (is_admin_caller());
create index if not exists email_failures_created_at_idx on email_failures (created_at desc);
