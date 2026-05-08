'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { QuestionDetailPanel } from '@/components/questions/question-detail-panel';
import { QuestionsFilterBar } from '@/components/questions/questions-filter-bar';
import { QuestionsList } from '@/components/questions/questions-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  sampleQuestions,
  type QuestionStatus,
  type SampleQuestion,
} from '@/lib/sample-data/sample-questions';

export type QuestionsViewKey = 'pending' | 'answered' | 'closed';
export type QuestionFilter = 'claim-2024-001' | 'urgent' | 'week' | 'month';
export type QuestionSort = 'date-desc' | 'date-asc' | 'urgency' | 'claim';
export type QuestionAction = 'remind' | 'approve' | 'request-more' | 'reopen';

const tabLabels: Record<QuestionsViewKey, string> = {
  pending: 'ממתינות',
  answered: 'נענו',
  closed: 'סגורות',
};

const validViews = new Set<QuestionsViewKey>(['pending', 'answered', 'closed']);

export function QuestionsView({ view }: Readonly<{ view: QuestionsViewKey }>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentView, setCurrentView] = React.useState<QuestionsViewKey>(view);
  const [filters, setFilters] = React.useState<QuestionFilter[]>(['month']);
  const [sort, setSort] = React.useState<QuestionSort>('date-desc');
  const [statusOverrides, setStatusOverrides] = React.useState<
    Record<string, QuestionStatus>
  >({});
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    const queryView = searchParams.get('view');
    const nextView =
      queryView && validViews.has(queryView as QuestionsViewKey)
        ? (queryView as QuestionsViewKey)
        : 'pending';
    setCurrentView(nextView);
  }, [searchParams]);

  const questions = React.useMemo(
    () =>
      sampleQuestions.map((question) => ({
        ...question,
        status: statusOverrides[question.id] ?? question.status,
      })),
    [statusOverrides],
  );
  const tabCounts = React.useMemo(
    () =>
      (Object.keys(tabLabels) as QuestionsViewKey[]).reduce(
        (counts, key) => ({
          ...counts,
          [key]: questions.filter((question) => question.status === key).length,
        }),
        {} as Record<QuestionsViewKey, number>,
      ),
    [questions],
  );

  const selectedQuestion =
    questions.find((question) => question.id === selectedQuestionId) ?? null;

  function changeView(nextView: string) {
    const safeView = validViews.has(nextView as QuestionsViewKey)
      ? (nextView as QuestionsViewKey)
      : 'pending';
    setCurrentView(safeView);

    const params = new URLSearchParams(searchParams.toString());
    if (safeView === 'pending') {
      params.delete('view');
    } else {
      params.set('view', safeView);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function updateQuestionStatus(id: string, status: QuestionStatus) {
    setStatusOverrides((previous) => ({ ...previous, [id]: status }));
  }

  function handleAction(action: QuestionAction, questionId: string) {
    if (action === 'approve') {
      updateQuestionStatus(questionId, 'closed');
      setCurrentView('closed');
      changeView('closed');
      return;
    }

    if (action === 'request-more' || action === 'reopen') {
      updateQuestionStatus(questionId, 'pending');
      setCurrentView('pending');
      changeView('pending');
    }
  }

  function closePanel() {
    const returnToId = selectedQuestionId;
    setSelectedQuestionId(null);
    window.setTimeout(() => {
      if (returnToId) {
        document
          .querySelector<HTMLElement>(`[data-question-id="${returnToId}"]`)
          ?.focus();
      }
    }, 0);
  }

  return (
    <section className="space-y-5" aria-label="תור שאלות הבהרה">
      <QuestionsFilterBar
        filters={filters}
        sort={sort}
        onFiltersChange={setFilters}
        onSortChange={setSort}
      />
      <Tabs value={currentView} onValueChange={changeView} dir="rtl">
        <div className="overflow-x-auto">
          <TabsList aria-label="סטטוס שאלות">
            {(Object.keys(tabLabels) as QuestionsViewKey[]).map((key) => (
              <TabsTrigger key={key} value={key}>
                {tabLabels[key]}{' '}
                <span className="font-latin">({tabCounts[key]})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {(Object.keys(tabLabels) as QuestionsViewKey[]).map((status) => (
          <TabsContent key={status} value={status} className="mt-5">
            <QuestionsList
              status={status}
              questions={questions}
              filters={filters}
              sort={sort}
              onClearFilters={() => setFilters([])}
              onOpenQuestion={(question) => setSelectedQuestionId(question.id)}
              onAction={handleAction}
            />
          </TabsContent>
        ))}
      </Tabs>
      <QuestionDetailPanel
        question={selectedQuestion}
        open={selectedQuestion !== null}
        onOpenChange={(open) => {
          if (!open) {
            closePanel();
          }
        }}
        onAction={handleAction}
      />
    </section>
  );
}

export function getQuestionStatus(question: SampleQuestion): QuestionStatus {
  return question.status;
}
