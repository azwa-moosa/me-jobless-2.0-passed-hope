# K. Master Implementation Checklist

Legend: `[ ]` Not started · `[-]` In progress · `[x]` Completed (meets Definition of Done – see DR-41) · `[!]` Blocked / decision required

Nothing is marked `[x]` because code has been generated. An item is `[x]` only when required components **and** tests exist and (pending DR-41) HR UAT has confirmed it.

Last updated: 2026-09-29 (v0.1 build – Sprint 1 foundation + first slice). `[-]*` = built and tested (unit/security/e2e), awaiting HR UAT per DR-41 strict rule.

## Phase 0 – Governance & source preparation
- [-] Blueprint analysis (A) — drafted, awaiting PO review
- [-] Requirements traceability matrix (B) — 116 requirements drafted, awaiting review
- [-] Architecture (C), dependency map (D), domain model (E), access matrix (F), repo structure (G), API map (H), dev environment (I), roadmap (J), decisions register (L) — drafted, awaiting review
- [!] Owners named: architecture, product, modules — DR-01
- [-] Stack/hosting approval — DR-02: PO approved NestJS + PostgreSQL + Next.js **for build** (2026-09-29); IT/IS approval for UAT/PROD still required
- [!] Tenant/region/data residency — DR-03
- [!] Access matrix sign-off incl. restricted fields — DR-06, DR-07, DR-20
- [!] Data classification scheme — DR-08
- [!] Retention, backup, DR — DR-09, DR-10
- [!] Dataset inventory & field dictionary — DR-12
- [!] Formal metric dictionary — DR-11
- [!] ER workflow / SLA / D&G / letters / numbering — DR-15 to DR-19
- [!] Survey provider, anonymity threshold, exclusions, score method, action-plan rules — DR-21 to DR-25
- [!] Fun with Teams policy — DR-26
- [!] Voice anonymity model & triage ownership — DR-27, DR-28
- [!] Manager intake question sets — DR-29
- [!] Templates, JDs, signatories, numbering — DR-30, DR-31
- [!] AI service/model/embeddings approval — DR-32, DR-33
- [!] Notification channels, business calendar, escalation defaults — DR-34 to DR-36
- [!] Definition of Done semantics — DR-41
- [x] Sprint 1 scope — DR-42: PO chose foundation + first vertical slice (2026-09-29)
- [!] Roadmap resequencing — DR-43
- [ ] Golden test scenarios agreed with HR (analytics, ER, letters)

## Phase 1 – Shared Core
- [-]* Monorepo scaffold (pnpm workspaces), TypeScript strict — boundary lint and Turborepo not yet added
- [-]* CI pipeline (GitHub Actions: PII/secret scan, build, typecheck, unit, migrate+seed, security suite, e2e; dependency audit report-only) — SAST pending DR-47
- [-]* DEV docker infra (Postgres+pgvector, Azurite, Mailpit)
- [-]* Typed environment config + env safety switches (mock IdP refused outside dev)
- [-]* DB migration baseline (platform, org, config, audit, ai, synthetic_hris, actions, er)
- [!] Entra OIDC integration — API token validation built; web sign-in flow needs IT app registration
- [-]* DEV mock IdP with personas (blocked in UAT/PROD – tested)
- [-]* PolicyService (role + scope + record + field) + permission catalogue
- [-]* Permission test harness + negative tests (135 checks)
- [-]* EmployeeService interface + synthetic provider + org hierarchy (effective-dated)
- [-]* Synthetic data generator (org, employees, positions, personas; hash-stable)
- [-]* ConfigurationService core: lookups, calendar, sequences, state machines (read-only; maker-checker editing Sprint 2)
- [-]* Feature flags (audited; anonymous Voice locked – DR-27)
- [-]* AuditService (outbox, append-only, hash chain, verify, reader)
- [-]* Logging with redaction, correlation IDs, problem+json errors, health/ready — OpenTelemetry export not wired
- [-]* App shell, role-adaptive navigation, UI states (loading/empty/denied/error) — plain CSS design system
- [ ] AIService interface + mock provider (log tables exist; service not built)
- [ ] AnalyticsService interface + suppression utility
- [-]* ActionService core + My Work (pulled forward from Sprint 2)
- [ ] DocumentService attachments (Sprint 2)
- [ ] NotificationService in-app (Sprint 2)
- [ ] Admin: users, role/scope grants with approval (Sprint 2)

## Phase 2 – People Analytics ingestion MVP
- [ ] Reporting periods · [ ] Uploads & batch versioning · [ ] Column mapping · [ ] Validation rules & issues · [ ] Override with approval · [ ] Snapshot approval · [ ] Metric definitions (versioned) · [ ] Deterministic calculation runs · [ ] Core workforce/attendance/OT metrics — [!] DR-11/DR-12 · [ ] MoM/YoY comparisons · [ ] Golden metric tests

## Phase 3 – Action Centre (full) + ER MVP
- [-]* Action views (my, team, overdue, due soon, blocked, completed) · [ ] Approvals view · [ ] SLA reminders & escalation · [ ] Dependencies · [ ] Generic approvals · [ ] Action reports
- [-]* ER case intake · [-]* Case profile · [-]* Chronology (immutable, amendments) · [-]* Participants (subject) · [ ] Evidence register & custody (needs DocumentService) · [-]* Case team & RLS · [-]* Case tasks · [-]* Status machine (SAMPLE) — [!] DR-15 · [-]* Closure checklist · [-]* Access log · [-]* ER dashboard
- [ ] Template engine (DocumentService) — proposal DR-43

## Phase 4 – Analytics publishing + ER advanced
- [ ] Remaining datasets & metric families · [ ] QoQ/YTD/benchmark/threshold · [ ] Drill-down with scope · [ ] Rule-based insights + review · [ ] Publication · [ ] Persistent dashboards · [ ] Exports (masked)
- [ ] Investigation · [ ] Meetings · [ ] D&G — [!] DR-17 · [ ] Decisions · [ ] ER letters — [!] DR-18

## Phase 4b – Document Studio Deterministic MVP (proposed)
- [ ] Letter selection · [ ] Fact retrieval · [ ] Missing-field blocking & verified input · [ ] Deterministic merge · [ ] Approval · [ ] Reference no. & DOCX/PDF · [ ] Register — [!] DR-30

## Phase 5 – Engagement + Fun with Teams
- [ ] Cycles · [ ] Population & freeze · [ ] Participation (thresholded) · [ ] Results import · [ ] Suppression incl. complementary · [ ] Flags · [ ] Action plans → Action Centre · [ ] Next-cycle comparison · [ ] Reports · [ ] FwT quarters/eligibility/claims/validation/approval/reconciliation — [!] DR-21–26

## Phase 6 – AI Letter & Document Studio + RAG
- [ ] Knowledge base versioning & approval · [ ] Chunking/embedding · [ ] Metadata-filtered retrieval · [ ] JD mapping · [ ] Chat intent · [ ] AI narrative slots · [ ] Post-generation validators · [ ] AI review workflow · [ ] Evaluation & injection suites · [ ] ER AI assists — [!] DR-32/33

## Phase 7 – Employee Voice
- [ ] Identified submission & reference · [ ] Triage · [ ] Secure messaging · [ ] Convert to ER case · [ ] Aggregates · [!] Anonymous route — DR-27

## Phase 8 – People Manager
- [ ] Guided intake · [ ] Cited guidance · [ ] ER request · [ ] Manager actions — [!] DR-29

## Phase 9 – Advanced intelligence
- [ ] Forecasting with back-tests — [!] DR-14 · [ ] AI insights · [ ] Ask People Analytics · [ ] Cross-module aggregates/AI

## Phase 10 – Production readiness (brief §28)
- [ ] Authentication · [ ] Authorisation · [ ] Data classification · [ ] Retention · [ ] Audit · [ ] Backup/recovery · [ ] Monitoring · [ ] Logging · [ ] Error handling · [ ] AI security · [ ] RAG source controls · [ ] Prompt-injection controls · [ ] PII handling · [ ] ER confidentiality · [ ] Anonymity design · [ ] Performance · [ ] Access reviews · [ ] UAT · [ ] IT approval · [ ] Information Security approval · [ ] HR process sign-off
