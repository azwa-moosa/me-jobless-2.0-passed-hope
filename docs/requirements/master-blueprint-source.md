**BANK OF MALDIVES**

**PEOPLE & ER PLATFORM**

**MASTER PRODUCT & TECHNICAL BLUEPRINT**

People Analytics · Engagement · ER Case Management · Employee Voice · People Manager\
HR Action Centre · AI Letter & Document Studio

Product Vision · Operating Model · Architecture · Data · AI · Security · APIs · Roadmap · README

Master working design \| September 2026

# Master Document Map

1\. Executive Summary

2\. Platform Vision & Design Principles

3\. Platform Scope & Module Map

4\. Shared Platform Foundation

5\. End-to-End Operating Model

6\. People Analytics

7\. Engagement

8\. ER Case Management

9\. Employee Voice

10\. People Manager

11\. HR Action Centre

12\. AI Letter & Document Studio

13\. Shared Data Architecture & Data Model

14\. AI / RAG Architecture & Guardrails

15\. Access Control, Privacy & Governance

16\. Technical Architecture

17\. API & Integration Design

18\. Notifications, Workflow & Audit

19\. Reporting, Dashboards & Exports

20\. Testing & Acceptance

21\. Delivery Roadmap & Build Order

22\. Initial Product Backlog

23\. Production Decisions to Confirm

24\. Repository / README

25\. Definition of Done & First Implementation Sprint

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Master objective\
  **Replace fragmented monthly reporting and manual ER/engagement/document workflows with one governed internal platform. The platform should automate repeatable work, keep authoritative facts traceable, preserve HR accountability, and provide secure role-scoped experiences.
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# 1. Executive Summary

The BML People & ER Platform combines the previously separate People Analytics, operational ER/engagement modules and AI Letter & Document Studio into one master architecture. People Analytics acts as the intelligence layer; Engagement, ER Case Management, Employee Voice, People Manager and HR Action Centre form the operational layer; the AI Letter & Document Studio provides governed document generation and a reusable RAG/AI foundation.

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Layer**               **Modules**                                                                                                                     **Primary outcome**
  ----------------------- ------------------------------------------------------------------------------------------------------------------------------- -----------------------------------------------------------------------------------------------------------------------
  Intelligence            People Analytics                                                                                                                Validated metrics, trends, forecasts, HR-reviewed insights and secure division dashboards.

  Operational             Engagement, ER Case Management, Employee Voice, People Manager, HR Action Centre                                                Structured workflows, cases, action plans, reporting routes, tasks, approvals, deadlines and follow-up.

  Document & AI           AI Letter & Document Studio                                                                                                     Approved template generation, JD/RAG retrieval, factual validation, approval, Word/PDF issuance and document history.

  Shared foundation       Identity, EmployeeService, ActionService, DocumentService, NotificationService, AuditService, AIService, ConfigurationService   One reusable control layer instead of separate apps and duplicated employee data.
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Core principle\
  **The system automates calculations, workflow, retrieval, drafting and reminders. HR remains accountable for data approval, interpretation, sensitive ER content, disciplinary decisions, recommendations, document approval and publication.
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# 2. Platform Vision & Design Principles

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Principle**                       **Design decision**
  ----------------------------------- -------------------------------------------------------------------------------------------------------------------------------------
  One source of truth                 Published metrics, documents and case actions trace to approved source data, rules, versions and users.

  Upload / capture once               Historical data and workflow records are retained and reused for comparisons and follow-up.

  Exception-first HR workflow         Home screens prioritise missing data, overdue actions, anomalies, material changes and approvals.

  Human-reviewed AI                   AI drafts, summarises and retrieves; it does not silently publish or make high-impact employment decisions.

  Secure by design                    SSO, server-side role/scope enforcement, least privilege and restricted ER/document fields.

  Configurable rules                  Thresholds, benchmarks, SLAs, survey rules, templates, letter fields and Fun with Teams policy are configuration.

  Version everything important        Source files, metrics, templates, JDs, prompts, models, approvals and published snapshots remain auditable.

  Shared services, separate records   Each module owns its business records while reusing platform identity, employee, action, document, notification and audit services.
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# 3. Platform Scope & Module Map

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Module**                    **Primary job**                                                                                     **Feeds / receives**
  ----------------------------- --------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------------
  People Analytics              Monthly HR data ingestion, KPI calculation, comparisons, forecasting, AI insights and dashboards.   Receives approved HR datasets; creates insights/actions; supplies aggregate analytics.

  Engagement                    Survey cycles, participation/results, action plans and Fun with Teams.                              Feeds Analytics and Action Centre.

  ER Case Management            Disciplinary, grievance, investigation and D&G workflows.                                           Receives Voice/Manager escalations; feeds restricted analytics and Action Centre.

  Employee Voice                Anonymous or identified employee reporting and secure follow-up.                                    Can create triage tasks and linked ER cases.

  People Manager                Guided ER support for managers and issue escalation.                                                Can create ER triage requests and manager actions.

  HR Action Centre              One work queue for tasks, approvals, deadlines, escalations and follow-ups.                         Receives actions from every module.

  AI Letter & Document Studio   Reference/employment letter generation from approved templates, employee data and JDs.              Uses EmployeeService, DocumentService, RAG/AI and approval/audit services.
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# 4. Shared Platform Foundation

  ------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Shared service**                  **Responsibility**
  ----------------------------------- ------------------------------------------------------------------------------------------------------------------------
  Identity & Access                   Microsoft Entra ID / approved SSO, roles, organisational scope, privileged access.

  EmployeeService                     Employee lookup, current organisation and permitted employment attributes; no duplicate authoritative Employee Master.

  ActionService                       Tasks, owners, due dates, SLA, reminders, escalations, dependencies and completion.

  DocumentService                     Templates, attachments, generated documents, versioning, storage and retention.

  NotificationService                 Approved email/Teams/in-app notifications.

  AuditService                        Immutable record of material user/system actions.

  AIService                           Governed drafting, summarisation, classification and retrieval.

  AnalyticsService                    Approved metrics, comparisons and aggregate insights.

  ConfigurationService                Categories, SLAs, thresholds, templates, survey cycles, Fun with Teams rules and feature toggles.
  ------------------------------------------------------------------------------------------------------------------------------------------------------------

# 5. End-to-End Operating Model

1.  User signs in through the Bank-approved identity provider; role and organisational scope are resolved server-side.

2.  Employee and organisational context is retrieved through EmployeeService and effective-dated organisation data.

3.  Module-specific intake occurs: monthly dataset upload, engagement cycle, ER case, Voice submission, manager request or document request.

4.  Validation/rules run before calculations, case progression, publication or document generation.

5.  System creates tasks/approvals in HR Action Centre and sends permitted reminders.

6.  AI may assist only from approved evidence and within module-specific guardrails.

7.  HR reviews and approves sensitive conclusions, recommendations, case decisions and official documents.

8.  Published/issued outcomes are versioned, auditable and visible only to authorised audiences.

9.  Aggregate outcomes feed People Analytics for trend and management reporting.

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Cross-module examples\
  **Employee Voice → triage → ER case → Action Centre. People Manager → guided intake → ER request → Action Centre. Engagement → action plan → Action Centre → completion → next-cycle comparison. People Analytics → HR-approved recommendation → Action Centre. ER case → meeting / D&G / letter / follow-up tasks → Action Centre.
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# 6. People Analytics

Purpose: turn monthly HR source datasets into validated metrics, comparative analytics, forecasts, HR-reviewed insights and persistent division-specific dashboards.

## 6.1 Monthly flow

10. Create reporting period.

11. Upload Staff Master and subject datasets.

12. Map fields and validate UID / organisation relationships.

13. Resolve blocking data-quality issues and approve clean snapshots.

14. Calculate KPIs at Bank/division/department/unit levels.

15. Run MoM, QoQ, YoY, YTD, benchmark and threshold comparisons.

16. Run eligible back-tested forecasts.

17. Generate AI-assisted observations and recommended actions.

18. HR accepts, edits or rejects insights.

19. Publish a versioned reporting snapshot.

20. Authorised users access BML/division dashboards through SSO.

## 6.2 Core datasets

  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Dataset**               **Typical grain**                             **Key content**
  ------------------------- --------------------------------------------- ------------------------------------------------------------------------------------------------------
  Employee / Staff Master   Employee snapshot                             UID, status, join date, demographic band, grade, role, manager, division/department/unit, location.

  Attendance                Employee-period / leave transaction           Leave type, entitlement/balance, utilised days, unplanned leave, mandatory annual leave, long leave.

  Recruitment & Movement    Event                                         Hire, vacancy, transfer, promotion, from/to organisation, effective date.

  Turnover                  Separation event                              Separation date, voluntary/involuntary, reason, service at exit, early-turnover flag.

  Overtime                  Employee-period                               Month, OT hours, OT cost, organisation.

  Recognition               Award event                                   UID/team, award type, date, programme, individual/team.

  Training                  Attendance/event                              Programme, delivery mode, hours, date, provider.

  ER                        Restricted case/action aggregate              Case/action category, status, dates, root-cause group.

  Engagement                Survey aggregate / governed respondent data   Cycle, eligible/responded, score, themes/items; anonymity thresholds.
  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 6.3 KPI & comparison engine

  ------------------------------------------------------------------------------------------------------------------------------------
  **Family**                          **Illustrative measures**
  ----------------------------------- ------------------------------------------------------------------------------------------------
  Workforce                           Headcount, retention, gender composition, age/generation, service, leadership ratio, manpower.

  Attendance                          Unplanned leave utilisation, mandatory leave utilisation, absence rate, long leave, forecast.

  Recruitment / mobility              Hires, vacancies, transfers, promotions, internal mobility.

  Turnover                            Turnover, voluntary/involuntary, early turnover, reasons, service at exit.

  Overtime                            Hours, cost, hours/employee, cost/employee, utilisation bands and hotspots.

  Recognition                         Recognised coverage, event counts, awards and programme breakdown.

  Training                            Programmes, attendances, unique employees, hours, repeat participation.

  ER                                  Counts and aging by approved categories; restricted detail.
  ------------------------------------------------------------------------------------------------------------------------------------

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Metric governance\
  **Every KPI belongs in a versioned metric catalogue with definition, formula, numerator, denominator, exclusions, grain, dimensions, benchmark, thresholds, owner and effective date. Existing dashboards are a functional reference; HR signs off the formal metric dictionary before production.
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 6.4 Forecasting & AI

-   Forecast only where history is sufficient and back-testing beats a simple baseline.

-   Show confidence/interval, history length, model version and error; return \'insufficient history\' when evidence is weak.

-   Initial candidates: absence, overtime hours/cost, leave utilisation, vacancy/hiring trajectory and selected turnover indicators.

-   AI receives calculated facts and approved context; deterministic code remains authoritative for KPI values.

-   AI may draft narrative summaries, exception explanations, recommendations and meeting briefs; HR reviews before publication.

# 7. Engagement

The Engagement module covers the full lifecycle: planning, launch readiness, participation monitoring, result publication, action planning, follow-up and Fun with Teams utilisation.

  ---------------------------------------------------------------------------------------------------------------------------------------
  **Screen**                          **Content**
  ----------------------------------- ---------------------------------------------------------------------------------------------------
  Engagement Home                     Current cycle, score, participation, benchmark, action-plan status, overdue items, recent cycles.

  Survey Cycles                       Cycle name, dates, eligible population, exclusions, status, owner, survey link/provider.

  Participation                       Eligible vs responded at permitted organisation levels; anonymity rules applied.

  Results                             Overall score, themes/items, trend, benchmark and organisation comparisons.

  Action Plans                        Theme/problem, proposed action, owner, due date, status, evidence and HR review.

  Fun with Teams                      Quarter, allocation, eligible HC, activity/claim, attendance, spend, utilisation and exceptions.

  Insights                            Low scores, declining trends, recurring themes and action-plan gaps.

  Configuration                       Benchmark, anonymity threshold, exclusions, action-plan rules, Fun with Teams rate/policy.
  ---------------------------------------------------------------------------------------------------------------------------------------

## 7.1 Survey workflow

21. Create cycle and reporting dates.

22. Resolve eligible population and apply approved exclusions; freeze cycle population.

23. Record survey provider/link and launch status.

24. Monitor participation only at permitted aggregate levels.

25. Import approved results after close.

26. Calculate organisation results subject to anonymity threshold.

27. Flag below-benchmark or materially declining areas.

28. HR reviews findings and requests action plans.

29. Leaders submit actions, owners and due dates.

30. Actions flow to HR Action Centre with reminders/escalations.

31. Next cycle compares results with prior action completion.

## 7.2 Fun with Teams workflow

32. Create quarter and effective per-staff allocation rule.

33. Freeze eligible headcount / approved eligibility basis.

34. Division or unit records planned/completed activity.

35. Upload attendance, evidence and claim details.

36. Validate activity date, quarter, eligible HC, maximum allocation and duplicate claims.

37. HR reviews exceptions and approves/rejects.

38. Approved spend updates utilisation and remaining allocation.

39. Quarterly reconciliation identifies unused allocation, late claims and exceptions.

  -----------------------------------------------------------------------------------------------------------------------------
  **Configuration rule\
  **Rates, eligibility and quarter rules must be effective-dated configuration so policy changes do not require code changes.
  -----------------------------------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------------------------------------------------------------

# 8. ER Case Management

ER Case Management is the restricted operational record for disciplinary matters, grievances, investigations and D&G. It is designed around due process, confidentiality and a complete chronology.

  --------------------------------------------------------------------------------------------------------------------------------
  **Screen**                          **Purpose**
  ----------------------------------- --------------------------------------------------------------------------------------------
  ER Dashboard                        Open cases, aging, overdue actions, D&G pending, letters pending and restricted alerts.

  New Case                            Employee lookup, category, source, issue/allegation, dates, priority and confidentiality.

  Case Profile                        Single restricted record with overview and controlled tabs.

  Timeline                            Chronological events, status changes, meetings, letters, evidence and decisions.

  Investigation                       Plan, issues/allegations, evidence register, interviews/statements and findings.

  Meetings                            Invite, attendees, notes/minutes, employee response and follow-up.

  Evidence                            Files, source, received date, description, sensitivity and chain/history.

  D&G                                 Committee pack, meeting date, attendees, decision fields and approvals.

  Letters / Actions                   Show-cause, warning/outcome/other approved letters, follow-up and expiry where applicable.
  --------------------------------------------------------------------------------------------------------------------------------

## 8.1 Case controls

-   Restricted case-level access, not just menu hiding.

-   Immutable chronology for material events; corrections are auditable.

-   Evidence attachments protected with server-side authorisation and no public URLs.

-   Case statuses, SLAs, committee routing and letter types configured from approved ER procedures.

-   AI can summarise chronology or draft approved-format wording from evidence; it cannot determine guilt, credibility or sanction.

-   Aggregate ER metrics may feed leadership analytics, but sensitive employee detail is withheld unless specifically authorised.

# 9. Employee Voice

Employee Voice provides a secure route for identified or, where technically validated, anonymous employee reporting.

  ---------------------------------------------------------------------------------------------------------------------------------------
  **Capability**                      **Design**
  ----------------------------------- ---------------------------------------------------------------------------------------------------
  Submission                          Structured issue category, narrative, attachments, preferred follow-up and identification mode.

  Reference                           Provide a safe reference/status mechanism appropriate to the chosen identification model.

  Triage                              Authorised HR triage categorises, prioritises, requests information and routes the matter.

  Convert to ER                       Eligible submissions create a linked ER case without duplicating source history.

  Follow-up                           Secure two-way communication where the technical anonymity model permits it.

  Analytics                           Aggregate themes, volume, aging and resolution trends; protect identity and small-number privacy.
  ---------------------------------------------------------------------------------------------------------------------------------------

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Anonymous reporting\
  **Do not describe the route as anonymous until IT/security has validated that identity, logs, metadata, attachments, notifications and analytics cannot unintentionally reveal the reporter.
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# 10. People Manager

People Manager gives managers structured ER guidance without exposing confidential ER case data.

-   Guided intake asks only the facts required to classify the support need.

-   Approved policy/procedure guidance is retrieved from the controlled knowledge base.

-   Manager may receive a recommended next process step or submit an ER support request.

-   Requests can create triage tasks in Action Centre and linked ER records where appropriate.

-   Manager actions and due dates can be tracked without revealing restricted investigation content.

-   AI guidance must cite/retrieve approved policy content and clearly distinguish guidance from formal ER decisions.

# 11. HR Action Centre

The Action Centre is the platform-wide work queue and should be built early because every other module depends on it.

  -----------------------------------------------------------------------------------------------------------
  **Field / capability**              **Requirement**
  ----------------------------------- -----------------------------------------------------------------------
  Source                              Module + source record link.

  Ownership                           Named owner or team; reassignment audited.

  Timing                              Due date, SLA, reminder schedule and escalation path.

  Priority / status                   Configurable priority and controlled status transitions.

  Dependencies                        Block/sequence tasks where another action must complete first.

  Visibility                          Role/case/scope restrictions inherited from source record.

  Evidence                            Completion notes and attachments where permitted.

  Audit                               Created, assigned, changed, reminded, escalated and completed events.
  -----------------------------------------------------------------------------------------------------------

# 12. AI Letter & Document Studio

A governed HR document-generation module combining approved templates, structured employee data, effective JDs and enterprise AI. Authoritative facts are never invented.

## 12.1 Initial document catalogue

  ------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Document**                **Likely inputs**                                                                      **AI role**
  --------------------------- -------------------------------------------------------------------------------------- -----------------------------------------------
  Visa Letter                 Name, passport, DOJ, position, org, salary where required, destination/travel/leave.   Mostly deterministic template merge.

  Academic Excuse             Name, NID, position, institution, missed period and approved context.                  Template merge + controlled wording.

  Academic Reference          Name, NID, DOJ, current role/org, institution/purpose.                                 Draft narrative from approved facts/template.

  Release Staff Reference     DOJ, DOR, final role, department, relevant JD and service details.                     JD retrieval + responsibility summary.

  General Employment Record   DOJ, DOR, service period, positions and organisation.                                  Deterministic history formatting.

  Job Opportunity Reference   Employment, role/history, JD summary and purpose.                                      JD retrieval + controlled narrative.

  Financial Reference         DOJ, service, role, employment type, salary, recipient/purpose.                        Factual merge; restricted fields verified.
  ------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 12.2 Core workflow

40. Start from chat or choose document type.

41. Identify intent and retrieve active approved template.

42. Select/enter employee UID.

43. Retrieve permitted employee facts and position history.

44. Match relevant JD versions to positions/effective dates.

45. Retrieve approved JDs, samples and document rules.

46. Check mandatory fields and identify missing facts.

47. Generate only narrative slots requiring AI; insert factual fields deterministically.

48. Validate draft against facts, dates, sources and locked template sections.

49. HR previews/edits and submits for approval where required.

50. Approver accepts/returns/rejects with comments.

51. Generate reference number and controlled DOCX/PDF.

52. Store final document, source versions, approval and issuance history.

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Non-negotiable fact rule\
  **AI must never invent employee name/UID, NID/passport, DOJ/DOR, salary, employment status, position history, organisation or other authoritative HR facts. Missing required values block generation or require verified input.
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 12.3 RAG / knowledge base

  ------------------------------------------------------------------------------------------------------------------------------
  **Knowledge item**                  **Versioned metadata**
  ----------------------------------- ------------------------------------------------------------------------------------------
  Letter Template                     Type, version, effective date, owner, approval status, locked sections, required fields.

  Job Description                     Position/title, grade/band if relevant, version, effective from/to, owner, approval.

  Approved Sample                     Document type, scenario/purpose, approval date, de-identification and usage notes.

  Policy / Procedure                  Title, version, effective date, applicable workflows, owner.

  Wording Library                     Approved paragraphs, sign-offs, disclaimers and recipient wording.

  Organisation Mapping                Position/title aliases and controlled organisation terminology.
  ------------------------------------------------------------------------------------------------------------------------------

# 13. Shared Data Architecture & Data Model

The platform should use separate controlled domain datasets/tables rather than one enormous workbook or one monolithic record. UID is the employee join key where employee-level linkage is permitted; organisation is effective-dated.

  -----------------------------------------------------------------------------------------------------------------------
  **Domain entity**                                          **Purpose**
  ---------------------------------------------------------- ------------------------------------------------------------
  ReportingPeriod / SurveyCycle / Quarter                    Effective reporting/cycle context and status.

  EmployeeSnapshot / OrgUnit                                 Effective employee and organisation placement.

  UploadBatch / UploadIssue                                  Source file version, schema, validation and resolution.

  MetricDefinition / MetricResult / ForecastResult           Versioned calculations and prediction metadata.

  ERCase / CaseEvent / Evidence / Meeting / Decision         Restricted ER chronology and supporting records.

  VoiceSubmission / VoiceMessage                             Voice intake and secure follow-up.

  ManagerRequest                                             Guided manager intake and ER support request.

  Action / Approval                                          Cross-module task and approval model.

  DocumentTemplate / KnowledgeDocument / GeneratedDocument   Versioned templates/JDs/sources and issued documents.

  Insight / Recommendation                                   Generated evidence-backed insight and approved action.

  UserScope / AuditEvent                                     Authorisation scope and immutable material activity trail.
  -----------------------------------------------------------------------------------------------------------------------

# 14. AI / RAG Architecture & Guardrails

  ------------------------------------------------------------------------------------------------------------------------------------------------------
  **AI may**                                                                   **AI must not**
  ---------------------------------------------------------------------------- -------------------------------------------------------------------------
  Summarise approved calculated evidence or case chronology.                   Calculate authoritative KPIs when deterministic code can do it.

  Draft recommendations, meeting briefs and official-letter narrative slots.   Invent employee facts, dates, IDs, salary, roles or performance claims.

  Retrieve approved policies, JDs, templates and wording.                      Determine disciplinary guilt, credibility or sanction.

  Suggest categories, missing information and likely column mappings.          Infer an anonymous reporter\'s identity.

  Draft engagement commentary and manager guidance.                            Expose restricted data or bypass role/template/approval rules.

  Answer governed analytics questions from authorised aggregates.              Make autonomous high-impact employment decisions.
  ------------------------------------------------------------------------------------------------------------------------------------------------------

-   Pass the model only minimum permitted evidence.

-   Separate system facts, retrieved source text, user input and writing instructions.

-   Use structured output schemas where possible.

-   Render factual fields from code after generation.

-   Store model/prompt/source version metadata for reproducibility.

-   Run post-generation checks for names, dates, numbers and unsupported claims.

-   Block production output when validation fails.

-   Prefer RAG + controlled configuration + evaluation over constant model retraining.

# 15. Access Control, Privacy & Governance

  -------------------------------------------------------------------------------------------------------------
  **Role**                            **Illustrative access**
  ----------------------------------- -------------------------------------------------------------------------
  HR Analytics Admin                  Analytics uploads, metric config, validation, approval and publication.

  ER Restricted                       Permitted employee-level ER data and restricted workflow actions.

  Engagement HR                       Survey cycles, results, action plans and Fun with Teams administration.

  HR Leadership                       Approved Bank-wide analytics and authorised oversight.

  Division / Department Head          Own permitted aggregate dashboard and assigned actions.

  Manager                             People Manager intake, own requests/actions; no confidential ER detail.

  Employee                            Own Voice submission/status where supported; no internal triage detail.

  Document HR / Approver              Permitted employee fields, templates, drafts, approvals and issuance.

  System Admin                        Technical administration without unnecessary business-data privileges.
  -------------------------------------------------------------------------------------------------------------

-   SSO + MFA according to Bank policy.

-   Server-side RBAC plus organisational/case/data-level scope.

-   Least privilege for salary, NID/passport, ER evidence and employee-level exports.

-   Encryption in transit and at rest; approved secrets management.

-   No public dashboard, attachment or document URLs.

-   Define retention, backup, data residency, incident response and access-review rules with IT/Information Security.

-   Use synthetic data in DEV; approved masked/test data in UAT; live controlled data only in PROD.

-   Engagement drill-down applies minimum-response/anonymity thresholds.

-   All AI/data-processing services must be Bank-approved.

# 16. Technical Architecture

  -----------------------------------------------------------------------------------------------------------------------------------
  **Layer**                           **Recommended direction (subject to IT/security approval)**
  ----------------------------------- -----------------------------------------------------------------------------------------------
  Frontend                            Next.js / React or equivalent Bank-approved web stack.

  Authentication                      Microsoft Entra ID SSO; group/role mapping.

  Backend API                         ASP.NET Core or Node/NestJS service.

  Operational database                Azure SQL or PostgreSQL with effective-dated organisation and domain records.

  Files / documents                   Azure Blob / approved SharePoint or document storage; encrypted and access-controlled.

  Processing                          Background worker / Azure Functions / job queue.

  Analytics                           Application-native charts initially; Power BI Embedded optional if governance/licensing fits.

  AI                                  Bank-approved Azure OpenAI / enterprise AI endpoint; no unapproved external transfer.

  Secrets                             Key Vault / approved secrets manager.

  Observability                       Application Insights / approved logging and alerting.

  Hosting                             BML-approved Azure tenant/internal hosting.
  -----------------------------------------------------------------------------------------------------------------------------------

A Power Platform implementation (Power Apps + Dataverse + Power Automate + Power BI) can be evaluated during architecture review. For sensitive relational workflows, Dataverse is generally preferable to SharePoint lists if licensing and scale are acceptable.

# 17. API & Integration Design

  -----------------------------------------------------------------------------------------------------------------------------------------------------
  **Service / endpoint family**                                              **Purpose**
  -------------------------------------------------------------------------- --------------------------------------------------------------------------
  EmployeeService                                                            Authorised employee lookup, position history and effective organisation.

  /reporting-periods, /uploads, /calculate, /forecast, /insights, /publish   People Analytics processing lifecycle.

  /engagement/cycles, /results, /action-plans, /fun-with-teams               Engagement and programme workflows.

  /er/cases, /timeline, /evidence, /meetings, /decisions                     Restricted ER case lifecycle.

  /voice/submissions, /triage, /convert-to-case                              Employee Voice intake and routing.

  /manager/requests                                                          Guided manager intake and ER escalation.

  /actions, /approvals                                                       Shared Action Centre and maker-checker workflow.

  /templates, /knowledge/retrieve, /documents/\*                             Letter generation, validation, approval, rendering and history.

  /analytics/query                                                           Governed natural-language analytics query over authorised metrics.
  -----------------------------------------------------------------------------------------------------------------------------------------------------

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Processing rule\
  **Re-running deterministic calculations against the same approved source/version must return the same metric results. Workflow commands should be idempotent where practical and all material state changes must be auditable.
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# 18. Notifications, Workflow & Audit

-   Every module can create Action Centre tasks with source record, owner/team, due date/SLA, priority, dependency, visibility and evidence.

-   Notifications use approved channels and avoid sensitive detail in message bodies where unnecessary.

-   Reminder/escalation rules are configuration and must support business-day handling if required.

-   Approvals retain reviewer, decision, comments, timestamp and version.

-   Audit login/access changes, uploads, validation overrides, case status changes, evidence actions, approvals, publication, document generation/issue and exports.

-   Corrections create new versions or auditable amendments; do not silently overwrite approved history.

# 19. Reporting, Dashboards & Exports

-   Interactive dashboard is the primary People Analytics delivery channel; persistent division routes are protected by authentication and scope checks.

-   Leadership views show approved aggregates, trends, material changes, actions and status without unnecessary employee-level detail.

-   ER dashboards show open/aging/overdue work only to authorised roles.

-   Engagement reports cover cycle score, participation, action-plan completion and Fun with Teams utilisation.

-   Action Centre reports show overdue, due soon, blocked, awaiting approval and workload by team/owner.

-   Document Studio reports cover volume, turnaround, returned drafts, template usage and generation quality without exposing restricted content.

-   PDF/Excel/CSV exports are permission-controlled and masked where needed.

# 20. Testing & Acceptance

  --------------------------------------------------------------------------------------------------------------------------------------
  **Test area**                       **Acceptance focus**
  ----------------------------------- --------------------------------------------------------------------------------------------------
  Workflow                            Every status transition and branch behaves as approved.

  Permissions                         Employee, manager, HR, ER, leadership, admin and approver boundaries; direct-URL negative tests.

  Data quality                        Unknown UID, duplicates, invalid dates, organisation mismatch, reconciliation and completeness.

  Analytics                           Golden metric datasets produce expected KPI values and comparisons.

  Forecast                            Back-testing, error tracking, insufficient-history fallback and model versioning.

  ER                                  Restricted chronology, evidence access, due process steps and audit.

  Voice                               Privacy/anonymity technical testing and safe follow-up.

  Documents                           Golden letters, fact consistency, JD faithfulness, locked wording and missing-data blocking.

  AI                                  No invented facts/unsupported policy claims; prompt-injection and regression evaluation.

  Notifications / SLA                 Reminders, escalations, business-day rules and duplicate prevention.

  UAT                                 Realistic synthetic/masked scenarios signed off by HR before live use.
  --------------------------------------------------------------------------------------------------------------------------------------

# 21. Delivery Roadmap & Build Order

  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Phase**                                 **Deliverables**
  ----------------------------------------- ------------------------------------------------------------------------------------------------------------------------------
  0 -- Governance & source prep             Access matrix, data classification, metric dictionary, workflows, SLAs, templates/JDs, architecture and security approval.

  1 -- Shared Core                          App shell, SSO, role/scope, EmployeeService interface, ActionService, DocumentService, NotificationService and AuditService.

  2 -- People Analytics ingestion MVP       Upload, mapping, validation, snapshots and core workforce/attendance/OT metrics.

  3 -- ER MVP                               Case intake, profile, chronology, evidence, tasks, status and closure.

  4 -- Analytics publishing + ER advanced   Full reporting domains, division dashboards; investigation, meetings, D&G and ER letters.

  5 -- Engagement                           Survey cycles, results import, action plans, Fun with Teams and reminders.

  6 -- AI Letter Studio MVP / RAG           Template bot, Word/PDF, JD versioning/retrieval, validation and approval registry.

  7 -- Employee Voice                       Identified/approved anonymous intake, triage, follow-up and convert-to-case.

  8 -- People Manager                       Guided intake, approved guidance, ER request and manager actions.

  9 -- Advanced intelligence                Comparative analytics, forecasts, Ask People Analytics, cross-module RAG/AI and recommendations.

  10 -- Integration & optimisation          Production HRIS/Microsoft integrations, automation expansion, performance, mobile UX and BAU monitoring.
  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  ------------------------------------------------------------------------------------------------------------------------------------------------
  **Build strategy\
  **Release vertical slices that work end-to-end in UAT. Do not wait for the entire platform to be complete before validating workflows with HR.
  ------------------------------------------------------------------------------------------------------------------------------------------------

  ------------------------------------------------------------------------------------------------------------------------------------------------

# 22. Initial Product Backlog

  ------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Priority**                        **Story**
  ----------------------------------- ------------------------------------------------------------------------------------------------------------------------
  P0                                  As HR, I have one Action Centre showing tasks and approvals from all modules.

  P0                                  As ER, I can create a restricted case and maintain its chronology, evidence and due dates.

  P0                                  As HR Analytics, I can upload approved monthly datasets, resolve validation issues and calculate governed KPIs.

  P0                                  As HR, I can choose an approved letter template, populate verified employee facts and generate controlled Word/PDF.

  P0                                  As admin, I can manage roles/scopes, templates/configuration and audit events.

  P1                                  As Engagement HR, I can create a survey cycle, import results and track action plans.

  P1                                  As HR, I can administer Fun with Teams allocations, claims and exceptions.

  P1                                  As an employee, I can submit an identified Voice report and receive a reference.

  P1                                  As triage HR, I can convert an eligible Voice submission to a linked ER case.

  P1                                  As a manager, I can use guided intake and request ER support.

  P1                                  As HR, I can version JDs/templates and retrieve the correct effective source for a reference letter.

  P2                                  As HR, I can use AI to draft evidence-grounded case summaries, letters and engagement commentary.

  P2                                  As leadership, I can see aggregate cross-module trends and approved actions without unnecessary employee-level detail.

  P2                                  As an authorised user, I can ask governed natural-language analytics questions within my scope.
  ------------------------------------------------------------------------------------------------------------------------------------------------------------

# 23. Production Decisions to Confirm

  ------------------------------------------------------------------------------------------------------------------------------------
  **Decision**                                                **Why it matters**
  ----------------------------------------------------------- ------------------------------------------------------------------------
  Authoritative employee API and permitted fields             Controls auto-population and shared EmployeeService design.

  Organisation hierarchy source/effective dating              Required for scope, analytics and historical accuracy.

  Formal metric dictionary                                    Prevents dashboard inconsistencies from becoming code.

  ER workflow / D&G / letter approval matrix                  Defines statuses, permissions, maker-checker and due process.

  Survey provider, anonymity threshold and exclusions         Defines engagement calculation and privacy rules.

  Fun with Teams effective policy rules                       Defines allocation, eligibility, exceptions and reconciliation.

  Voice anonymity technical model                             Determines what privacy claims and follow-up features are safe.

  Approved letter templates, JDs, signatories and numbering   Defines document schema and issuance workflow.

  AI service/model and data handling                          Requires IT/security approval and evaluation.

  Storage, retention, backup and data residency               Determines document/evidence/audit architecture.

  Hosting / stack choice                                      Confirms custom web vs Power Platform direction and integration model.
  ------------------------------------------------------------------------------------------------------------------------------------

# 24. Repository / README

Suggested monorepo structure:

apps/\
web/\
api/\
worker/\
modules/\
analytics/\
actions/\
er/\
engagement/\
voice/\
people-manager/\
document-studio/\
packages/\
auth/\
employees/\
metrics/\
schemas/\
documents/\
notifications/\
audit/\
ai/\
config/\
ui/\
infra/\
docs/\
tests/\
sample-data/

## README -- Core rules

-   DEV uses synthetic data; UAT uses approved test/masked data; PROD uses live controlled data.

-   Employee data is not maintained as a new authoritative master; production uses Bank-approved integrations behind EmployeeService.

-   Sensitive permissions are enforced server-side.

-   AI is assistive and evidence-grounded; HR owns high-impact decisions and official publication.

-   No public secret-link dashboards, attachments or generated documents.

-   Every material workflow is auditable and versioned.

-   Documentation, tests and UAT are part of the feature---not an afterthought.

# 25. Definition of Done & First Implementation Sprint

## 25.1 Definition of done

-   Business rule/workflow is documented and signed off.

-   Permissions and organisational/case scope are enforced server-side.

-   Unit/integration/permission tests pass.

-   Audit requirements and notification/SLA rules are met.

-   Attachments and sensitive fields are protected.

-   HR UAT confirms calculations/workflow/output.

-   Errors and missing-data states are understandable.

-   AI outputs are human-reviewed and evidence-grounded.

-   Documentation and change log are updated.

-   No sensitive data is exposed in logs.

-   Production output is reproducible from approved source/configuration versions.

## 25.2 First implementation sprint

53. Confirm architecture owner, product owner and module owners.

54. Create app shell and navigation.

55. Implement SSO/role scaffold and permission test harness.

56. Create EmployeeService mock interface using synthetic data.

57. Build ActionService + My Work / HR Action Centre screen.

58. Build AuditService and protected Document/Attachment service.

59. Create People Analytics data inventory, field dictionary, metric dictionary and golden test dataset.

60. Build ER New Case, Case Profile, Timeline and task/due-date flow.

61. Create template catalogue and field schema for initial letters.

62. Build template upload/versioning, deterministic placeholder merge and draft preview.

63. Set up repository, CI, environments and basic observability.

64. Run UAT with synthetic analytics files, ER cases and golden letters.

  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Immediate next step\
  **Before polishing dashboards, collect the real source definitions and approved business rules: data inventory, metric dictionary, ER workflow/status matrix, access matrix, survey/Fun with Teams rules, approved templates/JDs and golden test scenarios. These become the contract for the application.
  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
