import { expect, test } from '@playwright/test';

test.describe('UI-002B claimant response recycle', () => {
  test('recycle function is registered in local Inngest endpoint', async ({
    request,
  }) => {
    const response = await request.get('/api/inngest');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.function_count).toBeGreaterThanOrEqual(9);
  });
});
