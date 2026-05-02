import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { expect, test as setup } from '@playwright/test';

const authFile = '.auth/user.json';
const testEmail = process.env.E2E_TEST_EMAIL ?? 'test-adjuster@spectix.test';
const testPassword = process.env.E2E_TEST_PASSWORD ?? 'test-password-123';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/אימייל/).fill(testEmail);
  await page.getByLabel(/סיסמה/).fill(testPassword);
  await page.getByRole('button', { name: 'כניסה' }).click();
  await page.waitForURL('/dashboard');
  await expect(page.getByRole('heading', { name: 'תור עבודה' })).toBeVisible();
  await mkdir(dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
