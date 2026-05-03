import { inngest } from '../client';
import {
  ClassifierLLMError,
  ClassifierPreCallError,
  classifyDocumentFromStorage,
  type ClassifyDocumentResult,
} from '@/lib/llm/classify-document';
import { DEFAULT_MODEL } from '@/lib/llm/client';
import {
  SUBTYPE_DETERMINISTIC_ACTOR_ID,
  SUBTYPE_PRECALL_SENTINEL,
  SubtypeClassifierPreCallError,
  classifySubtypeFromStorage,
  type ClassifySubtypeResult,
} from '@/lib/llm/classify-subtype';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  DocumentProcessFailedEvent,
  DocumentProcessedEvent,
  DocumentSubtypeClassifiedEvent,
  DocumentUploadedEvent,
  DocumentType,
} from '@/lib/types';

export const SYSTEM_ACTOR_ID = 'inngest:process-document';
export const CLASSIFIER_PRECALL_SENTINEL = 'classifier:pre-call-failure';

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

type StepEvent =
  | DocumentProcessedEvent
  | DocumentProcessFailedEvent
  | DocumentSubtypeClassifiedEvent;

type StepLike = {
  run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
  sendEvent: (name: string, payload: StepEvent) => Promise<unknown>;
};

type SupabaseLike = ReturnType<typeof createAdminClient>;

type ClaimedDocument = {
  id: string;
  file_name: string | null;
  claim_id: string;
  document_type: DocumentType;
};

type FailureCategory = 'forced' | 'pre_call' | 'llm_call';
type FailurePhase = 'broad' | 'subtype';

type ProcessDocumentArgs = {
  event: DocumentUploadedEvent;
  step: StepLike;
  logger: LoggerLike;
  supabaseAdmin?: SupabaseLike;
  classifier?: typeof classifyDocumentFromStorage;
  subtypeClassifier?: typeof classifySubtypeFromStorage;
};

type FailureAuditActor = {
  actorType: 'system' | 'llm';
  actorId: string;
};

export async function runProcessDocument({
  event,
  step,
  logger,
  supabaseAdmin = createAdminClient(),
  classifier = classifyDocumentFromStorage,
  subtypeClassifier = classifySubtypeFromStorage,
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
  let subtypeResult: ClassifySubtypeResult | null = null;
  let failureReason: string | null = null;
  let failureCategory: FailureCategory | null = null;
  let failurePhase: FailurePhase = 'broad';

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
      failurePhase = 'broad';
    }
  }

  if (classifierResult || failureCategory === 'llm_call') {
    await step.run('upsert-pass-broad-cost', async () => {
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

  if (classifierResult && failureReason === null) {
    try {
      subtypeResult = (await step.run('claude-classify-subtype', async () =>
        subtypeClassifier({
          documentId: claimed.id,
          fileName: claimed.file_name ?? 'unknown',
          broad: classifierResult.documentType,
        }),
      )) as ClassifySubtypeResult;
    } catch (error) {
      failureReason = error instanceof Error ? error.message : String(error);
      failureCategory =
        error instanceof SubtypeClassifierPreCallError
          ? 'pre_call'
          : 'llm_call';
      failurePhase = 'subtype';
    }
  }

  if (subtypeResult && !subtypeResult.skipped) {
    await step.run('upsert-pass-subtype-cost', async () => {
      const { error } = await supabaseAdmin.rpc('upsert_pass_increment', {
        p_claim_id: claimId,
        p_pass_number: 1,
        p_calls_increment: 1,
        p_cost_increment: subtypeResult.costUsd,
      });

      if (error) {
        throw new Error(`upsert_pass_increment failed: ${error.message}`);
      }
    });
  }

  if (failureReason !== null && failureCategory !== null) {
    const auditActor = getFailureAuditActor(
      failureCategory,
      failurePhase,
      classifierResult,
    );
    const finalizeOutcome = (await step.run('finalize-failed', async () => {
      const processingTimeMs = Date.now() - startTime;
      const { data, error } = await supabaseAdmin
        .from('documents')
        .update({
          processing_status: 'failed',
          extracted_data: {
            spike: '03d-1a',
            error: failureReason,
            processing_time_ms: processingTimeMs,
            failure_category: failureCategory,
            failure_phase: failurePhase,
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
            failure_phase: failurePhase,
            processing_time_ms: processingTimeMs,
            cost_usd:
              (classifierResult?.costUsd ?? 0) + (subtypeResult?.costUsd ?? 0),
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

  if (!classifierResult || !subtypeResult) {
    throw new Error('classification results unexpectedly null in happy path');
  }

  const finalizeOutcome = (await step.run('finalize-processed', async () => {
    const processingTimeMs = Date.now() - startTime;
    const { data, error } = await supabaseAdmin
      .from('documents')
      .update({
        processing_status: 'processed',
        document_type: classifierResult.documentType,
        document_subtype: subtypeResult.documentSubtype,
        extracted_data: {
          spike: '03d-1a',
          classifier: {
            document_type: classifierResult.documentType,
            confidence: classifierResult.confidence,
            reasoning: classifierResult.reasoning,
          },
          subtype_classifier: {
            document_subtype: subtypeResult.documentSubtype,
            confidence: subtypeResult.confidence,
            reasoning: subtypeResult.reasoning,
            skipped: subtypeResult.skipped,
            llm_returned_raw: subtypeResult.llmReturnedRaw,
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

    const { error: broadAuditError } = await supabaseAdmin
      .from('audit_log')
      .insert({
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

    if (broadAuditError) {
      logger.error('[audit-failure]', { documentId, error: broadAuditError });
    }

    const subtypeActorType = subtypeResult.skipped ? 'system' : 'llm';
    const subtypeActorId = subtypeResult.skipped
      ? SUBTYPE_DETERMINISTIC_ACTOR_ID
      : subtypeResult.modelId;
    const { error: subtypeAuditError } = await supabaseAdmin
      .from('audit_log')
      .insert({
        claim_id: claimId,
        actor_type: subtypeActorType,
        actor_id: subtypeActorId,
        action: 'document_subtype_classification_completed',
        target_table: 'documents',
        target_id: documentId,
        details: {
          document_type: classifierResult.documentType,
          document_subtype: subtypeResult.documentSubtype,
          confidence: subtypeResult.confidence,
          skipped: subtypeResult.skipped,
          llm_returned_invalid_subtype:
            subtypeResult.documentSubtype === null
              ? subtypeResult.llmReturnedRaw
              : null,
          cost_usd: subtypeResult.costUsd,
          input_tokens: subtypeResult.inputTokens,
          output_tokens: subtypeResult.outputTokens,
        },
      });

    if (subtypeAuditError) {
      logger.error('[audit-failure]', { documentId, error: subtypeAuditError });
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

    if (subtypeResult.documentSubtype !== null) {
      const subtypeEvent: DocumentSubtypeClassifiedEvent = {
        name: 'claim/document.subtype_classified',
        data: {
          claimId,
          documentId,
          documentType: classifierResult.documentType,
          documentSubtype: subtypeResult.documentSubtype,
        },
      };
      await step.sendEvent('emit-subtype-classified', subtypeEvent);
    }
  }

  return {
    status: 'processed',
    documentId,
    transitioned: finalizeOutcome.transitioned,
  };
}

function getFailureAuditActor(
  failureCategory: FailureCategory,
  failurePhase: FailurePhase,
  classifierResult: ClassifyDocumentResult | null,
): FailureAuditActor {
  if (failureCategory === 'forced') {
    return { actorType: 'system', actorId: SYSTEM_ACTOR_ID };
  }

  if (failureCategory === 'pre_call') {
    if (failurePhase === 'subtype') {
      return { actorType: 'system', actorId: SUBTYPE_PRECALL_SENTINEL };
    }

    return { actorType: 'system', actorId: CLASSIFIER_PRECALL_SENTINEL };
  }

  if (failurePhase === 'broad') {
    return {
      actorType: 'llm',
      actorId: classifierResult?.modelId ?? DEFAULT_MODEL,
    };
  }

  return { actorType: 'llm', actorId: DEFAULT_MODEL };
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
