import { expect, test } from '@playwright/test';

test('questions queue skeleton supports tabs, filters, actions, and detail panel', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/questions');

  await expect(
    page.getByRole('heading', { name: 'תור שאלות הבהרה' }),
  ).toBeVisible();
  await expect(page.getByText('Spectix Spike #07')).toBeVisible();

  for (const label of [
    'שאלות פתוחות',
    'תשובות לסקירה',
    'ממוצע זמן תגובה',
    'אחוז תגובות',
  ]) {
    await expect(page.getByText(label).first()).toBeVisible();
  }

  for (const tab of ['ממתינות', 'נענו', 'סגורות']) {
    await expect(page.getByRole('tab', { name: tab })).toBeVisible();
  }

  await expect(page.locator('[data-testid^="question-card-"]')).toHaveCount(5);
  await expect(page.locator('a[href="/questions"]')).toHaveClass(
    /bg-secondary/,
  );
  await expect(page).toHaveScreenshot('questions-pending.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.getByRole('tab', { name: 'נענו' }).click();
  await expect(page).toHaveURL(/view=answered/);
  await expect(page.locator('[data-testid^="question-card-"]')).toHaveCount(4);

  await page.getByRole('tab', { name: 'סגורות' }).click();
  await expect(page).toHaveURL(/view=closed/);
  await expect(page.locator('[data-testid^="question-card-"]')).toHaveCount(3);

  await page.goto('/questions?view=invalid');
  await expect(page).toHaveURL('/questions?view=invalid');
  await expect(page.getByRole('tab', { name: 'ממתינות' })).toHaveAttribute(
    'data-state',
    'active',
  );

  const firstCard = page.getByTestId('question-card-q-001');
  await firstCard.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('השאלה המקורית')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'פעילות' })).toBeVisible();
  await expect(page).toHaveScreenshot('questions-detail-panel.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await firstCard.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(firstCard).toBeFocused();

  await page.getByTestId('question-card-q-001').getByText('שלח תזכורת').click();
  await expect(page.getByText('התזכורת נשלחה למבוטח')).toBeVisible();

  await page.goto('/questions?view=answered');
  await page
    .getByTestId('question-card-q-006')
    .getByText('בקשת הבהרה נוספת')
    .click();
  await expect(page.getByLabel('בקשת הבהרה נוספת')).toBeVisible();
  await page
    .getByLabel('בקשת הבהרה נוספת')
    .fill('אנא צרף צילום ברור יותר של הקבלה.');
  await page.getByRole('button', { name: 'שליחה' }).click();
  await expect(page.getByText('הבקשה נשלחה')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'ממתינות' })).toHaveAttribute(
    'data-state',
    'active',
  );

  await page.goto('/questions?view=answered');
  await page.getByTestId('question-card-q-009').getByText('אישור').click();
  await expect(page).toHaveURL(/view=closed/);
  await expect(page.getByTestId('question-card-q-009')).toBeVisible();
  await expect(page.getByText('השאלה אושרה')).toBeVisible();

  await page.goto('/questions');
  await page.getByTestId('question-card-q-001').getByText('2024-001').click();
  await expect(page).toHaveURL(/\/claim\/2024-001/);

  await page.goto('/questions');
  await expect(page.getByText('החודש')).toBeVisible();
  await page.getByLabel('הסרת מסנן החודש').click();
  await expect(page.getByText('אין מסננים פעילים')).toBeVisible();

  await page.getByRole('combobox', { name: 'מיון שאלות הבהרה' }).click();
  await page.getByRole('option', { name: 'לפי תיק' }).click();
  await expect(
    page.getByRole('combobox', { name: 'מיון שאלות הבהרה' }),
  ).toHaveText('לפי תיק');

  await page.goto('/questions?view=closed');
  await page.getByRole('button', { name: 'הוסף מסנן' }).click();
  await expect(page.getByText('אין שאלות התואמות למסננים.')).toBeVisible();
  await expect(page).toHaveScreenshot('questions-empty-state.png', {
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'נקה מסננים' }).click();
  await expect(page.locator('[data-testid^="question-card-"]')).toHaveCount(3);

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/questions');
  const horizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
  );
  expect(horizontalOverflow).toBe(false);
  await page.getByTestId('question-card-q-001').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCSS('width', '375px');
  await expect(page).toHaveScreenshot('questions-mobile.png', {
    fullPage: true,
    animations: 'disabled',
  });

  expect(errors).toEqual([]);
});
