import { AlertTriangle, FileText, Gauge, Users } from 'lucide-react';

import { AdjusterShell } from '@/components/layout/adjuster-shell';
import { PageHeader } from '@/components/layout/page-header';
import { SectionDivider } from '@/components/layout/section-divider';
import { VersionFooter } from '@/components/layout/version-footer';
import { StatCard } from '@/components/data-display/stat-card';
import { InfoRow } from '@/components/data-display/info-row';
import { Tag } from '@/components/data-display/tag';
import { RiskBadge, RiskLegend, RiskMeter } from '@/components/risk/risk-band';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorBanner, InlineError } from '@/components/states/error-state';
import {
  PageLoading,
  SkeletonCard,
  Spinner,
} from '@/components/states/loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function DesignSystemPage() {
  return (
    <AdjusterShell>
      <div className="space-y-8">
        <PageHeader
          eyebrow="בדיקת רכיבים"
          title="ספריית רכיבי UI"
          description="דף פנימי לבדיקת רכיבי ממשק לפני שילוב במסכי המוצר."
          actions={
            <>
              <Button variant="outline">פעולה משנית</Button>
              <Button>פעולה ראשית</Button>
            </>
          }
        />

        <section
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          aria-label="מדדים"
        >
          <StatCard
            label="תיקים פתוחים"
            value={<span className="num font-latin">128</span>}
            helper="מתוכם 12 דורשים טיפול היום"
            icon={FileText}
            trend={<Tag tone="info">+8%</Tag>}
          />
          <StatCard
            label="סיכון גבוה"
            value={<span className="num font-latin">17</span>}
            helper="כולל תיקים אדומים וכתומים"
            icon={AlertTriangle}
            trend={<RiskBadge band="orange" />}
          />
          <StatCard
            label="זמן טיפול חציוני"
            value={<span className="num font-latin">03:42</span>}
            helper="שעות מרגע פתיחת תיק"
            icon={Gauge}
          />
          <StatCard
            label="נציגים פעילים"
            value={<span className="num font-latin">6</span>}
            helper="משמרת נוכחית"
            icon={Users}
            trend={<Tag tone="success">תקין</Tag>}
          />
        </section>

        <SectionDivider
          title="רמות סיכון"
          description="בדיקת תצוגה של צבעים, תגים ומדדי סיכון."
        />

        <section className="space-y-4" aria-label="רמות סיכון">
          <RiskLegend />
          <Card>
            <CardHeader>
              <CardTitle>מדדי סיכון</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <RiskMeter band="green" />
              <RiskMeter band="yellow" />
              <RiskMeter band="orange" />
              <RiskMeter band="red" />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-3" aria-label="מצבי מערכת">
          <EmptyState preset="claims" actionLabel="פתיחת תיק חדש" />
          <EmptyState preset="documents" />
          <div className="space-y-4">
            <ErrorBanner description="החיבור לשירות זמני נכשל. ניתן לנסות שוב בעוד רגע." />
            <InlineError message="שדה חובה חסר" />
            <Card>
              <CardContent className="p-4">
                <Spinner label="טוען בדיקות" />
              </CardContent>
            </Card>
          </div>
        </section>

        <section
          className="grid gap-4 lg:grid-cols-2"
          aria-label="נתונים וטעינה"
        >
          <Card>
            <CardHeader>
              <CardTitle>פרטי תיק לדוגמה</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <InfoRow
                  label="מספר תיק"
                  value={<span className="num font-latin">2024-001</span>}
                />
                <InfoRow
                  label="סכום תביעה"
                  value={<span className="num font-latin">₪1,234.56</span>}
                />
                <InfoRow
                  label="תגיות"
                  value={
                    <div className="flex flex-wrap gap-2">
                      <Tag>מסמכים חסרים</Tag>
                      <Tag tone="warning">בדיקה ידנית</Tag>
                    </div>
                  }
                />
                <InfoRow
                  label="סטטוס"
                  value={<Badge variant="secondary">טיוטה</Badge>}
                />
              </dl>
            </CardContent>
          </Card>
          <div className="grid gap-4">
            <SkeletonCard />
            <Card>
              <CardContent className="p-0">
                <PageLoading />
              </CardContent>
            </Card>
          </div>
        </section>
        <VersionFooter internal />
      </div>
    </AdjusterShell>
  );
}
