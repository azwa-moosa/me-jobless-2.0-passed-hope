# Changelog

## 0.1.0 – 2026-09-29 · Sprint 1 foundation + first slice

Decisions taken by the product owner for this build: DR-02 (build on NestJS + PostgreSQL + Next.js, provisional pending IT), DR-42 (foundation **plus** first vertical slice), plain CSS instead of Tailwind.

### Added
- pnpm monorepo: `apps/{web,api,worker}`, `packages/{policy,schemas,synthetic-data,crypto}`; DEV docker compose (Postgres+pgvector, Azurite, Mailpit).
- Typed env config with safety switches (mock IdP refused outside dev; PROD refuses synthetic employee provider).
- SQL migrations: platform, org (effective-dated, configurable levels), config, audit (append-only, hash chain), ai log tables, actions, er (RLS), synthetic_hris.
- Auth: Entra token validation (config-driven) + DEV mock IdP personas; JIT user provisioning without roles.
- PolicyService: 38-permission catalogue, 16 draft role bundles (R1–R16), org scope with descendants, ER case access, field masking, navigation hints.
- EmployeeService provider interface + synthetic provider; org tree as-of any date.
- ConfigurationService: lookups, effective-dated values, state machines, business calendar (no hard-coded weekend), gap-free reference sequences, feature flags.
- AuditService: transactional outbox, worker relay, verify endpoint, audit log UI.
- HR Action Centre: My Work / Team / Overdue / Due soon / Blocked / Completed, controlled transitions, mandatory completion notes, audited reassignment, restricted-detail inheritance.
- ER MVP: dashboard, intake with reference allocation, restricted profile, encrypted narrative, immutable chronology with amendments, case team, tasks, status machine (SAMPLE), closure checklist with override, access log.
- Web: sign-in persona picker, role-adaptive shell, all state components (loading/empty/denied/error with correlation ID), module placeholders showing phase and blocking decisions.
- Tests: 31 unit, 135 security/permission, 8 Playwright e2e; PII/secret scanner; GitHub Actions CI.
- Docs: README, architecture (as built + deviations), security design v0.1, audit catalogue, generated data dictionary, Phase 0 templates.
