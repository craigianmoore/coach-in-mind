-- Failed emails keep who/what/why so they can be retried automatically (first in line when
-- Resend next allows) and shown to the admin. status: queued | retrying | sent | permanent |
-- gave_up | dismissed | legacy (logged before details were kept; cannot be retried).
alter table email_failures
  add column if not exists to_email text,
  add column if not exists subject text,
  add column if not exists body text,
  add column if not exists reply_to text,
  add column if not exists kind text,
  add column if not exists status text not null default 'queued',
  add column if not exists attempts int not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists resolved_at timestamptz;
update email_failures set status = 'legacy' where body is null and status = 'queued';
drop policy if exists "admin can update email failures" on email_failures;
create policy "admin can update email failures" on email_failures
  for update using (is_admin_caller()) with check (is_admin_caller());
create index if not exists email_failures_status_idx on email_failures (status, created_at);
