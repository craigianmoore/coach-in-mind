-- 20 Oct 2026: admin switch for distance-based geography scoring (off by default). Safe to run more than once.
alter table platform_settings add column if not exists distance_matching_enabled boolean not null default false;
