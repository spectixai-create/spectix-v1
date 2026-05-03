import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  DocumentProcessFailedEvent,
  DocumentProcessedEvent,
  DocumentUploadedEvent,
  DocumentType,
} from '@/lib/types';

type LoggerLike = {
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
};

type StepLike = {
  run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
  sleep: (name: string, duration: string) => Promise<void>;
  sendEvent: (
    name: string,
    payload: DocumentProcessedEvent | DocumentProcessFailedEvent,
  ) => Promise<unknown>;
};

type SupabaseLike = ReturnType<typeof createAdminClient>;

type ClaimedDocument = {
  id: string;
  file_name: string | null;
  claim_id: string;
  document_type: DocumentType;
};

type ProcessDocumentArgs = {
  event: DocumentUploadedEvent;
  step: StepLike;
  logger: LoggerLike;
  supabaseAdmin?: SupabaseLike;
};

export async function runProcessDocument({
  event,
  step,
  logger,
  supabaseAdmin = createAdminClient(),
}: ProcessDocumentArgs) {
  const { documentId, claimId } = event.data;

  const claimed = (await step.run('claim-pending', async () => {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId)
      .eq('processing_status', 'pending')
      .select('id, file_name, claim_id, document_type')
      .maybeSingle();

    if (error) throw error;

    return data as ClaimedDocument | null;
  })) as ClaimedDocument | null;

  if (!claimed) {
    logger.info('[skip] document not in pending state', { documentId });

    return { skipped: true, reason: 'not_pending' };
  }

  await step.run('audit-started', async () => {
    const { error } = await supabaseAdmin.from('audit_log').insert({
      claim_id: claimId,
      actor_type: 'system',
      actor_id: null,
      action: 'document_processing_started',
      target_table: 'documents',
      target_id: documentId,
      details: { trigger: 'inngest', function_id: 'process-document' },
    });

    if (error) {
      logger.error('[audit-failure]', { documentId, error });
    }
  });

  const startTime = Date.now();
  await step.sleep('stub-work', '1s');

  const envForceFailure = process.env.SPECTIX_FORCE_DOCUMENT_FAILURE === 'true';
  const fileNameTriggersFailure = (claimed.file_name ?? '').includes('[FAIL]');
  const shouldFail = envForceFailure || fileNameTriggersFailure;

  if (shouldFail) {
    const failureReason = envForceFailure ? 'env_var' : 'file_name_pattern';

    await step.run('finalize-failed', async () => {
      const processingTimeMs = Date.now() - startTime;
      const { data, error } = await supabaseAdmin
        .from('documents')
        .update({
          processing_status: 'failed',
          extracted_data: {
            stub: true,
            error: 'simulated_failure',
            trigger: failureReason,
            processing_time_ms: processingTimeMs,
          },
        })
        .eq('id', documentId)
        .eq('processing_status', 'processing')
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        logger.warn('[skip-finalize] state changed mid-processing', {
          documentId,
          expected: 'processing',
        });

        return;
      }

      const { error: auditError } = await supabaseAdmin
        .from('audit_log')
        .insert({
          claim_id: claimId,
          actor_type: 'system',
          actor_id: null,
          action: 'document_processing_failed',
          target_table: 'documents',
          target_id: documentId,
          details: {
            error: 'simulated_failure',
            trigger: failureReason,
            processing_time_ms: processingTimeMs,
          },
        });

      if (auditError) {
        logger.error('[audit-failure]', { documentId, error: auditError });
      }
    });

    const failedEvent: DocumentProcessFailedEvent = {
      name: 'claim/document.process_failed',
      data: { claimId, documentId, error: 'simulated_failure' },
    };
    await step.sendEvent('emit-process-failed', failedEvent);

    return { status: 'failed', documentId };
  }

  await step.run('finalize-processed', async () => {
    const processingTimeMs = Date.now() - startTime;
    const { data, error } = await supabaseAdmin
      .from('documents')
      .update({
        processing_status: 'processed',
        extracted_data: { stub: true, processing_time_ms: processingTimeMs },
      })
      .eq('id', documentId)
      .eq('processing_status', 'processing')
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      logger.warn('[skip-finalize] state changed mid-processing', {
        documentId,
        expected: 'processing',
      });

      return;
    }

    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      claim_id: claimId,
      actor_type: 'system',
      actor_id: null,
      action: 'document_processing_completed',
      target_table: 'documents',
      target_id: documentId,
      details: { stub: true, processing_time_ms: processingTimeMs },
    });

    if (auditError) {
      logger.error('[audit-failure]', { documentId, error: auditError });
    }
  });

  const processedEvent: DocumentProcessedEvent = {
    name: 'claim/document.processed',
    data: {
      claimId,
      documentId,
      documentType: claimed.document_type,
    },
  };
  await step.sendEvent('emit-processed', processedEvent);

  return { status: 'processed', documentId };
}

export const processDocument = inngest.createFunction(
  { id: 'process-document', retries: 3 },
  { event: 'claim/document.uploaded' },
  async ({ event, step, logger }) =>
    runProcessDocument({
      event: event as DocumentUploadedEvent,
      step: step as unknown as StepLike,
      logger,
    }),
);
