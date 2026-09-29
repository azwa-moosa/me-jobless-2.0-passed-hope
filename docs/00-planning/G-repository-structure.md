# G. Repository Structure

Tooling: **pnpm workspaces + Turborepo**, TypeScript project references, ESLint with `eslint-plugin-boundaries` to enforce module boundaries.

The blueprint's structure [BP §24] is preserved. Additions are marked **(added)** with reasons.

```
bml-people-er-platform/
├── apps/
│   ├── web/                     Next.js app: shell, navigation, module pages (UI only, no authz decisions)
│   │   └── src/app/
│   │       ├── (auth)/          sign-in, signed-out, dev persona picker (DEV build only)
│   │       ├── home/            exception-first home
│   │       ├── my-work/         Action Centre views
│   │       ├── analytics/  engagement/  er/  voice/  manager/  documents/  reports/
│   │       └── admin/           users & access, configuration, feature flags, audit log
│   ├── api/                     NestJS bootstrap: wires modules + shared services, global guards/interceptors
│   └── worker/                  Job runner (pg-boss): parse, validate, calculate, remind, escalate, notify, embed, render, export
│
├── modules/                     Business modules. Each = { contracts/, server/ } with a single public index
│   ├── analytics/               reporting periods, uploads, validation, snapshots, metrics runs, insights, publication, forecasts
│   ├── engagement/              survey cycles, population, participation, results, action plans, Fun with Teams
│   ├── er/                      cases, participants, timeline, investigation, meetings, evidence, D&G, decisions, ER letters
│   ├── voice/                   submissions, messages, triage, convert-to-case, reporter access tokens
│   ├── people-manager/          guided intake, manager requests, escalations
│   ├── actions/                 Action Centre UI-facing API over ActionService (views, reports)
│   └── document-studio/         document requests, evidence bundles, validation, review, issuance
│       ├── contracts/           Zod DTOs, permission keys, event names (shared with web)
│       └── server/              Nest module: controllers, application services, repositories, policies, state machines
│
├── packages/                    Shared platform services and libraries
│   ├── auth/                    Entra token validation, mock IdP (DEV), SecurityContext, AuthGuard
│   ├── policy/          (added) Permission catalogue, role→permission bundles, PolicyService, scope resolver, field masking.
│   │                            Separated from auth so it can be unit-tested exhaustively and reused by worker.
│   ├── employees/               EmployeeService interface + providers (synthetic, hris) + org hierarchy
│   ├── actions/         (added) ActionService + ApprovalService (the shared engine; modules/actions is its UI-facing API)
│   ├── analytics/               AnalyticsService: governed aggregate queries, small-number suppression
│   ├── metrics/                 Metric engine: definition parser, deterministic evaluator, comparisons (pure, no I/O)
│   ├── schemas/                 Database schema (Drizzle) per module schema + SQL migrations + RLS policies
│   ├── documents/               DocumentService: attachments, blob adapter, template engine, renderers, exports
│   ├── notifications/           NotificationService: channels (in-app, email, Teams), templates, de-dup
│   ├── audit/                   AuditService: event catalogue, outbox writer, hash chain, reader
│   ├── ai/                      AIService: providers (azure-openai, mock), prompt registry, retriever, validators, interaction log
│   ├── config/                  ConfigurationService (effective-dated), feature flags, env config loader (typed, validated)
│   ├── jobs/            (added) Queue abstraction (pg-boss) + transactional outbox; shared by api and worker
│   ├── observability/   (added) Logger with PII redaction, OpenTelemetry setup, correlation IDs, error model
│   ├── testing/         (added) Test harness: persona tokens, permission-matrix runner, DB fixtures, golden-file helpers
│   ├── synthetic-data/  (added) Deterministic synthetic generator: org tree, employees, datasets, cases, cycles, JDs, templates
│   └── ui/                      Design system: tokens, components (tables, forms, status chips, dialogs, empty/denied states)
│
├── infra/
│   ├── docker/                  docker-compose for DEV: postgres(+pgvector), azurite, mailpit, (optional) otel collector
│   ├── bicep/           (added) Azure IaC per environment (dev/uat/prod parameter files) – subject to DR-02/DR-03
│   └── pipelines/               CI/CD definitions (DR-47)
│
├── docs/                        Living documentation (see list below)
├── tests/
│   ├── e2e/                     Playwright: workflows, direct-URL denial, role navigation
│   ├── security/                Negative security suites: cross-scope, restricted fields, attachments, exports, anonymity
│   ├── golden/                  Golden datasets + expected outputs (metrics, validations, letters)
│   ├── ai-eval/                 AI evaluation and prompt-injection corpora (Phase 6+)
│   └── uat/                     UAT scenario scripts and sign-off templates
└── sample-data/                 Generated synthetic files (CSV/XLSX) for uploads; NEVER real data (CI scan enforces)
```

## G.1 Module internal layout (example: `modules/er/server`)

```
er/server/
  er.module.ts            Nest module; exports ErPublicService only
  public/                 ErPublicService (the only thing other modules may call)
  api/                    controllers (thin), request/response DTO mapping
  application/            use cases: CreateCase, ChangeStatus, AddEvidence ... (transactional, audited)
  domain/                 entities, state machines, invariants (no framework code)
  policy/                 ER resource policies (case team, confidentiality, evidence sensitivity)
  infrastructure/         repositories (Drizzle), RLS session setup
  __tests__/              unit + integration
```

## G.2 Boundary rules (lint-enforced)

1. `modules/*` may import `packages/*` and other modules' **`contracts`** or **`public`** only.
2. `packages/*` never import `modules/*` (dependency inversion via registration: e.g. modules register `VisibilityResolver`s with ActionService).
3. `apps/web` imports only `contracts`, `packages/ui`, `packages/policy` (for navigation hints – never for enforcement).
4. Only `packages/schemas` defines tables; each module owns its own schema namespace.

## G.3 `docs/` layout

```
docs/
  00-planning/        A–M planning pack (this set)
  requirements/       blueprint source text, RTM (rtm_data.py → rtm.csv/.xlsx)
  architecture.md     product-requirements.md   data-dictionary.md   metric-catalogue.md
  er-workflow.md      engagement-workflow.md    access-matrix.md      api-specification.md (OpenAPI generated)
  ai-rag-design.md    ai-evaluation-plan.md     template-catalogue.md jd-catalogue.md
  security-design.md  audit-catalogue.md        testing-uat-plan.md   deployment-guide.md
  runbook.md          decisions-register.md     CHANGELOG.md
```
