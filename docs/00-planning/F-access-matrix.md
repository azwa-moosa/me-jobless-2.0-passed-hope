# F. RBAC & Access Matrix

Status: **DRAFT – requires HR, ER and Information Security sign-off (DR-06, DR-07, DR-20).** Everything here is illustrative until signed off; it is implemented as **data** (role → permission bundles, scopes) so sign-off changes configuration, not code.

## F.1 Access model

Access = **Role permission** ∧ **Scope** ∧ **Record rule** ∧ **Field rule**, evaluated server-side on every request.

| Layer | Question | Mechanism |
|---|---|---|
| Role permission | May this kind of user perform this action at all? | `role_permission` (e.g. `er.case.read`) |
| Organisational scope | Over which part of the Bank? | `user_scope` (BANK / ORG_UNIT + descendants / SELF), resolved as-of today against effective-dated org tree |
| Record scope | For this specific record? | Case team (`er.case_team_member`), Voice triage assignment, action ownership/team, approval step assignment, own records (requester/reporter) |
| Field rule | Which fields of the record? | Restricted-field permissions (salary, NID, passport; ER narrative fields; reporter identity); masking at serialisation |
| Aggregate rule | Can this number be shown? | Minimum-n suppression (engagement, voice, ER aggregates) incl. complementary suppression |
| Environment/feature | Is the capability enabled? | Feature flags; anonymous Voice gated by DR-27 |

Principles: deny by default; no permission implied by navigation; Platform Administrator has **no business-data permissions** [BP §15 "System Admin … without unnecessary business-data privileges"]; maker ≠ checker; privileged grants need second approver and expire; all denials of sensitive resources are audited.

## F.2 Role catalogue

| # | Role | Blueprint mapping [BP §15] | Default scope | Status |
|---|---|---|---|---|
| R1 | HR Analytics Admin | HR Analytics Admin | BANK | From blueprint |
| R2 | ER Officer | "ER Restricted" (split per brief – C-04) | Case team | **DR-06/DR-20** |
| R3 | ER Manager | "ER Restricted" (split per brief – C-04) | All ER cases or assigned portfolio | **DR-06/DR-20** |
| R4 | Engagement HR | Engagement HR | BANK | From blueprint |
| R5 | HR Leadership | HR Leadership | BANK (aggregates) | From blueprint |
| R6 | Division Head | Division / Department Head | Own division | From blueprint (split per brief) |
| R7 | Department Head | Division / Department Head | Own department | From blueprint (split per brief) |
| R8 | Manager | Manager | SELF + own requests/actions | From blueprint |
| R9 | Employee | Employee | SELF | From blueprint |
| R10 | Document HR | Document HR / Approver | BANK (employee facts per field rules) | From blueprint |
| R11 | Document Approver | Document HR / Approver | Per approval matrix | From blueprint; matrix DR-30 |
| R12 | Platform Administrator | System Admin | Technical only | From blueprint |
| R13 | Voice Triage Officer | "Authorised HR triage" [§9] | Assigned submissions | **Proposed – DR-28** |
| R14 | Audit Reviewer | not specified | Audit log read | **Proposed – DR-37** |
| R15 | FwT Coordinator | "Division or unit records activity" [§7.2] | Own unit/division | **Proposed – DR-26** |
| R16 | Access Approver | not specified (maker-checker on grants) | Role grants | **Proposed – DR-06** |

Division Head vs Department Head could remain a single role with different scope rows; kept separate per the brief pending DR-06.

## F.3 Permission matrix

Legend: **●** full within scope · **◐** limited (aggregate / safe fields / assigned only) · **○** own records only · **A** approve (maker-checker) · **✕** none · **?** decision required.

### Platform & administration

| Capability | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12 | R13 | R14 | R15 | R16 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sign in / view own profile | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| Request role/scope change | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ● | ✕ | ✕ | ✕ | ✕ |
| Approve role/scope change | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | A |
| Edit config – own module namespace | ● analytics | ✕ | ● er (maker) | ● engagement | ✕ | ✕ | ✕ | ✕ | ✕ | ● studio | A studio | ◐ technical flags | ✕ | ✕ | ✕ | ✕ |
| Approve module config | ? | ✕ | ? | ? | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ? | ✕ | ✕ | ✕ | ✕ | ✕ |
| Read audit log | ◐ analytics | ✕ | ◐ ER events | ◐ engagement | ✕ | ✕ | ✕ | ✕ | ✕ | ◐ studio | ✕ | ◐ technical only | ✕ | ● | ✕ | ◐ access events |
| Manage feature flags | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ● | ✕ | ✕ | ✕ | ✕ |

### Employee data

| Capability | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12 | R13 | R14 | R15 | R16 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Employee search (summary) | ● | ● | ● | ● | ✕ | ◐ scope | ◐ scope | ◐ direct reports? (DR-07) | ✕ | ● | ◐ in approvals | ✕ | ◐ | ✕ | ✕ | ✕ |
| Position history | ◐ | ● | ● | ✕ | ✕ | ✕ | ✕ | ✕ | ○ | ● | ◐ | ✕ | ✕ | ✕ | ✕ | ✕ |
| **Salary** | ✕ | ? | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ○? | ◐ reveal when template requires | ◐ in approval | ✕ | ✕ | ✕ | ✕ | ✕ |
| **NID / passport** | ✕ | ? | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ○? | ◐ reveal when template requires | ◐ in approval | ✕ | ✕ | ✕ | ✕ | ✕ |

### People Analytics

| Capability | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12 | R13 | R14 | R15 | R16 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create period, upload, map, validate | ● | ✕ | ✕ | ◐ engagement dataset | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Override validation | ● (reason) / A? | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Approve snapshot / publish | A (≠ uploader) | ✕ | ✕ | ✕ | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Edit metric definitions | ● maker | ✕ | ✕ | ✕ | ? A | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Review insights | ● | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| View published dashboards | ● Bank | ✕ | ◐ ER metrics | ◐ engagement | ● Bank | ◐ own division | ◐ own dept | ✕? | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Employee-level drill-through | ● | ✕ | ✕ | ✕ | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| ER aggregate metrics | ● | ✕ | ● | ✕ | ◐ suppressed | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Export | ● | ✕ | ✕ | ✕ | ◐ aggregate | ◐ own aggregate | ◐ own aggregate | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |

### Engagement & Fun with Teams

| Capability | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12 | R13 | R14 | R15 | R16 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Manage cycles, population, import | ✕ | ✕ | ✕ | ● | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Participation (aggregate, thresholded) | ✕ | ✕ | ✕ | ● | ● | ◐ own | ◐ own | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Results (thresholded) | ◐ | ✕ | ✕ | ● | ● | ◐ own | ◐ own | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Respondent-level data | ✕ | ✕ | ✕ | ? (DR-22) | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Submit action plan | ✕ | ✕ | ✕ | ✕ | ✕ | ● own | ● own | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Review/approve action plan | ✕ | ✕ | ✕ | A | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| FwT: record activity/claim | ✕ | ✕ | ✕ | ● | ✕ | ? | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ● own unit | ✕ |
| FwT: approve/reject claim | ✕ | ✕ | ✕ | A | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |

### ER Case Management (all record-scoped by case team unless stated)

| Capability | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12 | R13 | R14 | R15 | R16 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create case | ✕ | ● | ● | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ◐ via convert | ✕ | ✕ | ✕ |
| View case (profile/timeline) | ✕ | ◐ case team | ● or portfolio (DR-20) | ✕ | ? oversight | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ◐ converted-from own triage? | ✕ | ✕ | ✕ |
| Manage case team | ✕ | ✕ | ● | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Change status / assign | ✕ | ◐ per state machine | ● | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Upload evidence | ✕ | ◐ case team | ● | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| View/download evidence | ✕ | ◐ case team + sensitivity | ◐ + sensitivity | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Investigation / meetings | ✕ | ◐ case team | ● | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| D&G pack / decision entry | ✕ | ◐ prepare | ● / A per DR-17 | ✕ | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| ER letters | ✕ | ◐ draft | A per DR-18 | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Assigned ER follow-up action (safe title only) | ✕ | ● | ● | ✕ | ✕ | ○ | ○ | ○ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Case access log | ✕ | ✕ | ● | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ● | ✕ | ✕ |

### Employee Voice

| Capability | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12 | R13 | R14 | R15 | R16 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Submit (identified) | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| View own submission status/messages | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Triage / message reporter | ✕ | ? | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ● assigned | ✕ | ✕ | ✕ |
| See reporter identity (identified mode) | ✕ | ? | ? | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ◐ per DR-28 | ✕ | ✕ | ✕ |
| Convert to ER case | ✕ | ? | ● | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ◐ request | ✕ | ✕ | ✕ |
| Voice aggregates (suppressed) | ● | ✕ | ● | ✕ | ● | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ● | ✕ | ✕ | ✕ |

A submitter's own role never grants access to anyone else's submission. Conflict-of-interest routing (e.g. report concerning HR or a triage officer) per DR-28.

### People Manager

| Capability | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12 | R13 | R14 | R15 | R16 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Guided intake / guidance | ✕ | ✕ | ✕ | ✕ | ✕ | ● | ● | ● | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Own requests + manager-safe status | ✕ | ✕ | ✕ | ✕ | ✕ | ○ | ○ | ○ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| Triage manager requests | ✕ | ● | ● | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |

### HR Action Centre

| Capability | All roles | Notes |
|---|---|---|
| My Work | ○ | Own assigned actions; restricted detail only if source policy passes |
| Team Work | ◐ | Team members/leads of that team |
| Approvals | ○ | Steps assigned to user/role within scope |
| Reassign | ◐ | Team lead or module owner roles |
| Action reports | ◐ | HR Leadership (aggregate), team leads (own teams) |

### AI Letter & Document Studio

| Capability | R10 Document HR | R11 Document Approver | R9 Employee | Others |
|---|---|---|---|---|
| Create request, view permitted facts | ● | ◐ in approval | ? self-service request (not in blueprint) | ✕ |
| Reveal restricted fields | ◐ only when template requires | ◐ in approval | ✕ | ✕ |
| Provide verified input for missing fact | ● (with evidence) | ✕ | ✕ | ✕ |
| Edit draft | ● | ◐ return with comments | ✕ | ✕ |
| Approve / issue | ✕ (maker) | A | ✕ | ✕ |
| Manage templates / JDs / knowledge | ● maker | A | ✕ | ✕ |

## F.4 Negative security test catalogue (seed for `tests/security`)

1. Direct URL/API to another division's dashboard as Division Head → 403 + audit.
2. Manager calls `/er/cases/{id}` for a case linked to their own request → 403; manager request API never returns case FK.
3. ER Officer not on case team → 403 on case, timeline, evidence list, evidence download; RLS returns zero rows even if app check is bypassed in test.
4. Evidence download URL replay after case-team removal → 403.
5. Salary/NID/passport returned masked for all roles without field permission, in API, exports, audit summaries, logs, notifications.
6. Export endpoint without export permission → 403; with permission → masked per profile; audited.
7. Engagement results for org units below threshold → suppressed; parent-minus-children derivation blocked.
8. Voice: triage-only data absent from reporter view; anonymous mode endpoints disabled (404) while flag off.
9. Platform Administrator → 403 on ER, Voice, salary, engagement respondent data.
10. Maker approving own item → 409/403.
11. Mock IdP token presented to UAT/PROD API → 401.
12. Expired scope (valid_to past) → access removed without redeploy.
