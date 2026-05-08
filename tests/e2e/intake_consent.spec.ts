import { expect, test } from '@playwright/test';

test.describe('intake consent', () => {
  test('keeps submit disabled until ToS and Privacy consent is checked', async ({
    page,
  }) => {
    await page.goto('/new');

    await expect(
      page.getByRole('button', { name: 'שלח לבדיקה' }),
    ).toBeDisabled();
    await expect(
      page.getByText('קראתי ואני מסכים לתנאי השימוש ולמדיניות הפרטיות'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'תנאי השימוש' }).click();
    await expect(page.getByText('טיוטה — לא לשימוש מסחרי')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'מדיניות הפרטיות' }).click();
    await expect(page.getByText('טיוטה — לא לשימוש מסחרי')).toBeVisible();
    await page.keyboard.press('Escape');

    await page
      .getByLabel('קראתי ואני מסכים לתנאי השימוש ולמדיניות הפרטיות')
      .check();
    await expect(
      page.getByRole('button', { name: 'שלח לבדיקה' }),
    ).toBeEnabled();
  });
});
