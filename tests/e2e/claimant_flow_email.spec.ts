import { expect, test } from '@playwright/test';

const claimId = process.env.UI002C_E2E_CLAIM_ID;
const adjusterUrl = claimId ? `/claim/${claimId}` : null;

test.describe('UI-002C claimant email notification path', () => {
  test.skip(
    !claimId,
    'UI-002C non-prod claim fixture is required for email smoke',
  );

  test('adjuster dispatch keeps manual link sharing visible', async ({
    page,
  }) => {
    await page.goto(adjusterUrl!);
    await expect(page.getByText('שאלות להשלמה')).toBeVisible();
    await expect(
      page.getByText('הקישור יישאר זמין לשיתוף ידני', { exact: false }),
    ).toBeVisible();
  });
});
