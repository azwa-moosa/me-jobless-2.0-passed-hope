# E. Database / Domain Model

Status: **Logical model v0.1 – DRAFT.** Target: PostgreSQL 16 (provisional, DR-02). Business field lists for datasets, ER, templates and letters are **placeholders to be replaced by the approved dictionaries** (DR-04, DR-11, DR-12, DR-15, DR-30). No BML business values are encoded here.

## E.0 Conventions

| Convention | Definition |
|---|---|
| PK | `id uuid` (UUIDv7, time-ordered) unless stated |
| **[STD]** | `created_at timestamptz NN default now()`, `created_by uuid NN → platform.app_user`, `updated_at timestamptz NULL`, `updated_by uuid NULL`, `row_version int NN default 1` (optimistic locking) |
| **[IMM]** | Immutable row: `created_at`, `created_by` only; UPDATE/DELETE revoked from app role; trigger raises on attempt |
| **[EFF]** | `effective_from date NN`, `effective_to date NULL` (exclusive); `EXCLUDE USING gist (key WITH =, daterange(effective_from, effective_to) WITH &&)` – no overlapping versions |
| **[APPR]** | `status` (`DRAFT`,`PENDING_APPROVAL`,`APPROVED`,`RETIRED`/`REJECTED`), `approved_by uuid NULL`, `approved_at timestamptz NULL`, `approval_id uuid NULL → actions.approval` |
| Sensitivity | **INT** Internal · **CONF** Confidential · **REST** Restricted · **HREST** Highly Restricted — placeholder labels to map to BML scheme (DR-08) |
| Retention | Retention class code, e.g. `RC-ER`; **periods are not set** (DR-09). No automatic deletion until approved |
| Employee reference | `employee_uid varchar(20)` – BML UID, **not** a FK to any employee master (none exists). Validated through EmployeeService |
| Money | `numeric(14,2)` + `currency char(3)`; never float |
| Enums | Business enums (categories, statuses, priorities) are `varchar` codes validated against `config.lookup_value`, **not** Postgres enums, so they stay configurable |
| Soft delete | Not used for sensitive records; closure/retirement states instead |

---

## E.1 Platform – identity & access (schema `platform`)

### User — `platform.app_user` · CONF · RC-PLATFORM · [STD]
| Column | Type | Null | Notes |
|---|---|---|---|
| id | uuid | NN | PK |
| entra_object_id | uuid | NULL | Unique when present (null for DEV mock personas) |
| upn | citext | NN | Unique |
| display_name | varchar(200) | NN | |
| employee_uid | varchar(20) | NULL | Link to EmployeeService identity; unique when present |
| status | varchar(20) | NN | ACTIVE / DISABLED |
| last_login_at | timestamptz | NULL | |
| is_synthetic | boolean | NN | true only in DEV/UAT personas |
Indexes: `ux_user_upn`, `ux_user_entra_oid (where not null)`, `ux_user_uid (where not null)`.

### Role — `platform.role` · INT · RC-PLATFORM · [STD]
| Column | Type | Null | Notes |
|---|---|---|---|
| id | uuid | NN | PK |
| code | varchar(60) | NN | Unique, e.g. `ER_OFFICER` |
| name, description | varchar / text | NN / NULL | |
| entra_group_id | uuid | NULL | If role membership is sourced from Entra (DR-06) |
| is_privileged | boolean | NN | Requires dual approval to grant |
| allowed_scope_types | varchar[] | NN | e.g. {BANK,DIVISION} |

### Permission — `platform.permission` · INT · [IMM, seeded from code catalogue]
`code varchar(100) PK` (e.g. `er.evidence.download`), `module`, `description`, `is_restricted_field boolean`.

### RolePermission — `platform.role_permission` · INT · [STD]
PK (`role_id`, `permission_code`). FKs → role, permission.

### UserRoleAssignment + UserScope — `platform.user_scope` · CONF · RC-PLATFORM · [STD][APPR]
One row = one user holding one role within one scope for a period.
| Column | Type | Null | Notes |
|---|---|---|---|
| id | uuid | NN | PK |
| user_id | uuid | NN | FK app_user |
| role_id | uuid | NN | FK role |
| scope_type | varchar(20) | NN | BANK / ORG_UNIT / SELF / NONE (case & record grants are separate tables) |
| org_unit_id | uuid | NULL | FK org.organisation_unit; required when ORG_UNIT |
| include_descendants | boolean | NN | default true |
| valid_from | timestamptz | NN | |
| valid_to | timestamptz | NULL | |
| grant_reason | text | NN | |
| source | varchar(20) | NN | ENTRA_SYNC / PLATFORM_GRANT |
Indexes: `(user_id, valid_to)`, `(org_unit_id)`. Constraint: `org_unit_id` NN iff scope_type = ORG_UNIT. Maker ≠ approver (app rule + check on approval).

### PrivilegedAccessGrant — `platform.privileged_access_grant` · REST · RC-AUDIT · [IMM]
Break-glass/time-boxed elevated access (DR-44): `user_id`, `permission_code`, `resource_type`, `resource_id NULL`, `reason`, `approved_by`, `starts_at`, `expires_at`. Index `(user_id, expires_at)`.

### Team / TeamMember — `platform.team`, `platform.team_member` · INT · [STD]
Work teams for Action ownership (e.g. "ER Team", "Analytics Team"). `team(code unique, name, module)`; `team_member(team_id, user_id, role_in_team, valid_from, valid_to)` unique `(team_id,user_id,valid_from)`.

---

## E.2 Organisation (schema `org`)

### OrgLevelType — `org.org_level_type` · INT · [STD]
`code PK` (BANK, DIVISION, SECTION?, DEPARTMENT, UNIT – **configurable**, DR-05), `depth int unique`, `label`.

### OrganisationUnit — `org.organisation_unit` · INT · RC-PLATFORM · [STD]
Stable identity: `id`, `source_code varchar(40) unique` (code from authoritative org source).

### OrganisationUnitVersion — `org.organisation_unit_version` · INT · [STD][EFF]
| Column | Type | Null | Notes |
|---|---|---|---|
| id | uuid | NN | PK |
| org_unit_id | uuid | NN | FK organisation_unit |
| parent_org_unit_id | uuid | NULL | FK organisation_unit (null = Bank root) |
| level_type_code | varchar(20) | NN | FK org_level_type |
| name | varchar(200) | NN | |
| path | ltree | NN | Materialised ancestry for scope queries |
| head_employee_uid | varchar(20) | NULL | If provided by source |
| source_batch_id | uuid | NULL | Org import batch |
Indexes: GiST on `path`, `(org_unit_id, effective_from)`; [EFF] exclusion on `org_unit_id`.

---

## E.3 Employee abstraction (no master)

EmployeeService exposes: `EmployeeSummary`, `EmployeeProfile` (field-projected), `PositionHistoryEntry`, `OrgPlacement`. Provider implementations:

| Provider | Environment | Storage |
|---|---|---|
| `synthetic` | DEV/UAT | `synthetic_hris.*` tables (separate schema, generated, dropped in PROD build) |
| `hris` | UAT/PROD | Authoritative HRIS API (DR-04). **No local copy** except short-lived request cache |

### EmployeeSnapshot — `analytics.employee_snapshot` · CONF · RC-ANALYTICS-SRC · [IMM after snapshot approval]
Analytics-only, period-bound record from the approved Staff Master upload. **Not used by ER, Voice or Document Studio.**
| Column | Type | Null | Notes |
|---|---|---|---|
| id | uuid | NN | PK |
| dataset_snapshot_id | uuid | NN | FK analytics.dataset_snapshot |
| reporting_period_id | uuid | NN | FK reporting_period |
| employee_uid | varchar(20) | NN | |
| employment_status | varchar(30) | NN | Code per field dictionary (DR-12) |
| join_date | date | NULL | |
| grade_code, role_title | varchar | NULL | |
| manager_uid | varchar(20) | NULL | |
| org_unit_id | uuid | NULL | Resolved FK org.organisation_unit (validation issue if unresolved) |
| location_code | varchar(40) | NULL | |
| demographic_band fields | varchar | NULL | Bands only (e.g. gender, age band) per approved dictionary |
| attributes | jsonb | NULL | Additional approved fields from dataset schema version |
Unique `(dataset_snapshot_id, employee_uid)`. Indexes `(reporting_period_id, org_unit_id)`.

---

## E.4 Configuration (schema `config`)

| Entity | Key fields | Class | Notes |
|---|---|---|---|
| **Configuration** `config.configuration_item` | `namespace`, `key`, `scope_type`, `scope_ref NULL`, `value jsonb`, `value_schema_version`, [EFF][APPR][STD] | INT | Unique `(namespace,key,scope_type,scope_ref,effective_from)`; [EFF] exclusion on approved rows |
| **FeatureFlag** `config.feature_flag` | `key unique`, `enabled`, `audience jsonb` (roles/users), `environment` [STD] | INT | |
| **LookupSet / LookupValue** `config.lookup_set`, `config.lookup_value` | set `code`; value `(set_code, code) unique`, `label`, `sort`, `active`, `metadata jsonb` [EFF][APPR] | INT | ER categories, Voice categories, priorities, statuses |
| **SlaRule** `config.sla_rule` | `module`, `record_type`, `category_code NULL`, `priority_code NULL`, `stage_code NULL`, `duration_value`, `duration_unit` (HOURS/DAYS/BUSINESS_DAYS), `calendar_id`, `reminder_offsets jsonb`, `escalation_path jsonb` [EFF][APPR] | INT | Values supplied by DR-16/DR-36 |
| **BusinessCalendar / CalendarHoliday** | calendar `code`, `working_days int[]` (ISO weekdays), `timezone`; holiday `(calendar_id, date) unique`, `name` [STD] | INT | Working week **not hard-coded** (DR-35) |
| **SequenceRule / SequenceCounter** | rule `code unique`, `format` (tokens), `reset_policy`; counter `(rule_code, period_key) unique`, `last_value` | INT | Allocation with `SELECT … FOR UPDATE`; DR-19/DR-30 |
| **StateMachineDefinition** `config.state_machine` | `code` (e.g. `er.case`), `version`, `definition jsonb` (states, transitions, required permissions, guards) [EFF][APPR] | INT | ER/Voice/Action workflows configurable (DR-15) |
| **RetentionClass** `config.retention_class` | `code unique`, `description`, `retention_period NULL`, `trigger_event`, `disposition` [APPR] | INT | Period null until DR-09 |

---

## E.5 Audit (schema `audit`)

### AuditEvent — `audit.audit_event` · CONF · RC-AUDIT · [IMM]
| Column | Type | Null | Notes |
|---|---|---|---|
| id | bigint identity | NN | PK (monotonic) |
| occurred_at | timestamptz | NN | |
| actor_user_id | uuid | NULL | Null for system; **never set for validated anonymous Voice actions** |
| actor_type | varchar(20) | NN | USER / SYSTEM / JOB |
| on_behalf_of | uuid | NULL | |
| event_type | varchar(80) | NN | From audit catalogue (`er.case.status_changed`) |
| module | varchar(40) | NN | |
| resource_type | varchar(60) | NN | |
| resource_id | varchar(64) | NULL | |
| outcome | varchar(20) | NN | SUCCESS / DENIED / FAILED |
| sensitivity | varchar(10) | NN | Determines who may read the event |
| summary | jsonb | NULL | Changed field **names**, old/new for non-restricted values only; restricted values replaced by `"[REDACTED]"` |
| correlation_id | uuid | NN | |
| client_ip_hash | varchar(64) | NULL | Hashed; policy per DR-37 |
| prev_hash / row_hash | bytea | NN | SHA-256 hash chain for tamper evidence |
Indexes: `(resource_type, resource_id, occurred_at)`, `(actor_user_id, occurred_at)`, `(event_type, occurred_at)`, BRIN on `occurred_at`. DB: app role has INSERT/SELECT only; trigger blocks UPDATE/DELETE; monthly partitions; periodic sealed export to immutable blob (PROD, DR-37).

### OutboxMessage — `platform.outbox` · inherits · RC-PLATFORM
`id`, `topic`, `payload jsonb`, `created_at`, `processed_at NULL`, `attempts`. Written in the business transaction; relayed to audit/notifications/jobs.

---

## E.6 Actions, approvals, notifications (schema `actions`, `notify`)

### Action — `actions.action` · CONF (inherits source) · RC-ACTION · [STD]
| Column | Type | Null | Notes |
|---|---|---|---|
| id | uuid | NN | PK |
| reference | varchar(30) | NN | Unique (sequence rule) |
| source_module | varchar(40) | NN | analytics / engagement / er / voice / manager / studio / platform |
| source_record_type | varchar(60) | NN | |
| source_record_id | uuid | NN | |
| title_safe | varchar(200) | NN | Non-sensitive title shown to any viewer of the action |
| detail_restricted | text | NULL | Only shown to users passing source-record policy |
| action_type_code | varchar(40) | NN | Lookup |
| owner_user_id | uuid | NULL | FK app_user; one of owner/team required |
| owner_team_id | uuid | NULL | FK team |
| priority_code | varchar(20) | NN | Lookup |
| status_code | varchar(20) | NN | Per state machine `actions.action` |
| due_at | timestamptz | NULL | |
| sla_rule_id | uuid | NULL | FK sla_rule (version applied) |
| sla_breached_at | timestamptz | NULL | |
| visibility_class | varchar(20) | NN | STANDARD / ORG_SCOPED / CASE_RESTRICTED / VOICE_RESTRICTED |
| visibility_org_unit_id | uuid | NULL | For ORG_SCOPED |
| completed_at, completed_by | timestamptz, uuid | NULL | |
| completion_notes | text | NULL | |
| reopen_count | int | NN | |
Indexes: `(owner_user_id, status_code, due_at)`, `(owner_team_id, status_code, due_at)`, `(source_module, source_record_type, source_record_id)`, partial `(due_at) where status not in terminal`. CHECK owner_user_id or owner_team_id NN.

### ActionEvent — `actions.action_event` · inherits · [IMM]
`action_id`, `event_type` (CREATED, ASSIGNED, REASSIGNED, STATUS_CHANGED, REMINDED, ESCALATED, COMPLETED, REOPENED, COMMENTED), `from_value`, `to_value`, `reason`, `actor`. Index `(action_id, created_at)`.

### ActionDependency — `actions.action_dependency` · [STD]
PK (`action_id`, `depends_on_action_id`), `dependency_type` (BLOCKS / SEQUENCE). CHECK not self; cycle prevention in service.

### ActionAccess — `actions.action_access` · [STD]
Explicit per-user/team grants for restricted actions: `(action_id, user_id NULL, team_id NULL, access_level)`.

### Approval / ApprovalStep / ApprovalDecision — `actions.approval*` · inherits · RC-ACTION
- `approval`: `id`, `subject_module`, `subject_type`, `subject_id`, `subject_version`, `policy_code` (from config), `status` (PENDING/APPROVED/REJECTED/RETURNED/CANCELLED), `requested_by`, `requested_at`, `closed_at`. Unique active approval per `(subject_type, subject_id, subject_version)`.
- `approval_step`: `approval_id`, `step_no`, `approver_user_id NULL`, `approver_role_code NULL`, `approver_scope jsonb`, `due_at`, `status`.
- `approval_decision` [IMM]: `approval_step_id`, `decision` (APPROVE/RETURN/REJECT), `comments`, `decided_by`, `decided_at`, `subject_hash` (hash of version approved). CHECK decided_by ≠ approval.requested_by (maker-checker, overridable only by policy config).

### Notification — `notify.notification` · INT (content minimised) · RC-NOTIF · [STD]
`recipient_user_id`, `template_code`, `template_version`, `channel_set`, `subject_safe`, `body_safe`, `link_path`, `source_module`, `source_ref`, `dedupe_key` (unique within window), `read_at`.
### NotificationDelivery — `notify.notification_delivery` · [IMM]
`notification_id`, `channel` (IN_APP/EMAIL/TEAMS), `status`, `attempt`, `provider_message_id`, `error_code`.
### NotificationTemplate — `notify.notification_template` · [EFF][APPR]
`code`, `version`, `channel`, `subject_tpl`, `body_tpl`, `allowed_variables text[]` (whitelist prevents sensitive merge fields).

---

## E.7 Documents & knowledge (schemas `documents`, `knowledge`)

### Attachment / AttachmentVersion — `documents.attachment*` · inherits owner · retention from owner
- `attachment`: `owner_module`, `owner_type`, `owner_id`, `category_code`, `sensitivity`, `current_version_id`, `status` (ACTIVE/QUARANTINED/WITHDRAWN) [STD]. Index `(owner_type, owner_id)`.
- `attachment_version` [IMM]: `attachment_id`, `version_no`, `blob_container`, `blob_key` (opaque, no PII), `file_name_enc` (encrypted original name), `mime_type`, `size_bytes`, `sha256`, `scan_status` (PENDING/CLEAN/INFECTED/SKIPPED). Unique `(attachment_id, version_no)`.
Access: DocumentService asks the owning module's registered `AttachmentPolicy` before streaming.

### DocumentTemplate / DocumentTemplateVersion — `documents.document_template*` · CONF (ER templates REST) · RC-KB
- `document_template`: `code unique`, `document_type_code`, `module` (studio / er / engagement), `name`, `owner_user_id` [STD].
- `document_template_version` [EFF][APPR][STD]: `template_id`, `version_no`, `attachment_version_id` (the .docx), `locked_sections jsonb`, `narrative_slots jsonb` (slot id, allowed sources, max length, AI permitted?), `approval_matrix_code`, `signatory_rule_code`, `sequence_rule_code`, `language_code`. Unique `(template_id, version_no)`.
### TemplateField — `documents.template_field` · INT · [STD]
`template_version_id`, `field_key`, `label`, `source` (EMPLOYEE_SERVICE / VERIFIED_INPUT / REQUEST / SYSTEM), `employee_attribute NULL`, `is_mandatory`, `is_restricted`, `format_rule`, `validation_rule jsonb`. Unique `(template_version_id, field_key)`.

### KnowledgeDocument / KnowledgeDocumentVersion — `knowledge.*` · per-document sensitivity · RC-KB
- `knowledge_document`: `code unique`, `kind` (JD / TEMPLATE_SAMPLE / APPROVED_SAMPLE / POLICY / PROCEDURE / WORDING / ORG_MAPPING), `title`, `owner_user_id`, `audience text[]` (e.g. {HR, MANAGER}) [STD].
- `knowledge_document_version` [EFF][APPR][STD]: `document_id`, `version_no`, `attachment_version_id NULL`, `content_text`, `metadata jsonb` (position, grade band, scenario, workflows), `sensitivity`, `deidentified boolean` (samples). Unique `(document_id, version_no)`.
### KnowledgeChunk — `knowledge.knowledge_chunk` · inherits · [IMM]
`document_version_id`, `chunk_no`, `text`, `embedding vector(N)`, `embedding_model_id`, `tsv tsvector`, denormalised filter columns (`kind`, `effective_from`, `effective_to`, `approval_status`, `audience`, `sensitivity`). Indexes: HNSW on embedding, GIN on tsv, btree on filter columns.

### JobDescription / JobDescriptionVersion — `knowledge.job_description*` · CONF · RC-KB
- `job_description`: `position_code` (from org/HR source), `title`, `knowledge_document_id` FK (content lives in knowledge version) [STD].
- `job_description_version` [EFF][APPR]: `job_description_id`, `knowledge_document_version_id`, `grade_band NULL`, `responsibilities jsonb` (structured list for faithful summarisation).
### JdPositionMap — `knowledge.jd_position_map` · [EFF][APPR]
Maps HRIS position codes/title aliases → job_description (org mapping). Unique active mapping per position.

---

## E.8 AI governance (schema `ai`)

| Entity | Key fields | Class | Retention |
|---|---|---|---|
| **AiModel** `ai.ai_model_registry` | `provider`, `deployment_name`, `model_version`, `purpose` (CHAT/EMBEDDING), `approved_for jsonb` (use cases, data classes), `status` [APPR] | INT | RC-AI |
| **PromptTemplate / PromptTemplateVersion** | `use_case_code`, `version_no`, `system_text`, `task_text`, `output_schema jsonb`, `validators text[]` [APPR][EFF] | INT | RC-AI |
| **AiInteraction** `ai.ai_interaction` [IMM] | `use_case_code`, `prompt_version_id`, `model_id`, `user_id`, `source_module`, `source_record_type/id`, `input_hash`, `input_payload_enc` (encrypted, classification = max of inputs), `output_payload_enc`, `validation_result jsonb`, `status` (DRAFT/BLOCKED/ACCEPTED/EDITED/REJECTED), `reviewed_by`, `reviewed_at`, `review_notes`, `latency_ms`, `tokens` | Inherits (up to HREST) | RC-AI (DR-09) |
| **AiInteractionSource** [IMM] | `interaction_id`, `source_type` (EMPLOYEE_FACT / METRIC_RESULT / KNOWLEDGE_CHUNK / CASE_EVENT…), `source_ref`, `source_version`, `rank` | Inherits | RC-AI |
| **AiEvaluationSet / Case / Run** | set `use_case_code`, cases (input, expected properties), runs (`prompt_version_id`, `model_id`, `scores jsonb`, `passed`) | INT (synthetic) | RC-AI |

---

## E.9 People Analytics (schema `analytics`)

| Entity | Key fields | Constraints / indexes | Class | Notes |
|---|---|---|---|---|
| **ReportingPeriod** | `period_code` (e.g. 2026-09), `period_start`, `period_end`, `status` (OPEN/LOADING/VALIDATED/SNAPSHOT_APPROVED/CALCULATED/IN_REVIEW/PUBLISHED/SUPERSEDED) [STD] | Unique `period_code` | INT | |
| **DatasetType** | `code` (STAFF_MASTER, ATTENDANCE, RECRUITMENT, MOVEMENT, TURNOVER, OVERTIME, RECOGNITION, TRAINING, ER_AGG, ENGAGEMENT_AGG), `grain`, `sensitivity` [STD] | Unique code | INT | |
| **DatasetSchemaVersion** | `dataset_type_code`, `version_no`, `fields jsonb` (target field, type, required, allowed values, rules) [EFF][APPR] | Unique `(type, version_no)` | INT | Filled from field dictionary (DR-12) |
| **ColumnMappingProfile** | `dataset_type_code`, `schema_version_id`, `source_signature` (header hash), `mapping jsonb` [STD][APPR] | | INT | |
| **UploadBatch** | `reporting_period_id`, `dataset_type_code`, `schema_version_id`, `attachment_version_id`, `mapping_profile_id`, `version_no`, `status` (UPLOADED/PARSED/MAPPED/VALIDATED/HAS_BLOCKING/ACCEPTED/SUPERSEDED/REJECTED), `row_count`, `sha256` [STD] | Unique `(period, dataset_type, version_no)`; index `(period, dataset_type, status)` | CONF | Source file retained |
| **UploadIssue** | `upload_batch_id`, `row_no`, `field_key`, `rule_code`, `severity` (BLOCKING/WARNING/INFO), `message`, `value_masked`, `status` (OPEN/RESOLVED/OVERRIDDEN/ACCEPTED), `resolution_note`, `resolved_by`, `override_approval_id` [STD] | Index `(batch, severity, status)` | CONF | |
| **ValidationRule** | `code`, `dataset_type_code`, `rule jsonb`, `severity` [EFF][APPR] | | INT | |
| **DatasetSnapshot** | `reporting_period_id`, `dataset_type_code`, `upload_batch_id`, `version_no`, `status` (PENDING_APPROVAL/APPROVED/SUPERSEDED), `approval_id`, `content_hash` [IMM once APPROVED] | Unique approved per `(period, type)` via partial index | CONF | |
| **Dataset record tables** `attendance_record`, `movement_event`, `recruitment_event`, `separation_event`, `overtime_record`, `recognition_event`, `training_event`, `er_aggregate_record`, `engagement_aggregate_record` | `dataset_snapshot_id`, `employee_uid` (where permitted), `org_unit_id`, typed fields per schema version, `attributes jsonb` | Index `(snapshot, org_unit_id)`, `(employee_uid)` | CONF (OT cost CONF; ER agg REST) | Exact columns from DR-12 |
| **MetricDefinition** | `code unique`, `family`, `owner_user_id` [STD] | | INT | |
| **MetricDefinitionVersion** | `metric_definition_id`, `version_no`, `name`, `description`, `rule jsonb` (numerator, denominator, filters/exclusions, aggregation), `grain`, `dimensions text[]`, `unit`, `direction` (higher-better/lower-better), `benchmark jsonb`, `thresholds jsonb`, `suppression_min_n NULL`, `required_datasets text[]` [EFF][APPR] | Unique `(definition, version_no)` | INT | Formula as data, not UI code |
| **CalculationRun** | `reporting_period_id`, `input_snapshot_ids uuid[]`, `metric_version_ids uuid[]`, `org_tree_as_of date`, `engine_version`, `inputs_hash`, `status`, `started_at`, `finished_at` [IMM] | Unique `(period, inputs_hash, engine_version)` → idempotent | INT | Reproducibility |
| **MetricResult** | `calculation_run_id`, `metric_version_id`, `reporting_period_id`, `org_unit_id NULL` (null = Bank), `dimension_key jsonb`, `value numeric`, `numerator`, `denominator`, `n`, `suppressed boolean`, `comparisons jsonb` (MoM, QoQ, YoY, YTD, benchmark, threshold status) [IMM] | Unique `(run, metric_version, org_unit, dimension_hash)`; index `(period, metric, org_unit)` | CONF (ER metrics REST) | |
| **Publication** | `reporting_period_id`, `calculation_run_id`, `version_no`, `status` (DRAFT/PENDING_APPROVAL/PUBLISHED/SUPERSEDED), `approval_id`, `published_at`, `notes` [STD] | Unique published per period | INT | Dashboards read only published |
| **Insight** | `publication_id NULL`, `calculation_run_id`, `org_unit_id`, `type` (EXCEPTION/TREND/NARRATIVE), `text`, `origin` (RULE/AI), `ai_interaction_id NULL`, `review_status` (PENDING/ACCEPTED/EDITED/REJECTED), `reviewed_by` [STD] | Index `(run, review_status)` | CONF | |
| **InsightEvidence** | `insight_id`, `metric_result_id` [IMM] | PK pair | – | Every insight cites results |
| **Recommendation** | `insight_id`, `text`, `status` (DRAFT/APPROVED/REJECTED/ACTIONED), `approved_by`, `action_id NULL` [STD] | | CONF | → Action Centre |
| **ForecastModel** | `code`, `version`, `method` (e.g. seasonal naive, ETS), `params jsonb`, `eligibility jsonb` (min history, must beat baseline) [APPR] | | INT | DR-14 |
| **ForecastRun / ForecastResult / ForecastBacktest** | run: `metric_version_id`, `org_unit_id`, `model_id`, `history_from/to`, `history_points`, `status` (OK/INSUFFICIENT_HISTORY/FAILED_BASELINE); result: `target_period`, `point`, `lower`, `upper`, `interval_level`; backtest: `mape`, `mae`, `baseline_mae`, `folds` [IMM] | | CONF | "Insufficient history" is a stored status, never a fabricated value |

---

## E.10 Engagement & Fun with Teams (schema `engagement`)

| Entity | Key fields | Constraints | Class |
|---|---|---|---|
| **SurveyCycle** | `code unique`, `name`, `open_date`, `close_date`, `reporting_date`, `provider_code`, `provider_link`, `status` (DRAFT/POPULATION_FROZEN/LAUNCHED/CLOSED/RESULTS_IMPORTED/IN_REVIEW/PUBLISHED/ACTION_PLANNING/COMPLETE), `owner_user_id`, `config_snapshot jsonb` (threshold, exclusions version) [STD] | | INT |
| **SurveyExclusionRule** | `code`, `rule jsonb`, `reason_label` [EFF][APPR] | | INT |
| **SurveyPopulation** | `cycle_id`, `employee_uid`, `org_unit_id`, `is_eligible`, `exclusion_rule_code NULL`, `frozen_at` [IMM after freeze] | Unique `(cycle, employee_uid)` | CONF |
| **SurveyItem / SurveyTheme** | `cycle_id` or instrument version, `item_code`, `text`, `theme_code`, `scale jsonb` [APPR] | Unique `(instrument_version, item_code)` | INT |
| **ParticipationSnapshot** | `cycle_id`, `as_of`, `org_unit_id`, `eligible_n`, `responded_n`, `suppressed` [IMM] | Unique `(cycle, as_of, org_unit)` | CONF |
| **EngagementResult** | `cycle_id`, `import_batch_id`, `org_unit_id`, `item_code NULL`, `theme_code NULL`, `score`, `favourable_pct`, `n`, `suppressed`, `suppression_reason` [IMM] | Unique `(cycle, org_unit, item, theme)` | CONF |
| **EngagementRespondentRecord** (only if DR-21/22 permit) | `cycle_id`, `respondent_key` (provider pseudonym), `org_unit_id`, `responses jsonb` | Restricted to Engagement HR; never exposed through API at row level | REST |
| **EngagementFlag** | `cycle_id`, `org_unit_id`, `rule_code`, `detail`, `status` [STD] | | CONF |
| **EngagementActionPlan** | `cycle_id`, `org_unit_id`, `leader_user_id`, `status` (REQUESTED/SUBMITTED/RETURNED/APPROVED/IN_PROGRESS/COMPLETE), `due_at`, `hr_review_notes` [STD] | Unique `(cycle, org_unit)` | CONF |
| **ActionPlanItem** | `action_plan_id`, `category_code`, `problem_statement`, `proposed_action`, `owner_user_id`, `due_date`, `action_id` (FK Action once approved), `evidence_attachment_id NULL` [STD] | | CONF |
| **FunWithTeamsQuarter** | `quarter_code unique` (e.g. 2026-Q3), `start_date`, `end_date`, `claim_deadline`, `rule_config_version_id`, `status` (OPEN/ELIGIBILITY_FROZEN/CLAIMS_OPEN/RECONCILING/CLOSED) [STD] | | INT |
| **FwtEligibility** | `quarter_id`, `org_unit_id`, `eligible_hc`, `basis_note`, `allocation_rate`, `allocation_amount`, `currency` [IMM after freeze] | Unique `(quarter, org_unit)` | INT |
| **FwtActivity** | `quarter_id`, `org_unit_id`, `title`, `planned_date`, `activity_date`, `status` (PLANNED/COMPLETED/CANCELLED), `attendance_count` [STD] | | INT |
| **FunWithTeamsClaim** | `reference` unique, `activity_id`, `quarter_id`, `org_unit_id`, `claim_amount`, `approved_amount NULL`, `currency`, `submitted_at`, `status` (DRAFT/SUBMITTED/EXCEPTION/APPROVED/PARTIALLY_APPROVED/REJECTED), `rejection_reason NULL`, `approval_id` [STD] | Duplicate detection index `(org_unit, activity_date, claim_amount)`; CHECK approved ≤ claim | INT |
| **FwtClaimIssue** | `claim_id`, `rule_code` (DATE_OUTSIDE_QUARTER, EXCEEDS_ALLOCATION, DUPLICATE, LATE, HC_MISMATCH), `severity`, `status` [STD] | | INT |
| **FwtReconciliation** | `quarter_id`, `org_unit_id`, `allocated`, `approved_spend`, `remaining`, `utilisation_pct`, `late_claims`, `exceptions` [IMM] | Unique `(quarter, org_unit, run_no)` | INT |

---

## E.11 ER Case Management (schema `er`) — all **HREST**, retention **RC-ER**, RLS enabled

| Entity | Key fields | Constraints / indexes |
|---|---|---|
| **ERCase** | `reference` unique (sequence, DR-19), `case_type_code` (DISCIPLINARY/GRIEVANCE/INVESTIGATION/D&G per config), `category_code`, `source_code` (DIRECT/VOICE/MANAGER/OTHER), `summary_enc` (encrypted), `incident_date NULL`, `reported_date`, `priority_code`, `confidentiality_level` (config levels), `status_code` (state machine `er.case`), `stage_code`, `lead_officer_user_id`, `opened_at`, `closed_at NULL`, `closure_reason_code NULL`, `legal_hold boolean` [STD] | Index `(status_code, lead_officer_user_id)`, `(opened_at)` |
| **CaseParticipant** | `case_id`, `participant_role` (SUBJECT/COMPLAINANT/WITNESS/REPRESENTATIVE/…), `employee_uid NULL`, `external_name_enc NULL`, `notes_enc` [STD] | Index `(employee_uid)` (for conflict checks, restricted) |
| **CaseTeamMember** | `case_id`, `user_id`, `case_role` (LEAD/OFFICER/INVESTIGATOR/REVIEWER/COMMITTEE/OBSERVER), `access_level`, `valid_from`, `valid_to`, `granted_by` [STD] | Unique active `(case, user)`; drives RLS |
| **CaseEvent** (chronology) | `case_id`, `event_type`, `event_at` (business time), `recorded_at`, `summary_enc`, `related_type/id`, `amends_event_id NULL`, `amendment_reason NULL`, `visibility` [IMM] | Index `(case_id, event_at)`; corrections via `amends_event_id` |
| **CaseAllegation** | `case_id`, `seq`, `description_enc`, `policy_ref NULL`, `status` (OPEN/SUBSTANTIATED/NOT_SUBSTANTIATED/WITHDRAWN — values per DR-15), `finding_set_by` (human only) [STD] | Unique `(case, seq)` |
| **Investigation** | `case_id` (1:1 or 1:n), `investigator_user_id`, `plan_enc`, `scope_enc`, `status`, `started_at`, `completed_at`, `findings_enc` (human-authored) [STD] | |
| **InvestigationInterview** | `investigation_id`, `interviewee_participant_id`, `scheduled_at`, `held_at`, `statement_attachment_id`, `notes_enc` [STD] | |
| **Evidence** | `case_id`, `evidence_no` (unique per case), `source_desc_enc`, `received_date`, `received_from_participant_id NULL`, `description_enc`, `sensitivity_level`, `attachment_id NULL`, `status` (ACTIVE/WITHDRAWN) [STD] | Unique `(case, evidence_no)` |
| **EvidenceCustodyEvent** | `evidence_id`, `event` (RECEIVED/UPLOADED/VIEWED/DOWNLOADED/REPLACED/WITHDRAWN/SHARED_WITH_COMMITTEE), `actor`, `reason` [IMM] | Index `(evidence_id, created_at)` |
| **Meeting** | `case_id`, `meeting_type_code`, `scheduled_at`, `location_or_link_enc`, `status`, `minutes_enc`, `employee_response_enc`, `minutes_approved_by NULL` [STD] | |
| **MeetingAttendee** | `meeting_id`, `participant_id NULL`, `user_id NULL`, `attendee_role`, `attended boolean NULL` [STD] | |
| **DgHearing** (D&G) | `case_id`, `committee_code`, `pack_attachment_id`, `hearing_date`, `status`, `routing_rule_version` [STD] | Committee routing per DR-17 |
| **DgCommitteeMember** | `dg_hearing_id`, `user_id`, `committee_role`, `conflict_declared boolean` [STD] | |
| **ERDecision** | `case_id`, `dg_hearing_id NULL`, `decision_type_code`, `decision_fields_enc jsonb` (fields per DR-17), `decided_by_user_ids uuid[]`, `decided_at`, `approval_id`, `effective_date NULL`, `expiry_date NULL` [STD, amend-only] | Written only via human-authenticated command; AI service has no write path |
| **ERLetter** | `case_id`, `letter_type_code` (per DR-18), `generated_document_id` FK studio, `status`, `issued_at`, `expiry_date NULL`, `acknowledged_at NULL` [STD] | |
| **CaseLink** | `case_id`, `linked_type` (VOICE_SUBMISSION/MANAGER_REQUEST/ER_CASE), `linked_id`, `link_reason` [IMM] | Unique `(case, linked_type, linked_id)` |

RLS policy (sketch): `USING (exists (select 1 from er.case_team_member m where m.case_id = <row>.case_id and m.user_id = current_setting('app.user_id')::uuid and now() <@ tstzrange(m.valid_from, m.valid_to)) OR current_setting('app.er_override') = 'on')`, where override is set only for roles/grants defined in DR-20.

---

## E.12 Employee Voice (schema `voice`) — **HREST**, retention **RC-VOICE**, RLS enabled

| Entity | Key fields | Notes |
|---|---|---|
| **VoiceSubmission** | `reference` unique, `identification_mode` (IDENTIFIED / ANONYMOUS – latter disabled until DR-27), `reporter_user_id NULL` (**stored in separate table** `voice.reporter_identity` for IDENTIFIED), `category_code`, `narrative_enc`, `preferred_followup` , `status` (SUBMITTED/IN_TRIAGE/INFO_REQUESTED/ROUTED/CONVERTED/CLOSED), `submitted_at` (coarsened for anonymous mode per DR-27), `converted_case_id NULL` | No created_by for anonymous mode; audit actor null |
| **ReporterIdentity** | `submission_id` PK/FK, `reporter_user_id`, `consent_to_share boolean` | Separate grant; triage sees identity only if permitted |
| **VoiceAccessToken** | `submission_id`, `token_hash` (argon2), `created_at`, `last_used_at`, `failed_attempts` | For reference/status + follow-up without login (anonymous model) |
| **VoiceMessage** | `submission_id`, `direction` (REPORTER_TO_HR / HR_TO_REPORTER), `body_enc`, `sent_at`, `author_user_id NULL` (HR only) [IMM] | Notifications never include body |
| **VoiceTriage** | `submission_id`, `triage_officer_user_id`, `category_code`, `priority_code`, `route_code`, `decision` (REQUEST_INFO/ROUTE/CONVERT/CLOSE), `rationale_enc`, `ai_suggestion_interaction_id NULL` [STD] | |

---

## E.13 People Manager (schema `manager`) — **REST**, retention **RC-MGR**

| Entity | Key fields | Notes |
|---|---|---|
| **IntakeQuestionSet** | `code`, `version`, `questions jsonb` (branching), `classification_rules jsonb` [EFF][APPR] | DR-29 |
| **ManagerRequest** | `reference` unique, `manager_user_id`, `subject_employee_uid NULL`, `question_set_version_id`, `issue_summary_enc`, `classification_code`, `status` (DRAFT/GUIDANCE_GIVEN/ER_REQUESTED/IN_TRIAGE/LINKED/CLOSED), `linked_case_visible_status` (manager-safe status only) [STD] | Manager never gets case FK in API responses |
| **ManagerRequestAnswer** | `request_id`, `question_code`, `answer_enc` [IMM] | |
| **ManagerGuidanceSession** | `request_id`, `ai_interaction_id`, `cited_versions uuid[]`, `helpful boolean NULL` [IMM] | |

---

## E.14 AI Letter & Document Studio (schema `studio`) — CONF/REST, retention **RC-DOC-ISSUED / RC-DOC-DRAFT**

| Entity | Key fields | Notes |
|---|---|---|
| **DocumentRequest** | `reference`, `document_type_code`, `template_version_id`, `employee_uid`, `requested_by`, `purpose_code`, `recipient_enc`, `request_inputs_enc jsonb` (e.g. travel dates, institution), `intent_source` (SELECT/CHAT), `status` (DRAFT/MISSING_INFO/READY/GENERATED/IN_REVIEW/RETURNED/APPROVED/ISSUED/CANCELLED) [STD] | |
| **DocumentEvidenceBundle** | `request_id`, `version_no`, `facts_enc jsonb` (field_key → value, source, source_version, retrieved_at, verified_by), `jd_versions uuid[]`, `knowledge_versions uuid[]`, `missing_fields text[]`, `bundle_hash` [IMM] | Restricted values encrypted; masked in UI unless permitted |
| **VerifiedInput** | `request_id`, `field_key`, `value_enc`, `evidence_attachment_id`, `verified_by`, `verified_at` [IMM] | Path for missing facts; never AI |
| **GeneratedDocument** | `request_id`, `current_version_id`, `status` [STD] | |
| **GeneratedDocumentVersion** | `generated_document_id`, `version_no`, `bundle_id`, `template_version_id`, `ai_interaction_ids uuid[]`, `content_json` (slots + merged fields), `docx_attachment_version_id`, `pdf_attachment_version_id NULL`, `edited_by NULL`, `edit_reason NULL` [IMM] | |
| **DocumentValidationResult** | `document_version_id`, `check_code`, `passed`, `detail` [IMM] | Blocks on failure |
| **DocumentApproval** | via `actions.approval` with `subject_type = studio.generated_document_version` | Retains reviewer, decision, comments, timestamp, version |
| **IssuedDocument** | `reference_no` unique (sequence rule per DR-30), `generated_document_version_id`, `issued_by`, `issued_at`, `signatory_user_id`, `delivery_method`, `revoked_at NULL`, `revocation_reason NULL` [IMM + revoke fields] | Issue register |

---

## E.15 Supporting entities

| Entity | Purpose |
|---|---|
| `platform.export_job` | Export requests: `requested_by`, `resource`, `filters jsonb`, `row_count`, `masking_profile`, `attachment_id`, `status`, `expires_at` — audited (RC-AUDIT) |
| `platform.legal_hold` | `resource_type`, `resource_id`, `reason`, `placed_by`, `released_by` — blocks retention disposition |
| `platform.access_review` / `access_review_item` | Periodic access recertification (DR-44) |
| `org.org_import_batch` | Org hierarchy imports with source file and diff |

## E.16 Entity checklist vs brief §5

EmployeeSnapshot ✔ · OrganisationUnit ✔ (+Version) · User ✔ · Role ✔ · UserScope ✔ · ReportingPeriod ✔ · UploadBatch ✔ · UploadIssue ✔ · MetricDefinition ✔ (+Version) · MetricResult ✔ · ForecastResult ✔ · Insight ✔ · Recommendation ✔ · SurveyCycle ✔ · SurveyPopulation ✔ · EngagementResult ✔ · EngagementActionPlan ✔ · FunWithTeamsQuarter ✔ · FunWithTeamsClaim ✔ · ERCase ✔ · CaseEvent ✔ · CaseParticipant ✔ · Evidence ✔ · Investigation ✔ · Meeting ✔ · ERDecision ✔ · ERLetter ✔ · VoiceSubmission ✔ · VoiceMessage ✔ · VoiceTriage ✔ · ManagerRequest ✔ · Action ✔ · ActionDependency ✔ · Approval ✔ · Notification ✔ · DocumentTemplate ✔ · KnowledgeDocument ✔ · JobDescription ✔ · DocumentRequest ✔ · GeneratedDocument ✔ · DocumentApproval ✔ (via Approval) · Configuration ✔ · AuditEvent ✔.

Full column-level data dictionary (`docs/data-dictionary.md`) is generated from the Drizzle schema per sprint so it cannot drift from the code.
