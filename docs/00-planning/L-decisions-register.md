# L. Decisions Register – items requiring BML confirmation

Each item: **current state**, **required from**, **how the build proceeds meanwhile**, and **what it blocks**. "BP §23" marks the blueprint's own production decisions. Nothing below is assumed as a BML rule in code.

Owners: **HR** = People & Culture leadership · **ER** = Employee Relations · **ENG** = Engagement HR · **AN** = HR Analytics · **DOC** = Document HR · **IT** = BML IT (architecture/ops) · **IS** = Information Security · **CMP** = Compliance/Legal · **PO** = Product Owner.

## L.1 Governance & platform

| ID | Decision | Current state | Required from | Build meanwhile | Blocks |
|---|---|---|---|---|---|
| DR-01 | Architecture owner, product owner, module owners [BP §25.2] | Not named | HR, IT | Planning continues; approvals recorded against "PO (TBC)" | UAT sign-offs, DR approvals |
| DR-02 | Stack & hosting: custom web vs Power Platform; NestJS vs ASP.NET Core; PostgreSQL vs Azure SQL (BP §23) | **PO approved for build 2026-09-29** (NestJS + PostgreSQL + Next.js, plain CSS). IT/IS approval still required for UAT/PROD | IT, IS | Sprint 1 foundation proceeds on recommendation **only if you approve**; logical design is stack-neutral | Any UAT/PROD deployment |
| DR-03 | Azure tenant, region, data residency, regulatory/outsourcing constraints for cloud-hosted HR data | Unknown | IT, IS, CMP | DEV runs locally/isolated with synthetic data only | UAT/PROD environment build |
| DR-41 | Definition of Done: does `[x]` require HR UAT sign-off (blueprint §25.1) or only an existing UAT scenario (brief §29)? | Conflict C-05 | You (PO) | Stricter blueprint rule applied in checklist until decided | Checklist semantics |
| DR-42 | Sprint 1 scope: foundation-only (brief) vs blueprint §25.2 first sprint | **Decided 2026-09-29: foundation + first slice (Action Centre My Work, ER intake/profile/chronology)** | You (PO) | Proposal in `M-sprint-1-proposal.md` | Sprint 1 start |
| DR-43 | Resequence: template engine by Phase 3; Studio deterministic MVP as Phase 4b | Proposal (C-08) | You (PO), DOC | Baseline blueprint order kept until approved | Roadmap |
| DR-45 | UAT masked-data process: owner, masking method, approval | Not specified | IT, IS, HR | Synthetic in UAT until approved | UAT with realistic data |
| DR-47 | Source control & CI platform (GitHub vs Azure DevOps), code ownership/IP location | Not specified | IT | Repo structured to be CI-neutral | Pipeline setup in BML environment |
| DR-40 | Accessibility standard, supported browsers, languages (English only? Dhivehi for any letters?) | Not specified | HR, IT | English UI; RTL-capable components chosen | Template engine (if Dhivehi letters) |

## L.2 Identity, access & security

| ID | Decision | Current state | Required from | Build meanwhile | Blocks |
|---|---|---|---|---|---|
| DR-06 | Role source of truth (Entra groups/app roles vs platform-managed), final role catalogue (ER Officer/Manager split; Division vs Department Head; Voice Triage; Audit Reviewer; FwT Coordinator; Access Approver), grant approval process | Blueprint §15 illustrative; brief adds roles (C-04) | HR, ER, IS, IT | Roles as configurable bundles; DEV personas for each candidate role | PROD access, UAT personas |
| DR-07 | Signed-off access matrix incl. restricted fields (salary/NID/passport), export rights, who approves snapshots/publication/config/overrides | Draft in `F-access-matrix.md` | HR, ER, IS | Draft matrix encoded as seed + tests | Each module's go-live |
| DR-08 | Data classification labels and handling rules | Placeholders INT/CONF/REST/HREST | IS | Placeholder labels mapped later | Security design sign-off |
| DR-20 | ER case access model: who joins case team, ER Manager portfolio vs all cases, HR Leadership oversight, conflicts of interest, break-glass | Not specified | ER, IS | Case-team model + configurable override roles | ER MVP UAT |
| DR-37 | Audit: reviewers, retention, which reads must be logged ("case access where required"), IP logging | Not specified | IS, ER, CMP | Log all ER/Voice reads + all material writes | Audit catalogue sign-off |
| DR-38 | Export policy: who may export what, formats, masking profiles, watermarking | Blueprint: permission-controlled & masked | HR, IS | Exports disabled by default; masked profile | Export features |
| DR-39 | File upload controls: malware scanning service, allowed types, max size | Not specified | IS, IT | Type/size allow-list config; scan hook stubbed as PENDING in DEV | UAT uploads of evidence |
| DR-44 | Privileged access / break-glass, admin separation, access recertification cadence | Not specified | IS | Admin has no business data; grants expire | PROD |
| DR-48 | MFA / conditional access policies and session timeout | "SSO + MFA per Bank policy" | IS | Enforced at IdP; app session timeout configurable | PROD |
| DR-09 | Retention periods, disposition, legal hold per record class (ER, Voice, analytics source, audit, AI logs, documents) (BP §23) | Not specified | CMP, IS, HR | Retention classes tagged; **no deletion** | PROD, BAU |
| DR-10 | Backup, RPO/RTO, DR, availability targets (BP §23) | Not specified | IT | PITR default | PROD |

## L.3 Employee & organisation data

| ID | Decision | Current state | Required from | Build meanwhile | Blocks |
|---|---|---|---|---|---|
| DR-04 | Authoritative employee API/HRIS, permitted fields, position history availability, update frequency (BP §23) | Unknown system | IT, HR | `synthetic` provider behind EmployeeService interface | Studio facts in UAT/PROD; ER lookup in PROD |
| DR-05 | Organisation hierarchy source, levels (Division / Section / Department / Unit?), codes, effective dating (BP §23) | Blueprint: Bank→Division→Department→Unit; BML structure also includes sections (C-09) | HR, IT | Configurable level types; synthetic tree | Scope in UAT; analytics drill-down |

## L.4 People Analytics

| ID | Decision | Current state | Required from | Build meanwhile | Blocks |
|---|---|---|---|---|---|
| DR-11 | Formal metric dictionary: definitions, formulas, exclusions, grain, dimensions, owners (BP §23) | Existing dashboards are "functional reference" only [BP §6.3]; current absenteeism work uses an ABS-flag classification (to confirm) | AN, HR | Metric engine built generically; golden tests use synthetic placeholder metrics clearly labelled | Any real KPI in UAT |
| DR-12 | Dataset inventory & field dictionary per dataset: source system, columns, codes, frequency, owner [BP §25.2] | Not documented | AN | Template for inventory delivered in Sprint 1 | Upload schemas |
| DR-13 | Benchmarks and thresholds per metric and per engagement theme | Not specified | AN, HR, ENG | Config fields empty → "no benchmark set" displayed | Threshold flags |
| DR-14 | Forecast eligibility: minimum history, baseline, acceptable error, which metrics | Blueprint gives principles, not values | AN | Engine returns "Insufficient history" until configured | Forecasting (Phase 9) |
| DR-46 | Native charts only vs Power BI Embedded | Blueprint: native initially | IT, AN | Native charts | – |

## L.5 Engagement & Fun with Teams

| ID | Decision | Current state | Required from | Build meanwhile | Blocks |
|---|---|---|---|---|---|
| DR-21 | Survey provider and import format (BP §23) | Reported current practice: SurveyMonkey (unconfirmed for platform) | ENG, IT | Generic file import adapter | Results import |
| DR-22 | Anonymity / minimum-response threshold, and whether respondent-level data may be stored at all (BP §23) | Not specified; reported practice: completion follow-ups by counts only | ENG, IS | Threshold is required config; module refuses to publish without it | Participation & results screens |
| DR-23 | Eligibility and exclusion rules (BP §23) | Reported practice: long leave excluded (unconfirmed) | ENG | Rule engine configurable | Population freeze |
| DR-24 | Engagement score method, scale, favourable definition, treatment of incomplete responses | Reported practice: 27 items, four-point scale, share scoring ≥3 on total staff, incomplete counted as disengaged (unconfirmed) | ENG, AN | Method stored as metric definition | Results calculation |
| DR-25 | Action-plan rules: who submits, minimum actions, deadlines, categories, HR review | Reported practice: min. 3 divisional actions; 9 categories; Category/Action/Deadline/Owner (unconfirmed) | ENG | Configurable rules | Action plans |
| DR-26 | Fun with Teams policy: rate, currency, eligibility basis, quarter rules, maximum allocation, late-claim cut-off, evidence required, who records/approves, carry-forward (BP §23) | Not specified | ENG, Finance | Effective-dated config; **no amounts in code** | FwT module |

## L.6 ER, Voice, People Manager

| ID | Decision | Current state | Required from | Build meanwhile | Blocks |
|---|---|---|---|---|---|
| DR-15 | ER workflow: case types, categories, sources, statuses, transitions, mandatory steps, closure rules (BP §23) | Not specified; existing Excel D&G tracker is a reference | ER | Configurable state machine; synthetic workflow labelled "SAMPLE – NOT BML POLICY" | ER MVP UAT |
| DR-16 | ER SLAs by category/stage; business-day basis | Not specified | ER | SLA rules table empty → no due date auto-set, manual due dates allowed | SLA reminders for ER |
| DR-17 | D&G committee composition, routing, decision fields, approval matrix, maker-checker (BP §23) | Not specified | ER, HR leadership | Generic approval engine | D&G (Phase 4) |
| DR-18 | ER letter types, templates, approval, expiry rules (e.g. warning validity) | Not specified; show-cause/warning/outcome named in blueprint | ER | Template engine generic | ER letters |
| DR-19 | Reference numbering formats (ER cases, Voice, actions) | Existing ON / D&G convention in current tracker (to confirm) | ER | Configurable sequence rules | Case creation in UAT |
| DR-27 | Voice anonymity technical model (BP §23) – identity, logs, metadata, attachments, notifications, analytics | Blueprint: do not call it anonymous until validated | IS, IT | Identified route only; anonymous flag OFF | Anonymous route |
| DR-28 | Voice triage ownership, categories, routing, conflict-of-interest handling, reporter-identity visibility | Not specified | ER, HR | Proposed Voice Triage role | Voice module |
| DR-29 | People Manager intake question sets, classification rules and approved guidance sources | Not specified | ER | Question-set engine; synthetic sample set | People Manager |

## L.7 Documents & AI

| ID | Decision | Current state | Required from | Build meanwhile | Blocks |
|---|---|---|---|---|---|
| DR-30 | Approved templates for 7 letter types, mandatory fields, locked wording, signatories, numbering, approval per letter type, output format (DOCX/PDF, letterhead, e-signature?) (BP §23) | Not provided | DOC, HR | Synthetic sample templates labelled "SAMPLE" | Studio UAT |
| DR-31 | JD source, ownership, versioning, position mapping | Not specified | DOC, HR | Synthetic JDs | JD retrieval |
| DR-32 | Approved AI service/model/deployment, data handling, logging retention, evaluation thresholds (BP §23) | Blueprint: Bank-approved Azure OpenAI/enterprise AI | IT, IS | Mock provider only; no real data to any model | All AI features beyond mock |
| DR-33 | Embedding model and vector storage approval | Not specified | IT, IS | pgvector with mock embeddings in DEV | RAG in UAT |
| DR-34 | Notification channels (email relay, Teams method), sender identity, content rules | Blueprint: approved channels; minimal sensitive content | IT, IS | In-app only | Email/Teams |
| DR-35 | Business calendar: working week and public holiday source | Not specified | HR, IT | Calendar is config; no hard-coded weekend | SLA due dates |
| DR-36 | Default reminder and escalation paths for actions | Not specified | HR | Configurable per SLA rule | Escalations |
