-- Lets a mentor paste a YouTube/Loom/Vimeo link introducing themselves,
-- shown as an embedded player on the coach-facing "browse mentors" page.
alter table coach2mentor_mentor_listings
  add column intro_video_url text;

comment on column coach2mentor_mentor_listings.intro_video_url is
  'YouTube/Loom/Vimeo link the mentor pastes in; embedded on the coach-facing browse page. Null = no video.';
