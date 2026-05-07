import type { BriefQuestion } from '@/lib/adjuster/types';

export function getDefaultSelectedQuestionIds(
  questions: readonly BriefQuestion[],
): string[] {
  return questions
    .filter((question) => !question.dispatch)
    .map((question) => question.id);
}

export function isQuestionSelectable(_question: BriefQuestion): boolean {
  return true;
}

export function buildRequestInfoBody(questionIds: readonly string[]): {
  question_ids: string[];
} {
  return { question_ids: [...questionIds] };
}

export function getQuestionDispatchStatusText(question: BriefQuestion): string {
  if (!question.dispatch) return 'טרם נשלחה';

  const base = `נשלחה לאחרונה: ${formatDate(
    question.dispatch.lastDispatchedAt,
  )}`;

  if (hasNotificationError(question)) {
    return `${base} (שגיאת אימייל)`;
  }
  if (question.dispatch.notificationSentAt) {
    return `${base} (אימייל נשלח)`;
  }

  return base;
}

export function hasNotificationError(question: BriefQuestion): boolean {
  return Boolean(question.dispatch?.notificationLastError?.trim());
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
