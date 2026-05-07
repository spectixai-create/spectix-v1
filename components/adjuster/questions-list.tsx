'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { RotateCcw, Send } from 'lucide-react';

import type { BriefQuestion } from '@/lib/adjuster/types';
import {
  buildRequestInfoBody,
  getDefaultSelectedQuestionIds,
  getQuestionDispatchStatusText,
  isQuestionSelectable,
} from '@/lib/adjuster/question-selection';
import { EMPTY_STATES } from '@/lib/ui/strings-he';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ManualMagicLinkShare } from '@/components/adjuster/manual-magic-link-share';

export function QuestionsList({
  claimId,
  claimContact,
  questions,
}: Readonly<{
  claimId: string;
  claimContact?: {
    claimantEmail: string | null;
    claimantPhone: string | null;
  };
  questions: BriefQuestion[];
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const defaultSelected = useMemo(
    () => getDefaultSelectedQuestionIds(questions),
    [questions],
  );
  const [selected, setSelected] = useState(defaultSelected);
  const [message, setMessage] = useState<string | null>(null);
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null);
  const [contactStatus, setContactStatus] = useState<{
    claimant_email: string | null;
    claimant_phone: string | null;
    missing_both: boolean;
  } | null>(null);
  const initialContactStatus = useMemo(() => {
    const claimant_email = (claimContact?.claimantEmail ?? '').trim() || null;
    const claimant_phone = (claimContact?.claimantPhone ?? '').trim() || null;

    return {
      claimant_email,
      claimant_phone,
      missing_both: !claimant_email && !claimant_phone,
    };
  }, [claimContact?.claimantEmail, claimContact?.claimantPhone]);
  const displayedContactStatus = contactStatus ?? initialContactStatus;

  function toggle(questionId: string) {
    setSelected((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  }

  function sendSelected() {
    setMessage(null);
    setMagicLinkUrl(null);
    startTransition(async () => {
      const response = await fetch(
        `/api/claims/${claimId}/dispatch-questions`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(buildRequestInfoBody(selected)),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setMessage(payload?.error?.message ?? 'שליחת השאלות נכשלה');
        return;
      }

      const payload = (await response.json()) as {
        data?: {
          magic_link_url?: string;
          contact_status?: {
            claimant_email: string | null;
            claimant_phone: string | null;
            missing_both: boolean;
          };
        };
      };
      setMagicLinkUrl(payload.data?.magic_link_url ?? null);
      setContactStatus(payload.data?.contact_status ?? null);
      setMessage('נוצר קישור לשיתוף ידני עם המבוטח');
      router.refresh();
    });
  }

  function regenerateLink() {
    setMessage(null);
    setMagicLinkUrl(null);
    startTransition(async () => {
      const response = await fetch(`/api/claims/${claimId}/regenerate-link`, {
        method: 'POST',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setMessage(payload?.error?.message ?? 'חידוש הקישור נכשל');
        return;
      }

      const payload = (await response.json()) as {
        data?: { magic_link_url?: string };
      };
      setMagicLinkUrl(payload.data?.magic_link_url ?? null);
      setMessage('נוצר קישור חדש');
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">שאלות להשלמה</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {EMPTY_STATES.questions}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              התראות אוטומטיות עדיין אינן פעילות. לאחר שליחה יש להעתיק את הקישור
              ולשתף אותו ידנית עם המבוטח.
            </div>
            {questions.map((question) => (
              <label
                key={question.id}
                className={
                  question.dispatch
                    ? 'block rounded-md border bg-muted/50 p-3 text-muted-foreground'
                    : 'block rounded-md border p-3'
                }
              >
                <span className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={selected.includes(question.id)}
                    onChange={() => toggle(question.id)}
                    disabled={!isQuestionSelectable(question)}
                  />
                  <span>
                    <span className="block font-medium">{question.text}</span>
                    <span className="text-sm text-muted-foreground">
                      {getQuestionDispatchStatusText(question)}
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="gap-2"
            disabled={isPending || selected.length === 0}
            onClick={sendSelected}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            יצירת קישור לשאלות מסומנות
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={isPending}
            onClick={regenerateLink}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            חידוש קישור
          </Button>
        </div>
        {displayedContactStatus ? (
          <div
            className={
              displayedContactStatus.missing_both
                ? 'rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900'
                : 'rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700'
            }
          >
            {displayedContactStatus.missing_both
              ? 'אין פרטי קשר בתיק. יש לשתף את הקישור ידנית בטלפון.'
              : `התראות לא פעילות. שתף ידנית באמצעות ${
                  displayedContactStatus.claimant_email ??
                  displayedContactStatus.claimant_phone
                }.`}
          </div>
        ) : null}
        {magicLinkUrl ? (
          <ManualMagicLinkShare magicLinkUrl={magicLinkUrl} />
        ) : null}
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
