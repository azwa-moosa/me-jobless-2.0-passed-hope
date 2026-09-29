# D. Module Dependency Map

## D.1 Dependency graph

```mermaid
flowchart LR
  subgraph F["Foundation (Phase 1)"]
    IAM[Identity & Access]
    EMP[EmployeeService + Org]
    CFG[ConfigurationService]
    AUD[AuditService]
    DOC[DocumentService\nattachments]
    NOT[NotificationService]
    ACT[ActionService]
    AIS[AIService\ninterface+mock]
    ANS[AnalyticsService\ninterface]
  end
  TPL[Template engine\n(deterministic merge)]
  KB[Knowledge base / RAG]

  PA[People Analytics]
  ER[ER Case Mgmt]
  ENG[Engagement + FwT]
  DS[Document Studio]
  VOI[Employee Voice]
  MGR[People Manager]

  F --> PA
  F --> ER
  F --> ENG
  DOC --> TPL
  TPL --> ER
  TPL --> DS
  AIS --> KB --> DS
  KB --> MGR
  ER --> VOI
  ER --> MGR
  ENG -. aggregates .-> PA
  ER -. restricted aggregates .-> PA
  VOI -. aggregates .-> PA
  ACT -. reports .-> PA
```

## D.2 Dependency table

| Module | Hard dependencies (must exist first) | Soft dependencies (can stub) | Provides to others |
|---|---|---|---|
| Identity & Access | Entra app registration (DR-06); org hierarchy for scope (EMP) | – | Security context for everything |
| EmployeeService | Provider decision (DR-04); synthetic HRIS in DEV | – | Employee facts, position history, org tree |
| ConfigurationService | – | – | Rules, SLAs, calendar, sequences, flags |
| AuditService | – | – | Immutable trail |
| DocumentService | Blob storage; Policy delegation contract | Malware scan (DR-39) | Attachments, templates, rendering, exports |
| NotificationService | Action/Config | Email/Teams approval (DR-34) – in-app first | Notifications |
| ActionService | Identity, Config (SLA, calendar), Notification, Audit | – | Tasks, approvals for all modules |
| People Analytics | Foundation; dataset inventory (DR-12); metric dictionary (DR-11) | AI insights (Phase 9) | Metrics, dashboards, aggregates |
| ER | Foundation; ER workflow matrix (DR-15); template engine for letters (Phase 4) | AI summaries (Phase 6+) | Linked cases for Voice/Manager; aggregates |
| Engagement + FwT | Foundation; Action plans need ActionService | Survey provider import (DR-21) | Engagement aggregates |
| Document Studio | Template engine; EmployeeService provider with required fields; approval matrix (DR-30) | JD RAG and AI narrative (Phase 6) | Knowledge base, template engine hardening |
| Employee Voice | ER case model (convert-to-case); anonymity model (DR-27) for anonymous route | – | Aggregates |
| People Manager | Knowledge base (RAG) with approved policies; ER request intake | – | ER requests |

## D.3 Critical path

`Identity + Org scope → ActionService → (Analytics ingestion ‖ ER MVP) → Template engine → ER letters / Studio deterministic → Knowledge/RAG → Studio AI → People Manager → Advanced intelligence`

Business-decision critical path (these block build items, not the foundation): DR-04 (employee API), DR-05 (org hierarchy), DR-11 (metric dictionary), DR-15/17/18 (ER workflow & approvals), DR-30 (templates/signatories/numbering), DR-32 (AI service approval).

## D.4 Proposed resequencing (not applied – DR-43)

| Change | Reason | Effect |
|---|---|---|
| Build template engine (DocumentService) in Phase 3 | ER letters in Phase 4 need it; blueprint §25.2 builds template merge in first sprint | Removes a Phase 4 blocker |
| Add **Phase 4b: Document Studio Deterministic MVP** (select letter → facts → missing-field block → merge → approval → DOCX/PDF, no AI) | Blueprint §22 marks letter generation **P0**, while Engagement is P1 | P0 value earlier; Phase 6 becomes "AI narrative + JD RAG" |
| Keep Engagement at Phase 5, Voice 7, Manager 8, Advanced 9, Integration 10 | Dependencies satisfied | No change |
