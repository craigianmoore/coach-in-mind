-- Remembers, per admin and per admin page, when each tab was last looked at, so the bold "new activity" tab names
-- follow the admin across phone and laptop. Each person can only see and change their own rows.
create table if not exists admin_tab_seen (
  person_id uuid not null references people(id) on delete cascade,
  scope text not null,
  tab text not null,
  seen_at timestamptz not null default now(),
  primary key (person_id, scope, tab)
);
alter table admin_tab_seen enable row level security;
drop policy if exists "own tab seen select" on admin_tab_seen;
create policy "own tab seen select" on admin_tab_seen for select using (person_id = my_person_id());
drop policy if exists "own tab seen insert" on admin_tab_seen;
create policy "own tab seen insert" on admin_tab_seen for insert with check (person_id = my_person_id());
drop policy if exists "own tab seen update" on admin_tab_seen;
create policy "own tab seen update" on admin_tab_seen for update using (person_id = my_person_id()) with check (person_id = my_person_id());
