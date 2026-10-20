-- 20 Oct 2026: one reminder to coaches who haven't responded, a daily send limit, and club invitations.
-- Safe to run more than once.

-- Coaches: when the one-off reminder was sent.
alter table invite_recipients add column if not exists reminder_sent_at timestamptz;

-- Clubs: a region (so invitations only go where coaches already are), and when/if an invitation went out.
alter table clubs add column if not exists region text;
alter table club_contacts add column if not exists invite_sent_at timestamptz;
alter table club_contacts add column if not exists invite_error text;

-- Settings (all on the single platform_settings row). Club invitations start switched OFF with no regions chosen.
alter table platform_settings add column if not exists invite_daily_limit integer not null default 150;
alter table platform_settings add column if not exists reminders_enabled boolean not null default true;
alter table platform_settings add column if not exists club_invite_enabled boolean not null default false;
alter table platform_settings add column if not exists club_invite_share integer not null default 25;
alter table platform_settings add column if not exists club_invite_regions text[] not null default '{}';
