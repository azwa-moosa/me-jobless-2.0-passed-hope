# BML design system – v0.2

The whole UI reads from **one token file**: `apps/web/src/styles/tokens.css`. Components live in `apps/web/src/styles/globals.css` (plain CSS, no framework) and React components in `apps/web/src/components/`. Colour literals anywhere else fail `pnpm lint:colors`.

## Official brand values
No official BML token file exists in the repository, so the palette is **BML-inspired** (deep navy, BML blue, cyan/teal, BML red, white, cool grey). To adopt official values, edit only the *Brand primitives* block at the top of `tokens.css`; every semantic token and component follows.

## Token layers
| Layer | Examples | Used by |
|---|---|---|
| Brand primitives | `--bml-navy-*`, `--bml-blue-*`, `--bml-cyan-*`, `--bml-red-*`, `--bml-slate-*` | semantic tokens only |
| Scale | `--fs-*`, `--space-*`, `--radius-*` (max 8px – enterprise, not consumer), `--control-h`, `--z-*` | all components |
| Semantic (light + dark) | `--background`, `--surface`, `--surface-secondary`, `--foreground`, `--foreground-muted`, `--border`, `--input`, `--primary`, `--primary-hover`, `--success`, `--warning`, `--danger`, `--info`, `--sensitive`, `--brand-red`, `--sidebar-*`, `--chart-*` | all components |

Dark mode is a **selected** set of values (very dark navy background, lighter navy surfaces, off-white text, muted slate secondary text, brighter status hues), not an inversion.

## Red
BML red carries identity: the brand mark, the 3px top rule on the sidebar and sign-in hero, the active-navigation indicator, active tab underline, page eyebrows, avatar ring, Platform Owner marker, division tags and chart series 2. `--danger` is a separate status token (errors, overdue, destructive buttons) and always comes with an icon and text.

## Theme
- Preference `light | dark | system`, stored in `localStorage['bml-theme']`, applied as `<html data-theme>` by an inline script in `<head>` **before first paint** (no flash, no hydration mismatch).
- System follows `prefers-color-scheme` live; changes sync across tabs.
- Switch: user menu → Appearance (and on the DEV sign-in page, and the Design System page). Radio-group semantics with arrow-key support.

## Components
Buttons (`primary · secondary · outline · ghost · danger · brand`, `sm`, `icon`), inputs/select/textarea/date (native pickers themed via `color-scheme`), search, file upload, cards, KPI tiles, tabs, chips/badges, status/priority/confidentiality chips, masked field (MASKED → REVEAL → REVEALED · audited), sensitivity banner (calm violet, not alarm red), callouts, dialog, drawer, dropdown (menu or dialog), tooltip, toast, pagination, DataTable (search, sort, pagination, sticky header, numeric alignment, stacked cards ≤760px), empty / loading / error / access-denied states, theme-aware SVG charts. All are demonstrated on **Administration → Design System**.

## Charts
Categorical order (fixed, never cycled): blue · red · teal · violet · amber. Validated with the dataviz palette validator in both themes (lightness band, chroma, CVD separation, normal-vision floor, ≥3:1 against the chart surface). Every chart has a hover/focus tooltip and a *View as table* alternative; small groups render as dashed "suppressed" marks.

## Navigation (RBAC-driven)
Workspace: Home, HR Action Centre · Modules: Employee Relations, People Analytics (preview), Engagement (preview), Employee Voice, People Manager, Documents, Employees, Reports · Administration: Access Management, Audit, Organisation, Configuration, Feature Flags, Design System. Items come from `/me/capabilities`; the API enforces every call regardless of what the UI shows.

## Responsive
≥1181px full layout · ≤1180px two-column KPIs, single-column side panels · ≤1024px sidebar becomes an off-canvas drawer (hamburger, Escape/scrim to close) · ≤760px single column, stacked-card tables, compact top bar.
