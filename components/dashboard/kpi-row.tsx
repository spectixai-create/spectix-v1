import { AlertTriangle, Clock3, FileText, Loader2 } from 'lucide-react';

import { StatCard } from '@/components/data-display/stat-card';
import { Tag } from '@/components/data-display/tag';
import { Badge } from '@/components/ui/badge';

export function KpiRow({
  stats,
}: Readonly<{
  stats: {
    open: number;
    pending: number;
    red: number;
    processing: number;
  };
}>) {
  return (
    <section
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="מדדי תור עבודה"
    >
      <StatCard
        label="תיקים פתוחים"
        value={<span className="num font-latin">{stats.open}</span>}
        helper="כל התיקים שעדיין לא נסגרו"
        icon={FileText}
        trend={<Tag tone="info">+12 היום</Tag>}
      />
      <StatCard
        label="ממתינים לבדיקה"
        value={<span className="num font-latin">{stats.pending}</span>}
        helper="כולל מסמכים חסרים ושאלות פתוחות"
        icon={Clock3}
        trend={<Tag tone="warning">ניטור</Tag>}
      />
      <StatCard
        label="אדומים"
        value={<span className="num font-latin">{stats.red}</span>}
        helper="דורשים החלטת נציג"
        icon={AlertTriangle}
        trend={<Badge variant="destructive">גבוה</Badge>}
        className="border-risk-red/30"
      />
      <StatCard
        label="בעיבוד"
        value={<span className="num font-latin">{stats.processing}</span>}
        helper="Pass פעיל ברקע"
        icon={Loader2}
        trend={<Tag tone="success">תקין</Tag>}
      />
    </section>
  );
}
