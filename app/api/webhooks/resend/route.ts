import { NextResponse } from 'next/server';
import type { WebhookEventPayload } from 'resend';

import { inngest } from '@/inngest/client';
import { verifyResendWebhookPayload } from '@/lib/claimant/notifications';
import { handleResendWebhookEvent } from '@/lib/claimant/resend-webhooks';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const payload = await request.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return new NextResponse('Webhook not configured', { status: 500 });
  }

  let event: WebhookEventPayload;
  try {
    event = verifyResendWebhookPayload({
      payload,
      headers: {
        id: request.headers.get('svix-id') ?? '',
        timestamp: request.headers.get('svix-timestamp') ?? '',
        signature: request.headers.get('svix-signature') ?? '',
      },
      webhookSecret: secret,
    });
  } catch {
    return new NextResponse('Invalid webhook', { status: 400 });
  }

  const result = await handleResendWebhookEvent({
    event,
    supabaseAdmin: createAdminClient(),
    sendEvent: (payload) => inngest.send(payload),
  });

  if (!result.ok) {
    return new NextResponse(result.message, { status: result.status });
  }

  return new NextResponse('OK', { status: 200 });
}
