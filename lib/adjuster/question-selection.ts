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

  if (hasNotificationError(question)) {
    return `נשלחה לאחרונה: ${formatDate(
      question.dispatch.lastDispatchedAt,
    )} (שגיאת אימייל)`;
  }
  if (question.dispatch.notificationSentAt) {
    return `נשלח ללקוח בתאריך ${formatDate(
      question.dispatch.notificationSentAt,
    )}`;
  }

  return `נוצר קישור בתאריך ${formatDate(question.dispatch.lastDispatchedAt)}`;
}

export function hasNotificationError(question: BriefQuestion): boolean {
  return Boolean(question.dispatch?.notificationLastError?.trim());
}

export function getRequiredActionLabel(action: string | null): string {
  if (action === 'upload_document') return 'נדרש מסמך';
  if (action === 'answer') return 'נדרשת תשובה';
  if (action === 'upload_document_or_answer') return 'מסמך או תשובה';
  return 'מסמך או תשובה';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
