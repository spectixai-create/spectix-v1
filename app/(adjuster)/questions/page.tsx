import { AdjusterShell } from '@/components/layout/adjuster-shell';
import { PageHeader } from '@/components/layout/page-header';
import { VersionFooter } from '@/components/layout/version-footer';
import { QuestionsSummaryStats } from '@/components/questions/question-summary-stats';
import { QuestionsView } from '@/components/questions/questions-view';

export type QuestionsViewKey = 'pending' | 'answered' | 'closed';

const viewValues = new Set<QuestionsViewKey>(['pending', 'answered', 'closed']);

export const dynamic = 'force-dynamic';

export default function QuestionsPage({
  searchParams,
}: Readonly<{
  searchParams?: { view?: string };
}>) {
  const view = parseQuestionsView(searchParams?.view);

  return (
    <AdjusterShell>
      <div className="space-y-6">
        <PageHeader
          title="תור שאלות הבהרה"
          description="ניהול תקשורת עם מבוטחים — שאלות פתוחות, תשובות לסקירה, היסטוריה"
        />
        <QuestionsSummaryStats />
        <QuestionsView view={view} />
        <VersionFooter />
      </div>
    </AdjusterShell>
  );
}

function parseQuestionsView(value: string | undefined): QuestionsViewKey {
  if (value && viewValues.has(value as QuestionsViewKey)) {
    return value as QuestionsViewKey;
  }

  return 'pending';
}
