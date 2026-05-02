import { expect, test } from '@playwright/test';

test('empty and error states remain accessible in Hebrew', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/design-system');

  await expect(page.getByText('אין תיקים בתור')).toBeVisible();
  await expect(page.getByText('אין מסמכים')).toBeVisible();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page.getByText('טוען נתונים')).toBeVisible();
  await expect(page).toHaveScreenshot('empty-state-768.png', {
    fullPage: true,
    animations: 'disabled',
  });
});
