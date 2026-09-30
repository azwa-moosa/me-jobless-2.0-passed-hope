/**
 * Theme / UI verification suite. Each test title is one line of the PASS/FAIL matrix.
 * Runs against the live web app (WEB_BASE_URL, default http://localhost:3000) with API + seeded DB.
 */
import AxeBuilder from '@axe-core/playwright';
import { BrowserContext, expect, Page, test } from '@playwright/test';

type Pref = 'light' | 'dark' | 'system';
const PERSONA = { rayya: 'rayya@dev.synthetic.local', azwa: 'azwa.moosa@dev.synthetic.local', erOfficer: 'er.officer@dev.synthetic.local' };

async function setPref(ctx: BrowserContext, pref: Pref) {
  await ctx.addInitScript((p) => { try { localStorage.setItem('bml-theme', p); } catch { /* noop */ } }, pref);
}
async function login(page: Page, upn: string) {
  const r = await page.request.post('/api/session', { headers: { 'x-requested-with': 'bml-web', 'content-type': 'application/json' }, data: { upn } });
  expect(r.ok()).toBeTruthy();
}
const theme = (page: Page) => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
async function settle(page: Page) { await page.waitForLoadState('networkidle'); await page.waitForTimeout(250); }

/** Relative-luminance contrast between two computed colours. */
async function contrastOf(page: Page, selector: string, bgSelector?: string) {
  return page.evaluate(([sel, bgSel]) => {
    const parse = (c: string) => (c.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const el = document.querySelector(sel)!;
    let bgEl: Element | null = bgSel ? document.querySelector(bgSel) : el;
    let bg = 'rgba(0, 0, 0, 0)';
    while (bgEl) { bg = getComputedStyle(bgEl).backgroundColor; if (!bg.startsWith('rgba(0, 0, 0, 0)') && bg !== 'transparent') break; bgEl = bgEl.parentElement; }
    const cs = getComputedStyle(el);
    const fg = el instanceof SVGElement ? cs.fill : cs.color;
    const [a, b] = [lum(parse(fg)), lum(parse(bg))].sort((x, y) => y - x);
    return { ratio: (a + 0.05) / (b + 0.05), fg, bg };
  }, [selector, bgSelector ?? null] as const);
}
const bgLuminance = (page: Page, selector: string) => page.evaluate((sel) => {
  const c = (getComputedStyle(document.querySelector(sel)!).backgroundColor.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
}, selector);

async function axe(page: Page, include?: string) {
  let b = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  if (include) b = b.include(include);
  const r = await b.analyze();
  const summary = r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(summary, summary.join('\n')).toEqual([]);
}


test('LIGHT MODE', async ({ page, context }) => {
  await setPref(context, 'light');
  await login(page, PERSONA.rayya);
  await page.goto('/'); await settle(page);
  expect(await theme(page)).toBe('light');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(244, 246, 249)');
  expect(await bgLuminance(page, '.card')).toBeGreaterThan(0.9);
  expect((await contrastOf(page, 'h1')).ratio).toBeGreaterThan(7);
  await axe(page);
});

test('DARK MODE', async ({ page, context }) => {
  test.setTimeout(90_000);
  await setPref(context, 'dark');
  await login(page, PERSONA.rayya);
  for (const url of ['/', '/my-work', '/employees', '/admin/config']) {
    await page.goto(url); await settle(page);
    expect(await theme(page)).toBe('dark');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(10, 22, 40)');
    // No bright cards on a dark page, no dark-on-dark text
    expect(await bgLuminance(page, '.card')).toBeLessThan(0.2);
    expect((await contrastOf(page, 'h1')).ratio).toBeGreaterThan(7);
    await axe(page);
  }
});

test('SYSTEM THEME', async ({ page, context }) => {
  await setPref(context, 'system');
  await page.emulateMedia({ colorScheme: 'dark' });
  await login(page, PERSONA.rayya);
  await page.goto('/'); await settle(page);
  expect(await theme(page)).toBe('dark');
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme-pref'))).toBe('system');
  await page.emulateMedia({ colorScheme: 'light' }); // OS switches while the page is open
  await expect.poll(() => theme(page)).toBe('light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => theme(page)).toBe('dark');
});

test('THEME PERSISTENCE', async ({ page }) => {
  await login(page, PERSONA.rayya);
  await page.goto('/'); await settle(page);
  await page.getByRole('button', { name: 'Account and display settings' }).click();
  await page.getByRole('radio', { name: 'Dark' }).click();
  expect(await theme(page)).toBe('dark');
  expect(await page.evaluate(() => localStorage.getItem('bml-theme'))).toBe('dark');
  // Reload: theme must be applied before first paint (bootstrap script in <head>) – check at DOMContentLoaded
  await page.goto('/my-work', { waitUntil: 'domcontentloaded' });
  expect(await theme(page)).toBe('dark');
  await settle(page);
  expect(await theme(page)).toBe('dark');
  // New tab in the same profile keeps it
  const p2 = await page.context().newPage();
  await p2.goto('/', { waitUntil: 'domcontentloaded' });
  expect(await theme(p2)).toBe('dark');
  // Switching back to light also persists
  await page.getByRole('button', { name: 'Account and display settings' }).click();
  await page.getByRole('radio', { name: 'Light' }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await theme(page)).toBe('light');
});

test('DEV SIGN-IN DARK MODE', async ({ page, context }) => {
  await setPref(context, 'dark');
  await page.goto('/sign-in'); await settle(page);
  expect(await theme(page)).toBe('dark');
  const azwa = page.locator('.persona', { hasText: 'Azwa Moosa' }).first();
  await expect(azwa).toContainText('Platform Owner / Super Admin');
  await expect(azwa.locator('.role-ids')).toHaveText('R1 · R4 · R10 · R11 · R13 · R14 · R15 · R16 + PLATFORM_OWNER');
  await expect(azwa).toContainText('SCOPE: ALL');
  const rayya = page.locator('.persona', { hasText: 'Rayya' });
  await expect(rayya).toContainText('Manager – Employee Relations, Engagement & Analytics');
  await expect(rayya.locator('.role-ids')).toHaveText('R1 · R3 · R4 · R8 · R11 · R15');
  await expect(rayya).toContainText('SCOPE: ER · ENGAGEMENT · ANALYTICS');
  const names = await page.locator('.persona-grid').first().locator('.persona strong').allInnerTexts();
  expect(names).toEqual(['Azwa Moosa', 'Azwa Moosa Number 2', 'Maiz', 'Shai', 'Rayya', 'Humaam', 'Anj', 'Arif', 'Ish', 'Bishwajit']);
  // Every role list is numerically ordered
  for (const t of await page.locator('.persona .role-ids').allInnerTexts()) {
    const n = t.split('+')[0].match(/R(\d+)/g)?.map((x) => Number(x.slice(1))) ?? [];
    expect(n, t).toEqual([...n].sort((a, b) => a - b));
  }
  expect(await bgLuminance(page, '.persona')).toBeLessThan(0.2);
  await axe(page);
  // Sign-in works from the dark picker
  await azwa.click();
  await page.waitForURL('/');
  await expect(page.locator('.user-meta .role-ids')).toContainText('+ PLATFORM_OWNER');
});

test('ER MODULE DARK MODE', async ({ page, context }) => {
  await setPref(context, 'dark');
  await login(page, PERSONA.rayya);
  await page.goto('/er'); await settle(page);
  await expect(page.locator('.sensitivity-banner')).toBeVisible();
  expect(await bgLuminance(page, '.table th')).toBeLessThan(0.2);
  await axe(page);
  await page.locator('.table.stack-mobile tbody tr').first().click();
  await page.waitForURL(/\/er\/cases\//); await settle(page);
  await expect(page.locator('.sensitivity-banner')).toContainText('Confidential ER record');
  await axe(page);
  await page.getByRole('tab', { name: 'Chronology' }).click(); await settle(page);
  expect(await bgLuminance(page, '.tl-text')).toBeLessThan(0.2);
  expect((await contrastOf(page, '.tl-text')).ratio).toBeGreaterThan(7);
  await axe(page);
});

test('ANALYTICS DARK MODE', async ({ page, context }) => {
  await setPref(context, 'dark');
  await login(page, PERSONA.rayya);
  await page.goto('/analytics'); await settle(page);
  await expect(page.locator('.chart svg').first()).toBeVisible();
  expect(await page.locator('.chart .mark').count()).toBeGreaterThan(10);
  expect(await bgLuminance(page, '.card')).toBeLessThan(0.2);
  await axe(page);
});

test('ENGAGEMENT DARK MODE', async ({ page, context }) => {
  await setPref(context, 'dark');
  await login(page, PERSONA.rayya);
  await page.goto('/engagement'); await settle(page);
  await expect(page.locator('.line-mark')).toHaveCount(2);
  expect(await page.locator('.line-mark.series-1').evaluate((e) => getComputedStyle(e).stroke)).toBe('rgb(74, 134, 224)');
  expect(await page.locator('.line-mark.series-2').evaluate((e) => getComputedStyle(e).stroke)).toBe('rgb(229, 71, 79)');
  await axe(page);
});

test('TABLES DARK MODE', async ({ page, context }) => {
  await setPref(context, 'dark');
  await login(page, PERSONA.azwa);
  await page.goto('/admin/design-system'); await settle(page);
  const table = page.locator('section', { has: page.getByRole('heading', { name: 'Data table' }) });
  expect(await bgLuminance(page, 'section .table th')).toBeLessThan(0.2);
  expect((await contrastOf(page, 'section .table td')).ratio).toBeGreaterThan(7);
  expect((await contrastOf(page, 'section .table th')).ratio).toBeGreaterThan(4.5);
  // sort
  await table.getByRole('button', { name: /Age \(days\)/ }).click();
  await expect(table.locator('th[aria-sort="ascending"]')).toHaveCount(1);
  const first = Number(await table.locator('tbody tr td:nth-child(4)').first().innerText());
  await table.getByRole('button', { name: /Age \(days\)/ }).click();
  const firstDesc = Number(await table.locator('tbody tr td:nth-child(4)').first().innerText());
  expect(firstDesc).toBeGreaterThanOrEqual(first);
  // pagination + search
  await expect(table.getByRole('navigation', { name: 'Pagination' })).toContainText('Showing 1–8 of 23');
  await table.getByRole('button', { name: '2', exact: true }).click();
  await expect(table.getByRole('navigation', { name: 'Pagination' })).toContainText('Showing 9–16 of 23');
  await table.getByRole('searchbox').fill('Humaam');
  await expect(table.locator('.table-count')).toContainText('8 records');
  // sticky header
  expect(await table.locator('th').first().evaluate((e) => getComputedStyle(e).position)).toBe('sticky');
  await axe(page, 'section:has(#ds-table)');
});

test('DIALOGS DARK MODE', async ({ page, context }) => {
  await setPref(context, 'dark');
  await login(page, PERSONA.azwa);
  await page.goto('/admin/design-system'); await settle(page);
  await page.getByRole('button', { name: 'Open dialog' }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  expect(await bgLuminance(page, '.modal')).toBeLessThan(0.2);
  expect((await contrastOf(page, '.modal h3')).ratio).toBeGreaterThan(7);
  await axe(page, '.modal');
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
  // Drawer (Action Centre) and dropdown menu
  await page.goto('/my-work'); await settle(page);
  await page.locator('.action-row').first().click();
  await expect(page.locator('.drawer')).toBeVisible();
  expect(await bgLuminance(page, '.drawer')).toBeLessThan(0.2);
  await axe(page, '.drawer');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Account and display settings' }).click();
  expect(await bgLuminance(page, '.dropdown-menu')).toBeLessThan(0.2);
  await axe(page, '.dropdown-menu');
});

test('FORMS DARK MODE', async ({ page, context }) => {
  await setPref(context, 'dark');
  await login(page, PERSONA.erOfficer);
  await page.goto('/er/new'); await settle(page);
  for (const sel of ['#ct', '#sum', '#rd']) {
    expect(await bgLuminance(page, sel), sel).toBeLessThan(0.2);
    expect((await contrastOf(page, sel)).ratio, sel).toBeGreaterThan(7);
  }
  // Native controls (date picker, select popup) render dark via color-scheme
  expect(await page.locator('#rd').evaluate((e) => getComputedStyle(e).colorScheme)).toContain('dark');
  // Placeholder is readable
  const ph = await page.locator('#sum').evaluate((e) => getComputedStyle(e, '::placeholder').color);
  expect(ph).not.toBe('rgb(0, 0, 0)');
  await axe(page);
  // Visible focus ring
  await page.locator('#sum').focus();
  expect(await page.locator('#sum').evaluate((e) => getComputedStyle(e).boxShadow)).not.toBe('none');
});

test('CHARTS DARK MODE', async ({ page, context }) => {
  // Same chart, both themes: marks and labels must switch to the theme's own tokens.
  await login(page, PERSONA.rayya);
  await page.goto('/analytics'); await settle(page);
  const read = () => page.evaluate(() => {
    const cs = (sel: string, prop: 'fill' | 'stroke') => getComputedStyle(document.querySelector(sel)!)[prop];
    return { mark1: cs('.chart .series-1', 'fill'), mark2: cs('.chart .series-2', 'fill'), axis: cs('.chart .axis-label', 'fill'), grid: cs('.chart .grid-line', 'stroke') };
  });
  await page.evaluate(() => { localStorage.setItem('bml-theme', 'light'); document.documentElement.setAttribute('data-theme', 'light'); });
  const light = await read();
  await page.evaluate(() => { localStorage.setItem('bml-theme', 'dark'); document.documentElement.setAttribute('data-theme', 'dark'); });
  const dark = await read();
  expect(light.mark1).toBe('rgb(11, 92, 173)');
  expect(dark.mark1).toBe('rgb(74, 134, 224)');
  expect(dark.mark2).toBe('rgb(229, 71, 79)');
  expect(dark.axis).not.toBe(light.axis);
  expect(dark.grid).not.toBe(light.grid);
  // Chart text readable on the dark card
  expect((await contrastOf(page, '.chart .axis-label', '.card')).ratio).toBeGreaterThan(4.5);
  expect((await contrastOf(page, '.chart .category-label', '.card')).ratio).toBeGreaterThan(7);
  // Chart marks ≥ 3:1 against the dark card (non-text contrast)
  expect((await contrastOf(page, '.chart .series-1', '.card')).ratio).toBeGreaterThan(3);
  // Hover tooltip is themed too
  await page.locator('.chart g[tabindex="0"]').first().hover();
  await expect(page.locator('.chart-tooltip').first()).toBeVisible();
  expect(await bgLuminance(page, '.chart-tooltip')).toBeLessThan(0.2);
});

test('ACCESSIBILITY', async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, PERSONA.azwa);
  for (const pref of ['light', 'dark'] as const) {
    await page.evaluate((p) => localStorage.setItem('bml-theme', p), pref).catch(() => undefined);
    for (const url of ['/', '/my-work', '/employees', '/admin/access', '/admin/audit', '/admin/org', '/admin/design-system', '/engagement', '/analytics']) {
      await page.goto(url); await settle(page);
      expect(await theme(page)).toBe(pref);
      await axe(page);
    }
  }
  // Keyboard: skip link, focus ring, theme radio group with arrow keys
  await page.goto('/'); await settle(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.getByRole('button', { name: 'Account and display settings' }).focus();
  await page.keyboard.press('Enter');
  const checked = page.getByRole('radio', { checked: true });
  await checked.focus();
  expect(await checked.evaluate((e) => getComputedStyle(e).boxShadow)).not.toBe('none');
  const before = await theme(page);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => theme(page)).not.toBe(before);
  // Errors are not colour-only: masked/denied/validation states carry text + icon
  await page.goto('/admin/design-system'); await settle(page);
  await expect(page.locator('#ds-err-msg svg')).toHaveCount(1);
  await expect(page.locator('.mask-badge').first()).toHaveText('MASKED');
});

test('RESPONSIVE LAYOUT', async ({ browser }) => {
  test.setTimeout(300_000);
  const sizes = [{ n: 'mobile', w: 390, h: 844 }, { n: 'tablet', w: 820, h: 1180 }, { n: 'laptop', w: 1280, h: 800 }, { n: 'desktop', w: 1920, h: 1080 }];
  for (const s of sizes) {
    for (const pref of ['light', 'dark'] as const) {
      const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h } });
      await setPref(ctx, pref);
      const page = await ctx.newPage();
      await login(page, PERSONA.rayya);
      for (const url of ['/', '/er', '/analytics', '/engagement', '/employees', '/sign-in']) {
        await page.goto(url); await settle(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${s.n} ${pref} ${url} horizontal overflow`).toBeLessThanOrEqual(1);
      }
      await page.goto('/er'); await settle(page);
      const toggle = page.getByRole('button', { name: 'Open navigation' });
      if (s.w <= 1024) {
        await expect(toggle).toBeVisible();
        await expect(page.locator('.sidebar')).not.toBeInViewport();
        await toggle.click();
        await expect(page.locator('.sidebar')).toBeInViewport();
        await page.getByRole('link', { name: 'Engagement' }).click();
        await page.waitForURL('/engagement');
        await expect(page.locator('.sidebar')).not.toBeInViewport();
      } else {
        await expect(toggle).toBeHidden();
        await expect(page.locator('.sidebar')).toBeInViewport();
      }
      if (s.w <= 760) {
        await page.goto('/er'); await settle(page);
        // Tables become stacked labelled cards instead of shrinking columns
        expect(await page.locator('.table.stack-mobile td').first().evaluate((e) => getComputedStyle(e, '::before').content)).toContain('Reference');
      }
      await ctx.close();
    }
  }
});
