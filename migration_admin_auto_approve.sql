-- Both admin pages (Club2Coach and Coach2Mentor) read and write
-- auto_approve_matches on admin_settings, and types/database.ts
-- already declares it — but the column was never actually added to
-- the database. The toggle in both admin screens has been failing
-- silently; matching has always fallen back to the safe default
-- (every auto-match goes in as "suggested", awaiting admin approval)
-- because the column read back as undefined, never because anyone
-- chose that setting.
alter table admin_settings
  add column auto_approve_matches boolean not null default false;

comment on column admin_settings.auto_approve_matches is
  'When false (default), auto-matched suggestions need explicit admin approval before contact details are shared. Shared by Club2Coach and Coach2Mentor, one row per product.';
