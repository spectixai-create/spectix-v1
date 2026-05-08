'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type {
  ClaimantPortalSnapshot,
  ClaimantQuestion,
} from '@/lib/claimant/types';
import {
  convertHeicToJpeg,
  DOCUMENT_UPLOAD_ACCEPT,
  isHeicFile,
} from '@/lib/upload/heic';

type AnswerState = Record<string, Record<string, unknown>>;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function ClaimantResponseForm({
  snapshot,
  token,
}: {
  snapshot: ClaimantPortalSnapshot;
  token: string;
}) {
  const [answers, setAnswers] = useState<AnswerState>(() =>
    Object.fromEntries(
      snapshot.questions.map((question) => [
        question.id,
        initialAnswer(question),
      ]),
    ),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(
    null,
  );
  const [convertingQuestionId, setConvertingQuestionId] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allAnswered = useMemo(
    () =>
      snapshot.questions.length > 0 &&
      snapshot.questions.every((question) =>
        isAnswered(question, answers[question.id]),
      ),
    [answers, snapshot.questions],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void saveAllDrafts();
    }, 900);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  async function saveAllDrafts() {
    setSaveStatus('saving');
    try {
      await Promise.all(
        snapshot.questions.map((question) =>
          fetch(`/api/c/${snapshot.claimId}/draft`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              token,
              question_id: question.id,
              response_value: answers[question.id] ?? {},
            }),
          }).then(async (response) => {
            if (!response.ok) throw new Error(await response.text());
          }),
        ),
      );
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }

  async function uploadDocument(question: ClaimantQuestion, file: File) {
    setUploadingQuestionId(question.id);
    setConvertingQuestionId(null);
    setMessage(null);

    try {
      let uploadFile = file;

      if (isHeicFile(file)) {
        setConvertingQuestionId(question.id);
        uploadFile = await convertHeicToJpeg(file);
      }

      setConvertingQuestionId(null);

      const body = new FormData();
      body.set('token', token);
      body.set('question_id', question.id);
      body.set('file', uploadFile);

      const response = await fetch(`/api/c/${snapshot.claimId}/upload`, {
        method: 'POST',
        body,
      });

      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as {
        data?: {
          document?: { id: string; fileName?: string; file_name?: string };
        };
      };
      const document = payload.data?.document;

      setAnswers((current) => ({
        ...current,
        [question.id]: {
          type: 'document',
          document_id: document?.id,
          file_name:
            document?.fileName ?? document?.file_name ?? uploadFile.name,
        },
      }));
      setMessage('המסמך נשמר');
    } catch {
      setMessage('שמירת המסמך נכשלה');
    } finally {
      setConvertingQuestionId(null);
      setUploadingQuestionId(null);
    }
  }

  function finalize() {
    setMessage(null);
    startTransition(async () => {
      await saveAllDrafts();
      const response = await fetch(`/api/c/${snapshot.claimId}/finalize`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        setMessage('לא ניתן לשלוח כרגע. יש לוודא שכל השאלות מולאו.');
        return;
      }

      window.location.href = `/c/${snapshot.claimId}/done`;
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Spectix</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          השלמת מידע לתביעה
        </h1>
        {snapshot.claimNumber ? (
          <p className="mt-2 text-sm text-slate-600">
            מספר תביעה:{' '}
            <span className="num ltr-isolate">{snapshot.claimNumber}</span>
          </p>
        ) : null}
      </header>

      <section className="space-y-4">
        {snapshot.questions.map((question, index) => (
          <article
            key={question.id}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">שאלה {index + 1}</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  {question.text}
                </h2>
              </div>
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">
                {answerTypeLabel(question.expectedAnswerType)}
              </span>
            </div>

            <div className="mt-4">
              {renderQuestionControl({
                question,
                value: answers[question.id],
                setValue: (next) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: next,
                  })),
                onUpload: uploadDocument,
                uploadingQuestionId,
                convertingQuestionId,
              })}
            </div>
          </article>
        ))}
      </section>

      <footer className="sticky bottom-0 mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {saveStatus === 'saving'
              ? 'שומר טיוטה...'
              : saveStatus === 'saved'
                ? 'הטיוטה נשמרה'
                : saveStatus === 'error'
                  ? 'שמירת הטיוטה נכשלה'
                  : 'טיוטה תישמר אוטומטית'}
          </p>
          <Button
            type="button"
            onClick={finalize}
            disabled={!allAnswered || isPending}
          >
            {isPending ? 'שולח...' : 'שלח תשובות'}
          </Button>
        </div>
        {message ? (
          <p className="mt-3 text-sm text-slate-700">{message}</p>
        ) : null}
      </footer>
    </div>
  );
}

function renderQuestionControl({
  question,
  value,
  setValue,
  onUpload,
  uploadingQuestionId,
  convertingQuestionId,
}: {
  question: ClaimantQuestion;
  value: Record<string, unknown> | undefined;
  setValue: (value: Record<string, unknown>) => void;
  onUpload: (question: ClaimantQuestion, file: File) => Promise<void>;
  uploadingQuestionId: string | null;
  convertingQuestionId: string | null;
}) {
  if (question.expectedAnswerType === 'confirmation') {
    const current = typeof value?.value === 'string' ? value.value : '';

    return (
      <div className="flex flex-wrap gap-3">
        {[
          ['yes', 'כן'],
          ['no', 'לא'],
        ].map(([option, label]) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-4 py-2"
          >
            <input
              type="radio"
              name={question.id}
              value={option}
              checked={current === option}
              onChange={() => setValue({ type: 'confirmation', value: option })}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.expectedAnswerType === 'document') {
    const fileName =
      typeof value?.file_name === 'string' ? value.file_name : null;

    return (
      <div className="space-y-3">
        <input
          type="file"
          accept={DOCUMENT_UPLOAD_ACCEPT}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onUpload(question, file);
          }}
        />
        <p className="text-sm text-slate-600">
          {convertingQuestionId === question.id
            ? 'ממיר תמונה...'
            : uploadingQuestionId === question.id
              ? 'מעלה מסמך...'
              : fileName
                ? `מסמך נשמר: ${fileName}`
                : 'ניתן להעלות PDF או תמונה עד 4MB'}
        </p>
      </div>
    );
  }

  return (
    <Textarea
      value={typeof value?.value === 'string' ? value.value : ''}
      placeholder={
        question.expectedAnswerType === 'correction'
          ? 'נא להזין את הפרטים המתוקנים'
          : 'נא לכתוב תשובה'
      }
      className="min-h-28"
      onChange={(event) =>
        setValue({
          type: question.expectedAnswerType,
          value: event.target.value,
        })
      }
    />
  );
}

function initialAnswer(question: ClaimantQuestion): Record<string, unknown> {
  return (
    question.draftValue ??
    question.responseValue ?? { type: question.expectedAnswerType }
  );
}

function isAnswered(
  question: ClaimantQuestion,
  answer: Record<string, unknown> | undefined,
): boolean {
  if (!answer) return false;

  if (question.expectedAnswerType === 'document') {
    return (
      typeof answer.document_id === 'string' && answer.document_id.length > 0
    );
  }

  if (question.expectedAnswerType === 'confirmation') {
    return answer.value === 'yes' || answer.value === 'no';
  }

  return typeof answer.value === 'string' && answer.value.trim().length > 0;
}

function answerTypeLabel(type: ClaimantQuestion['expectedAnswerType']): string {
  switch (type) {
    case 'document':
      return 'מסמך';
    case 'confirmation':
      return 'אישור';
    case 'correction':
      return 'תיקון';
    case 'text':
    default:
      return 'טקסט';
  }
}
