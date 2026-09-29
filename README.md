# BML People & ER Platform

Internal HR platform built from the *Master Product & Technical Blueprint* (Sept 2026).
This repository is **v0.1 – Sprint 1 foundation + first vertical slice** (HR Action Centre "My Work" and ER Case Management intake).

> **DEV uses synthetic data only.** No real employee data may be loaded outside an approved UAT/PROD environment. CI fails on NID-like values.

## Stack

| Layer | Choice |
|---|---|
| Web | Next.js 15 (App Router) + React 19, **plain CSS design system** (`apps/web/src/styles/globals.css`) |
| API | NestJS 10 (TypeScript), modular monolith |
| Worker | Node (TypeScript) – transactional-outbox → audit relay |
| Database | PostgreSQL 16 (+ pgvector image), plain SQL migrations, Row-Level Security on ER |
| Auth | Microsoft Entra ID token validation (config-driven) + DEV-only mock IdP personas |
| Tests | Vitest (unit), matrix-driven security suite (Node), Playwright (e2e) |

Provisional per DR-02 (stack) – approved for build by the product owner on 2026-09-29.

## Run it locally

Prerequisites: **Node 22**, **pnpm 10** (`corepack enable`), **Docker** (or a local PostgreSQL 16).

```bash
cp .env.example .env            # DEV values; never commit .env
pnpm install
pnpm infra:up                   # Postgres (+pgvector), Azurite, Mailpit
pnpm db:migrate                 # applies packages/schemas/migrations/*.sql + grants
pnpm db:seed                    # synthetic org, 1,200 employees, 18 personas, sample config
pnpm dev                        # web :3000 · api :4000 · worker
```

Open http://localhost:3000 and pick a persona (one per draft role R1–R16, plus edge cases).

Without Docker: create database `bml_people_er` owned by a superuser called `app_migrator` (password `app_migrator_dev`), then continue from `pnpm db:migrate`. The migration creates the restricted `app_runtime` role itself.

Useful commands:

| Command | What it does |
|---|---|
| `pnpm db:reset` | DEV only – drop all platform schemas, migrate, seed |
| `pnpm test` | Unit tests (policy, crypto, synthetic data, log redaction) |
| `pnpm test:security` | 135 permission-matrix, record/field, workflow, audit-tamper and env-safety checks (needs api + worker running) |
| `pnpm test:e2e` | Playwright browser tests (needs web running) |
| `pnpm scan:pii` | Fails on real-looking NIDs or secrets |
| `pnpm test:all` | All of the above |
| `pnpm build` | Build packages, API, worker and web |

## Try these journeys

| Persona | Try |
|---|---|
| **Raifa Shareef** – ER Officer | Home → overdue ER task → *Open source record* → case chronology; *New case*; amend a chronology entry |
| **Imran Hameed** – ER Officer (not on team) | Paste a case URL from Raifa's session → permission denied (API 403, audited, RLS returns no row) |
| **Khadheeja Waheed** – ER Manager | Sees all cases; add a case team member; close a case (blocked by open mandatory task → override with reason); Access log tab |
| **Yoosuf Adam** – Manager | My Work shows "ER follow-up task" with **restricted detail** – no case reference, no link |
| **Shifa Rauf** – Document HR | Employee lookup → Reveal salary/NID (audited) |
| **Hussain Faisal** – Division Head | Employee lookup only returns DIV01 staff |
| **Ali Riyaz** – expired grant | Signs in to "No active access" |
| **Shaan Manik** – Platform Admin | Org tree as-of dates, config, feature flags; try enabling `voice.anonymous_route` (blocked – DR-27); no employee/ER data |
| **Moosa Areef** – Audit Reviewer | Audit log → *Verify chain* |

## Repository layout

```
apps/
  web/        Next.js shell + pages; BFF proxy keeps the token in an httpOnly cookie
  api/        NestJS: auth, policy guard, audit, employees, org, config, actions, er
  worker/     Outbox → audit relay (pg-boss jobs arrive in Phase 2)
packages/
  policy/          Permission catalogue, R1–R16 role bundles, PolicyService, masking, state machine, business calendar
  schemas/         SQL migrations, grants, migrate/seed runners
  synthetic-data/  Deterministic generator (seeded; hash-stable)
  crypto/          AES-256-GCM field encryption for ER narrative
infra/docker/      DEV compose file          infra/pipelines/  CI definitions
tests/security/    matrix.platform.yaml + runner, PII scan
tests/e2e/         Playwright specs
docs/              Planning pack (00-planning), requirements/RTM, architecture, security, audit catalogue, Phase 0 templates
```

## Core rules (BP §24)

- DEV synthetic · UAT approved masked · PROD live controlled.
- No new Employee Master – EmployeeService provider interface; synthetic HRIS stub is DEV/UAT only and the API refuses to start in PROD without a real provider (DR-04).
- Sensitive permissions are enforced server-side; the UI never decides access.
- AI is assistive and evidence-grounded (no AI in this build).
- No public links to dashboards, attachments or documents.
- Every material workflow is audited and versioned.
- Anything marked **SAMPLE** is a placeholder pending a BML decision – see `docs/00-planning/L-decisions-register.md`.

See `docs/architecture.md` for the as-built design and deviations from the plan, and `CHANGELOG.md` for what changed.
