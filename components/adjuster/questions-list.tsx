'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Send } from 'lucide-react';

import type { BriefQuestion } from '@/lib/adjuster/types';
import { EMPTY_STATES } from '@/lib/ui/strings-he';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function QuestionsList({
  claimId,
  questions,
}: Readonly<{
  claimId: string;
  questions: BriefQuestion[];
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const defaultSelected = useMemo(
    () =>
      questions
        .filter((question) => !question.dispatch)
        .map((question) => question.id),
    [questions],
  );
  const [selected, setSelected] = useState(defaultSelected);
  const [message, setMessage] = useState<string | null>(null);

  function toggle(questionId: string) {
    setSelected((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  }

  function sendSelected() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/claims/${claimId}/request-info`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question_ids: selected }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setMessage(payload?.error?.message ?? 'שליחת השאלות נכשלה');
        return;
      }

      setMessage('השאלות סומנו לשליחה');
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
                    disabled={Boolean(question.dispatch)}
                  />
                  <span>
                    <span className="block font-medium">{question.text}</span>
                    <span className="text-sm text-muted-foreground">
                      {question.dispatch
                        ? `נשלחה לאחרונה: ${formatDate(
                            question.dispatch.lastDispatchedAt,
                          )}`
                        : 'טרם נשלחה'}
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        <Button
          type="button"
          className="gap-2"
          disabled={isPending || selected.length === 0}
          onClick={sendSelected}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          שליחת שאלות מסומנות
        </Button>
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
