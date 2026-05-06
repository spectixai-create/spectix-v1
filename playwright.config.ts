import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command:
        "powershell -NoProfile -Command \"$env:INNGEST_DEV='1'; $env:INNGEST_BASE_URL='http://localhost:8288'; $env:SPECTIX_FAKE_CLAUDE_CLASSIFIER='true'; pnpm dev\"",
      url: 'http://localhost:3000/design-system',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm inngest:dev',
      url: 'http://localhost:8288',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'unauthenticated',
      testMatch:
        /(auth-flow|auth-and-404|claims-api|document-upload|document-processing|document-classification|watchdog|claimant_flow_core|claimant_flow_security|claimant_flow_recycle)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      dependencies: ['unauthenticated'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testMatch:
        /(claim-view|dashboard|questions-queue|design-system|risk-band|empty-state|intake-form)\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' },
    },
  ],
});
