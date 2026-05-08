'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Check,
  ExternalLink,
  MessageSquarePlus,
  RotateCcw,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  formatRelativeDaysAgo,
  formatRelativeHoursAgo,
} from '@/lib/ui/hebrew-time';
import { cn } from '@/lib/utils';
import { Tag } from '@/components/data-display/tag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { QuestionAction } from '@/components/questions/questions-view';
import type { SampleQuestion } from '@/lib/sample-data/sample-questions';

const statusLabel: Record<SampleQuestion['status'], string> = {
  pending: 'ממתינה',
  answered: 'נענתה',
  closed: 'סגורה',
};

const statusVariant: Record<
  SampleQuestion['status'],
  React.ComponentProps<typeof Badge>['variant']
> = {
  pending: 'risk-yellow',
  answered: 'risk-orange',
  closed: 'risk-green',
};

const referenceNow = new Date('2026-05-02T12:00:00.000Z').getTime();

export function QuestionCard({
  question,
  onClick,
  onAction,
}: Readonly<{
  question: SampleQuestion;
  onClick: () => void;
  onAction: (action: QuestionAction, questionId: string) => void;
}>) {
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [composerText, setComposerText] = React.useState('');

  function stop(event: React.MouseEvent) {
    event.stopPropagation();
  }

  function sendReminder(event: React.MouseEvent) {
    stop(event);
    toast.info('התזכורת נשלחה למבוטח');
    onAction('remind', question.id);
  }

  function approve(event: React.MouseEvent) {
    stop(event);
    toast.success('השאלה אושרה');
    onAction('approve', question.id);
  }

  function requestMore(event: React.MouseEvent) {
    stop(event);
    setComposerOpen(true);
  }

  function submitComposer(event: React.MouseEvent) {
    stop(event);
    toast.success('הבקשה נשלחה');
    setComposerText('');
    setComposerOpen(false);
    onAction('request-more', question.id);
  }

  function reopen(event: React.MouseEvent) {
    stop(event);
    toast.info('השאלה נפתחה מחדש');
    onAction('reopen', question.id);
  }

  return (
    <Card
      role="group"
      aria-label={`שאלת הבהרה לתיק ${question.claimId}`}
      tabIndex={0}
      data-testid={`question-card-${question.id}`}
      data-question-id={question.id}
      className="cursor-pointer rounded-lg p-4 shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/claim/${question.claimId}`}
            className="inline-flex"
            onClick={(event) => event.stopPropagation()}
            prefetch={false}
          >
            <Tag className="num font-latin">{question.claimId}</Tag>
          </Link>
          <Tag tone={question.urgency === 'urgent' ? 'warning' : 'neutral'}>
            {question.urgency === 'urgent' ? 'דחוף' : 'רגיל'}
          </Tag>
          <Badge variant={statusVariant[question.status]}>
            {statusLabel[question.status]}
          </Badge>
        </div>

        <div className="space-y-2">
          <p className="line-clamp-2 text-sm font-medium leading-6">
            {question.questionText}
          </p>
          {question.status === 'pending' ? (
            <p className="text-xs text-muted-foreground">
              נשלח {formatRelativeDaysAgo(question.sentAt, referenceNow)}
            </p>
          ) : null}
          {question.status === 'answered' ? (
            <div className="space-y-1">
              <p className="line-clamp-1 text-sm text-muted-foreground">
                {question.answerText}
              </p>
              <p className="text-xs text-muted-foreground">
                נענה{' '}
                {formatRelativeHoursAgo(
                  question.answeredAt ?? question.sentAt,
                  referenceNow,
                )}
              </p>
            </div>
          ) : null}
          {question.status === 'closed' ? (
            <div className="space-y-1">
              <p className="line-clamp-1 text-sm text-muted-foreground">
                {question.resolutionNote}
              </p>
              <p className="text-xs text-muted-foreground">
                נסגר על ידי {question.resolvedBy}
              </p>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end',
            question.status === 'answered' && 'sm:items-center',
          )}
        >
          <Button asChild size="sm" className="gap-2">
            <Link
              href={`/claim/${question.claimId}`}
              onClick={(event) => event.stopPropagation()}
              prefetch={false}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              פתח תיק
            </Link>
          </Button>
          {question.status === 'pending' ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={sendReminder}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              שלח תזכורת
            </Button>
          ) : null}
          {question.status === 'answered' ? (
            <>
              <Button
                type="button"
                size="sm"
                className="gap-2"
                onClick={approve}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                אישור
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={requestMore}
              >
                <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                בקשת הבהרה נוספת
              </Button>
            </>
          ) : null}
          {question.status === 'closed' ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={reopen}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              פתיחה מחדש
            </Button>
          ) : null}
        </div>

        {composerOpen ? (
          <div
            className="space-y-2 rounded-md border bg-background p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <Textarea
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
              placeholder="כתוב בקשת הבהרה נוספת למבוטח"
              aria-label="בקשת הבהרה נוספת"
              className="min-h-24"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={submitComposer}
                disabled={composerText.trim().length === 0}
              >
                שליחה
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
