-- 001_foundation.sql
-- Sprint 1 baseline: platform, org, config, audit, ai (log tables), synthetic_hris.
-- Business values (categories, statuses, SLAs, numbering) are NOT defined here; they are seeded as
-- clearly-labelled SAMPLE configuration (see seed) pending BML decisions (DR-15, DR-19, DR-35 ...).

create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists ltree;
create extension if not exists btree_gist;

create schema if not exists platform;
create schema if not exists org;
create schema if not exists config;
create schema if not exists audit;
create schema if not exists ai;
create schema if not exists synthetic_hris;

-- Helper: current application user from the per-transaction setting (set by the API).
create or replace function platform.current_user_id() returns uuid
language sql stable as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;

-- =========================================================== platform
create table platform.app_user (
  id               uuid primary key default gen_random_uuid(),
  entra_object_id  uuid unique,
  upn              citext not null unique,
  display_name     varchar(200) not null,
  employee_uid     varchar(20) unique,
  status           varchar(20) not null default 'ACTIVE' check (status in ('ACTIVE','DISABLED')),
  last_login_at    timestamptz,
  is_synthetic     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

create table platform.role (
  id                  uuid primary key default gen_random_uuid(),
  code                varchar(60) not null unique,
  name                varchar(120) not null,
  description         text,
  entra_group_id      uuid,
  is_privileged       boolean not null default false,
  allowed_scope_types varchar(20)[] not null default '{BANK}',
  status_note         varchar(60),              -- e.g. 'Proposed – DR-28'
  created_at          timestamptz not null default now()
);

create table platform.permission (
  code                varchar(100) primary key,
  module              varchar(40) not null,
  description         text not null,
  is_restricted_field boolean not null default false
);

create table platform.role_permission (
  role_id         uuid not null references platform.role(id),
  permission_code varchar(100) not null references platform.permission(code),
  primary key (role_id, permission_code)
);

create table platform.team (
  id     uuid primary key default gen_random_uuid(),
  code   varchar(60) not null unique,
  name   varchar(120) not null,
  module varchar(40) not null
);

create table platform.team_member (
  team_id      uuid not null references platform.team(id),
  user_id      uuid not null references platform.app_user(id),
  role_in_team varchar(20) not null default 'MEMBER' check (role_in_team in ('MEMBER','LEAD')),
  valid_from   timestamptz not null default now(),
  valid_to     timestamptz,
  primary key (team_id, user_id, valid_from)
);

create table platform.outbox (
  id           bigserial primary key,
  topic        varchar(60) not null,
  payload      jsonb not null,
  created_at   timestamptz not null default now(),
  processed_at timestamptz,
  attempts     int not null default 0
);
create index ix_outbox_pending on platform.outbox (id) where processed_at is null;

create table platform.privileged_access_grant (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references platform.app_user(id),
  permission_code varchar(100) not null references platform.permission(code),
  resource_type   varchar(60) not null,
  resource_id     varchar(64),
  reason          text not null,
  approved_by     uuid not null references platform.app_user(id),
  starts_at       timestamptz not null,
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

-- =========================================================== org (effective-dated, configurable levels – DR-05)
create table org.org_level_type (
  code  varchar(20) primary key,
  depth int not null unique,
  label varchar(60) not null
);

create table org.organisation_unit (
  id          uuid primary key default gen_random_uuid(),
  source_code varchar(40) not null unique
);

create table org.organisation_unit_version (
  id                 uuid primary key default gen_random_uuid(),
  org_unit_id        uuid not null references org.organisation_unit(id),
  parent_org_unit_id uuid references org.organisation_unit(id),
  level_type_code    varchar(20) not null references org.org_level_type(code),
  name               varchar(200) not null,
  path               ltree not null,
  head_employee_uid  varchar(20),
  effective_from     date not null,
  effective_to       date,
  created_at         timestamptz not null default now(),
  exclude using gist (org_unit_id with =, daterange(effective_from, effective_to) with &&)
);
create index ix_ouv_path on org.organisation_unit_version using gist (path);
create index ix_ouv_unit on org.organisation_unit_version (org_unit_id, effective_from);

-- Scope grants (role within scope for a period). Maker-checker fields ready for Sprint 2 admin UI.
create table platform.user_scope (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references platform.app_user(id),
  role_id             uuid not null references platform.role(id),
  scope_type          varchar(20) not null check (scope_type in ('BANK','ORG_UNIT','SELF','NONE')),
  org_unit_id         uuid references org.organisation_unit(id),
  include_descendants boolean not null default true,
  valid_from          timestamptz not null,
  valid_to            timestamptz,
  grant_reason        text not null,
  source              varchar(20) not null default 'PLATFORM_GRANT',
  status              varchar(20) not null default 'APPROVED',
  created_by          uuid,
  approved_by         uuid,
  created_at          timestamptz not null default now(),
  check ((scope_type = 'ORG_UNIT') = (org_unit_id is not null))
);
create index ix_user_scope_user on platform.user_scope (user_id, valid_to);

-- =========================================================== config
create table config.configuration_item (
  id                   uuid primary key default gen_random_uuid(),
  namespace            varchar(60) not null,
  key                  varchar(100) not null,
  scope_type           varchar(20) not null default 'GLOBAL',
  scope_ref            varchar(64),
  value                jsonb not null,
  value_schema_version int not null default 1,
  status               varchar(20) not null default 'DRAFT' check (status in ('DRAFT','PENDING_APPROVAL','APPROVED','RETIRED','REJECTED')),
  effective_from       date not null,
  effective_to         date,
  created_by           uuid,
  approved_by          uuid,
  approved_at          timestamptz,
  created_at           timestamptz not null default now(),
  unique (namespace, key, scope_type, scope_ref, effective_from)
);

create table config.feature_flag (
  key         varchar(80) primary key,
  enabled     boolean not null default false,
  description text,
  audience    jsonb,
  environment varchar(10) not null default 'dev',
  updated_at  timestamptz not null default now()
);

create table config.lookup_set (
  code        varchar(60) primary key,
  description text,
  is_sample   boolean not null default true    -- true = placeholder pending BML decision
);

create table config.lookup_value (
  set_code       varchar(60) not null references config.lookup_set(code),
  code           varchar(40) not null,
  label          varchar(120) not null,
  sort           int not null default 0,
  active         boolean not null default true,
  metadata       jsonb,
  effective_from date not null default '2020-01-01',
  effective_to   date,
  primary key (set_code, code)
);

create table config.business_calendar (
  code         varchar(40) primary key,
  name         varchar(120) not null,
  working_days int[] not null,       -- ISO weekdays (1=Mon..7=Sun). NOT hard-coded in code (DR-35)
  timezone     varchar(40) not null default 'Indian/Maldives',
  is_sample    boolean not null default true
);

create table config.calendar_holiday (
  calendar_code varchar(40) not null references config.business_calendar(code),
  date          date not null,
  name          varchar(120) not null,
  primary key (calendar_code, date)
);

create table config.sequence_rule (
  code         varchar(40) primary key,
  format       varchar(80) not null,  -- tokens: {YYYY} {SEQ:n}
  reset_policy varchar(20) not null default 'YEARLY',
  is_sample    boolean not null default true
);

create table config.sequence_counter (
  rule_code  varchar(40) not null references config.sequence_rule(code),
  period_key varchar(20) not null,
  last_value bigint not null default 0,
  primary key (rule_code, period_key)
);

create table config.state_machine (
  code           varchar(60) not null,
  version        int not null,
  definition     jsonb not null,
  status         varchar(20) not null default 'APPROVED',
  is_sample      boolean not null default true,
  effective_from date not null default '2020-01-01',
  primary key (code, version)
);

create table config.retention_class (
  code             varchar(30) primary key,
  description      text not null,
  retention_period interval,          -- null until DR-09 approved; no automated deletion
  trigger_event    varchar(60),
  disposition      varchar(30)
);

-- =========================================================== audit (append-only, hash-chained)
create sequence audit.chain_seq;

create table audit.audit_event (
  id             bigint generated always as identity primary key,
  chain_seq      bigint not null unique,
  occurred_at    timestamptz not null,
  recorded_at    timestamptz not null default now(),
  actor_user_id  uuid,
  actor_type     varchar(20) not null check (actor_type in ('USER','SYSTEM','JOB')),
  on_behalf_of   uuid,
  event_type     varchar(80) not null,
  module         varchar(40) not null,
  resource_type  varchar(60) not null,
  resource_id    varchar(64),
  outcome        varchar(20) not null check (outcome in ('SUCCESS','DENIED','FAILED')),
  sensitivity    varchar(10) not null check (sensitivity in ('INT','CONF','REST','HREST')),
  summary        jsonb,
  correlation_id uuid not null,
  client_ip_hash varchar(64),
  prev_hash      bytea not null,
  row_hash       bytea not null
);
create index ix_audit_resource on audit.audit_event (resource_type, resource_id, occurred_at);
create index ix_audit_actor on audit.audit_event (actor_user_id, occurred_at);
create index ix_audit_type on audit.audit_event (event_type, occurred_at);
create index ix_audit_time on audit.audit_event using brin (occurred_at);

create or replace function audit.canonical(e audit.audit_event) returns text
language sql immutable as $$
  select concat_ws('|',
    e.chain_seq::text,
    to_char(e.occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    coalesce(e.actor_user_id::text, ''), e.actor_type, coalesce(e.on_behalf_of::text, ''),
    e.event_type, e.module, e.resource_type, coalesce(e.resource_id, ''), e.outcome, e.sensitivity,
    coalesce(e.summary::text, ''), e.correlation_id::text)
$$;

create or replace function audit.tg_chain() returns trigger
language plpgsql as $$
declare prev bytea;
begin
  perform pg_advisory_xact_lock(727201);          -- serialise chain writers
  new.chain_seq := nextval('audit.chain_seq');
  select row_hash into prev from audit.audit_event order by chain_seq desc limit 1;
  new.prev_hash := coalesce(prev, decode(repeat('00', 32), 'hex'));
  new.row_hash  := digest(new.prev_hash || convert_to(audit.canonical(new), 'UTF8'), 'sha256');
  return new;
end $$;

create trigger audit_chain before insert on audit.audit_event
  for each row execute function audit.tg_chain();

create or replace function audit.tg_block_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'audit.audit_event is append-only (% blocked)', tg_op using errcode = '42501';
end $$;

create trigger audit_block_update before update or delete on audit.audit_event
  for each row execute function audit.tg_block_mutation();
create trigger audit_block_truncate before truncate on audit.audit_event
  for each statement execute function audit.tg_block_mutation();

-- Returns the first chain_seq whose hash does not verify (null = chain intact).
create or replace function audit.verify_chain() returns table(checked bigint, first_broken bigint)
language plpgsql stable as $$
declare r audit.audit_event; prev bytea := decode(repeat('00', 32), 'hex'); n bigint := 0;
begin
  for r in select * from audit.audit_event order by chain_seq loop
    n := n + 1;
    if r.prev_hash <> prev
       or r.row_hash <> digest(prev || convert_to(audit.canonical(r), 'UTF8'), 'sha256') then
      checked := n; first_broken := r.chain_seq; return next; return;
    end if;
    prev := r.row_hash;
  end loop;
  checked := n; first_broken := null; return next;
end $$;

-- =========================================================== ai (governance log tables only – Sprint 1)
create table ai.ai_model_registry (
  id              uuid primary key default gen_random_uuid(),
  provider        varchar(40) not null,
  deployment_name varchar(120) not null,
  model_version   varchar(60) not null,
  purpose         varchar(20) not null,
  approved_for    jsonb,
  status          varchar(20) not null default 'DRAFT'
);
create table ai.prompt_template (
  id            uuid primary key default gen_random_uuid(),
  use_case_code varchar(60) not null unique
);
create table ai.prompt_template_version (
  id                 uuid primary key default gen_random_uuid(),
  prompt_template_id uuid not null references ai.prompt_template(id),
  version_no         int not null,
  system_text        text not null,
  task_text          text not null,
  output_schema      jsonb,
  validators         text[],
  status             varchar(20) not null default 'DRAFT',
  unique (prompt_template_id, version_no)
);
create table ai.ai_interaction (
  id                  uuid primary key default gen_random_uuid(),
  use_case_code       varchar(60) not null,
  prompt_version_id   uuid references ai.prompt_template_version(id),
  model_id            uuid references ai.ai_model_registry(id),
  user_id             uuid references platform.app_user(id),
  source_module       varchar(40) not null,
  source_record_type  varchar(60),
  source_record_id    varchar(64),
  input_hash          varchar(64) not null,
  input_payload_enc   bytea,
  output_payload_enc  bytea,
  validation_result   jsonb,
  status              varchar(20) not null default 'DRAFT',
  reviewed_by         uuid,
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now()
);
create table ai.ai_interaction_source (
  interaction_id uuid not null references ai.ai_interaction(id),
  source_type    varchar(40) not null,
  source_ref     varchar(100) not null,
  source_version varchar(40),
  rank           int not null default 0
);

-- =========================================================== synthetic HRIS (DEV/UAT only – excluded from PROD)
create table synthetic_hris.employee (
  uid            varchar(20) primary key,
  full_name      varchar(200) not null,
  email          citext not null unique,
  status         varchar(20) not null,
  join_date      date not null,
  leave_date     date,
  grade          varchar(10) not null,
  position_title varchar(160) not null,
  org_unit_id    uuid not null references org.organisation_unit(id),
  manager_uid    varchar(20),
  nid            varchar(30) not null,
  passport       varchar(30),
  salary         numeric(14,2) not null,
  currency       char(3) not null default 'MVR',
  is_synthetic   boolean not null default true check (is_synthetic)
);
create index ix_syn_emp_org on synthetic_hris.employee (org_unit_id);
create index ix_syn_emp_name on synthetic_hris.employee (lower(full_name));

create table synthetic_hris.position_history (
  id             bigserial primary key,
  uid            varchar(20) not null references synthetic_hris.employee(uid),
  position_title varchar(160) not null,
  grade          varchar(10) not null,
  org_unit_id    uuid not null references org.organisation_unit(id),
  effective_from date not null,
  effective_to   date,
  change_type    varchar(20) not null  -- HIRE / TRANSFER / PROMOTION
);
create index ix_syn_pos_uid on synthetic_hris.position_history (uid, effective_from);
