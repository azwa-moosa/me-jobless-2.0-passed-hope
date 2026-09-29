# Audit event catalogue – v0.1

All events: `occurred_at`, actor, event type, module, resource, outcome, sensitivity class, correlation ID, hashed client IP, and a **summary containing field names / codes only** (never restricted values or narrative). Reviewer, retention and IP-logging policy pending DR-37 / DR-09.

| Event | Module | Class | When |
|---|---|---|---|
| auth.login.succeeded / auth.login.failed | auth | CONF | Sign-in (mock IdP in DEV) |
| auth.logout | auth | CONF | Sign-out |
| access.denied | platform | CONF | Any 403 (route, scope or record) |
| employee.restricted_field.revealed | employee | REST | Salary / NID / passport reveal (field name only) |
| feature_flag.changed | admin | INT | Flag toggled |
| audit.verify.run | audit | CONF | Hash-chain verification (result in summary) |
| action.created / action.status_changed / action.completed / action.reopened / action.reassigned | actions or er | CONF / HREST | Action Centre changes (HREST when the source is an ER case) |
| er.case.created | er | HREST | Intake |
| er.case.viewed | er | HREST | Every case profile open (AUD-002) |
| er.case.event_added / er.case.event_amended | er | HREST | Chronology entry / amendment |
| er.case.status_changed | er | HREST | Status transition |
| er.case.team_member_added / er.case.team_member_removed | er | HREST | Case team change |
| er.case.closed | er | HREST | Closure (summary flags override use) |
| platform.seed.completed | platform | INT | Synthetic seed (DEV) |

Immutability: runtime role has INSERT/SELECT only; a trigger blocks UPDATE/DELETE/TRUNCATE for every role; `audit.verify_chain()` pinpoints the first altered row (proven by the security suite's simulated DBA tamper test).
