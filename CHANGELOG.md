# Changelog

## 0.2.0 – 2026-09-30 · BML design system, light/dark themes

### Added
- Central token file (`styles/tokens.css`): BML-inspired brand primitives, scale tokens, semantic tokens for light and a selected dark theme; colour-literal lint (`pnpm lint:colors`).
- Theme switch (Light / Dark / System) in the user menu, sign-in page and Design System page; no-flash bootstrap; System follows the OS live; persisted and synced across tabs.
- More BML red: sidebar/hero top rule, active navigation indicator, active tabs, eyebrows, brand mark, avatar ring, Platform Owner marker, chart series 2.
- Components: DataTable (search, sort, pagination, sticky header, stacked mobile cards), Pagination, Tooltip, Dropdown, FileUpload, MaskedField (MASKED/REVEAL/REVEALED), SensitivityBanner, button variants (secondary, outline, brand), theme-aware SVG charts (bars, columns, lines) with tooltips and table view.
- People Analytics workforce preview and Engagement home preview (synthetic/sample, scope-filtered, small-number suppression).
- Access Management (read-only register) and Design System pages; RBAC navigation relabelled (Employee Relations, HR Action Centre, Employees, Documents, Audit).
- Named DEV personas (Azwa Moosa, Azwa Moosa Number 2, Maiz, Shai, Rayya, Humaam, Anj, Arif, Ish, Bishwajit) with multi-role grants, numerically ordered role IDs, scope labels; single-role fixtures kept for automated suites. Supplementary `PLATFORM_OWNER` role (administration + full audit; no ER case content).
- Collapsible off-canvas navigation ≤1024px.
- Tests: 14-check theme/UI suite with axe-core (all PASS – `docs/ui-test-report.md`); e2e extended to 10 tests; unit tests 34.

### Fixed
- Invalid ARIA attribute on sortable headers; Loading state ARIA; user menu role.

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
