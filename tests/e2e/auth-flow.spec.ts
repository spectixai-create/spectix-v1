import { expect, test, type Page } from '@playwright/test';

const testEmail = process.env.E2E_TEST_EMAIL ?? 'test-adjuster@spectix.test';
const testPassword = process.env.E2E_TEST_PASSWORD ?? 'test-password-123';

async function signIn(page: Page, next?: string) {
  const suffix = next ? `?next=${encodeURIComponent(next)}` : '';

  await page.goto(`/login${suffix}`);
  await page.getByLabel(/אימייל/).fill(testEmail);
  await page.getByLabel(/סיסמה/).fill(testPassword);
  await page.getByRole('button', { name: 'כניסה' }).click();
}

test.describe('login flow', () => {
  test('login renders and invalid credentials show Hebrew error', async ({
    page,
  }) => {
    await page.goto('/login');

    await expect(
      page.getByRole('heading', { name: 'כניסה למערכת' }),
    ).toBeVisible();
    await expect(page.getByLabel(/אימייל/)).toBeVisible();
    await expect(page.getByLabel(/סיסמה/)).toBeVisible();

    await page.getByLabel(/אימייל/).fill('wrong@spectix.test');
    await page.getByLabel(/סיסמה/).fill('wrong-password');
    await page.getByRole('button', { name: 'כניסה' }).click();
    await expect(
      page.getByText('פרטי ההתחברות שגויים. נסה שוב.'),
    ).toBeVisible();
  });

  test('valid credentials redirect to dashboard and disable submit during flight', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel(/אימייל/).fill(testEmail);
    await page.getByLabel(/סיסמה/).fill(testPassword);

    await page.getByRole('button', { name: 'כניסה' }).click();
    await expect(page.getByRole('button', { name: 'מתחבר...' })).toBeDisabled();
    await page.waitForURL('/dashboard');
    await expect(
      page.getByRole('heading', { name: 'תור עבודה' }),
    ).toBeVisible();
  });
});

test.describe('protected and public route boundaries', () => {
  for (const path of ['/dashboard', '/claim/2024-001', '/questions']) {
    test(`${path} redirects anonymous users to login with safe next`, async ({
      page,
    }) => {
      await page.goto(path);

      await expect(page).toHaveURL((url) => {
        return (
          url.pathname === '/login' && url.searchParams.get('next') === path
        );
      });
    });
  }

  for (const path of ['/', '/new', '/login', '/design-system']) {
    test(`${path} is public without session`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      await expect(page.getByLabel('גרסת מערכת')).toBeVisible();
    });
  }

  test('/api/inngest is not redirected by middleware', async ({ request }) => {
    const response = await request.get('/api/inngest');

    expect(response.status()).not.toBe(307);
    expect(response.headers().location ?? '').not.toContain('/login');
  });
});

test.describe('open redirect security', () => {
  const cases = [
    { next: 'https://evil.com', expectedPath: '/dashboard' },
    { next: '//evil.com', expectedPath: '/dashboard' },
    { next: '/api/inngest', expectedPath: '/dashboard' },
    { next: '/login', expectedPath: '/dashboard' },
    { next: '/dashboard', expectedPath: '/dashboard' },
    { next: '/claim/2024-001', expectedPath: '/claim/2024-001' },
  ];

  for (const { next, expectedPath } of cases) {
    test(`next=${next} resolves to ${expectedPath}`, async ({ page }) => {
      await signIn(page, next);

      await expect(page).toHaveURL((url) => url.pathname === expectedPath);
      expect(page.url()).not.toContain('evil.com');
    });
  }
});

test.describe('logout and session persistence', () => {
  test('logout clears session and protected route redirects again', async ({
    page,
  }) => {
    await signIn(page);
    await page.waitForURL('/dashboard');

    await page.getByRole('button', { name: testEmail }).click();
    await page.getByRole('menuitem', { name: 'התנתק' }).click();
    await page.waitForURL('/login');

    await page.goto('/dashboard');
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname === '/login' &&
        url.searchParams.get('next') === '/dashboard'
      );
    });
  });

  test('session persists across protected route navigation and reload', async ({
    page,
  }) => {
    await signIn(page);
    await page.waitForURL('/dashboard');

    await page.goto('/claim/2024-001');
    await expect(
      page.getByRole('heading', { name: 'תיק 2024-001' }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'תיק 2024-001' }),
    ).toBeVisible();
  });
});
