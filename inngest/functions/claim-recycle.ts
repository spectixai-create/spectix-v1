import { inngest } from '../client';
import { handleClaimScopedFunctionFailure } from './claim-failure';

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  ClaimResponsesSubmittedEvent,
  ClaimValidationRequestedEvent,
  DocumentUploadedEvent,
} from '@/lib/types';

export const CLAIM_RECYCLE_CONFIG = {
  id: 'claim-recycle',
  retries: 3,
  concurrency: { limit: 1, key: 'event.data.claimId' },
} as const;

type StepEvent = ClaimValidationRequestedEvent | DocumentUploadedEvent;

type StepLike = {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  sendEvent: (name: string, payload: StepEvent) => Promise<unknown>;
};

type SupabaseLike = ReturnType<typeof createAdminClient>;

export async function runClaimRecycle({
  event,
  step,
  supabaseAdmin = createAdminClient(),
}: {
  event: ClaimResponsesSubmittedEvent;
  step: StepLike;
  supabaseAdmin?: SupabaseLike;
}) {
  const { claimId } = event.data;

  const newDocumentIds = await step.run('load-response-documents', async () => {
    const requested = event.data.newDocumentIds ?? [];
    let query = supabaseAdmin
      .from('documents')
      .select('id')
      .eq('claim_id', claimId)
      .not('response_to_question_id', 'is', null)
      .eq('processing_status', 'pending');

    if (requested.length > 0) {
      query = query.in('id', requested);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? [])
      .map((row) => String((row as { id: string }).id))
      .filter(Boolean);
  });

  if (newDocumentIds.length === 0) {
    const validationRequested: ClaimValidationRequestedEvent = {
      name: 'claim/validation.requested',
      data: {
        claimId,
        passNumber: 2,
        source: 'claimant_response',
      },
    };

    await step.sendEvent(
      'request-validation-without-documents',
      validationRequested,
    );

    return {
      status: 'validation_requested',
      claimId,
      newDocumentCount: 0,
    };
  }

  await step.run('reopen-extraction-pass-for-response-documents', async () => {
    const { error } = await supabaseAdmin.rpc(
      'reopen_pass_for_document_processing',
      {
        p_claim_id: claimId,
        p_pass_number: 1,
        p_reason: 'claimant_response_documents',
        p_document_id: newDocumentIds[0] ?? null,
      },
    );

    if (error) throw error;
  });

  await Promise.all(
    newDocumentIds.map((documentId) => {
      const documentUploaded: DocumentUploadedEvent = {
        name: 'claim/document.uploaded',
        data: { claimId, documentId },
      };

      return step.sendEvent(
        `extract-response-document-${documentId}`,
        documentUploaded,
      );
    }),
  );

  return {
    status: 'document_extraction_requested',
    claimId,
    newDocumentCount: newDocumentIds.length,
  };
}

export const claimRecycleFunction = inngest.createFunction(
  {
    ...CLAIM_RECYCLE_CONFIG,
    onFailure: async ({ event, error, step, logger }) =>
      handleClaimScopedFunctionFailure({
        event,
        error,
        step: step as unknown as {
          run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
        },
        logger,
        functionId: CLAIM_RECYCLE_CONFIG.id,
      }),
  },
  { event: 'claim/responses.submitted' },
  async ({ event, step }) =>
    runClaimRecycle({
      event: event as ClaimResponsesSubmittedEvent,
      step: step as unknown as StepLike,
    }),
);
