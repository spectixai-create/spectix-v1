import { expect, test, type Page } from '@playwright/test';

test.describe('POST /api/claims direct API tests', () => {
  test('valid payload returns 201 and claim number', async ({ request }) => {
    const response = await request.post('/api/claims', {
      data: validPayload(),
    });

    expect(response.status()).toBe(201);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.claim.claimNumber).toMatch(/^\d{4}-\d{3}$/);
  });

  test('invalid claimType returns 400', async ({ request }) => {
    const response = await request.post('/api/claims', {
      data: { ...validPayload(), claimType: 'invalid_type' },
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe('validation_failed');
  });

  test('future incidentDate returns 400', async ({ request }) => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const response = await request.post('/api/claims', {
      data: {
        ...validPayload(),
        incidentDate: future.toISOString().slice(0, 10),
      },
    });

    expect(response.status()).toBe(400);
  });

  test('missing required field returns 400', async ({ request }) => {
    const payload = validPayload();
    const { claimantName: _claimantName, ...withoutClaimantName } = payload;
    const response = await request.post('/api/claims', {
      data: withoutClaimantName,
    });

    expect(response.status()).toBe(400);
  });

  test('empty body returns 400', async ({ request }) => {
    const response = await request.post('/api/claims', { data: {} });

    expect(response.status()).toBe(400);
  });

  test('invalid JSON returns 400', async ({ request }) => {
    const response = await request.post('/api/claims', {
      data: Buffer.from('{not-json'),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe('invalid_json');
  });
});

test.describe('intake form API wiring', () => {
  test('submits valid form and shows real claim number', async ({ page }) => {
    await page.goto('/new');
    await fillValidForm(page);
    await page.getByRole('button', { name: 'שלח לבדיקה' }).click();
    await expect(page.getByTestId('success-panel')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId('claim-number')).toHaveText(/^\d{4}-\d{3}$/);
  });

  test('URL is clean after success', async ({ page }) => {
    await page.goto('/new');
    await fillValidForm(page);
    await page.getByRole('button', { name: 'שלח לבדיקה' }).click();
    await expect(page.getByTestId('success-panel')).toBeVisible({
      timeout: 10000,
    });
    expect(page.url()).toMatch(/\/new$/);
  });

  test('back from success then resubmit creates a new claim', async ({
    page,
  }) => {
    await page.goto('/new');
    await fillValidForm(page);
    await page.getByRole('button', { name: 'שלח לבדיקה' }).click();
    await expect(page.getByTestId('success-panel')).toBeVisible({
      timeout: 10000,
    });
    const firstNumber = await page.getByTestId('claim-number').textContent();

    await page.goBack();
    if (page.url() === 'about:blank') {
      await page.goto('/new');
    } else {
      await expect(page).toHaveURL(/\/new$/);
    }
    await fillValidForm(page);
    await page.getByRole('button', { name: 'שלח לבדיקה' }).click();
    await expect(page.getByTestId('success-panel')).toBeVisible({
      timeout: 10000,
    });
    const secondNumber = await page.getByTestId('claim-number').textContent();

    expect(firstNumber).not.toBe(secondNumber);
  });
});

test.describe('intake demo mode regression', () => {
  test('?state=success shows panel without API call', async ({ page }) => {
    let apiCalled = false;
    await page.route('**/api/claims', (route) => {
      apiCalled = true;
      void route.continue();
    });

    await page.goto('/new?state=success');
    await expect(page.getByTestId('success-panel')).toBeVisible();
    expect(apiCalled).toBe(false);
  });

  test('?state=error shows banner without API call', async ({ page }) => {
    let apiCalled = false;
    await page.route('**/api/claims', (route) => {
      apiCalled = true;
      void route.continue();
    });

    await page.goto('/new?state=error');
    await expect(page.getByText('שליחת התיק נכשלה')).toBeVisible();
    expect(apiCalled).toBe(false);
  });
});

test.describe('concurrent claim submissions', () => {
  test('5 parallel submits all succeed with unique numbers', async ({
    request,
  }) => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request.post('/api/claims', { data: validPayload() }),
      ),
    );
    const numbers = await Promise.all(
      responses.map(async (response) => {
        expect(response.status()).toBe(201);
        const json = await response.json();

        return json.data.claim.claimNumber as string;
      }),
    );

    expect(new Set(numbers).size).toBe(5);
  });
});

function validPayload() {
  return {
    claimantName: 'Test User',
    insuredName: 'Test User',
    claimantEmail: 'test@example.com',
    claimantPhone: '0501234567',
    policyNumber: `POL-${Date.now()}`,
    claimType: 'theft',
    incidentDate: '2025-04-15',
    tripStartDate: '2025-04-10',
    tripEndDate: '2025-04-20',
    preTripInsurance: 'yes',
    incidentLocation: 'Tel Aviv, Israel',
    amountClaimed: 5000,
    currency: 'ILS',
    currencyCode: 'ILS',
    summary: 'Test claim summary, sufficient length to pass validation.',
    tosAccepted: true,
    privacyAccepted: true,
    metadata: { tripPurpose: 'tourism' },
  };
}

async function fillValidForm(page: Page) {
  await page.getByLabel('שם מלא *').fill('נועה בן דוד');
  await page.getByLabel('אימייל *').fill('noa@example.com');
  await page.getByLabel('טלפון *').fill('0501234567');
  await page.getByLabel('מספר פוליסה *').fill(`POL-${Date.now()}`);
  await page.getByLabel('עיסוק *').fill('מנהלת שיווק');
  await page.getByLabel('תאריך עזיבה *').fill('2025-04-10');
  await page.getByLabel('תאריך חזרה *').fill('2025-04-20');
  await page.getByLabel('כן, לפני יציאה לחו״ל').check();
  await page.getByRole('combobox', { name: 'מטרת הנסיעה' }).click();
  await page.getByRole('option', { name: 'תיירות' }).click();
  await page.getByLabel('קשרים מקומיים').fill('אין');
  await page.getByLabel('מספר נסיעות למדינה זו ב-24 חודשים אחרונים').fill('1');
  await page.getByLabel('מתוכן עם תביעות ביטוח').fill('0');
  await page.getByRole('combobox', { name: 'סוג התביעה' }).click();
  await page.getByRole('option', { name: 'גניבה' }).click();
  await page.getByLabel('תאריך האירוע *').fill('2025-04-15');
  await page.getByRole('combobox', { name: 'מדינה' }).click();
  await page.getByRole('option', { name: 'תאילנד' }).click();
  await page.getByLabel('עיר *').fill('בנגקוק');
  await page.getByLabel('סכום התביעה *').fill('5000');
  await page
    .getByLabel('תיאור האירוע *')
    .fill('התיק נגנב בזמן מעבר בין המלון למרכז הקניות.');
  await page
    .getByLabel('קראתי ואני מסכים לתנאי השימוש ולמדיניות הפרטיות')
    .check();
}
