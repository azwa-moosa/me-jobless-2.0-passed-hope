# Data dictionary (generated)

Generated 2026-09-29 by `pnpm db:dictionary`. Do not edit by hand.


## actions.action

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| reference | character varying |  |  |
| source_module | character varying |  |  |
| source_record_type | character varying |  |  |
| source_record_id | uuid |  |  |
| title_safe | character varying |  |  |
| detail_restricted | text | yes |  |
| action_type_code | character varying |  | 'TASK'::character varying |
| owner_user_id | uuid | yes |  |
| owner_team_id | uuid | yes |  |
| priority_code | character varying |  |  |
| status_code | character varying |  |  |
| due_at | timestamp with time zone | yes |  |
| visibility_class | character varying |  | 'STANDARD'::character varying |
| visibility_org_unit_id | uuid | yes |  |
| is_mandatory | boolean |  | false |
| completed_at | timestamp with time zone | yes |  |
| completed_by | uuid | yes |  |
| completion_notes | text | yes |  |
| reopen_count | integer |  | 0 |
| created_at | timestamp with time zone |  | now() |
| created_by | uuid |  |  |
| updated_at | timestamp with time zone | yes |  |
| row_version | integer |  | 1 |

## actions.action_event

| Column | Type | Null | Default |
|---|---|---|---|
| id | bigint |  | nextval('actions.action_event_id_seq'::r |
| action_id | uuid |  |  |
| event_type | character varying |  |  |
| from_value | character varying | yes |  |
| to_value | character varying | yes |  |
| reason | text | yes |  |
| actor | uuid | yes |  |
| created_at | timestamp with time zone |  | now() |

## ai.ai_interaction

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| use_case_code | character varying |  |  |
| prompt_version_id | uuid | yes |  |
| model_id | uuid | yes |  |
| user_id | uuid | yes |  |
| source_module | character varying |  |  |
| source_record_type | character varying | yes |  |
| source_record_id | character varying | yes |  |
| input_hash | character varying |  |  |
| input_payload_enc | bytea | yes |  |
| output_payload_enc | bytea | yes |  |
| validation_result | jsonb | yes |  |
| status | character varying |  | 'DRAFT'::character varying |
| reviewed_by | uuid | yes |  |
| reviewed_at | timestamp with time zone | yes |  |
| created_at | timestamp with time zone |  | now() |

## ai.ai_interaction_source

| Column | Type | Null | Default |
|---|---|---|---|
| interaction_id | uuid |  |  |
| source_type | character varying |  |  |
| source_ref | character varying |  |  |
| source_version | character varying | yes |  |
| rank | integer |  | 0 |

## ai.ai_model_registry

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| provider | character varying |  |  |
| deployment_name | character varying |  |  |
| model_version | character varying |  |  |
| purpose | character varying |  |  |
| approved_for | jsonb | yes |  |
| status | character varying |  | 'DRAFT'::character varying |

## ai.prompt_template

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| use_case_code | character varying |  |  |

## ai.prompt_template_version

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| prompt_template_id | uuid |  |  |
| version_no | integer |  |  |
| system_text | text |  |  |
| task_text | text |  |  |
| output_schema | jsonb | yes |  |
| validators | _text | yes |  |
| status | character varying |  | 'DRAFT'::character varying |

## audit.audit_event

| Column | Type | Null | Default |
|---|---|---|---|
| id | bigint |  |  |
| chain_seq | bigint |  |  |
| occurred_at | timestamp with time zone |  |  |
| recorded_at | timestamp with time zone |  | now() |
| actor_user_id | uuid | yes |  |
| actor_type | character varying |  |  |
| on_behalf_of | uuid | yes |  |
| event_type | character varying |  |  |
| module | character varying |  |  |
| resource_type | character varying |  |  |
| resource_id | character varying | yes |  |
| outcome | character varying |  |  |
| sensitivity | character varying |  |  |
| summary | jsonb | yes |  |
| correlation_id | uuid |  |  |
| client_ip_hash | character varying | yes |  |
| prev_hash | bytea |  |  |
| row_hash | bytea |  |  |

## config.business_calendar

| Column | Type | Null | Default |
|---|---|---|---|
| code | character varying |  |  |
| name | character varying |  |  |
| working_days | _int4 |  |  |
| timezone | character varying |  | 'Indian/Maldives'::character varying |
| is_sample | boolean |  | true |

## config.calendar_holiday

| Column | Type | Null | Default |
|---|---|---|---|
| calendar_code | character varying |  |  |
| date | date |  |  |
| name | character varying |  |  |

## config.configuration_item

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| namespace | character varying |  |  |
| key | character varying |  |  |
| scope_type | character varying |  | 'GLOBAL'::character varying |
| scope_ref | character varying | yes |  |
| value | jsonb |  |  |
| value_schema_version | integer |  | 1 |
| status | character varying |  | 'DRAFT'::character varying |
| effective_from | date |  |  |
| effective_to | date | yes |  |
| created_by | uuid | yes |  |
| approved_by | uuid | yes |  |
| approved_at | timestamp with time zone | yes |  |
| created_at | timestamp with time zone |  | now() |

## config.feature_flag

| Column | Type | Null | Default |
|---|---|---|---|
| key | character varying |  |  |
| enabled | boolean |  | false |
| description | text | yes |  |
| audience | jsonb | yes |  |
| environment | character varying |  | 'dev'::character varying |
| updated_at | timestamp with time zone |  | now() |

## config.lookup_set

| Column | Type | Null | Default |
|---|---|---|---|
| code | character varying |  |  |
| description | text | yes |  |
| is_sample | boolean |  | true |

## config.lookup_value

| Column | Type | Null | Default |
|---|---|---|---|
| set_code | character varying |  |  |
| code | character varying |  |  |
| label | character varying |  |  |
| sort | integer |  | 0 |
| active | boolean |  | true |
| metadata | jsonb | yes |  |
| effective_from | date |  | '2020-01-01'::date |
| effective_to | date | yes |  |

## config.retention_class

| Column | Type | Null | Default |
|---|---|---|---|
| code | character varying |  |  |
| description | text |  |  |
| retention_period | interval | yes |  |
| trigger_event | character varying | yes |  |
| disposition | character varying | yes |  |

## config.sequence_counter

| Column | Type | Null | Default |
|---|---|---|---|
| rule_code | character varying |  |  |
| period_key | character varying |  |  |
| last_value | bigint |  | 0 |

## config.sequence_rule

| Column | Type | Null | Default |
|---|---|---|---|
| code | character varying |  |  |
| format | character varying |  |  |
| reset_policy | character varying |  | 'YEARLY'::character varying |
| is_sample | boolean |  | true |

## config.state_machine

| Column | Type | Null | Default |
|---|---|---|---|
| code | character varying |  |  |
| version | integer |  |  |
| definition | jsonb |  |  |
| status | character varying |  | 'APPROVED'::character varying |
| is_sample | boolean |  | true |
| effective_from | date |  | '2020-01-01'::date |

## er.case_event · RLS

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| case_id | uuid |  |  |
| event_type | character varying |  |  |
| event_at | timestamp with time zone |  |  |
| recorded_at | timestamp with time zone |  | now() |
| summary_enc | text |  |  |
| related_type | character varying | yes |  |
| related_id | uuid | yes |  |
| amends_event_id | uuid | yes |  |
| amendment_reason | text | yes |  |
| recorded_by | uuid |  |  |

## er.case_participant · RLS

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| case_id | uuid |  |  |
| participant_role | character varying |  |  |
| employee_uid | character varying | yes |  |
| external_name_enc | text | yes |  |
| created_at | timestamp with time zone |  | now() |
| created_by | uuid |  |  |

## er.case_team_member · RLS

| Column | Type | Null | Default |
|---|---|---|---|
| case_id | uuid |  |  |
| user_id | uuid |  |  |
| case_role | character varying |  |  |
| valid_from | timestamp with time zone |  | now() |
| valid_to | timestamp with time zone | yes |  |
| granted_by | uuid |  |  |

## er.er_case · RLS

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| reference | character varying |  |  |
| case_type_code | character varying |  |  |
| category_code | character varying |  |  |
| source_code | character varying |  |  |
| summary_enc | text |  |  |
| incident_date | date | yes |  |
| reported_date | date |  |  |
| priority_code | character varying |  |  |
| confidentiality_level | character varying |  |  |
| status_code | character varying |  |  |
| lead_officer_user_id | uuid | yes |  |
| opened_at | timestamp with time zone |  | now() |
| closed_at | timestamp with time zone | yes |  |
| closure_reason | text | yes |  |
| legal_hold | boolean |  | false |
| created_at | timestamp with time zone |  | now() |
| created_by | uuid |  |  |
| updated_at | timestamp with time zone | yes |  |
| row_version | integer |  | 1 |

## org.org_level_type

| Column | Type | Null | Default |
|---|---|---|---|
| code | character varying |  |  |
| depth | integer |  |  |
| label | character varying |  |  |

## org.organisation_unit

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| source_code | character varying |  |  |

## org.organisation_unit_version

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| org_unit_id | uuid |  |  |
| parent_org_unit_id | uuid | yes |  |
| level_type_code | character varying |  |  |
| name | character varying |  |  |
| path | ltree |  |  |
| head_employee_uid | character varying | yes |  |
| effective_from | date |  |  |
| effective_to | date | yes |  |
| created_at | timestamp with time zone |  | now() |

## platform.app_user

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| entra_object_id | uuid | yes |  |
| upn | citext |  |  |
| display_name | character varying |  |  |
| employee_uid | character varying | yes |  |
| status | character varying |  | 'ACTIVE'::character varying |
| last_login_at | timestamp with time zone | yes |  |
| is_synthetic | boolean |  | false |
| created_at | timestamp with time zone |  | now() |
| updated_at | timestamp with time zone | yes |  |

## platform.outbox

| Column | Type | Null | Default |
|---|---|---|---|
| id | bigint |  | nextval('platform.outbox_id_seq'::regcla |
| topic | character varying |  |  |
| payload | jsonb |  |  |
| created_at | timestamp with time zone |  | now() |
| processed_at | timestamp with time zone | yes |  |
| attempts | integer |  | 0 |

## platform.permission

| Column | Type | Null | Default |
|---|---|---|---|
| code | character varying |  |  |
| module | character varying |  |  |
| description | text |  |  |
| is_restricted_field | boolean |  | false |

## platform.privileged_access_grant

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| user_id | uuid |  |  |
| permission_code | character varying |  |  |
| resource_type | character varying |  |  |
| resource_id | character varying | yes |  |
| reason | text |  |  |
| approved_by | uuid |  |  |
| starts_at | timestamp with time zone |  |  |
| expires_at | timestamp with time zone |  |  |
| created_at | timestamp with time zone |  | now() |

## platform.role

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| code | character varying |  |  |
| name | character varying |  |  |
| description | text | yes |  |
| entra_group_id | uuid | yes |  |
| is_privileged | boolean |  | false |
| allowed_scope_types | _varchar |  | '{BANK}'::character varying[] |
| status_note | character varying | yes |  |
| created_at | timestamp with time zone |  | now() |

## platform.role_permission

| Column | Type | Null | Default |
|---|---|---|---|
| role_id | uuid |  |  |
| permission_code | character varying |  |  |

## platform.team

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| code | character varying |  |  |
| name | character varying |  |  |
| module | character varying |  |  |

## platform.team_member

| Column | Type | Null | Default |
|---|---|---|---|
| team_id | uuid |  |  |
| user_id | uuid |  |  |
| role_in_team | character varying |  | 'MEMBER'::character varying |
| valid_from | timestamp with time zone |  | now() |
| valid_to | timestamp with time zone | yes |  |

## platform.user_scope

| Column | Type | Null | Default |
|---|---|---|---|
| id | uuid |  | gen_random_uuid() |
| user_id | uuid |  |  |
| role_id | uuid |  |  |
| scope_type | character varying |  |  |
| org_unit_id | uuid | yes |  |
| include_descendants | boolean |  | true |
| valid_from | timestamp with time zone |  |  |
| valid_to | timestamp with time zone | yes |  |
| grant_reason | text |  |  |
| source | character varying |  | 'PLATFORM_GRANT'::character varying |
| status | character varying |  | 'APPROVED'::character varying |
| created_by | uuid | yes |  |
| approved_by | uuid | yes |  |
| created_at | timestamp with time zone |  | now() |

## synthetic_hris.employee

| Column | Type | Null | Default |
|---|---|---|---|
| uid | character varying |  |  |
| full_name | character varying |  |  |
| email | citext |  |  |
| status | character varying |  |  |
| join_date | date |  |  |
| leave_date | date | yes |  |
| grade | character varying |  |  |
| position_title | character varying |  |  |
| org_unit_id | uuid |  |  |
| manager_uid | character varying | yes |  |
| nid | character varying |  |  |
| passport | character varying | yes |  |
| salary | numeric |  |  |
| currency | character |  | 'MVR'::bpchar |
| is_synthetic | boolean |  | true |

## synthetic_hris.position_history

| Column | Type | Null | Default |
|---|---|---|---|
| id | bigint |  | nextval('synthetic_hris.position_history |
| uid | character varying |  |  |
| position_title | character varying |  |  |
| grade | character varying |  |  |
| org_unit_id | uuid |  |  |
| effective_from | date |  |  |
| effective_to | date | yes |  |
| change_type | character varying |  |  |
