# J. Master Implementation Roadmap

Baseline: blueprint §21 phases (identical numbering in the brief §24). Reconciliations for C-02/C-03 are applied as described in `A-blueprint-analysis.md` §A.10; the **resequencing proposal (DR-43) is shown but not applied**. Durations are not estimated until Sprint 1 velocity is known. Delivery is **vertical slices validated in UAT** [BP §21 build strategy].

| Phase | Scope | Entry dependencies | Exit criteria (all require DoD per DR-41) |
|---|---|---|---|
| **0 – Governance & source prep** (runs continuously, starts now) | Owners (DR-01); access matrix (DR-07); classification (DR-08); dataset inventory + field dictionary (DR-12); metric dictionary (DR-11); ER workflow/status/SLA matrix (DR-15/16/17/18); survey + FwT rules (DR-21–26); templates/JDs/signatories (DR-30/31); architecture & security approval (DR-02/03/32); golden test scenarios | – | Decisions logged with owner and date; signed artefacts stored in `docs/` |
| **1 – Shared Core** | Repo/CI/envs; Entra SSO + DEV mock IdP; PolicyService (role+scope+record+field); EmployeeService interface + synthetic provider + org tree; ConfigurationService (effective-dated, flags, calendar, sequences); AuditService (append-only, hash chain); DocumentService attachments; NotificationService (in-app); ActionService core + My Work; AIService & AnalyticsService **interfaces + mocks** (C-03); app shell & UI kit; observability | DR-02 approval of stack for build | Permission test harness green; negative tests pass; synthetic seed reproducible; audit immutability proven at DB level |
| **2 – People Analytics ingestion MVP** | Periods, uploads, mapping, validation rules, issue resolution/override, snapshot approval; metric engine; core workforce/attendance/OT metrics; MoM/YoY; email/Teams channels (if DR-34) | Phase 1; DR-12 (at least Staff Master, Attendance, Overtime); DR-11 for those metrics | Golden datasets reproduce HR-signed expected values; re-run idempotent |
| **3 – HR Action Centre (full) + ER MVP** | Team/Approvals/Overdue/Due-soon/Blocked views, SLA reminders/escalations, dependencies, generic approvals; ER intake, profile, chronology, participants, evidence, case tasks, status, closure, access log; RLS on ER; **template engine in DocumentService (DR-43 proposal)** | Phase 1; DR-15, DR-19, DR-20 | ER negative security suite green; chronology immutability; HR UAT on synthetic cases |
| **4 – Analytics publishing + ER advanced** | Remaining datasets & metric families; QoQ/YTD/benchmark/threshold; drill-down; insights (rule-based) + review; publication; persistent division dashboards; exports; ER investigation, meetings, D&G, decisions, ER letters | Phase 2–3; DR-13, DR-17, DR-18, DR-38 | Division Head scope tests; published version immutability; D&G approval per matrix |
| **4b – Document Studio Deterministic MVP (PROPOSED, DR-43)** | 7 letter types by selection; fact retrieval; missing-field blocking; verified input; deterministic merge; approval; reference no.; DOCX/PDF; register | Template engine; DR-30; DR-04 (or synthetic in UAT) | Golden letters byte-match on factual fields; missing fact blocks |
| **5 – Engagement + Fun with Teams** | Cycles, population freeze, participation, results import with anonymity, flags, action plans → Action Centre, next-cycle comparison; FwT quarters, eligibility, claims, validation, approvals, reconciliation | Phase 3 (actions/approvals); DR-21–26 | Anonymity tests (incl. complementary suppression); FwT rule golden tests |
| **6 – AI Letter Studio + RAG** | Knowledge base (versioned, approved), JD mapping & retrieval, chat intent, AI narrative slots, post-generation validators, AI interaction logging & review, evaluation suite, prompt-injection tests; ER AI assists (chronology/meeting summaries, drafts, information gaps) | Phase 4b (or builds it if not approved); DR-31, DR-32, DR-33 | No-invented-fact evaluation passes; injection corpus blocked; every AI output traceable |
| **7 – Employee Voice** | Identified intake, reference, triage, secure messaging, convert-to-case, aggregates; anonymous route only after DR-27 validation | Phase 3 ER; DR-27, DR-28 | Voice privacy test suite; notifications contentless |
| **8 – People Manager** | Guided intake, cited guidance (RAG), ER request/escalation, manager actions | Phase 6 KB; Phase 3 ER; DR-29 | Manager cannot reach case data (negative tests) |
| **9 – Advanced intelligence** | Forecasting (back-tested, insufficient-history fallback), AI insights, Ask People Analytics, cross-module aggregates/AI, engagement commentary | Phase 4–8; DR-14, DR-32 | Forecast back-test reports; NL query scope tests |
| **10 – Integration & optimisation** | HRIS/org integration (DR-04/05), Microsoft integrations, performance, mobile UX, retention jobs (DR-09), backup/DR tests, monitoring, runbook, access reviews, pen test, production readiness review [brief §28] | All; IT/IS approvals | IT, IS approvals; HR process sign-off; DR test executed |

## J.1 Proposed sprint sequence (indicative, re-planned after each sprint)

| Sprint | Focus |
|---|---|
| 1 | Foundation: repo, CI, environments, DB baseline, auth + mock IdP, PolicyService + permission harness, org/EmployeeService synthetic, Config core, Audit, app shell. **Phase 0 governance track in parallel** |
| 2 | ActionService core + My Work, DocumentService attachments, NotificationService in-app, config admin screens, admin users/roles with approval |
| 3 | Analytics: periods, uploads, mapping, validation, issues (Phase 2 start) |
| 4 | Analytics: snapshot approval, metric engine, first metrics, golden tests |
| 5–6 | Action Centre full + ER MVP (Phase 3), template engine |
| 7+ | Per roadmap above |

Blueprint §25.2 items are mapped to these sprints in `M-sprint-1-proposal.md` §M.12.
