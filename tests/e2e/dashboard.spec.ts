import { expect, test } from '@playwright/test';

test('dashboard skeleton renders queue controls and navigates to claim view', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    const nextDevRscFallback = message
      .text()
      .startsWith('Failed to fetch RSC payload for ');

    if (message.type() === 'error' && !nextDevRscFallback) {
      errors.push(message.text());
    }
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/dashboard');

  for (const label of ['תיקים פתוחים', 'ממתינים לבדיקה', 'אדומים', 'בעיבוד']) {
    await expect(page.getByText(label).first()).toBeVisible();
  }

  await expect(page.getByText('סיכון: אדום + כתום')).toBeVisible();
  await expect(page.getByText('סטטוס: בעיבוד')).toBeVisible();
  await expect(
    page.getByRole('combobox', { name: 'מיון תיקים' }),
  ).toBeVisible();

  for (const header of [
    'מספר תיק',
    'מבוטח',
    'מדינה',
    'סכום',
    'סיכון',
    'Pass Status',
    'סטטוס',
    'תאריך',
  ]) {
    await expect(
      page.getByRole('columnheader', { name: new RegExp(header) }),
    ).toBeVisible();
  }

  await expect(page.locator('[data-testid^="claim-row-"]')).toHaveCount(10);
  await expect(page.getByText('2024-001')).toBeVisible();
  await expect(page.locator('.bg-risk-red').first()).toBeVisible();
  await expect(page).toHaveScreenshot('dashboard-1280.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.getByTestId('claim-row-2024-001').click();
  await expect(page).toHaveURL(/\/claim\/2024-001/);
  await expect(
    page.getByRole('heading', { name: 'תיק 2024-001' }),
  ).toBeVisible();

  await page.goto('/dashboard?empty=true');
  await expect(page.getByText('אין תיקים בתור')).toBeVisible();

  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard-768.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/dashboard');
  await expect(page.locator('.overflow-x-auto').first()).toBeVisible();
  await expect(page).toHaveScreenshot('dashboard-375.png', {
    fullPage: true,
    animations: 'disabled',
  });

  expect(errors).toEqual([]);
});
