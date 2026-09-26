-- The mentor listing form collects and validates an FA# (Football
-- Australia registration number, exactly 8 digits) but the column was
-- never added to the database — every mentor listing save has been
-- failing outright because of it. Null for existing listings; they'll
-- be prompted for it next time they save.
alter table coach2mentor_mentor_listings
  add column fa_number text;

comment on column coach2mentor_mentor_listings.fa_number is
  'Football Australia registration number; validated as 8 digits in the app.';
