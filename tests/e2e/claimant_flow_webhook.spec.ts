import { expect, test } from '@playwright/test';

const webhookSmokeEnabled = process.env.UI002C_WEBHOOK_SMOKE === '1';

test.describe('UI-002C Resend webhook path', () => {
  test.skip(
    !webhookSmokeEnabled,
    'UI-002C webhook smoke requires a prepared signed Resend fixture',
  );

  test('invalid webhook signature is rejected', async ({ request }) => {
    const response = await request.post('/api/webhooks/resend', {
      data: { type: 'email.delivered' },
      headers: {
        'svix-id': 'msg_test',
        'svix-timestamp': '1778140000',
        'svix-signature': 'v1,invalid',
      },
    });

    expect(response.status()).toBe(400);
  });
});
