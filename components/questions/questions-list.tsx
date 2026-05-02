'use client';

import { SearchX } from 'lucide-react';

import { QuestionCard } from '@/components/questions/question-card';
import { EmptyState } from '@/components/states/empty-state';
import type {
  QuestionAction,
  QuestionFilter,
  QuestionSort,
} from '@/components/questions/questions-view';
import type {
  QuestionStatus,
  SampleQuestion,
} from '@/lib/sample-data/sample-questions';

const statusEmptyText: Record<QuestionStatus, string> = {
  pending: 'אין שאלות ממתינות. כל השאלות נענו.',
  answered: 'אין תשובות חדשות לסקירה.',
  closed: 'אין שאלות סגורות.',
};

const referenceNow = new Date('2026-05-02T12:00:00.000Z').getTime();

export function QuestionsList({
  status,
  questions,
  filters,
  sort,
  onClearFilters,
  onOpenQuestion,
  onAction,
}: Readonly<{
  status: QuestionStatus;
  questions: SampleQuestion[];
  filters: QuestionFilter[];
  sort: QuestionSort;
  onClearFilters: () => void;
  onOpenQuestion: (question: SampleQuestion) => void;
  onAction: (action: QuestionAction, questionId: string) => void;
}>) {
  const statusQuestions = questions.filter(
    (question) => question.status === status,
  );
  const visibleQuestions = sortQuestions(
    statusQuestions.filter((question) => passesFilters(question, filters)),
    sort,
  );

  if (statusQuestions.length === 0) {
    return (
      <EmptyState
        title={statusEmptyText[status]}
        description="אין כרגע פריטים להצגה בסטטוס זה."
      />
    );
  }

  if (filters.length > 0 && visibleQuestions.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="אין שאלות התואמות למסננים."
        description="אפשר להסיר מסנן אחד או לנקות את כולם כדי לראות שוב את התור."
        actionLabel="נקה מסננים"
        onAction={onClearFilters}
      />
    );
  }

  return (
    <div className="grid gap-3" aria-live="polite">
      {visibleQuestions.map((question) => (
        <QuestionCard
          key={`${question.id}-${question.status}`}
          question={question}
          onClick={() => onOpenQuestion(question)}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

function passesFilters(question: SampleQuestion, filters: QuestionFilter[]) {
  return filters.every((filter) => {
    if (filter === 'claim-2024-001') {
      return question.claimId === '2024-001';
    }

    if (filter === 'urgent') {
      return question.urgency === 'urgent';
    }

    if (filter === 'week') {
      return daysSince(question.sentAt) <= 7;
    }

    if (filter === 'month') {
      return daysSince(question.sentAt) <= 31;
    }

    return true;
  });
}

function sortQuestions(questions: SampleQuestion[], sort: QuestionSort) {
  const ordered = [...questions];

  ordered.sort((a, b) => {
    if (sort === 'date-asc') {
      return new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
    }

    if (sort === 'urgency') {
      const urgencyDiff = urgencyRank(b.urgency) - urgencyRank(a.urgency);
      if (urgencyDiff !== 0) {
        return urgencyDiff;
      }
      return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
    }

    if (sort === 'claim') {
      return a.claimId.localeCompare(b.claimId, 'he');
    }

    return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
  });

  return ordered;
}

function urgencyRank(urgency: SampleQuestion['urgency']) {
  return urgency === 'urgent' ? 2 : 1;
}

function daysSince(date: string) {
  const diff = referenceNow - new Date(date).getTime();
  return diff / (1000 * 60 * 60 * 24);
}
