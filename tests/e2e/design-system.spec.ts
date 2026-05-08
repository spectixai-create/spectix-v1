import { expect, test } from '@playwright/test';

test('design system page renders core component groups', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/design-system');

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(
    page.getByRole('heading', { name: 'ספריית רכיבי UI' }),
  ).toBeVisible();
  await expect(page.getByText('רמות סיכון')).toBeVisible();
  await expect(page.getByText('פרטי תיק לדוגמה')).toBeVisible();
  await expect(page).toHaveScreenshot('design-system-1280.png', {
    fullPage: true,
    animations: 'disabled',
  });
});
