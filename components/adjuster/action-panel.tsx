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
  buildDefaultRejectionCustomerMessage,
  canApprove,
  canEscalate,
  canReject,
  canRequestInfo,
} from '@/lib/adjuster/service';
import type { ClaimDetailSnapshot } from '@/lib/adjuster/types';
import { ADJUSTER_ACTIONS } from '@/lib/ui/strings-he';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ManualMagicLinkShare } from '@/components/adjuster/manual-magic-link-share';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function ActionPanel({
  snapshot,
}: Readonly<{
  snapshot: ClaimDetailSnapshot;
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [policyClause, setPolicyClause] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [customerMessageTouched, setCustomerMessageTouched] = useState(false);
  const { claim } = snapshot;
  const selectedQuestionIds = useMemo(
    () =>
      snapshot.questions
        .filter((question) => !question.dispatch)
        .map((question) => question.id),
    [snapshot.questions],
  );

  function buildRejectionMessage(reason: string, clause: string) {
    return buildDefaultRejectionCustomerMessage({
      customerName: claim.claimantName ?? claim.insuredName,
      claimNumber: claim.claimNumber,
      rejectionReason: reason,
      policyClause: clause,
    });
  }

  function updateRejectionReason(value: string) {
    setRejectionReason(value);
    if (!customerMessageTouched) {
      setCustomerMessage(buildRejectionMessage(value, policyClause));
    }
  }

  function updatePolicyClause(value: string) {
    setPolicyClause(value);
    if (!customerMessageTouched) {
      setCustomerMessage(buildRejectionMessage(rejectionReason, value));
    }
  }

  function openRejectionDialog() {
    setMessage(null);
    setRejectionReason('');
    setPolicyClause('');
    setCustomerMessage(buildRejectionMessage('', ''));
    setCustomerMessageTouched(false);
    setRejectionDialogOpen(true);
  }

  function runAction(path: string, body?: unknown) {
    setMessage(null);
    setMagicLinkUrl(null);
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

      const payload = (await response.json().catch(() => null)) as {
        data?: {
          magic_link_url?: string;
          notification_attempted?: boolean;
          contact_status?: { claimant_email?: string | null };
        };
      } | null;
      setMagicLinkUrl(payload?.data?.magic_link_url ?? null);
      if (path === 'reject') {
        setRejectionDialogOpen(false);
        setRejectionReason('');
        setPolicyClause('');
        setCustomerMessage('');
        setCustomerMessageTouched(false);
      }
      router.refresh();
      setMessage(
        payload?.data?.notification_attempted &&
          payload.data.contact_status?.claimant_email
          ? `נרשמה בקשת שליחת אימייל ל-${payload.data.contact_status.claimant_email}. הקישור זמין גם לשיתוף ידני.`
          : payload?.data?.magic_link_url
            ? 'נוצר קישור לשיתוף ידני עם המבוטח'
            : 'הפעולה בוצעה',
      );
    });
  }

  const actionsDisabled = isPending || claim.status === 'rejected_no_coverage';
  const rejectionDisabled =
    actionsDisabled ||
    !canReject(claim.status) ||
    !rejectionReason.trim() ||
    !policyClause.trim() ||
    !customerMessage.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">פעולות מתאם</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" dir="rtl">
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
              runAction('dispatch-questions', {
                question_ids: selectedQuestionIds,
              })
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

        <div className="flex justify-end" dir="rtl">
          <Button
            type="button"
            variant="destructive"
            className="gap-2"
            disabled={actionsDisabled || !canReject(claim.status)}
            onClick={openRejectionDialog}
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            {ADJUSTER_ACTIONS.reject}
          </Button>
        </div>

        <Dialog
          open={rejectionDialogOpen}
          onOpenChange={setRejectionDialogOpen}
        >
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>דחיית תביעה</DialogTitle>
              <DialogDescription>
                דחייה מחייבת נימוק, בסיס פוליסה ונוסח הודעה ללקוח לפני עדכון
                הסטטוס.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium">סיבת דחייה</span>
                <Textarea
                  value={rejectionReason}
                  onChange={(event) =>
                    updateRejectionReason(event.target.value)
                  }
                  maxLength={500}
                  aria-label="סיבת דחייה"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  סעיף/חריג רלוונטי בפוליסה
                </span>
                <Input
                  value={policyClause}
                  onChange={(event) => updatePolicyClause(event.target.value)}
                  maxLength={500}
                  aria-label="סעיף או חריג רלוונטי בפוליסה"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">נוסח הודעה ללקוח</span>
                <Textarea
                  value={customerMessage}
                  onChange={(event) => {
                    setCustomerMessageTouched(true);
                    setCustomerMessage(event.target.value);
                  }}
                  maxLength={2500}
                  rows={8}
                  aria-label="נוסח הודעה ללקוח"
                />
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectionDialogOpen(false)}
                disabled={isPending}
              >
                ביטול
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="gap-2"
                disabled={rejectionDisabled}
                onClick={() =>
                  runAction('reject', {
                    reason: rejectionReason,
                    policy_clause: policyClause,
                    customer_message: customerMessage,
                  })
                }
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                אישור דחייה ושליחה ללקוח
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {message ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Send className="h-4 w-4" aria-hidden="true" />
            {message}
          </p>
        ) : null}
        {magicLinkUrl ? (
          <ManualMagicLinkShare
            magicLinkUrl={magicLinkUrl}
            copyButtonLabel="העתקת קישור"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
