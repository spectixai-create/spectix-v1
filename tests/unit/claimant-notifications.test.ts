import { describe, expect, it, vi } from 'vitest';
import type { WebhookEventPayload } from 'resend';

import {
  buildClaimantEmailTemplate,
  buildNotificationDispatchId,
  buildRejectionEmailTemplate,
  extractClaimIdFromNotificationDispatchId,
  sendClaimantEmail,
  sendClaimRejectionEmail,
  verifyResendWebhookPayload,
} from '@/lib/claimant/notifications';
import { runClaimantNotify } from '@/inngest/functions/claimant-notify';
import {
  getResendWebhookCorrelation,
  handleResendWebhookEvent,
} from '@/lib/claimant/resend-webhooks';
import type { ClaimDispatchQuestionsEvent } from '@/lib/types';

const claimId = '00000000-0000-4000-8000-000000000001';
const dispatchId = `${claimId}--1778140000000`;

describe('UI-002C claimant email notifications', () => {
  it('builds a Hebrew RTL template without double greeting', () => {
    const emptyName = buildClaimantEmailTemplate({
      claim_number: 'CLM-1',
      first_name: null,
      magic_link_url: 'https://staging.spectix.co.il/c/claim?token=test',
      question_count: 1,
      questions: [
        {
          text: 'נא להעלות אישור משטרה מקומית על הגניבה.',
          customer_label: 'אישור משטרה',
          required_action: 'upload_document',
        },
      ],
    });
    const named = buildClaimantEmailTemplate({
      claim_number: 'CLM-2',
      first_name: 'דנה',
      magic_link_url: 'https://staging.spectix.co.il/c/claim?token=test',
      question_count: 3,
      questions: [
        {
          text: 'נא להבהיר היכן היה התיק בזמן הגניבה.',
          customer_label: 'נסיבות שמירה על התיק',
          required_action: 'answer',
        },
      ],
    });

    expect(emptyName.text).toContain('שלום,');
    expect(emptyName.text).not.toContain('שלום שלום');
    expect(emptyName.text).toContain(
      'כדי שהתגובה תיקלט במערכת, יש להשיב דרך הקישור המאובטח בלבד',
    );
    expect(emptyName.subject).toBe(
      'נדרשת השלמת פרטים לתביעת ביטוח נסיעות מספר CLM-1',
    );
    expect(emptyName.text).toContain('אישור משטרה');
    expect(emptyName.text).toContain('מענה ישיר למייל זה לא ייקלט בתיק');
    expect(named.text).toContain('שלום דנה,');
    expect(named.html).toContain('מענה ישיר למייל זה לא ייקלט בתיק');
    expect(named.html).toContain('dir="rtl"');
  });

  it('builds and sends a rejection email without implying automated decisioning', async () => {
    const template = buildRejectionEmailTemplate({
      claim_number: 'CLM-9',
      first_name: 'דנה',
      customer_message: 'שלום דנה,\n\nלא ניתן לאשר את התביעה בשלב זה.',
    });

    expect(template.subject).toContain('CLM-9');
    expect(template.text).toContain('לא ניתן לאשר את התביעה בשלב זה');
    expect(template.text).not.toMatch(/הונאה|רמאי|automatic rejection/i);

    const resend = {
      emails: {
        send: vi.fn(async () => ({
          data: { id: 'email_reject' },
          error: null,
        })),
      },
    };

    await expect(
      sendClaimRejectionEmail(
        {
          to: 'claimant@example.com',
          claim_id: claimId,
          claim_number: 'CLM-9',
          first_name: 'דנה',
          reason: 'חריג בפוליסה',
          policy_clause: 'סעיף כבודה',
          customer_message: template.text,
        },
        resend as never,
      ),
    ).resolves.toBe('email_reject');
  });

  it('sends email through Resend with dispatch correlation tags', async () => {
    const sentPayloads: unknown[] = [];
    const resend = {
      emails: {
        send: vi.fn(async (payload: unknown) => {
          sentPayloads.push(payload);
          return { data: { id: 'email_123' }, error: null };
        }),
      },
    };

    await expect(
      sendClaimantEmail(
        {
          to: 'claimant@example.com',
          claim_number: 'CLM-1',
          first_name: 'דנה',
          magic_link_url: 'https://staging.spectix.co.il/c/claim?token=test',
          question_count: 2,
          questions: [{ text: 'שאלה ספציפית', customer_label: 'השלמה' }],
          dispatch_id: dispatchId,
        },
        resend as never,
      ),
    ).resolves.toBe('email_123');

    expect(resend.emails.send).toHaveBeenCalledTimes(1);
    expect(sentPayloads[0]).toMatchObject({
      from: 'Spectix <notifications@spectix.co.il>',
      to: 'claimant@example.com',
      tags: expect.arrayContaining([
        { name: 'dispatch_id', value: dispatchId },
        { name: 'claim_id', value: claimId },
      ]),
    });
  });

  it('verifies webhooks through Resend SDK raw payload and Svix headers', () => {
    const verify = vi.fn(() => deliveredEvent());
    const result = verifyResendWebhookPayload({
      payload: '{"type":"email.delivered"}',
      headers: {
        id: 'msg_123',
        timestamp: '1778140000',
        signature: 'v1,test',
      },
      webhookSecret: 'whsec_test',
      resend: { webhooks: { verify } } as never,
    });

    expect(result.type).toBe('email.delivered');
    expect(verify).toHaveBeenCalledWith({
      payload: '{"type":"email.delivered"}',
      headers: {
        id: 'msg_123',
        timestamp: '1778140000',
        signature: 'v1,test',
      },
      webhookSecret: 'whsec_test',
    });

    expect(() =>
      verifyResendWebhookPayload({
        payload: '{}',
        headers: { id: '', timestamp: '', signature: '' },
        webhookSecret: 'whsec_test',
        resend: {
          webhooks: {
            verify: () => {
              throw new Error('invalid');
            },
          },
        } as never,
      }),
    ).toThrow(/invalid/);
  });

  it('handles delivered, bounced, complained, and missing dispatch tags', async () => {
    const deliveredDb = createSupabaseRecorder();
    const sentEvents: unknown[] = [];

    await expect(
      handleResendWebhookEvent({
        event: deliveredEvent(),
        supabaseAdmin: deliveredDb.client as never,
        sendEvent: async (event) => sentEvents.push(event),
      }),
    ).resolves.toEqual({ ok: true });

    expect(deliveredDb.updates).toEqual([
      {
        table: 'question_dispatches',
        patch: { notification_last_error: null },
        column: 'claim_id',
        value: claimId,
      },
    ]);
    expect(sentEvents[0]).toMatchObject({
      name: 'resend/email.received',
      data: {
        claim_id: claimId,
        dispatch_id: dispatchId,
        status: 'email.delivered',
      },
    });

    const bouncedDb = createSupabaseRecorder();
    await handleResendWebhookEvent({
      event: bouncedEvent(),
      supabaseAdmin: bouncedDb.client as never,
      sendEvent: async () => undefined,
    });
    expect(bouncedDb.updates[0]?.patch.notification_last_error).toContain(
      'email.bounced',
    );

    const complainedDb = createSupabaseRecorder();
    await handleResendWebhookEvent({
      event: complainedEvent(),
      supabaseAdmin: complainedDb.client as never,
      sendEvent: async () => undefined,
    });
    expect(complainedDb.updates[0]?.patch).toEqual({
      notification_last_error: 'email.complained',
    });

    await expect(
      handleResendWebhookEvent({
        event: {
          type: 'email.delivered',
          created_at: '2026-05-07T00:00:00Z',
          data: { ...baseEmailData(), tags: {} },
        } as WebhookEventPayload,
        supabaseAdmin: createSupabaseRecorder().client as never,
        sendEvent: async () => undefined,
      }),
    ).resolves.toMatchObject({ ok: false, status: 400 });
  });

  it('runs the claimant notify function for email and no-email paths', async () => {
    const successDb = createSupabaseRecorder();
    const sendEmail = vi.fn(async () => 'email_123');

    await expect(
      runClaimantNotify({
        event: dispatchEvent({ claimant_email: 'claimant@example.com' }),
        step: { run: async (_name, fn) => fn() },
        supabaseAdmin: successDb.client as never,
        sendEmail: sendEmail as never,
      }),
    ).resolves.toEqual({ sent: true, messageId: 'email_123' });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'claimant@example.com',
        dispatch_id: dispatchId,
      }),
    );
    expect(successDb.updates[0]?.patch).toMatchObject({
      notification_attempts: 1,
      notification_channel: 'email',
      notification_last_error: null,
    });

    await expect(
      runClaimantNotify({
        event: dispatchEvent({ claimant_email: '' }),
        step: { run: async (_name, fn) => fn() },
        supabaseAdmin: createSupabaseRecorder().client as never,
        sendEmail: sendEmail as never,
      }),
    ).resolves.toEqual({ sent: false, reason: 'no_email_on_file' });
  });

  it('records failure metadata and rethrows for Inngest retry', async () => {
    const failureDb = createSupabaseRecorder();

    await expect(
      runClaimantNotify({
        event: dispatchEvent({ claimant_email: 'claimant@example.com' }),
        step: { run: async (_name, fn) => fn() },
        supabaseAdmin: failureDb.client as never,
        sendEmail: async () => {
          throw new Error('resend unavailable');
        },
      }),
    ).rejects.toThrow(/resend unavailable/);

    expect(failureDb.updates[0]?.patch).toMatchObject({
      notification_attempts: 1,
      notification_channel: 'email',
      notification_last_error: 'resend unavailable',
    });
  });

  it('builds and parses notification dispatch IDs', () => {
    const built = buildNotificationDispatchId({
      claimId,
      date: new Date(1778140000000),
    });

    expect(built).toBe(dispatchId);
    expect(extractClaimIdFromNotificationDispatchId(built)).toBe(claimId);
    expect(getResendWebhookCorrelation(deliveredEvent())).toEqual({
      claimId,
      dispatchId,
    });
    expect(
      getResendWebhookCorrelation({
        type: 'email.delivered',
        created_at: '2026-05-07T00:00:00Z',
        data: {
          ...baseEmailData(),
          tags: [
            { name: 'dispatch_id', value: dispatchId },
            { name: 'claim_id', value: claimId },
          ],
        },
      } as unknown as WebhookEventPayload),
    ).toEqual({ claimId, dispatchId });
  });
});

function dispatchEvent(
  overrides: Partial<ClaimDispatchQuestionsEvent['data']> = {},
): ClaimDispatchQuestionsEvent {
  return {
    name: 'claim/dispatch-questions',
    data: {
      claim_id: claimId,
      dispatch_id: dispatchId,
      claimant_email: 'claimant@example.com',
      claimant_first_name: 'דנה',
      claim_number: 'CLM-1',
      magic_link_url: 'https://staging.spectix.co.il/c/claim?token=test',
      question_count: 2,
      questions: [{ text: 'שאלה ספציפית', customer_label: 'השלמה' }],
      ...overrides,
    },
  };
}

function deliveredEvent(): WebhookEventPayload {
  return {
    type: 'email.delivered',
    created_at: '2026-05-07T00:00:00Z',
    data: baseEmailData(),
  } as WebhookEventPayload;
}

function bouncedEvent(): WebhookEventPayload {
  return {
    type: 'email.bounced',
    created_at: '2026-05-07T00:00:00Z',
    data: {
      ...baseEmailData(),
      bounce: { type: 'hard', subType: 'mailbox_full', message: 'bounced' },
    },
  } as WebhookEventPayload;
}

function complainedEvent(): WebhookEventPayload {
  return {
    type: 'email.complained',
    created_at: '2026-05-07T00:00:00Z',
    data: baseEmailData(),
  } as WebhookEventPayload;
}

function baseEmailData() {
  return {
    created_at: '2026-05-07T00:00:00Z',
    email_id: 'email_123',
    from: 'notifications@spectix.co.il',
    to: ['claimant@example.com'],
    subject: 'subject',
    tags: { dispatch_id: dispatchId, claim_id: claimId },
  };
}

function createSupabaseRecorder() {
  const updates: Array<{
    table: string;
    patch: Record<string, unknown>;
    column: string;
    value: string;
  }> = [];

  return {
    updates,
    client: {
      from(table: string) {
        return {
          update(patch: Record<string, unknown>) {
            return {
              eq(column: string, value: string) {
                updates.push({ table, patch, column, value });
                return {
                  throwOnError: async () => ({ error: null }),
                };
              },
            };
          },
        };
      },
    },
  };
}
