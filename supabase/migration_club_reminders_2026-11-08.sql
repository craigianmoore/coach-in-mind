-- One-off reminder to clubs that were invited and haven't signed up: when it was sent (null = not yet).
alter table club_contacts add column if not exists reminder_sent_at timestamptz;
