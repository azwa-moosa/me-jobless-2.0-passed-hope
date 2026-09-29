# Architecture – as built (v0.1)

Target design: `00-planning/C-architecture.md`. This page records what exists in code today and where it differs.

## Request path

```
Browser ──(same-origin /api/*, httpOnly SameSite=Strict cookie, CSRF header)──► Next.js BFF
      ──(Bearer token)──► NestJS API
          correlationMiddleware  → correlation ID + access log (no bodies)
          AuthGuard (global)     → deny-by-default; token verify (Entra JWKS or DEV mock) → SecurityContext from DB grants
          @Requires / @RequiresAny → role permission check
          handler                → scope check (canInOrg) / record check (canSeeCase) on the LOADED record
          DbService.tx(ctx)      → sets app.user_id / app.er_override → Postgres RLS on er.*
          AuditService.record    → outbox row in the SAME transaction
          ProblemFilter          → RFC 7807 + correlationId; every 403 audited as access.denied
      Worker: outbox → audit.audit_event (append-only, SHA-256 hash chain)
```

`RouteAccessAuditor` stops the API from booting if any route lacks an access rule or names a permission outside the catalogue.

## Data (schemas)

| Schema | Tables (v0.1) |
|---|---|
| platform | app_user, role, permission, role_permission, user_scope, team, team_member, outbox, privileged_access_grant |
| org | org_level_type, organisation_unit, organisation_unit_version (effective-dated, `ltree` path, no-overlap exclusion) |
| config | configuration_item, feature_flag, lookup_set/value, business_calendar, calendar_holiday, sequence_rule/counter, state_machine, retention_class |
| audit | audit_event (append-only trigger + grants, hash chain, `verify_chain()`) |
| actions | action, action_event |
| er | er_case, case_participant, case_team_member, case_event (immutable) – **RLS enabled** |
| ai | model registry, prompt templates, interaction log (tables only) |
| synthetic_hris | employee, position_history (DEV/UAT only) |

DB roles: `app_migrator` (owner/DDL) and `app_runtime` (DML only, not owner ⇒ subject to RLS, no UPDATE/DELETE on audit or chronology, no DELETE anywhere).

## Sensitive data handling

| Data | Control |
|---|---|
| Salary, NID, passport | Masked in every API response for every role; separate `POST /employees/:uid/reveal` requires the field permission + scope and is audited (value never logged/audited) |
| ER summary & chronology text | AES-256-GCM field encryption (`@bml/crypto`); key from env in DEV, Key Vault in UAT/PROD |
| ER records | Case-team policy in API **and** Postgres RLS; non-team direct URL → 403 + `access.denied`; every case open → `er.case.viewed` |
| ER tasks in Action Centre | `title_safe` visible to owner; `detail_restricted` + source link only if the viewer passes the case policy |
| Logs | pino with redaction of restricted fields, narrative, auth headers, cookies, bodies |

## Deviations from the plan (for review)

| Plan | As built | Why / next step |
|---|---|---|
| Drizzle ORM | Plain SQL migrations + `pg` | Readable for DBA/InfoSec review; RLS/triggers are native SQL. Drizzle can be layered on later |
| Turborepo | pnpm workspace scripts | Fewer moving parts at this size; add when build times justify caching |
| pg-boss job queue | Worker polls the outbox (`FOR UPDATE SKIP LOCKED`) | Only one job exists; pg-boss arrives with parse/validate jobs in Phase 2 |
| `modules/*` packages + eslint-plugin-boundaries | Business modules live in `apps/api/src/{actions,er}` | Extract into `modules/` and add boundary lint in Sprint 2 |
| Radix + Tailwind UI kit | Hand-written CSS design system | Product owner decision (plain CSS) |
| UUIDv7, partitioned audit table | UUIDv4 (`gen_random_uuid`), unpartitioned | Low volume in DEV; switch before UAT |
| Entra OIDC sign-in in web | API validates Entra tokens; web uses DEV mock only | Needs an Entra DEV app registration from IT |
| Web CSP | Allows inline/eval (Next.js runtime) | Move to nonce-based CSP before UAT |
| ESLint | Not configured; TypeScript strict only | Sprint 2 |

## Configuration that is SAMPLE (not BML policy)

ER case types, categories, sources, priorities, confidentiality levels, event types, ER state machine (DR-15/DR-20) · action priorities and state machine (DR-36) · reference formats `ER-{YYYY}-{SEQ:4}`, `ACT-{YYYY}-{SEQ:6}` (DR-19) · business calendar Sun–Thu, no holidays loaded (DR-35) · role bundles (DR-06/DR-07).
