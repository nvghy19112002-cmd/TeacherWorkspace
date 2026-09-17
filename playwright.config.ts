import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  actionTimeout: 10000,
  fullyParallel: false,
  workers: 1,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://127.0.0.1:1420',
    viewport: { width: 1440, height: 1000 },
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
          args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'],
        }
      : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
