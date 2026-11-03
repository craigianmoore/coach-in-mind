-- Optional free-text reason a club gives when it answers "did you fill this role with this coach?".
-- Visible to admins only (the coach never sees it); the club writes it with the outcome.
alter table club2coach_shares add column if not exists outcome_note text;
