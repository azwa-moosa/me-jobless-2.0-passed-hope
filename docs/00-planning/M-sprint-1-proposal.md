# M. Sprint 1 Proposal – Platform Foundation

Status: **PROPOSED – awaiting approval.** No application code will be written until you approve this sprint, DR-42 (scope) and — for build purposes — the provisional stack in DR-02.

## M.1 Sprint objective

Stand up a secure, testable skeleton that every later module plugs into: a user can sign in (DEV mock IdP or Entra DEV), land in a role-adaptive shell, and every API call passes through a proven server-side policy layer backed by an effective-dated synthetic organisation, with material actions written to an immutable audit trail — all on synthetic data, in CI.

## M.2 Exact deliverables

| # | Deliverable | Done when |
|---|---|---|
| D1 | Monorepo (pnpm + Turborepo) with `apps/{web,api,worker}`, `packages/{auth,policy,employees,config,audit,observability,jobs,schemas,testing,synthetic-data,ui,ai,analytics}`, empty `modules/*` with boundaries lint | `pnpm build` and `pnpm lint` pass; boundary violation test fails lint as expected |
| D2 | DEV infrastructure (`infra/docker/compose.yml`: Postgres 16 + pgvector, Azurite, Mailpit) | `pnpm infra:up` healthy |
| D3 | Typed environment config with env safety switches (`dev/uat/prod`) | App refuses to boot with mock IdP in `uat/prod`; missing config fails fast |
| D4 | DB migration baseline: `platform`, `org`, `config`, `audit`, `ai` (log tables only), `synthetic_hris` schemas | `pnpm db:migrate` idempotent; down/up tested |
| D5 | Authentication: Entra OIDC wiring (config-driven) + DEV mock IdP with persona tokens | Persona login works; Entra works when DEV app registration supplied; invalid/expired tokens → 401 |
| D6 | PolicyService: permission catalogue, role bundles, scope resolution against org tree, record-policy registry, field masking | Unit tests cover every rule branch |
| D7 | Permission test harness: matrix file → generated API tests per persona | Harness runs in CI; initial matrix rows for platform/admin/employee endpoints |
| D8 | EmployeeService interface + synthetic provider + org hierarchy (effective-dated, configurable levels) | Contract test suite passes against synthetic provider |
| D9 | Synthetic data generator (fixed seed): org tree, ~1,200 employees, positions, personas for R1–R16 | `pnpm db:seed` reproducible (hash-stable) |
| D10 | ConfigurationService core: effective-dated items with maker-checker states, lookups, business calendar (no hard-coded weekend), sequence allocator, feature flags | As-of lookups and concurrent sequence allocation tested |
| D11 | AuditService: outbox write in business transaction, relay to append-only `audit_event`, hash chain, verify endpoint, read API | UPDATE/DELETE fail at DB level; tamper test detected by verify |
| D12 | Observability: pino logger with redaction, correlation IDs, problem+json error model, `/health` & `/ready`, OTel hooks | Redaction tests pass for salary/NID/passport/free-text fields |
| D13 | AIService interface + deterministic mock provider + `ai_interaction` logging; AnalyticsService interface + small-number suppression utility | Unit tests; no network AI call possible in DEV build |
| D14 | Web app shell: sign-in, role-adaptive navigation from `/me/capabilities`, home placeholder, permission-denied / not-found / error / loading / empty states, UI kit basics (layout, nav, table, form field, status chip, confirm dialog) | Playwright: each persona sees only permitted nav; direct URL to forbidden route shows denied page and API returns 403 |
| D15 | CI pipeline: lint → typecheck → unit → integration (Testcontainers) → security suite → build → secret & PII scan → dependency audit → SAST | Pipeline green on main |
| D16 | Documentation: README (run/test), `docs/architecture.md`, `docs/security-design.md` (v0.1), `docs/access-matrix.md` (from F), `docs/audit-catalogue.md` (Sprint 1 events), `docs/data-dictionary.md` (generated), `CHANGELOG.md`, updated checklist | Docs match code; data dictionary generated from schema |
| D17 | **Phase 0 governance track** (non-code, for HR/IT): dataset inventory template, field dictionary template, metric dictionary template, ER workflow/status/SLA matrix template, access matrix review sheet, letter template catalogue & field schema template, decisions register circulated with owners | Templates in `docs/phase0/`; each DR has a named owner (target) |

## M.3 Repository changes

```
package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, .eslintrc (boundaries), .nvmrc, .env.example
apps/web/…           Next.js shell (auth routes, layout, nav, state pages)
apps/api/…           Nest bootstrap, global AuthGuard, PolicyGuard, AuditInterceptor, problem+json filter, health
apps/worker/…        pg-boss runner, outbox relay job
packages/auth        entra.ts, mock-idp.ts (dev-only), security-context.ts
packages/policy      permissions.catalogue.ts, roles.seed.ts, policy.service.ts, scope.resolver.ts, field-mask.ts
packages/employees   employee.service.ts (interface), providers/synthetic/*, org/*
packages/config      env.schema.ts, configuration.service.ts, calendar.ts, sequence.ts, flags.ts
packages/audit       audit.service.ts, outbox.ts, hash-chain.ts, catalogue.ts
packages/observability logger.ts (redaction), errors.ts, otel.ts
packages/jobs        queue.ts, outbox-relay.ts
packages/schemas     platform/*, org/*, config/*, audit/*, ai/*, synthetic_hris/*, migrations/*.sql
packages/ai          ai.service.ts (interface), providers/mock.ts, interaction-log.ts
packages/analytics   analytics.service.ts (interface), suppression.ts
packages/testing     personas.ts, matrix-runner.ts, db-fixture.ts
packages/synthetic-data  generator/*, seeds/*
packages/ui          tokens, components
infra/docker/compose.yml, infra/pipelines/ci.yml
tests/security/matrix.platform.yaml, tests/e2e/navigation.spec.ts
docs/… (D16, D17)
```

## M.4 Database work

| Schema | Tables in Sprint 1 |
|---|---|
| platform | app_user, role, permission, role_permission, user_scope, privileged_access_grant (table only), team, team_member, outbox |
| org | org_level_type, organisation_unit, organisation_unit_version, org_import_batch |
| config | configuration_item, feature_flag, lookup_set, lookup_value, business_calendar, calendar_holiday, sequence_rule, sequence_counter, retention_class (codes only, periods null) |
| audit | audit_event (partitioned, append-only grants, block trigger, hash chain) |
| ai | ai_model_registry, prompt_template, prompt_template_version, ai_interaction, ai_interaction_source (tables only) |
| synthetic_hris | employee, position_history (DEV/UAT only; excluded from PROD migrations) |

Extensions: `pgcrypto`, `citext`, `ltree`, `btree_gist`, `vector`. DB roles: `app_migrator` (DDL), `app_runtime` (DML, no UPDATE/DELETE on audit), `app_readonly_audit`.

## M.5 Backend work

- Nest bootstrap with global guards/interceptors; module registration pattern for later modules.
- `GET /me`, `GET /me/capabilities`, `GET /employees`, `GET /employees/{uid}`, `GET /employees/{uid}/positions`, `GET /org-units/tree`, `GET /config/lookups/{set}`, `GET /admin/feature-flags`, `GET /audit/events`, `GET /audit/verify`, `GET /health`, `GET /ready`.
- PolicyService integrated into every route (decorator + handler-level `assertCan`).
- Outbox → audit relay job in worker.
- Sprint 1 audit events: `auth.login.succeeded/failed`, `auth.logout`, `access.denied` (sensitive resources), `employee.restricted_field.revealed`, `config.item.created/submitted/approved`, `feature_flag.changed`, `audit.verify.run`.

## M.6 Frontend work

- Next.js App Router shell, Entra/mock sign-in, session handling.
- Navigation built from `/me/capabilities` (Home, My Work, People Analytics, Engagement, ER, Employee Voice, People Manager, Documents, Reports, Administration — each shown only if a capability exists; module pages are placeholders stating "not yet available").
- Reusable states: Loading, Empty, PermissionDenied, NotFound, Error (with correlation ID), ConfirmDialog (audit-friendly wording).
- Employee lookup demo page (Admin/HR personas) showing masked restricted fields — proves field masking end-to-end.
- Accessibility: axe checks in Playwright; keyboard navigation.

## M.7 Security work

- Deny-by-default guard; unknown route permission = build-time error.
- Token validation (issuer/audience/signature/expiry); mock IdP isolated to `dev`.
- Field masking for salary/NID/passport at serialisation; log redaction.
- Secret scanning + PII pattern scanning in CI; `.env` git-ignored.
- Audit immutability via DB grants + trigger + hash chain.
- Security headers (CSP, HSTS, frame-ancestors none), CSRF protection on web session.
- Threat model v0.1 for foundation in `docs/security-design.md`.

## M.8 Tests

| Type | Coverage in Sprint 1 |
|---|---|
| Unit | PolicyService rules, scope resolution (incl. as-of dates, descendants, expired grants), field masking, config as-of, calendar business-day maths, sequence formatting, hash chain, redaction |
| Integration (Testcontainers Postgres) | Migrations up/down; audit UPDATE/DELETE rejected; outbox atomicity (rollback → no audit); concurrent sequence allocation |
| API / permission | Matrix-driven tests for every Sprint 1 endpoint × persona |
| Negative security | Cross-division employee lookup; restricted fields masked for all non-permitted personas; mock token rejected when `PLATFORM_ENV=uat`; Platform Admin denied business data; direct-URL denial |
| Contract | EmployeeService provider contract suite |
| E2E (Playwright) | Persona navigation; forbidden route → denied page; error page shows correlation ID |
| Data | Seed determinism (same seed → same hash); PII scanner catches planted fake NID pattern |

## M.9 Sample data

- Synthetic org tree (configurable: e.g. 12 divisions / sections / departments / units, invented names), ~1,200 synthetic employees across 9 synthetic grades, position histories with transfers/promotions/edge cases, fake-format NID/passport (`TEST-…`), salary bands (synthetic).
- Personas: one per role R1–R16, plus edge personas (Division Head with expired grant; Manager who is also a Voice reporter; Platform Admin).
- All files and seeds carry `SYNTHETIC – NOT REAL DATA` markers.

## M.10 Acceptance criteria

1. Fresh clone → `pnpm install && pnpm infra:up && pnpm db:migrate && pnpm db:seed && pnpm dev` runs web, api, worker locally.
2. Each persona signs in via mock IdP and sees only permitted navigation items.
3. For every Sprint 1 endpoint, the permission matrix tests pass, including direct-URL and cross-division negatives.
4. Salary/NID/passport are masked in API responses, logs and audit summaries for every persona lacking the field permission.
5. Mock IdP tokens are rejected when `PLATFORM_ENV` ≠ `dev`; app refuses to boot with mock IdP enabled outside dev.
6. `audit_event` rows cannot be updated or deleted by the runtime role; `/audit/verify` detects a manually tampered row in the test DB.
7. Business transaction rollback leaves no audit/outbox record (atomicity test).
8. Org tree as-of two different dates returns the correct historical structure; scope changes take effect without redeploy.
9. CI pipeline green on main; secret/PII scan passes; no real data anywhere in the repo.
10. Docs (D16) updated and consistent with code; checklist updated honestly.
11. Phase 0 templates (D17) delivered for HR/IT input.

## M.11 Expected output at end of Sprint 1

A running foundation (locally and optionally in an isolated DEV environment) with sign-in, role-adaptive shell, synthetic organisation and employees, proven policy enforcement and immutable audit — **no business module functionality yet** — plus the Phase 0 templates that unblock Sprints 3–6. Checklist Phase 1 items move to `[-]` "built & tested – awaiting HR UAT" (or `[x]` for purely technical items if you decide DR-41 that way).

## M.12 Mapping of blueprint §25.2 "first implementation sprint" items

| §25.2 item | Where it lands |
|---|---|
| 53 Confirm owners | Sprint 1 Phase 0 track (DR-01) — decision for BML |
| 54 App shell and navigation | **Sprint 1** (D14) |
| 55 SSO/role scaffold + permission test harness | **Sprint 1** (D5–D7) |
| 56 EmployeeService mock with synthetic data | **Sprint 1** (D8–D9) |
| 57 ActionService + My Work | Sprint 2 |
| 58 AuditService + protected Document/Attachment service | Audit **Sprint 1** (D11); attachments Sprint 2 |
| 59 Analytics data inventory, field dictionary, metric dictionary, golden dataset | Templates **Sprint 1** (D17); content from HR (DR-11/12); golden dataset Sprint 3–4 |
| 60 ER New Case, Profile, Timeline, task/due-date flow | Sprints 5–6 (Phase 3) |
| 61 Template catalogue and field schema for initial letters | Template **Sprint 1** (D17); content from DOC (DR-30) |
| 62 Template upload/versioning, deterministic merge, draft preview | Phase 3 template engine (DR-43) |
| 63 Repository, CI, environments, observability | **Sprint 1** (D1–D3, D12, D15) |
| 64 UAT with synthetic analytics files, ER cases and golden letters | After Sprints 4 (analytics) / 6 (ER) / Phase 4b (letters) |

## M.13 Out of scope for Sprint 1

Business modules; Entra group sync; email/Teams; real AI calls; any UAT/PROD infrastructure (pending DR-02/DR-03); any real BML data, templates, metrics or rules.

## M.14 What I need from you to start

1. Approve Sprint 1 scope (DR-42) — foundation-only as above, or pull more of §25.2 in.
2. Approve the provisional stack for building (DR-02: NestJS + PostgreSQL) or name BML IT's standard.
3. Decide DR-41 (what `[x]` means).
4. Optional: an Entra DEV app registration (client ID/tenant) — otherwise Sprint 1 uses the mock IdP only.
