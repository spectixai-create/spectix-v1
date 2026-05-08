import { expect, test } from '@playwright/test';

test.describe('intake currency selection', () => {
  test('defaults to ILS and shows country currency hint', async ({ page }) => {
    await page.goto('/new');

    await expect(page.getByRole('combobox', { name: 'מטבע' })).toContainText(
      'ILS',
    );

    await page.getByRole('combobox', { name: 'מדינה' }).click();
    await page.getByRole('option', { name: 'תאילנד' }).click();
    await expect(page.getByText('המטבע הנפוץ במדינה זו: THB.')).toBeVisible();

    await page.getByRole('button', { name: 'החלף' }).click();
    await expect(page.getByRole('combobox', { name: 'מטבע' })).toContainText(
      '฿ THB — באט תאילנדי',
    );
  });

  test('manual currency selection suppresses hint until country changes', async ({
    page,
  }) => {
    await page.goto('/new');

    await page.getByRole('combobox', { name: 'מדינה' }).click();
    await page.getByRole('option', { name: 'תאילנד' }).click();
    await expect(page.getByText('המטבע הנפוץ במדינה זו: THB.')).toBeVisible();

    await page.getByRole('combobox', { name: 'מטבע' }).click();
    await page.getByRole('option', { name: '$ USD — דולר אמריקאי' }).click();
    await expect(page.getByText('המטבע הנפוץ במדינה זו: THB.')).toHaveCount(0);

    await page.getByRole('combobox', { name: 'מדינה' }).click();
    await page.getByRole('option', { name: 'ארצות הברית' }).click();
    await expect(page.getByText('המטבע הנפוץ במדינה זו: USD.')).toBeVisible();
  });
});
