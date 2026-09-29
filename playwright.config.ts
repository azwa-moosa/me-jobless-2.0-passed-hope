import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: process.env.WEB_BASE_URL ?? 'http://localhost:3000', viewport: { width: 1440, height: 900 } },
  reporter: [['list']],
});
