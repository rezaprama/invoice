import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', fullyParallel: true, retries: process.env.CI ? 1 : 0,
  reporter: 'list', use: { baseURL: 'http://127.0.0.1:4173/invoice/', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) } },
  ],
  webServer: { command: 'npm run preview -- --port 4173 --strictPort', port: 4173, reuseExistingServer: !process.env.CI },
});
