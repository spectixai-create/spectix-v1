import { AlertTriangle, CheckCircle2, ClipboardCheck } from 'lucide-react';

import { InfoRow } from '@/components/data-display/info-row';
import { StatCard } from '@/components/data-display/stat-card';
import { Tag } from '@/components/data-display/tag';
import { RiskBadge, RiskMeter } from '@/components/risk/risk-band';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  FindingSeverity,
  SampleClaim,
} from '@/lib/sample-data/sample-claim';

const severityVariant: Record<
  FindingSeverity,
  React.ComponentProps<typeof Badge>['variant']
> = {
  HIGH: 'destructive',
  MED: 'risk-orange',
  LOW: 'secondary',
};

export function TabBrief({ sample }: Readonly<{ sample: SampleClaim }>) {
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5">
          <dl>
            <InfoRow
              label="כיסוי ביטוחי"
              value={
                <Badge variant="risk-green">
                  {sample.coverageStatus === 'passed' ? 'עבר' : 'לא עבר'}
                </Badge>
              }
            />
            <InfoRow
              label="עמידה בחיתום"
              value={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="risk-yellow">
                    {sample.underwritingViolations} חריגה
                  </Badge>
                  <span className="text-muted-foreground">
                    נדרשת בדיקת הצהרות קודמות
                  </span>
                </div>
              }
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">הקשר נסיעה</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <InfoRow label="מטרה" value={sample.tripContext.purpose} />
            <InfoRow
              label="קשרים מקומיים"
              value={sample.tripContext.localConnections}
            />
            <InfoRow
              label="נסיעות קודמות"
              value={sample.tripContext.previousTrips}
            />
            <InfoRow label="עיסוק" value={sample.tripContext.occupation} />
            <InfoRow
              label="רלוונטיות עיסוק"
              value={sample.tripContext.occupationRelevance}
            />
            <InfoRow
              label="פקטור הקשר"
              value={sample.tripContext.connectionFactor}
            />
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <StatCard
          label="Claimant Readiness"
          value={
            <span className="num font-latin">
              {sample.claimantReadiness.score}/100
            </span>
          }
          helper={sample.claimantReadiness.interpretation}
          icon={ClipboardCheck}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">תקציר</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-7 text-muted-foreground">{sample.summary}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-xl">הערכת סיכון</CardTitle>
            <RiskBadge band={sample.riskBand} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <RiskMeter band={sample.riskBand} label="מדד סיכון נוכחי" />
          <p className="text-sm leading-6 text-muted-foreground">
            {sample.riskReason}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">ממצאים מרכזיים</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {sample.findings.map((finding, index) => (
              <li
                key={finding.id}
                className="rounded-md border bg-background p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num font-latin text-sm text-muted-foreground">
                    {index + 1}.
                  </span>
                  <Badge variant={severityVariant[finding.severity]}>
                    {finding.severity}
                  </Badge>
                  <Tag tone="info">Pass {finding.pass}</Tag>
                  <h3 className="font-semibold">{finding.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {finding.evidence}
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <NumberedCard title="פעולות נדרשות" items={sample.requiredActions} />
        <NumberedCard
          title="שאלות הבהרה למבוטח"
          items={sample.clarificationQuestions}
        />
      </div>

      <Card className="border-risk-orange bg-risk-orange-bg">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <AlertTriangle
              className="h-5 w-5 text-risk-orange"
              aria-hidden="true"
            />
            <CardTitle className="text-xl">המלצה סופית</CardTitle>
            <Badge variant="risk-orange">
              {sample.finalRecommendation.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-8">{sample.finalRecommendation.text}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function NumberedCard({
  title,
  items,
}: Readonly<{
  title: string;
  items: string[];
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li key={item} className="flex gap-3">
              <CheckCircle2
                className="mt-1 h-4 w-4 shrink-0 text-risk-green"
                aria-hidden="true"
              />
              <span>
                <span className="num font-latin text-muted-foreground">
                  {index + 1}.{' '}
                </span>
                {item}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
