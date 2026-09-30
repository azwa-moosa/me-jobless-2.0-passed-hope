-- 004_dev_persona.sql
-- Display metadata for DEV sign-in personas (title, functional scope label, ordering).
-- Contains no authorisation data: access still comes only from platform.user_scope grants.
create table platform.dev_persona (
  user_id       uuid primary key references platform.app_user(id),
  title         varchar(200) not null,
  scope_label   varchar(120) not null,
  persona_group varchar(20) not null check (persona_group in ('primary','fixture')),
  sort_order    int not null,
  note          text
);
