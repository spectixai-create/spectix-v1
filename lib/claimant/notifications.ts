import 'server-only';

import { Resend, type WebhookEventPayload } from 'resend';

import { buildGreeting } from '@/lib/claimant/contact';

export const CLAIMANT_EMAIL_FROM = 'Spectix <notifications@spectix.co.il>';
export const CLAIMANT_EMAIL_TAG_DISPATCH_ID = 'dispatch_id';
export const CLAIMANT_EMAIL_TAG_CLAIM_ID = 'claim_id';

export type SendClaimantEmailInput = {
  to: string;
  claim_number: string | null;
  first_name: string | null;
  magic_link_url: string;
  question_count: number;
  dispatch_id: string;
};

export type ClaimantEmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

type ResendEmailClient = Pick<Resend, 'emails'>;

let cachedResend: Resend | null = null;

export function createResendClient(): Resend {
  if (cachedResend) return cachedResend;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing required env: RESEND_API_KEY');
  }

  cachedResend = new Resend(apiKey);
  return cachedResend;
}

export function buildNotificationDispatchId({
  claimId,
  date = new Date(),
}: {
  claimId: string;
  date?: Date;
}): string {
  return `${claimId}--${date.getTime()}`;
}

export function extractClaimIdFromNotificationDispatchId(
  dispatchId: string,
): string | null {
  const [claimId] = dispatchId.split('--');
  return isUuidLike(claimId) ? claimId : null;
}

export function buildClaimantEmailTemplate({
  claim_number,
  first_name,
  magic_link_url,
  question_count,
}: Pick<
  SendClaimantEmailInput,
  'claim_number' | 'first_name' | 'magic_link_url' | 'question_count'
>): ClaimantEmailTemplate {
  const claimNumber = claim_number?.trim() || 'התביעה שלך';
  const greeting = buildGreeting(first_name);
  const questionCopy =
    question_count === 1 ? 'שאלה אחת' : `${question_count} שאלות`;
  const subject = `תביעה ${claimNumber} - דרושה התייחסותך`;
  const escapedGreeting = escapeHtml(greeting);
  const escapedClaimNumber = escapeHtml(claimNumber);
  const escapedQuestionCopy = escapeHtml(questionCopy);
  const escapedUrl = escapeHtml(magic_link_url);
  const replyInstruction =
    'כדי שהתגובה תיקלט במערכת, יש להשיב דרך הקישור המאובטח בלבד. מענה ישיר למייל זה לא ייקלט בתיק.';
  const escapedReplyInstruction = escapeHtml(replyInstruction);

  return {
    subject,
    html: `<!doctype html>
<html lang="he" dir="rtl">
  <body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;direction:rtl;text-align:right;">
    <main style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <section style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:24px;">
        <p style="margin:0 0 16px;font-size:18px;">${escapedGreeting},</p>
        <p style="margin:0 0 16px;line-height:1.7;">
          בנוגע לתביעה מספר ${escapedClaimNumber}, נדרשת התייחסותך ל-${escapedQuestionCopy}
          כדי להמשיך את הטיפול.
        </p>
        <p style="margin:24px 0;">
          <a href="${escapedUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 20px;font-weight:700;">
            ענה עכשיו
          </a>
        </p>
        <p style="margin:0 0 16px;color:#475569;line-height:1.7;">
          ${escapedReplyInstruction}
        </p>
        <p style="margin:0;color:#475569;line-height:1.7;">
          הקישור תקף ל-24 שעות. אם הכפתור לא נפתח, אפשר להעתיק את הקישור הבא לדפדפן:
        </p>
        <p style="direction:ltr;text-align:left;word-break:break-all;margin:12px 0 0;color:#334155;">
          ${escapedUrl}
        </p>
      </section>
    </main>
  </body>
</html>`,
    text: `${greeting},

בנוגע לתביעה מספר ${claimNumber}, נדרשת התייחסותך ל-${questionCopy} כדי להמשיך את הטיפול.

ענה עכשיו:
${magic_link_url}

${replyInstruction}

הקישור תקף ל-24 שעות.`,
  };
}

export async function sendClaimantEmail(
  input: SendClaimantEmailInput,
  resend: ResendEmailClient = createResendClient(),
): Promise<string> {
  const template = buildClaimantEmailTemplate(input);
  const claimId = extractClaimIdFromNotificationDispatchId(input.dispatch_id);
  const tags = [
    {
      name: CLAIMANT_EMAIL_TAG_DISPATCH_ID,
      value: sanitizeResendTagValue(input.dispatch_id),
    },
  ];

  if (claimId) {
    tags.push({
      name: CLAIMANT_EMAIL_TAG_CLAIM_ID,
      value: sanitizeResendTagValue(claimId),
    });
  }

  const { data, error } = await resend.emails.send({
    from: CLAIMANT_EMAIL_FROM,
    to: input.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    tags,
  });

  if (error) {
    throw new Error(error.message || 'resend_send_failed');
  }
  if (!data?.id) {
    throw new Error('resend_missing_message_id');
  }

  return data.id;
}

export function verifyResendWebhookPayload({
  payload,
  headers,
  webhookSecret,
  resend = createResendClient(),
}: {
  payload: string;
  headers: { id: string; timestamp: string; signature: string };
  webhookSecret: string;
  resend?: Pick<Resend, 'webhooks'>;
}): WebhookEventPayload {
  return resend.webhooks.verify({
    payload,
    headers,
    webhookSecret,
  });
}

function sanitizeResendTagValue(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 256);
}

function isUuidLike(value: string | undefined): value is string {
  return Boolean(
    value?.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    ),
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
