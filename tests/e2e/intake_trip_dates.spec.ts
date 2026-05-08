import { expect, test } from '@playwright/test';

test.describe('intake trip dates and pre-trip insurance', () => {
  test('shows trip fields and pre-trip warning state', async ({ page }) => {
    await page.goto('/new');

    await expect(page.getByText('פרטי הנסיעה')).toBeVisible();
    await page.getByLabel('תאריך עזיבה *').fill('2025-04-20');
    await page.getByLabel('תאריך חזרה *').fill('2025-04-10');
    await page.getByLabel('תאריך חזרה *').blur();
    await expect(
      page.getByText('תאריך חזרה חייב להיות אחרי תאריך עזיבה'),
    ).toBeVisible();

    await page.getByRole('combobox', { name: 'סוג התביעה' }).click();
    await page.getByRole('option', { name: 'גניבה' }).click();
    await page.getByLabel('לא, נרכש בחו״ל / אחרי יציאה').check();
    await expect(
      page.getByText(
        'ביטוח שנרכש לאחר תחילת הנסיעה כפוף לתקופת המתנה בפוליסה.',
      ),
    ).toBeVisible();
  });
});
