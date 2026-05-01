import { expect, test } from '@playwright/test';

test('risk band components expose all approved risk colors', async ({
  page,
}) => {
  await page.goto('/design-system');

  for (const label of ['ירוק', 'צהוב', 'כתום', 'אדום']) {
    await expect(page.getByText(label).first()).toBeVisible();
  }

  await expect(page.locator('[data-risk-band="orange"]')).toBeVisible();
  await expect(page.locator('[data-risk-band="red"]')).toBeVisible();
  await expect(page).toHaveScreenshot('risk-band.png', {
    fullPage: true,
    animations: 'disabled',
  });
});
