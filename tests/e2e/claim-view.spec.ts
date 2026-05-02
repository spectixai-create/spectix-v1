import { expect, test } from '@playwright/test';

test('claim view renders tabs, URL tab state, risk meter, and empty states', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/claim/2024-001');

  await expect(page.getByRole('link', { name: /תור עבודה/ })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'תיק 2024-001' }),
  ).toBeVisible();

  for (const label of ['בריף', 'ציר Pass-ים', 'מסמכים', 'יומן ביקורת']) {
    await expect(page.getByRole('tab', { name: label })).toBeVisible();
  }

  await expect(page.locator('[data-risk-band="red"]')).toBeVisible();
  const redMeter = page
    .locator('[data-risk-band="red"] div.bg-risk-red')
    .first();
  await expect(redMeter).toBeVisible();
  await expect(page).toHaveScreenshot('claim-brief.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.getByRole('tab', { name: 'ציר Pass-ים' }).click();
  await expect(page).toHaveURL(/tab=timeline/);
  await page.reload();
  await expect(page.getByRole('tab', { name: 'ציר Pass-ים' })).toHaveAttribute(
    'data-state',
    'active',
  );
  await expect(page.getByText('Pass 3 - בדיקת המשך')).toBeVisible();
  await expect(page).toHaveScreenshot('claim-timeline.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.getByRole('tab', { name: 'מסמכים' }).click();
  await expect(
    page.getByRole('columnheader', { name: 'שם הקובץ' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('claim-documents.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.getByRole('tab', { name: 'יומן ביקורת' }).click();
  await expect(page.getByText('יצר בריף חקירתי ראשוני')).toBeVisible();
  await expect(page).toHaveScreenshot('claim-audit.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.goto('/claim/2024-001?tab=invalid');
  await expect(page.getByRole('tab', { name: 'בריף' })).toHaveAttribute(
    'data-state',
    'active',
  );

  await page.goto('/claim/2024-001?tab=documents&empty=true');
  await expect(page.getByText('אין מסמכים')).toBeVisible();

  await page.goto('/claim/2024-001?tab=audit&empty=true');
  await expect(page.getByText('אין אירועי ביקורת')).toBeVisible();

  expect(errors).toEqual([]);
});
