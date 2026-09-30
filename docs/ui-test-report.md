# Theme / UI test report – v0.2 (2026-09-30)

Suite: `tests/ui/theme.spec.ts` (Playwright + axe-core 4.10, WCAG 2.1 A/AA rules). Run: `pnpm test:ui` against a freshly seeded DEV database. Every line below was executed; nothing is reported from inspection alone.

| Check | Result | What was actually tested |
|---|---|---|
| LIGHT MODE | PASS | `data-theme=light`, body/card colours match tokens, heading contrast > 7:1, axe clean on Home |
| DARK MODE | PASS | Home, HR Action Centre, Employees, Configuration: dark body, no light cards, heading contrast > 7:1, axe clean on each |
| SYSTEM THEME | PASS | OS dark → dark; OS switched to light while page open → light live; back to dark |
| THEME PERSISTENCE | PASS | Choose Dark in user menu → localStorage set → theme present at DOMContentLoaded on next page (no flash) → new tab dark → switch to Light persists after reload |
| DEV SIGN-IN DARK MODE | PASS | 10 named personas in order; Azwa `R1 · R4 · R10 · R11 · R13 · R14 · R15 · R16 + PLATFORM_OWNER`, Scope ALL; Rayya `R1 · R3 · R4 · R8 · R11 · R15`; every card numerically ordered; dark cards; axe clean; sign-in from dark picker works |
| ER MODULE DARK MODE | PASS | ER dashboard, case profile and chronology: sensitivity banner, dark table headers and timeline, text contrast > 7:1, axe clean |
| ANALYTICS DARK MODE | PASS | Workforce preview renders charts (>10 marks) on dark cards; axe clean |
| ENGAGEMENT DARK MODE | PASS | Trend lines use dark tokens (blue `rgb(74,134,224)`, red `rgb(229,71,79)`); axe clean |
| TABLES DARK MODE | PASS | Dark header, cell contrast > 7:1, header > 4.5:1; sort asc/desc (`aria-sort`), pagination 1–8 → 9–16 of 23, search filter, sticky header; axe clean |
| DIALOGS DARK MODE | PASS | Modal, Action Centre drawer and user dropdown: dark surfaces, title contrast > 7:1, Escape closes, axe clean on each |
| FORMS DARK MODE | PASS | New ER case form: dark inputs/select/textarea/date, contrast > 7:1, `color-scheme: dark` for native pickers, visible focus ring, axe clean |
| CHARTS DARK MODE | PASS | Same chart in both themes: series and axis/grid colours switch to each theme's tokens; axis labels > 4.5:1, category labels > 7:1, marks > 3:1 on the dark card; tooltip themed |
| ACCESSIBILITY | PASS | axe clean on 9 pages × 2 themes; skip link first in tab order; focus ring visible; theme radio group operable with arrow keys; errors/masked states carry text + icon |
| RESPONSIVE LAYOUT | PASS | 390 / 820 / 1280 / 1920 px × light/dark × 6 pages: no horizontal page overflow; hamburger + off-canvas nav at ≤1024px (opens, navigates, closes); fixed sidebar on desktop; stacked labelled table cards on mobile |

Issues found and fixed by this suite before it passed: a non-standard `aria-sort-active` attribute on sortable headers, `aria-label` on a Loading container without a role, and the user menu using `role="menu"` while containing a radio group (now `role="dialog"`).

Not covered: manual screen-reader walkthrough (NVDA/JAWS), Windows high-contrast mode beyond the `forced-colors` fallback, and real Bank devices/browsers (DR-40).
