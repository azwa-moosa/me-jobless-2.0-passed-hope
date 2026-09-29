# A. Blueprint Analysis

| | |
|---|---|
| Source of truth | *BML People & ER Platform – Master Product & Technical Blueprint* (Master working design, September 2026), 25 sections, read in full. Text copy: `docs/requirements/master-blueprint-source.md` |
| Status | DRAFT for review – Phase 0 |
| Convention | **[BP §x]** = blueprint reference. **[PROMPT §x]** = implementation brief reference. **ASSUMPTION** = technical assumption made by the build team, not a BML rule. **DR-xx** = Decision Required (see `L-decisions-register.md`). **C-xx** = Conflict (below). |

---

## A.1 What the blueprint defines

One governed internal platform with three layers over a shared foundation [BP §1, §3, §4]:

| Layer | Modules | Build meaning |
|---|---|---|
| Intelligence | People Analytics | Deterministic metric engine over approved monthly snapshots; AI only narrates calculated facts |
| Operational | Engagement, ER Case Management, Employee Voice, People Manager, HR Action Centre | Workflow/state-machine modules that emit Actions and aggregate data |
| Document & AI | AI Letter & Document Studio | Deterministic template merge + controlled AI narrative slots + RAG knowledge base; reusable by ER letters and People Manager |
| Shared foundation | Identity & Access, EmployeeService, ActionService, DocumentService, NotificationService, AuditService, AIService, AnalyticsService, ConfigurationService | Built once; modules must not re-implement any of these |

Core principle [BP §1]: the system automates calculation, workflow, retrieval, drafting and reminders; **HR remains accountable** for data approval, interpretation, sensitive ER content, disciplinary decisions, recommendations, document approval and publication.

The eight design principles [BP §2] become architecture constraints:

| Principle | Architectural consequence |
|---|---|
| One source of truth | Every published metric/document/case action stores source batch + rule version + user |
| Upload/capture once | Historical snapshots retained; comparisons read stored history, never re-uploads |
| Exception-first HR workflow | Home screens are queries over exceptions (missing data, overdue, anomalies, approvals) |
| Human-reviewed AI | AI output is always a *draft* entity with a review state; nothing AI-generated auto-publishes |
| Secure by design | Deny-by-default server-side policy engine; role + org scope + record scope |
| Configurable rules | ConfigurationService with effective-dated, approved (maker-checker) config values |
| Version everything important | Versioned tables for metrics, templates, JDs, prompts, models, config, snapshots |
| Shared services, separate records | Modular monolith: modules own tables; cross-module calls only via service interfaces |

## A.2 Module-by-module requirement summary

| Module | Core workflow [BP] | Highest-risk requirement |
|---|---|---|
| People Analytics [§6] | Period → upload → map → validate → resolve → approve snapshot → calculate → compare → forecast → AI insight → HR review → publish → dashboards | Metric correctness and reproducibility; no hard-coded formulas; drill-down scope |
| Engagement [§7] | Cycle → population/exclusions → freeze → provider link/launch status → participation → import → results with anonymity threshold → flags → action plans → Action Centre → next-cycle comparison | Anonymity thresholds on every drill-down, including participation |
| Fun with Teams [§7.2] | Quarter + effective rate → freeze eligible HC → activity → claim/evidence → validation → HR approve/reject → utilisation → reconciliation | Policy values must be effective-dated config, never code |
| ER Case Management [§8] | Intake → profile → timeline → investigation → meetings → evidence → D&G → decision → letters → follow-up → closure | Case-level access, immutable chronology, evidence protection, AI must not decide |
| Employee Voice [§9] | Submission → reference → triage → follow-up → convert to ER → aggregate analytics | Must not be called "anonymous" until IT/Security validates |
| People Manager [§10] | Guided intake → approved guidance (RAG) → next step or ER request → manager actions | Manager must never see confidential case content |
| HR Action Centre [§11] | Cross-module tasks with source link, owner/team, SLA, dependencies, visibility inherited from source, evidence, audit | Visibility inheritance from sensitive sources (ER, Voice) |
| AI Letter & Document Studio [§12] | Intent → template → UID → facts → JD match → evidence bundle → missing-field check → narrative slots → deterministic merge → validation → HR review → approval → ref no. → DOCX/PDF → history | AI must never invent authoritative facts; missing facts block generation |

## A.3 Shared functionality (build once)

| Capability | Used by | Owning service |
|---|---|---|
| Employee lookup, position history, effective organisation | All modules | EmployeeService |
| Org hierarchy with effective dating, scope resolution | Analytics drill-down, RBAC, Engagement, FwT | EmployeeService (org) + Identity & Access (scope) |
| Tasks, approvals (maker-checker), SLA, reminders, escalation, dependencies | All modules | ActionService |
| File upload, protected download, versioning, retention, template storage, DOCX/PDF render | Analytics uploads, ER evidence, FwT evidence, Voice attachments, Document Studio, ER letters | DocumentService |
| Email / Teams / in-app notifications with minimal content | All modules | NotificationService |
| Immutable audit of material events | All modules | AuditService |
| Effective-dated rules, categories, SLAs, thresholds, feature flags | All modules | ConfigurationService |
| Drafting, summarisation, classification, retrieval, evaluation logging | Analytics insights, ER summaries, Document Studio, People Manager, Engagement commentary, Voice triage suggestions, column-mapping suggestions | AIService (+ Knowledge/RAG) |
| Governed metrics, comparisons, aggregate queries, small-number suppression | Analytics, Engagement, ER aggregates, Voice aggregates, Action Centre reports, Document Studio reports | AnalyticsService |
| Reference numbering (cases, submissions, documents) | ER, Voice, Document Studio | ConfigurationService (sequence rules) |
| Business-day calendar | SLAs, reminders, escalations | ConfigurationService |
| Exports (PDF/Excel/CSV) with masking | All reporting | DocumentService + policy engine + audit |

## A.4 Dependencies between modules

```
Foundation (Identity, Employee, Config, Audit, Document, Notification, Action)
   ├─► People Analytics ──(aggregates in)◄── Engagement, ER, Voice, Actions, Documents
   ├─► ER ◄──(convert/escalate)── Employee Voice, People Manager
   │     └─► uses Document template engine for ER letters
   ├─► Engagement ─► Action Centre (action plans)
   ├─► Document Studio ─► Knowledge/RAG ─► People Manager guidance
   └─► AIService (Analytics insights, ER summaries, Studio, Manager, Voice triage)
```
Hard dependencies that drive sequencing (detail in `D-module-dependency-map.md`):

1. **Every module → ActionService** (tasks/approvals). Build first.
2. **ER letters → DocumentService deterministic template engine.** ER letters are in Phase 4 but the Studio is Phase 6 → the template/merge engine must exist by Phase 4 (see C-08).
3. **Voice convert-to-case → ER case model.** ER before Voice (blueprint order already satisfies).
4. **People Manager → Knowledge base (RAG) + ER request intake.** Studio/RAG (Phase 6) before Manager (Phase 8) – satisfied.
5. **Analytics ER/Engagement datasets → those modules' aggregate outputs**, or manual aggregate upload until the module exists.
6. **All scope checks → organisation hierarchy source** (DR-05). Can run on synthetic hierarchy in DEV.

## A.5 Sensitive data inventory (provisional – classification labels pending DR-08)

| Data | Where | Proposed class | Special handling |
|---|---|---|---|
| ER case record, allegations, investigation, findings, decisions | ER | Highly Restricted | Case-team access only; RLS defence-in-depth; access logging (DR-37) |
| ER evidence files, statements, interview notes, meeting minutes | ER / DocumentService | Highly Restricted | Per-file authorisation, no public URL, download audit, custody history |
| D&G committee packs and decisions | ER | Highly Restricted | Committee-scoped access (DR-17) |
| Employee Voice submissions, messages, attachments, reporter identity | Voice | Highly Restricted | Identity segregation; metadata minimisation; anonymity validation (DR-27) |
| Salary / pay | EmployeeService, Document Studio (Visa, Financial) | Restricted field | Separate field permission; masked by default; never in notifications/logs |
| NID, passport number | EmployeeService, Document Studio | Restricted field | Separate field permission; masked by default; never in notifications/logs |
| Employee-level analytics snapshot (demographic band, grade, manager, org) | Analytics | Confidential | Aggregates only for non-HR roles |
| Engagement respondent-level / small-group results | Engagement | Confidential + anonymity rules | Minimum-response suppression at every level (DR-22) |
| Generated letters and evidence bundles | Document Studio | Confidential / Restricted (depends on fields) | Encrypted fact bundle; issue register |
| AI prompts/responses containing any of the above | AIService | Inherits highest class of inputs | Minimum-evidence principle; stored with same controls |
| Audit events | AuditService | Confidential | Append-only; audit payload must not duplicate restricted values |
| Manager requests (issue descriptions) | People Manager | Restricted | Visible to requester and ER triage only |

## A.6 Approval workflows identified

| Approval | Blueprint basis | Rule status |
|---|---|---|
| Analytics snapshot approval | §6.1 step 13 | Approver role not specified → DR-07 |
| Validation override | §18 (audited) | Who may override → DR-07 |
| Insight accept/edit/reject | §6.1 step 18 | HR Analytics Admin assumed |
| Publication of reporting snapshot | §6.1 step 19 | Approver not specified → DR-07 |
| Metric definition change | §6.3 (HR sign-off of dictionary) | Maker-checker assumed → DR-11 |
| Engagement action plan HR review | §7 Action Plans | Rules → DR-25 |
| Fun with Teams claim approve/reject | §7.2 step 37 | Approver/limits → DR-26 |
| ER decisions, D&G approvals, letter approval | §8, §23 | **Not defined** → DR-15, DR-17, DR-18 |
| Voice → ER conversion | §9 | Authority → DR-28 |
| Document Studio draft approval | §12.2 step 49–50 | Per-letter approval matrix → DR-30 |
| Template/JD version approval | §12.3 | Owner/approver → DR-30, DR-31 |
| Configuration changes | §2 configurable rules | Maker-checker assumed → DR-07 |
| Role/scope grants | §15, §18 | Approval process → DR-06 |

## A.7 Configuration requirements

Everything below is **configuration, not code** [BP §2, §7.2, §8.1, §18]: metric definitions/benchmarks/thresholds; dataset schemas and column mappings; forecast eligibility; ER categories, statuses, transitions, SLAs, committee routing, letter types; survey anonymity threshold, exclusions, action-plan rules; Fun with Teams rate/eligibility/quarter rules; Voice categories and routing; manager intake question sets; letter templates, required fields, locked sections, signatories, numbering; notification templates and channels; reminder/escalation schedules; business calendar; feature flags; retention classes.

## A.8 Integration requirements

| Integration | Blueprint | Status |
|---|---|---|
| Microsoft Entra ID SSO + MFA + group/role mapping | §15, §16 | App registration required from IT (DR-06, DR-48) |
| Authoritative employee/HRIS API | §4, §23 | **Unknown system** → DR-04. DEV uses synthetic provider |
| Organisation hierarchy source | §23 | Unknown → DR-05 |
| Survey provider import | §7.1, §23 | Provider/format → DR-21 |
| Azure Blob / SharePoint document storage | §16 | DR-02/DR-03 |
| Azure OpenAI / enterprise AI | §14, §16 | DR-32, DR-33 |
| Email and Microsoft Teams | §18, §20 | DR-34 |
| Key Vault, Application Insights | §16 | IT platform standard |
| Power BI Embedded (optional) | §16 | DR-46 |

## A.9 Unresolved production decisions

The blueprint lists 11 production decisions [BP §23]; the analysis adds further items the build cannot safely assume. All are in `L-decisions-register.md` (DR-01 … DR-48). Items requiring **HR/ER** sign-off, **IT**, and **Information Security** are tagged there.

---

## A.10 Conflicts between the implementation brief and the blueprint

Per instruction, these are flagged, **not silently resolved**. Each has a recommendation; none is applied as final until you confirm.

| ID | Topic | Blueprint says | Brief says | Recommendation (pending your decision) |
|---|---|---|---|---|
| **C-01** | Sprint 1 scope | §25.2: first sprint includes owners, app shell, SSO/roles, EmployeeService mock, ActionService + My Work, Audit + Document/attachment service, analytics data inventory + metric dictionary + golden dataset, **ER New Case/Profile/Timeline**, template catalogue, **template upload/versioning + merge + preview**, CI/environments, **UAT with synthetic analytics files, ER cases and golden letters** | §30: Sprint 1 "should establish the technical foundation needed for everything else" | Blueprint §25.2 is realistically 3 sprints of work. Treat §25.2 as the **first release increment** delivered over Sprints 1–3; Sprint 1 = foundation + Phase 0 governance track. See `M-sprint-1-proposal.md` for mapping of every §25.2 item to a sprint. **DR-42** |
| **C-02** | When Action Centre is built | §21 Phase 1 "Shared Core" includes ActionService; §25.2 builds My Work in first sprint | §24 places "HR Action Centre + ER MVP" in Phase 3, but §8 says "build Action Centre early" | ActionService core + My Work in **Phase 1**; full Action Centre (team views, approvals UI, escalations, reports) completed in **Phase 3** with ER. |
| **C-03** | AIService and AnalyticsService in foundation | §21 Phase 1 lists identity, Employee, Action, Document, Notification, Audit services only | §7 lists AIService and AnalyticsService in the foundation | Phase 1 delivers **interfaces + mock providers + governance logging tables** for AIService and AnalyticsService; real AI provider in Phase 6, metric engine in Phase 2. |
| **C-04** | Role catalogue | §15: "ER Restricted", "Division / Department Head" (one role), "System Admin" | §6: ER Officer + ER Manager; Division Head + Department Head; Platform Administrator | Model as permission bundles so either catalogue works. Splitting ER Officer/Manager implies an ER approval hierarchy that the blueprint does not define. **DR-06, DR-17** |
| **C-05** | Definition of Done | §25.1 requires: workflow documented **and signed off**; **HR UAT confirms**; no sensitive data in logs; output reproducible from approved versions | §29 requires "UAT scenario exists" (not HR UAT confirmation); omits log and reproducibility criteria | Use the **union** (stricter of both). Checklist: `[x]` only when blueprint DoD is met incl. HR UAT; engineering-complete items stay `[-]` with note "built & tested – awaiting HR UAT". **DR-41** |
| **C-06** | Stack choice | §16 recommends direction "subject to IT/security approval"; §16/§23 require evaluating **Power Platform** alternative; stack is a production decision | §3 asks to recommend a custom web stack | Recommendation given in `C-architecture.md` (NestJS + PostgreSQL), explicitly **provisional** until IT confirms custom build vs Power Platform. **DR-02** |
| **C-07** | Survey "launch" | §7.1: "Record survey provider/link and launch status" – survey hosted by an external provider | §11: "launch" as a workflow step | Platform records launch status and provider link; it does **not** host or distribute the survey unless DR-21 decides otherwise. |
| **C-08** | Document Studio priority | §22 marks letter generation **P0**; §25.2 builds template merge in first sprint; but §21 puts Studio in **Phase 6**. ER letters (Phase 4) need the template engine | §24 keeps Studio in Phase 6 | Proposed resequence: deterministic template engine in DocumentService by Phase 3–4 (shared with ER letters); "Studio Deterministic MVP" (7 letter types, no AI) in Phase 4b; AI/RAG remains Phase 6. **DR-43** |
| **C-09** | Organisation hierarchy depth | §6.2/§13 drill-down Bank → Division → Department → Unit | Same | BML's structure also has **sections** (reported as 12 divisions / 17 sections / 58 departments). Hierarchy depth must be configurable and sourced, not fixed at four levels. **DR-05** |
| C-10 (minor) | Dataset list | §6.2 "Recruitment & Movement" as one dataset | §9 lists Recruitment and Movement separately | Two dataset types under one family; no functional conflict. |
| C-11 (minor) | Metric definition fields | §6.3 includes **grain** | §9 omits grain | Include grain (union). |

---

## A.11 Current practice reported by People & Culture (unconfirmed for platform use)

The following have been described informally by P&C and are useful **candidate inputs** for Phase 0 decisions. They are **not adopted** as platform rules until formally confirmed through the relevant DR.

| Area | Reported current practice | Feeds |
|---|---|---|
| Engagement | Quarterly bank-wide survey run in SurveyMonkey | DR-21 |
| Engagement | 27 items on a four-point agreement scale, no neutral | DR-24 |
| Engagement | Engagement % = share scoring 3 or above, on total staff, excluding long leave, incomplete surveys counted as disengaged | DR-23, DR-24 |
| Engagement | Completion follow-up uses counts only, never names | DR-22 |
| Engagement | Divisional action plans: Category / Action Item / Target Deadline / Owner across nine categories; minimum three actions per division | DR-25 |
| ER | Existing Excel Disciplinary & Grievance tracker with an ON / D&G reference numbering convention | DR-15, DR-19 |
| Attendance | ABS-flag absence classification in current absenteeism reporting | DR-11, DR-12 |

## A.12 Assumptions made in this plan (technical only)

| ID | Assumption | Reversible? |
|---|---|---|
| AS-01 | Modular monolith (one API deployable + one worker) rather than microservices | Yes – module boundaries allow later extraction |
| AS-02 | All timestamps stored in UTC; displayed in Maldives time (UTC+5) | Yes |
| AS-03 | English-only UI for MVP; letter languages per DR-40 | Yes |
| AS-04 | Stable employee identifier = BML UID [BP §13]; UID is not treated as secret but is Confidential | Pending DR-04 |
| AS-05 | Engineering sprint cadence of two weeks | Pending your confirmation |
| AS-06 | Source control and CI provider neutral (GitHub Actions examples; Azure DevOps equivalent) | Pending DR-47 |
| AS-07 | Every approval is maker-checker: the maker cannot approve their own item unless a rule says otherwise | Pending DR-07 |
