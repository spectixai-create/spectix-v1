'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';

import { FormActions } from '@/components/intake/form-actions';
import { SectionClaimant } from '@/components/intake/section-claimant';
import { SectionConsent } from '@/components/intake/section-consent';
import { SectionDocuments } from '@/components/intake/section-documents';
import { SectionIncident } from '@/components/intake/section-incident';
import { SectionTripContext } from '@/components/intake/section-trip-context';
import { ErrorPanel } from '@/components/intake/states/error-panel';
import { SuccessPanel } from '@/components/intake/states/success-panel';
import {
  defaultIntakeValues,
  type IntakeDemoState,
  type IntakeFormStatus,
  type IntakeFormValues,
  type MockUploadedFile,
} from '@/components/intake/types';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { buildClaimPayload } from '@/lib/intake/build-payload';
import type { Claim } from '@/lib/types';

export function IntakeForm({
  initialDemoState,
}: Readonly<{
  initialDemoState?: IntakeDemoState;
}>) {
  const router = useRouter();
  const form = useForm<IntakeFormValues>({
    defaultValues: defaultIntakeValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const [status, setStatus] = React.useState<IntakeFormStatus>('idle');
  const [files, setFiles] = React.useState<MockUploadedFile[]>([]);
  const [successClaim, setSuccessClaim] = React.useState<Claim | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();
  const [showSlowSubmitHelper, setShowSlowSubmitHelper] = React.useState(false);
  const submittingRef = React.useRef(false);
  const tosAccepted = form.watch('tosAccepted');

  React.useEffect(() => {
    setStatus(initialDemoState ?? 'idle');
  }, [initialDemoState]);

  React.useEffect(() => {
    return () => setShowSlowSubmitHelper(false);
  }, []);

  async function handleSubmit(values: IntakeFormValues) {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setStatus('submitting');
    setErrorMessage(undefined);

    const helperTextTimer = setTimeout(() => {
      setShowSlowSubmitHelper(true);
    }, 3000);

    try {
      const payload = buildClaimPayload(values);
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        data?: { claim?: Claim };
        error?: { code?: string };
      };

      if (response.ok && json.ok) {
        setSuccessClaim(json.data?.claim ?? null);
        setStatus('success');
        router.replace('/new', { scroll: false });
      } else {
        setErrorMessage(mapErrorCodeToHebrew(json.error?.code ?? 'unknown'));
        setStatus('error');
      }
    } catch (error) {
      console.error('[intake-submit-failed]', error);
      setErrorMessage('אירעה שגיאה. נסה שוב או צור קשר עם השירות.');
      setStatus('error');
    } finally {
      clearTimeout(helperTextTimer);
      setShowSlowSubmitHelper(false);
      submittingRef.current = false;
    }
  }

  function handleAddFiles(nextFiles: File[]) {
    setFiles((currentFiles) => [
      ...currentFiles,
      ...nextFiles.slice(0, 20 - currentFiles.length).map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        name: file.name,
        sizeBytes: file.size,
        type: file.type,
      })),
    ]);
  }

  function handleRemoveFile(id: string) {
    setFiles((currentFiles) => currentFiles.filter((file) => file.id !== id));
  }

  if (status === 'success') {
    return <SuccessPanel claim={successClaim ?? undefined} />;
  }

  return (
    <div className="space-y-5">
      {status === 'error' ? (
        <ErrorPanel
          description={errorMessage}
          onRetry={() => setStatus('idle')}
        />
      ) : null}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Form {...form}>
            <form
              className="space-y-8"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <SectionClaimant control={form.control} />
              <SectionTripContext control={form.control} watch={form.watch} />
              <SectionIncident
                control={form.control}
                watch={form.watch}
                setValue={form.setValue}
              />
              <SectionDocuments
                files={files}
                onAdd={handleAddFiles}
                onRemove={handleRemoveFile}
              />
              <SectionConsent control={form.control} />
              <FormActions
                submitting={status === 'submitting'}
                canSubmit={tosAccepted}
              />
              {status === 'submitting' && showSlowSubmitHelper ? (
                <p className="text-sm text-muted-foreground">
                  ההגשה ממשיכה — אנא המתן
                </p>
              ) : null}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function mapErrorCodeToHebrew(code: string): string {
  switch (code) {
    case 'invalid_json':
      return 'שגיאה בנתוני הטופס';
    case 'validation_failed':
      return 'פרטי הטופס שגויים — בדוק ונסה שוב';
    case 'db_error':
      return 'התחברות נכשלה. נסה שוב בעוד מספר רגעים.';
    case 'claim_number_generation_failed':
    case 'claim_number_collision':
      return 'לא ניתן ליצור מספר תיק כעת. נסה שוב.';
    default:
      return 'אירעה שגיאה. נסה שוב או צור קשר עם השירות.';
  }
}
