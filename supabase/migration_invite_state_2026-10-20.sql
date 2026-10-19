-- Invite emails adapt to the coach's state ("as a Tasmanian football coach"). Blank = "a football coach".
alter table invite_recipients add column if not exists state text;
-- Everyone already on the list is Victorian.
update invite_recipients set state = 'VIC' where state is null;
