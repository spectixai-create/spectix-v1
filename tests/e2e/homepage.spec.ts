import { expect, test } from '@playwright/test';

test.describe('homepage hero', () => {
  test('shows approved B2B hero and clean CTAs', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        name: 'תביעות ביטוח נסיעות, מאורגנות. בדקות.',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'פתח תיק חדש' }),
    ).toHaveAttribute('href', '/new');
    await expect(
      page.getByRole('link', { name: 'כניסת נציג' }),
    ).toHaveAttribute('href', '/login');
    await expect(page.getByText('Spectix • 2026')).toBeVisible();
  });
});
