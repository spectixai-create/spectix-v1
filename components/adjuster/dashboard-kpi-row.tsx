import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  HelpCircle,
} from 'lucide-react';

import type { ClaimListSummary } from '@/lib/adjuster/types';
import { StatCard } from '@/components/data-display/stat-card';
import { Tag } from '@/components/data-display/tag';

export function DashboardKpiRow({
  summary,
}: Readonly<{
  summary: ClaimListSummary;
}>) {
  return (
    <section
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="מדדי תור עבודה"
    >
      <StatCard
        label="תיקים פתוחים"
        value={<span className="num font-latin">{summary.totalOpen}</span>}
        helper="לפי הסינון הנוכחי"
        icon={FileText}
      />
      <StatCard
        label="מוכנים להחלטה"
        value={<span className="num font-latin">{summary.ready}</span>}
        icon={CheckCircle2}
        trend={<Tag tone="success">מוכן</Tag>}
      />
      <StatCard
        label="ממתינים ללקוח"
        value={<span className="num font-latin">{summary.pendingInfo}</span>}
        icon={HelpCircle}
        trend={<Tag tone="warning">השלמה</Tag>}
      />
      <StatCard
        label="בבדיקה מוגברת"
        value={<span className="num font-latin">{summary.enhancedReview}</span>}
        helper="כולל אדום וכתום"
        icon={AlertTriangle}
        trend={<Tag tone="warning">דורש תשומת לב</Tag>}
      />
    </section>
  );
}
