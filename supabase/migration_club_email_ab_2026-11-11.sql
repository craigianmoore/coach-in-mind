-- Club invitation split test: which version (A or B) each contact was emailed.
-- Everyone already invited received the original wording, so they are recorded as version A.
alter table club_contacts add column if not exists invite_variant text check (invite_variant in ('A','B'));
alter table club_extra_contacts add column if not exists invite_variant text check (invite_variant in ('A','B'));
update club_contacts set invite_variant = 'A' where invite_sent_at is not null and invite_variant is null;
update club_extra_contacts set invite_variant = 'A' where invite_sent_at is not null and invite_variant is null;
