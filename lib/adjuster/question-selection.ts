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
  return question.dispatch
    ? `נשלחה לאחרונה: ${formatDate(question.dispatch.lastDispatchedAt)}`
    : 'טרם נשלחה';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
