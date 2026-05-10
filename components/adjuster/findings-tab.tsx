'use client';

import {
  formatFindingEvidence,
  type FormattedFindingEvidence,
} from '@/lib/adjuster/finding-evidence';
import type { BriefFinding } from '@/lib/adjuster/types';
import {
  DOCUMENT_LABELS,
  EMPTY_STATES,
  FINDING_CATEGORY_LABELS,
} from '@/lib/ui/strings-he';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const severityLabel = {
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
} as const;

const leadingFindingClass = {
  high: 'border-risk-red bg-risk-red-bg',
  medium: 'border-risk-orange bg-risk-orange-bg',
  low: 'border-risk-yellow bg-risk-yellow-bg',
} as const;

export function FindingsTab({
  findings,
}: Readonly<{
  findings: BriefFinding[];
}>) {
  if (findings.length === 0) {
    return <EmptyState text={EMPTY_STATES.findings} />;
  }

  return (
    <div className="space-y-3">
      {findings.map((finding, index) => (
        <details
          key={finding.id}
          className={cn(
            'rounded-md border bg-card p-4 open:shadow-sm',
            index === 0 && leadingFindingClass[finding.severity],
          )}
          data-leading-finding={index === 0 ? 'true' : undefined}
        >
          <summary className="cursor-pointer list-none space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{finding.title}</h3>
              <div className="flex gap-2">
                {index === 0 ? (
                  <Badge variant="outline">ממצא מוביל</Badge>
                ) : null}
                <Badge variant="outline">
                  {FINDING_CATEGORY_LABELS[finding.category] ??
                    finding.category}
                </Badge>
                <Badge
                  variant={
                    finding.severity === 'high' ? 'destructive' : 'secondary'
                  }
                >
                  {severityLabel[finding.severity]}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {finding.description}
            </p>
          </summary>
          <div className="mt-4 rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">מקורות וראיות</p>
            <div className="mt-2 space-y-2">
              {formatFindingEvidence(finding).map((evidence, evidenceIndex) => (
                <EvidenceRow
                  key={`${finding.id}-evidence-${evidenceIndex}`}
                  evidence={evidence}
                />
              ))}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

function EvidenceRow({
  evidence,
}: Readonly<{
  evidence: FormattedFindingEvidence;
}>) {
  const documentTypeLabel = getDocumentTypeLabel(evidence.documentTypeLabel);

  return (
    <div className="rounded-md border bg-background/70 p-3">
      <dl className="grid gap-2 text-sm md:grid-cols-[140px_1fr]">
        <dt className="font-medium text-muted-foreground">מקור</dt>
        <dd>{evidence.sourceLabel}</dd>
        {documentTypeLabel ? (
          <>
            <dt className="font-medium text-muted-foreground">סוג מסמך</dt>
            <dd>{documentTypeLabel}</dd>
          </>
        ) : null}
        <dt className="font-medium text-muted-foreground">שדה שנבדק</dt>
        <dd className="break-words font-latin text-xs md:text-sm">
          {evidence.checkedField}
        </dd>
        <dt className="font-medium text-muted-foreground">ערך מצופה</dt>
        <dd className="break-words">{evidence.expectedValue}</dd>
        <dt className="font-medium text-muted-foreground">ערך שנמצא</dt>
        <dd className="break-words">{evidence.foundValue}</dd>
        {evidence.sourceQuote ? (
          <>
            <dt className="font-medium text-muted-foreground">ציטוט מקור</dt>
            <dd className="break-words">{evidence.sourceQuote}</dd>
          </>
        ) : null}
        <dt className="font-medium text-muted-foreground">הסבר</dt>
        <dd className="break-words">{evidence.explanation}</dd>
        <dt className="font-medium text-muted-foreground">פעולה מומלצת</dt>
        <dd className="break-words">{evidence.recommendedAction}</dd>
      </dl>
    </div>
  );
}

function EmptyState({ text }: Readonly<{ text: string }>) {
  return (
    <Card>
      <CardContent className="p-6 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}

function getDocumentTypeLabel(value: string | null): string | null {
  if (!value) return null;

  const labels = value
    .split(' / ')
    .filter(Boolean)
    .map((label) => DOCUMENT_LABELS[label] ?? label);
  const uniqueLabels = Array.from(new Set(labels));

  return uniqueLabels.length > 0 ? uniqueLabels.join(' / ') : null;
}
