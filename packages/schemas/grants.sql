-- grants.sql – re-applied after every migration run (idempotent).
-- app_runtime: DML only. No UPDATE/DELETE on audit or immutable tables. Not the table owner, so RLS applies.

grant usage on schema platform, org, config, audit, ai, synthetic_hris, actions, er to app_runtime;

grant select, insert, update on all tables in schema platform, org, config, ai, actions, er to app_runtime;
grant select on all tables in schema synthetic_hris to app_runtime;
grant usage, select on all sequences in schema platform, org, config, ai, actions, er to app_runtime;

-- Audit: append + read only.
revoke all on all tables in schema audit from app_runtime;
grant select, insert on audit.audit_event to app_runtime;
grant usage, select on sequence audit.chain_seq to app_runtime;
grant execute on function audit.verify_chain() to app_runtime;

-- Immutable records: no UPDATE for runtime (triggers also block).
revoke update, delete on er.case_event, actions.action_event, platform.permission from app_runtime;
-- Nothing in the platform may be hard-deleted by the runtime role.
revoke delete on all tables in schema platform, org, config, ai, actions, er from app_runtime;

grant execute on function er.case_exists(uuid), er.can_see_case(uuid) to app_runtime;
grant select on public.schema_migrations to app_runtime;
