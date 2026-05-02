import { Clock, HelpCircle, Inbox, MessageSquareText } from 'lucide-react';

import { StatCard } from '@/components/data-display/stat-card';
import { sampleQuestions } from '@/lib/sample-data/sample-questions';

export function QuestionsSummaryStats() {
  const pending = sampleQuestions.filter(
    (question) => question.status === 'pending',
  ).length;
  const answered = sampleQuestions.filter(
    (question) => question.status === 'answered',
  ).length;

  return (
    <section
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="מדדי שאלות הבהרה"
    >
      <StatCard
        label="שאלות פתוחות"
        value={<span className="num font-latin">{pending}</span>}
        helper="ממתינות לתשובת מבוטח"
        icon={HelpCircle}
      />
      <StatCard
        label="תשובות לסקירה"
        value={<span className="num font-latin">{answered}</span>}
        helper="ממתינות לאישור נציג"
        icon={Inbox}
      />
      <StatCard
        label="ממוצע זמן תגובה"
        value={<span className="num font-latin">32 שעות</span>}
        helper="מדד דמו לשבוע הנוכחי"
        icon={Clock}
      />
      <StatCard
        label="אחוז תגובות"
        value={<span className="num font-latin">78%</span>}
        helper="מתוך שאלות שנשלחו"
        icon={MessageSquareText}
      />
    </section>
  );
}
