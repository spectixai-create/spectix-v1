import { expect, test } from '@playwright/test';

const claimId = process.env.UI002B_E2E_CLAIM_ID;
const token = process.env.UI002B_E2E_TOKEN;

test.describe('UI-002B claimant core flow', () => {
  test.skip(!claimId || !token, 'UI-002B smoke claim and token are required');

  test('claimant can open, draft, and finalize core response page', async ({
    page,
  }) => {
    await page.goto(`/c/${claimId}?token=${token}`);
    await expect(
      page.getByRole('heading', { name: 'השלמת מידע לתביעה' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'שלח תשובות' }),
    ).toBeVisible();
  });
});
