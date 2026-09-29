-- 002_actions_er.sql
-- ActionService core (ACT-001/003/005/007) and ER MVP intake/profile/chronology/team (ER-002..ER-006, ER-013).
-- ER tables are Highly Restricted: Row-Level Security is enabled as defence-in-depth behind the app policy layer.

create schema if not exists actions;
create schema if not exists er;

-- =========================================================== actions
create table actions.action (
  id                     uuid primary key default gen_random_uuid(),
  reference              varchar(30) not null unique,
  source_module          varchar(40) not null,
  source_record_type     varchar(60) not null,
  source_record_id       uuid not null,
  title_safe             varchar(200) not null,        -- shown to anyone who can see the action
  detail_restricted      text,                          -- only if source-record policy passes
  action_type_code       varchar(40) not null default 'TASK',
  owner_user_id          uuid references platform.app_user(id),
  owner_team_id          uuid references platform.team(id),
  priority_code          varchar(20) not null,
  status_code            varchar(20) not null,
  due_at                 timestamptz,
  visibility_class       varchar(20) not null default 'STANDARD'
                         check (visibility_class in ('STANDARD','ORG_SCOPED','CASE_RESTRICTED','VOICE_RESTRICTED')),
  visibility_org_unit_id uuid references org.organisation_unit(id),
  is_mandatory           boolean not null default false,
  completed_at           timestamptz,
  completed_by           uuid references platform.app_user(id),
  completion_notes       text,
  reopen_count           int not null default 0,
  created_at             timestamptz not null default now(),
  created_by             uuid not null references platform.app_user(id),
  updated_at             timestamptz,
  row_version            int not null default 1,
  check (owner_user_id is not null or owner_team_id is not null)
);
create index ix_action_owner on actions.action (owner_user_id, status_code, due_at);
create index ix_action_team on actions.action (owner_team_id, status_code, due_at);
create index ix_action_source on actions.action (source_module, source_record_type, source_record_id);

create table actions.action_event (
  id          bigserial primary key,
  action_id   uuid not null references actions.action(id),
  event_type  varchar(30) not null,
  from_value  varchar(200),
  to_value    varchar(200),
  reason      text,
  actor       uuid references platform.app_user(id),
  created_at  timestamptz not null default now()
);
create index ix_action_event on actions.action_event (action_id, created_at);

-- =========================================================== er
create table er.er_case (
  id                    uuid primary key default gen_random_uuid(),
  reference             varchar(30) not null unique,
  case_type_code        varchar(40) not null,
  category_code         varchar(40) not null,
  source_code           varchar(40) not null,
  summary_enc           text not null,                -- AES-256-GCM (app-level field encryption)
  incident_date         date,
  reported_date         date not null,
  priority_code         varchar(20) not null,
  confidentiality_level varchar(20) not null,
  status_code           varchar(30) not null,
  lead_officer_user_id  uuid references platform.app_user(id),
  opened_at             timestamptz not null default now(),
  closed_at             timestamptz,
  closure_reason        text,
  legal_hold            boolean not null default false,
  created_at            timestamptz not null default now(),
  created_by            uuid not null references platform.app_user(id),
  updated_at            timestamptz,
  row_version           int not null default 1
);
create index ix_case_status on er.er_case (status_code, lead_officer_user_id);

create table er.case_participant (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references er.er_case(id),
  participant_role varchar(30) not null,
  employee_uid     varchar(20),
  external_name_enc text,
  created_at       timestamptz not null default now(),
  created_by       uuid not null references platform.app_user(id)
);
create index ix_participant_case on er.case_participant (case_id);

create table er.case_team_member (
  case_id    uuid not null references er.er_case(id),
  user_id    uuid not null references platform.app_user(id),
  case_role  varchar(20) not null check (case_role in ('LEAD','OFFICER','INVESTIGATOR','REVIEWER','COMMITTEE','OBSERVER')),
  valid_from timestamptz not null default now(),
  valid_to   timestamptz,
  granted_by uuid not null references platform.app_user(id),
  primary key (case_id, user_id, valid_from)
);

create table er.case_event (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references er.er_case(id),
  event_type       varchar(40) not null,
  event_at         timestamptz not null,            -- business time
  recorded_at      timestamptz not null default now(),
  summary_enc      text not null,
  related_type     varchar(40),
  related_id       uuid,
  amends_event_id  uuid references er.case_event(id),
  amendment_reason text,
  recorded_by      uuid not null references platform.app_user(id),
  check ((amends_event_id is null) = (amendment_reason is null))
);
create index ix_case_event on er.case_event (case_id, event_at);

-- Chronology is immutable: corrections are new rows that reference the original (ER-004).
create or replace function er.tg_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'er.case_event is immutable – record an amendment instead' using errcode = '42501';
end $$;
create trigger case_event_immutable before update or delete on er.case_event
  for each row execute function er.tg_immutable();

-- ----------------------------------------------------------- RLS (defence-in-depth)
-- SECURITY DEFINER so the membership lookup is not itself filtered by RLS.
create or replace function er.can_see_case(p_case_id uuid) returns boolean
language sql stable security definer set search_path = er, platform, pg_temp as $$
  select coalesce(current_setting('app.er_override', true), '') = 'on'
      or exists (select 1 from er.case_team_member m
                  where m.case_id = p_case_id
                    and m.user_id = platform.current_user_id()
                    and now() >= m.valid_from and (m.valid_to is null or now() < m.valid_to))
      or exists (select 1 from er.er_case c
                  where c.id = p_case_id and c.created_by = platform.current_user_id())
$$;

alter table er.er_case enable row level security;
alter table er.case_event enable row level security;
alter table er.case_team_member enable row level security;
alter table er.case_participant enable row level security;

create policy er_case_rw on er.er_case
  using (created_by = platform.current_user_id() or er.can_see_case(id))
  with check (created_by = platform.current_user_id() or er.can_see_case(id));
create policy case_event_rw on er.case_event
  using (er.can_see_case(case_id)) with check (er.can_see_case(case_id));
create policy case_team_rw on er.case_team_member
  using (er.can_see_case(case_id)) with check (er.can_see_case(case_id));
create policy case_participant_rw on er.case_participant
  using (er.can_see_case(case_id)) with check (er.can_see_case(case_id));
