import { inngest } from '../client';
import {
  ClassifierLLMError,
  ClassifierPreCallError,
  classifyDocumentFromStorage,
  type ClassifyDocumentResult,
} from '@/lib/llm/classify-document';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  DocumentProcessFailedEvent,
  DocumentProcessedEvent,
  DocumentUploadedEvent,
  DocumentType,
} from '@/lib/types';

export const SYSTEM_ACTOR_ID = 'inngest:process-document';
export const CLASSIFIER_PRECALL_SENTINEL = 'classifier:pre-call-failure';
export const CLASSIFIER_WRAPPER_SENTINEL = 'classifier:wrapper-error';

export const PROCESS_DOCUMENT_CONFIG = {
  id: 'process-document',
  retries: 3,
  concurrency: { limit: 5, key: 'event.data.claimId' },
} as const;

type LoggerLike = {
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
};

type StepLike = {
  run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
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

type FailureCategory = 'forced' | 'pre_call' | 'llm_call';

type ProcessDocumentArgs = {
  event: DocumentUploadedEvent;
  step: StepLike;
  logger: LoggerLike;
  supabaseAdmin?: SupabaseLike;
  classifier?: typeof classifyDocumentFromStorage;
};

export async function runProcessDocument({
  event,
  step,
  logger,
  supabaseAdmin = createAdminClient(),
  classifier = classifyDocumentFromStorage,
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
      actor_id: SYSTEM_ACTOR_ID,
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
  const envForceFailure = process.env.SPECTIX_FORCE_DOCUMENT_FAILURE === 'true';
  const fileNameTriggersFailure = (claimed.file_name ?? '').includes('[FAIL]');
  const isForcedFailure = envForceFailure || fileNameTriggersFailure;

  let classifierResult: ClassifyDocumentResult | null = null;
  let failureReason: string | null = null;
  let failureCategory: FailureCategory | null = null;

  if (isForcedFailure) {
    failureReason = envForceFailure
      ? 'forced_via_env_var'
      : 'forced_via_filename';
    failureCategory = 'forced';
  } else {
    try {
      classifierResult = (await step.run('claude-classify', async () =>
        classifier({
          documentId: claimed.id,
          fileName: claimed.file_name ?? 'unknown',
        }),
      )) as ClassifyDocumentResult;
    } catch (error) {
      failureReason = error instanceof Error ? error.message : String(error);
      failureCategory =
        error instanceof ClassifierPreCallError ? 'pre_call' : 'llm_call';
    }
  }

  if (failureCategory === null || failureCategory === 'llm_call') {
    await step.run('upsert-pass-1', async () => {
      const { error } = await supabaseAdmin.rpc('upsert_pass_increment', {
        p_claim_id: claimId,
        p_pass_number: 1,
        p_calls_increment: classifierResult ? 1 : 0,
        p_cost_increment: classifierResult?.costUsd ?? 0,
      });

      if (error) {
        throw new Error(`upsert_pass_increment failed: ${error.message}`);
      }
    });
  }

  if (failureReason !== null) {
    const auditActor = getFailureAuditActor(failureCategory, classifierResult);
    const finalizeOutcome = (await step.run('finalize-failed', async () => {
      const processingTimeMs = Date.now() - startTime;
      const { data, error } = await supabaseAdmin
        .from('documents')
        .update({
          processing_status: 'failed',
          extracted_data: {
            spike: '03c',
            error: failureReason,
            processing_time_ms: processingTimeMs,
            failure_category: failureCategory,
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

        return { transitioned: false };
      }

      const { error: auditError } = await supabaseAdmin
        .from('audit_log')
        .insert({
          claim_id: claimId,
          actor_type: auditActor.actorType,
          actor_id: auditActor.actorId,
          action: 'document_processing_failed',
          target_table: 'documents',
          target_id: documentId,
          details: {
            error: failureReason,
            failure_category: failureCategory,
            processing_time_ms: processingTimeMs,
            cost_usd: classifierResult?.costUsd ?? 0,
          },
        });

      if (auditError) {
        logger.error('[audit-failure]', { documentId, error: auditError });
      }

      return { transitioned: true };
    })) as { transitioned: boolean };

    if (finalizeOutcome.transitioned) {
      const failedEvent: DocumentProcessFailedEvent = {
        name: 'claim/document.process_failed',
        data: { claimId, documentId, error: failureReason },
      };
      await step.sendEvent('emit-process-failed', failedEvent);
    }

    return {
      status: 'failed',
      documentId,
      transitioned: finalizeOutcome.transitioned,
    };
  }

  if (!classifierResult) {
    throw new Error('classifierResult unexpectedly null in happy path');
  }

  const finalizeOutcome = (await step.run('finalize-processed', async () => {
    const processingTimeMs = Date.now() - startTime;
    const { data, error } = await supabaseAdmin
      .from('documents')
      .update({
        processing_status: 'processed',
        document_type: classifierResult.documentType,
        extracted_data: {
          spike: '03c',
          classifier: {
            document_type: classifierResult.documentType,
            confidence: classifierResult.confidence,
            reasoning: classifierResult.reasoning,
          },
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

      return { transitioned: false };
    }

    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
      claim_id: claimId,
      actor_type: 'llm',
      actor_id: classifierResult.modelId,
      action: 'document_processing_completed',
      target_table: 'documents',
      target_id: documentId,
      details: {
        document_type: classifierResult.documentType,
        confidence: classifierResult.confidence,
        processing_time_ms: processingTimeMs,
        cost_usd: classifierResult.costUsd,
        input_tokens: classifierResult.inputTokens,
        output_tokens: classifierResult.outputTokens,
      },
    });

    if (auditError) {
      logger.error('[audit-failure]', { documentId, error: auditError });
    }

    return { transitioned: true };
  })) as { transitioned: boolean };

  if (finalizeOutcome.transitioned) {
    const processedEvent: DocumentProcessedEvent = {
      name: 'claim/document.processed',
      data: {
        claimId,
        documentId,
        documentType: classifierResult.documentType,
      },
    };
    await step.sendEvent('emit-processed', processedEvent);
  }

  return {
    status: 'processed',
    documentId,
    transitioned: finalizeOutcome.transitioned,
  };
}

function getFailureAuditActor(
  failureCategory: FailureCategory | null,
  classifierResult: ClassifyDocumentResult | null,
): { actorType: 'system' | 'llm'; actorId: string } {
  if (failureCategory === 'forced') {
    return { actorType: 'system', actorId: SYSTEM_ACTOR_ID };
  }

  if (failureCategory === 'pre_call') {
    return { actorType: 'system', actorId: CLASSIFIER_PRECALL_SENTINEL };
  }

  return {
    actorType: 'llm',
    actorId: classifierResult?.modelId ?? CLASSIFIER_WRAPPER_SENTINEL,
  };
}

export const processDocument = inngest.createFunction(
  PROCESS_DOCUMENT_CONFIG,
  { event: 'claim/document.uploaded' },
  async ({ event, step, logger }) =>
    runProcessDocument({
      event: event as DocumentUploadedEvent,
      step: step as unknown as StepLike,
      logger,
    }),
);
