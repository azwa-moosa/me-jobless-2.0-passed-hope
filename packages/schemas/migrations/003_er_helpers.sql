-- 003_er_helpers.sql
-- Lets the API distinguish "exists but not permitted" (403 + audit) from "does not exist" (404)
-- without granting the runtime role visibility of the row itself.
create or replace function er.case_exists(p_case_id uuid) returns boolean
language sql stable security definer set search_path = er, pg_temp as $$
  select exists (select 1 from er.er_case where id = p_case_id)
$$;
revoke all on function er.case_exists(uuid) from public;
