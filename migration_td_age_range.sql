-- Lets a TD (Junior)/TD (Senior) vacancy capture an age-group RANGE
-- instead of a single AGE_GROUPS value. Null for every existing/non-TD
-- vacancy, so nothing already saved is affected.
alter table club2coach_club_vacancies
  add column age_group_max text;

comment on column club2coach_club_vacancies.age_group_max is
  'TD roles only: upper end of the age-group range this TD oversees (age_group is the lower end). AGE_GROUPS value or null.';
