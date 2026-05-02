'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Check,
  FileText,
  History,
  MessageSquarePlus,
  RotateCcw,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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

export function QuestionDetailPanel({
  question,
  open,
  onOpenChange,
  onAction,
}: Readonly<{
  question: SampleQuestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: QuestionAction, questionId: string) => void;
}>) {
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [composerText, setComposerText] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setComposerOpen(false);
      setComposerText('');
    }
  }, [open]);

  if (!question) {
    return <Sheet open={open} onOpenChange={onOpenChange} />;
  }

  const activeQuestion = question;

  function sendReminder() {
    toast.info('התזכורת נשלחה למבוטח');
    onAction('remind', activeQuestion.id);
  }

  function approve() {
    toast.success('השאלה אושרה');
    onOpenChange(false);
    onAction('approve', activeQuestion.id);
  }

  function submitComposer() {
    toast.success('הבקשה נשלחה');
    setComposerOpen(false);
    setComposerText('');
    onOpenChange(false);
    onAction('request-more', activeQuestion.id);
  }

  function reopen() {
    toast.info('השאלה נפתחה מחדש');
    onOpenChange(false);
    onAction('reopen', activeQuestion.id);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="start"
        className="flex h-full w-full max-w-none flex-col overflow-y-auto sm:max-w-md"
        aria-describedby="question-detail-description"
      >
        <SheetHeader className="gap-3 text-start">
          <div className="flex flex-wrap items-center gap-2 pe-10">
            <Link href={`/claim/${question.claimId}`} prefetch={false}>
              <Badge variant="outline" className="num font-latin">
                {question.claimId}
              </Badge>
            </Link>
            <Badge
              variant={
                question.urgency === 'urgent' ? 'destructive' : 'secondary'
              }
            >
              {question.urgency === 'urgent' ? 'דחוף' : 'רגיל'}
            </Badge>
            <Badge variant={statusVariant[question.status]}>
              {statusLabel[question.status]}
            </Badge>
          </div>
          <div className="space-y-1">
            <SheetTitle>פרטי שאלת הבהרה</SheetTitle>
            <SheetDescription id="question-detail-description">
              פעילות מלאה, תשובת מבוטח והקשר חקירתי
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 py-6">
          <PanelSection label="השאלה המקורית">
            <p className="text-sm leading-7">{question.questionText}</p>
          </PanelSection>

          <PanelSection label="מה הוביל לשאלה">
            <p className="text-sm leading-7 text-muted-foreground">
              {question.context}
            </p>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              onClick={() => toast.info('מעבר לממצא יתווסף בחיבור הנתונים')}
            >
              מעבר לממצא
            </Button>
          </PanelSection>

          {question.status === 'answered' || question.status === 'closed' ? (
            <PanelSection label="תשובת המבוטח">
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                <p className="text-sm leading-7">{question.answerText}</p>
                <p className="num font-latin text-xs text-muted-foreground">
                  {formatDateTime(question.answeredAt ?? question.sentAt)}
                </p>
                {question.attachments?.length ? (
                  <ul className="grid gap-2">
                    {question.attachments.map((attachment) => (
                      <li
                        key={attachment}
                        className="flex items-center gap-2 text-sm"
                      >
                        <FileText
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="ltr-isolate font-latin">
                          {attachment}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </PanelSection>
          ) : null}

          <PanelSection label="פעילות">
            <ol className="space-y-3">
              {question.activityLog.map((entry) => (
                <li key={`${question.id}-${entry.at}-${entry.action}`}>
                  <div className="flex gap-3 rounded-md border p-3">
                    <div className="mt-1 rounded-full bg-muted p-1.5 text-muted-foreground">
                      <History className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium">{entry.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.actor}
                        <span className="num font-latin">
                          {' '}
                          · {formatDateTime(entry.at)}
                        </span>
                      </p>
                      {entry.details ? (
                        <p className="text-xs leading-5 text-muted-foreground">
                          {entry.details}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </PanelSection>

          {composerOpen ? (
            <PanelSection label="בקשת הבהרה נוספת">
              <textarea
                value={composerText}
                onChange={(event) => setComposerText(event.target.value)}
                className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="כתוב בקשה נוספת למבוטח"
                aria-label="בקשת הבהרה נוספת בפאנל"
              />
            </PanelSection>
          ) : null}
        </div>

        <SheetFooter className="border-t pt-4">
          {question.status === 'pending' ? (
            <Button type="button" variant="secondary" onClick={sendReminder}>
              <Send className="h-4 w-4" aria-hidden="true" />
              שלח תזכורת
            </Button>
          ) : null}
          {question.status === 'answered' ? (
            <>
              <Button type="button" onClick={approve}>
                <Check className="h-4 w-4" aria-hidden="true" />
                אישור
              </Button>
              {composerOpen ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={submitComposer}
                  disabled={composerText.trim().length === 0}
                >
                  שליחת בקשה
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setComposerOpen(true)}
                >
                  <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                  בקשת הבהרה נוספת
                </Button>
              )}
            </>
          ) : null}
          {question.status === 'closed' ? (
            <Button type="button" variant="secondary" onClick={reopen}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              פתיחה מחדש
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function PanelSection({
  label,
  children,
}: Readonly<{
  label: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{label}</h3>
      {children}
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
