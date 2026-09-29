import { expect, Page, test } from '@playwright/test';

async function signIn(page: Page, name: string) {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await page.waitForURL('/');
  await expect(page.locator('.user-meta strong')).toHaveText(name);
}
const navLabels = (page: Page) => page.locator('.sidebar .nav-link span:not(.nav-soon)').allInnerTexts();

test('unauthenticated users are sent to sign-in', async ({ page }) => {
  await page.goto('/er');
  await expect(page).toHaveURL(/\/sign-in/);
});

test('Employee sees only Home, My Work and Voice', async ({ page }) => {
  await signIn(page, 'Hawwa Nazeer');
  expect(await navLabels(page)).toEqual(['Home', 'My Work', 'Employee Voice']);
});

test('Employee direct URL to ER shows permission denied (API 403)', async ({ page }) => {
  await signIn(page, 'Hawwa Nazeer');
  const res = page.waitForResponse((r) => r.url().includes('/api/er/dashboard'));
  await page.goto('/er');
  expect((await res).status()).toBe(403);
  await expect(page.getByText("You don't have access to this")).toBeVisible();
});

test('Platform Admin has admin navigation but no business modules', async ({ page }) => {
  await signIn(page, 'Shaan Manik');
  const nav = await navLabels(page);
  expect(nav).toContain('Feature Flags');
  expect(nav).not.toContain('ER Case Management');
  expect(nav).not.toContain('Employee Lookup');
});

test('expired grant signs in to a clear no-access state', async ({ page }) => {
  await signIn(page, 'Ali Riyaz');
  await expect(page.getByText('No active access')).toBeVisible();
});

test('Manager sees ER task with safe title only', async ({ page }) => {
  await signIn(page, 'Yoosuf Adam');
  await page.goto('/my-work');
  const row = page.locator('.action-row', { hasText: 'ER follow-up task' });
  await expect(row).toBeVisible();
  await expect(row.getByText('restricted detail')).toBeVisible();
  await expect(row).not.toContainText('ER-20');
});

test('ER Officer creates a case end-to-end', async ({ page }) => {
  await signIn(page, 'Raifa Shareef');
  await page.goto('/er/new');
  await page.getByPlaceholder(/Search by name, UID/).fill('S10005');
  await page.locator('.action-row').first().click();
  await page.selectOption('#ct', 'GRIEVANCE');
  await page.selectOption('#cat', 'CONDUCT');
  await page.selectOption('#src', 'DIRECT');
  await page.fill('#sum', 'E2E synthetic scenario – interpersonal concern raised directly.');
  await page.getByRole('button', { name: 'Create case' }).click();
  await page.waitForURL(/\/er\/cases\//);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/ER-\d{4}-\d{4}/);
  await page.getByRole('tab', { name: 'Chronology' }).click();
  await expect(page.locator('.tl-type').first()).toHaveText(/created/i);
});

test('Document HR reveal is explicit and audited', async ({ page }) => {
  await signIn(page, 'Shifa Rauf');
  await page.goto('/employees');
  await page.getByLabel('Search employees').fill('S10001');
  await page.locator('tbody tr').first().click();
  await expect(page.locator('.masked').first()).toContainText('••••••');
  await page.getByRole('button', { name: 'Reveal' }).first().click();
  await expect(page.locator('.revealed')).toContainText('MVR');
});
