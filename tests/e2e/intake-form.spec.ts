import { expect, test } from '@playwright/test';

test('public intake form renders, keeps values, handles states and mock upload', async ({
  page,
}) => {
  const errors: string[] = [];
  let releaseSubmit: () => void = () => undefined;
  const submitHold = new Promise<void>((resolve) => {
    releaseSubmit = resolve;
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  await page.route('**/api/claims', async (route) => {
    await submitHold;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          claim: {
            claimNumber: '2026-999',
          },
        },
      }),
    });
  });

  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.goto('/new');

  for (const label of [
    'פרטי המבוטח',
    'פרטי האירוע',
    'הקשר הנסיעה',
    'העלאת מסמכים',
  ]) {
    await expect(page.getByText(label).first()).toBeVisible();
  }

  await expect(page.getByText('*')).toHaveCount(12);
  await expect(page).toHaveScreenshot('intake-1280-idle.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('שם מלא *')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('אימייל *')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('טלפון *')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('מספר פוליסה *')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('עיסוק *')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('combobox', { name: 'סוג התביעה' }),
  ).toBeFocused();

  await page.getByLabel('שם מלא *').fill('נועה בן דוד');
  await page.getByLabel('אימייל *').fill('noa@example.com');
  await page.getByLabel('טלפון *').fill('0501234567');
  await page.getByLabel('מספר פוליסה *').fill('POL-2024-7788');
  await page.getByLabel('עיסוק *').fill('מנהלת שיווק');
  await page.getByRole('combobox', { name: 'סוג התביעה' }).click();
  await page.getByRole('option', { name: 'גניבה' }).click();
  await page.getByLabel('תאריך האירוע *').fill('2024-01-15');
  await page.getByRole('combobox', { name: 'מדינה' }).click();
  await page.getByRole('option', { name: 'תאילנד' }).click();
  await page.getByLabel('עיר *').fill('בנגקוק');
  await page.getByLabel('סכום התביעה *').fill('5000');
  await page
    .getByLabel('תיאור האירוע *')
    .fill('התיק נגנב בזמן מעבר בין המלון למרכז הקניות.');
  await page.getByRole('combobox', { name: 'מטרת הנסיעה' }).click();
  await page.getByRole('option', { name: 'תיירות' }).click();
  await page.getByLabel('קשרים מקומיים').fill('אין');
  await page.getByLabel('מספר נסיעות למדינה זו ב-24 חודשים אחרונים').fill('1');
  await page.getByLabel('מתוכן עם תביעות ביטוח').fill('0');

  await expect(page.getByLabel('שם מלא *')).toHaveValue('נועה בן דוד');
  await expect(page.getByLabel('מספר פוליסה *')).toHaveValue('POL-2024-7788');
  await expect(page.getByText(/\/ 2000/)).toBeVisible();

  const dropzone = page.getByLabel('אזור העלאת מסמכים');
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    const file = new File(['receipt'], 'receipt-trendy-electronics.pdf', {
      type: 'application/pdf',
    });
    transfer.items.add(file);
    return transfer;
  });
  await dropzone.dispatchEvent('dragenter', { dataTransfer });
  await expect(dropzone).toHaveAttribute('data-state', 'drag-over');
  await expect(page).toHaveScreenshot('intake-drag-over.png', {
    fullPage: true,
    animations: 'disabled',
  });
  await dropzone.dispatchEvent('drop', { dataTransfer });
  await expect(page.getByText('receipt-trendy-electronics.pdf')).toBeVisible();
  await page.getByLabel('הסרת קובץ receipt-trendy-electronics.pdf').click();
  await expect(page.getByText('receipt-trendy-electronics.pdf')).toHaveCount(0);

  await page.getByRole('button', { name: 'שמור כטיוטה' }).click();
  await expect(page.getByText('הטיוטה נשמרה')).toBeVisible();

  await page.getByRole('button', { name: 'שלח לבדיקה' }).click();
  await expect(page.getByRole('button', { name: 'שולח...' })).toBeVisible();
  await expect(page).toHaveScreenshot('intake-submitting.png', {
    fullPage: true,
    animations: 'disabled',
  });
  releaseSubmit();
  await expect(page.getByRole('heading', { name: 'התקבל. תודה.' })).toBeVisible(
    {
      timeout: 10000,
    },
  );
  await expect(page).toHaveScreenshot('intake-success.png', {
    fullPage: true,
    animations: 'disabled',
    mask: [page.getByText(/\d{4}-\d{3}/)],
  });

  await page.goto('/new?state=error');
  await expect(page.getByText('שליחת התיק נכשלה')).toBeVisible();
  await expect(page).toHaveScreenshot('intake-error.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.goto('/new?state=success');
  await expect(
    page.getByRole('heading', { name: 'התקבל. תודה.' }),
  ).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1000 });
  await page.goto('/new');
  await expect(page).toHaveScreenshot('intake-768-idle.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.setViewportSize({ width: 375, height: 1000 });
  await page.goto('/new');
  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalScroll).toBe(false);
  const mobileSubmitWidth = await page
    .getByRole('button', { name: 'שלח לבדיקה' })
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(mobileSubmitWidth).toBeGreaterThan(250);
  await expect(page).toHaveScreenshot('intake-375-idle.png', {
    fullPage: true,
    animations: 'disabled',
  });

  expect(errors).toEqual([]);
});
