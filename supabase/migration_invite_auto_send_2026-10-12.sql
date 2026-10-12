-- Switch for automatic sending of the one-off coach invitations (off by default).
alter table platform_settings add column if not exists invite_auto_send boolean not null default false;
