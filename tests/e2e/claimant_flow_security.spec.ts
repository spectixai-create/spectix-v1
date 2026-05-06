import { expect, test } from '@playwright/test';

test.describe('UI-002B claimant link security states', () => {
  test('invalid token shows invalid-link state', async ({ page }) => {
    await page.goto('/c/00000000-0000-4000-8000-000000000000?token=invalid');
    await expect(
      page.getByRole('heading', { name: 'הקישור אינו תקין' }),
    ).toBeVisible();
  });
});
