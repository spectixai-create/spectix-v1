'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';

import { FormActions } from '@/components/intake/form-actions';
import { SectionClaimant } from '@/components/intake/section-claimant';
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

export function IntakeForm({
  initialDemoState,
}: Readonly<{
  initialDemoState?: IntakeDemoState;
}>) {
  const form = useForm<IntakeFormValues>({
    defaultValues: defaultIntakeValues,
    mode: 'onSubmit',
  });
  const [status, setStatus] = React.useState<IntakeFormStatus>('idle');
  const [files, setFiles] = React.useState<MockUploadedFile[]>([]);
  const submitTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  React.useEffect(() => {
    setStatus(initialDemoState ?? 'idle');
  }, [initialDemoState]);

  React.useEffect(() => {
    return () => {
      if (submitTimerRef.current) {
        clearTimeout(submitTimerRef.current);
      }
    };
  }, []);

  function handleSubmit() {
    if (status === 'submitting') {
      return;
    }

    setStatus('submitting');
    submitTimerRef.current = setTimeout(() => {
      setStatus('success');
    }, 1500);
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
    return <SuccessPanel />;
  }

  return (
    <div className="space-y-5">
      {status === 'error' ? (
        <ErrorPanel onRetry={() => setStatus('idle')} />
      ) : null}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Form {...form}>
            <form
              className="space-y-8"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <SectionClaimant control={form.control} />
              <SectionIncident control={form.control} watch={form.watch} />
              <SectionTripContext control={form.control} />
              <SectionDocuments
                files={files}
                onAdd={handleAddFiles}
                onRemove={handleRemoveFile}
              />
              <FormActions submitting={status === 'submitting'} />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
