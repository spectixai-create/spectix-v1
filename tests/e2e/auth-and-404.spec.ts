import { expect, test, type Page } from '@playwright/test';

const versionTextPattern = /^Spectix Spike #\d+ • \d{4}-\d{2}-\d{2}$/;

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    const expectedNotFoundNavigation =
      text ===
      'Failed to load resource: the server responded with a status of 404 (Not Found)';

    if (message.type() === 'error' && !expectedNotFoundNavigation) {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  return errors;
}

async function expectVersionFooter(page: Page) {
  const footer = page.getByLabel('גרסת מערכת');
  await expect(footer).toBeVisible();
  await expect(footer).toHaveText(versionTextPattern);
  await expect(footer).toHaveAttribute('title', /.+/);
}

test('login skeleton handles demo states and version footer', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/login');

  await expect(
    page.getByRole('heading', { name: 'כניסה למערכת' }),
  ).toBeVisible();
  await expect(page.getByLabel('אימייל *')).toBeVisible();
  await expect(page.getByLabel('סיסמה *')).toBeVisible();
  await expect(page.getByRole('button', { name: 'כניסה' })).toBeVisible();
  await expectVersionFooter(page);
  await expect(page).toHaveScreenshot('login-1280.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.getByLabel('אימייל *').fill('adjuster@example.com');
  await page.getByLabel('סיסמה *').fill('password123');
  await page.getByRole('checkbox', { name: 'זכור אותי' }).check();
  await page.getByRole('button', { name: 'כניסה' }).click();
  await expect(page.getByRole('button', { name: 'מתחבר...' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'כניסה' })).toBeVisible({
    timeout: 3000,
  });

  await page.goto('/login?error=invalid');
  await expect(page.getByText('פרטי ההתחברות שגויים. נסה שוב.')).toBeVisible();

  await page.goto('/login?error=expired');
  await expect(page.getByText('הסשן פג תוקף. נא להתחבר מחדש.')).toBeVisible();

  await page.goto('/login?error=garbage');
  await expect(page.getByText('פרטי ההתחברות שגויים. נסה שוב.')).toHaveCount(0);
  await expect(page.getByText('הסשן פג תוקף. נא להתחבר מחדש.')).toHaveCount(0);

  await page.getByRole('button', { name: 'שכחתי סיסמה' }).click();
  await expect(page.getByText('פנה למנהל המערכת לאיפוס סיסמה')).toBeVisible();

  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/login');
  await expect(page).toHaveScreenshot('login-768.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/login');
  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalScroll).toBe(false);
  const buttonWidth = await page
    .getByRole('button', { name: 'כניסה' })
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(buttonWidth).toBeGreaterThan(250);
  await expect(page).toHaveScreenshot('login-375.png', {
    fullPage: true,
    animations: 'disabled',
  });

  expect(errors).toEqual([]);
});

test('404 page renders Hebrew actions and route edge cases', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/thispagedoesnotexist');
  await expect(
    page.getByRole('heading', { name: 'הדף לא נמצא' }),
  ).toBeVisible();
  await expect(page.getByText('הקישור שגוי או שהדף הוסר.')).toBeVisible();
  await expectVersionFooter(page);
  await expect(page).toHaveScreenshot('not-found-1280.png', {
    fullPage: true,
    animations: 'disabled',
  });

  await page.getByRole('link', { name: 'חזרה לדשבורד' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'תור עבודה' })).toBeVisible();

  await page.goto('/thispagedoesnotexist');
  await page.getByRole('link', { name: 'פתיחת תיק חדש' }).click();
  await expect(page).toHaveURL(/\/new$/);
  await expect(
    page.getByRole('heading', { name: 'פתיחת תיק חדש' }),
  ).toBeVisible();

  await page.goto('/dashboard/nonexistent');
  await expect(
    page.getByRole('heading', { name: 'הדף לא נמצא' }),
  ).toBeVisible();

  await page.goto('/claim/some-truly-invalid-id');
  await expect(
    page.getByRole('heading', { name: 'תיק some-truly-invalid-id' }),
  ).toBeVisible();
  await expect(page.getByText('בריף חקירתי')).toBeVisible();

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/thispagedoesnotexist');
  const buttons = page.locator('main a');
  await expect(buttons).toHaveCount(2);
  for (const index of [0, 1]) {
    const width = await buttons
      .nth(index)
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(width).toBeGreaterThan(250);
  }
  await expect(page).toHaveScreenshot('not-found-375.png', {
    fullPage: true,
    animations: 'disabled',
  });

  expect(errors).toEqual([]);
});

test('version footer is visible on every existing page', async ({ page }) => {
  const errors = collectConsoleErrors(page);

  for (const path of [
    '/',
    '/new',
    '/dashboard',
    '/login',
    '/claim/2024-001',
    '/design-system',
    '/thispagedoesnotexist',
  ]) {
    await page.goto(path);
    await expectVersionFooter(page);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('footer-dashboard.png', {
    fullPage: true,
    animations: 'disabled',
  });

  expect(errors).toEqual([]);
});
