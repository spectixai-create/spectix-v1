'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  Send,
  ShieldAlert,
  Undo2,
  XCircle,
} from 'lucide-react';

import {
  canApprove,
  canEscalate,
  canReject,
  canRequestInfo,
} from '@/lib/adjuster/service';
import type { ClaimDetailSnapshot } from '@/lib/adjuster/types';
import { ADJUSTER_ACTIONS } from '@/lib/ui/strings-he';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export function ActionPanel({
  snapshot,
}: Readonly<{
  snapshot: ClaimDetailSnapshot;
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const { claim } = snapshot;
  const selectedQuestionIds = useMemo(
    () =>
      snapshot.questions
        .filter((question) => !question.dispatch)
        .map((question) => question.id),
    [snapshot.questions],
  );

  function runAction(path: string, body?: unknown) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/claims/${claim.id}/${path}`, {
        method: 'POST',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setMessage(payload?.error?.message ?? 'הפעולה נכשלה');
        return;
      }

      router.refresh();
      setMessage('הפעולה בוצעה');
    });
  }

  const actionsDisabled = isPending || claim.status === 'rejected_no_coverage';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">פעולות מתאם</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <Button
            type="button"
            className="gap-2"
            disabled={actionsDisabled || !canApprove(claim.status)}
            onClick={() => runAction('approve')}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {ADJUSTER_ACTIONS.approve}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={
              actionsDisabled ||
              !canRequestInfo(claim.status) ||
              selectedQuestionIds.length === 0
            }
            onClick={() =>
              runAction('request-info', { question_ids: selectedQuestionIds })
            }
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            {ADJUSTER_ACTIONS.requestInfo}
          </Button>
          {claim.escalatedToInvestigator ? (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={isPending}
              onClick={() => runAction('unescalate')}
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" />
              {ADJUSTER_ACTIONS.unescalate}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={actionsDisabled || !canEscalate(claim.status)}
              onClick={() => runAction('escalate')}
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              {ADJUSTER_ACTIONS.escalate}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            placeholder="נימוק דחייה"
            aria-label="נימוק דחייה"
          />
          <Button
            type="button"
            variant="destructive"
            className="gap-2"
            disabled={
              actionsDisabled || !canReject(claim.status) || !reason.trim()
            }
            onClick={() => runAction('reject', { reason })}
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            {ADJUSTER_ACTIONS.reject}
          </Button>
        </div>

        {message ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Send className="h-4 w-4" aria-hidden="true" />
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
