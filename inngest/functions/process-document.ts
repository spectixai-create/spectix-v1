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
import {
  extractHotelGenericFromStorage,
  type ExtractHotelGenericResult,
} from '@/lib/llm/extract/extract-hotel-generic';
import {
  extractMedicalFromStorage,
  type ExtractMedicalResult,
} from '@/lib/llm/extract/extract-medical';
import {
  extractPoliceFromStorage,
  type ExtractPoliceResult,
} from '@/lib/llm/extract/extract-police';
import {
  extractReceiptFromStorage,
  type ExtractReceiptResult,
} from '@/lib/llm/extract/extract-receipt';
import {
  routeBySubtype,
  type ExtractionRoute,
} from '@/lib/llm/extract/route-by-subtype';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  DocumentExtractedEvent,
  DocumentExtractionDeferredEvent,
  DocumentExtractionFailedEvent,
  DocumentProcessFailedEvent,
  DocumentProcessedEvent,
  DocumentSubtypeClassifiedEvent,
  DocumentUploadedEvent,
  DocumentType,
  RoutedExtractionData,
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
  | DocumentSubtypeClassifiedEvent
  | DocumentExtractedEvent
  | DocumentExtractionFailedEvent
  | DocumentExtractionDeferredEvent;

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
type FailurePhase = 'broad' | 'subtype' | 'forced';

type ProcessDocumentArgs = {
  event: DocumentUploadedEvent;
  step: StepLike;
  logger: LoggerLike;
  supabaseAdmin?: SupabaseLike;
  classifier?: typeof classifyDocumentFromStorage;
  subtypeClassifier?: typeof classifySubtypeFromStorage;
  extractor?: typeof runExtractionByRoute;
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
  extractor = runExtractionByRoute,
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

  const processingStartedAtMs = (await step.run('audit-started', async () => {
    const startedAtMs = Date.now();
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

    return startedAtMs;
  })) as number;

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
    failurePhase = 'forced';
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
      const processingTimeMs = Date.now() - processingStartedAtMs;
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
    const processingTimeMs = Date.now() - processingStartedAtMs;
    const classificationExtractedData = {
      kind: 'classification',
      spike: '03d-1b',
      classifier: {
        document_type: classifierResult.documentType,
        confidence: classifierResult.confidence,
        reasoning: classifierResult.reasoning,
        modelId: classifierResult.modelId,
      },
      subtype_classifier: {
        document_subtype: subtypeResult.documentSubtype,
        confidence: subtypeResult.confidence,
        reasoning: subtypeResult.reasoning,
        skipped: subtypeResult.skipped,
        llm_returned_raw: subtypeResult.llmReturnedRaw,
        modelId: subtypeResult.modelId,
      },
      subtype: {
        modelId: subtypeResult.modelId,
        skipped: subtypeResult.skipped,
      },
      processing_time_ms: processingTimeMs,
    };
    const { data, error } = await supabaseAdmin
      .from('documents')
      .update({
        processing_status: 'processed',
        document_type: classifierResult.documentType,
        document_subtype: subtypeResult.documentSubtype,
        extracted_data: classificationExtractedData,
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

      return {
        transitioned: false,
        extractedData: classificationExtractedData,
      };
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

    return { transitioned: true, extractedData: classificationExtractedData };
  })) as {
    transitioned: boolean;
    extractedData: Record<string, unknown>;
  };

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

  if (!finalizeOutcome.transitioned) {
    return {
      status: 'processed',
      documentId,
      transitioned: false,
    };
  }

  const route = routeBySubtype(
    classifierResult.documentType,
    subtypeResult.documentSubtype,
  );

  if (route === 'skip_dedicated' || route === 'skip_other') {
    await step.run('audit-extraction-deferred', async () => {
      const { error } = await supabaseAdmin.from('audit_log').insert({
        claim_id: claimId,
        actor_type: 'system',
        actor_id: SYSTEM_ACTOR_ID,
        action: 'document_extraction_deferred',
        target_table: 'documents',
        target_id: documentId,
        details: {
          route,
          document_type: classifierResult.documentType,
          document_subtype: subtypeResult.documentSubtype,
        },
      });

      if (error) {
        logger.error('[audit-failure]', { documentId, error });
      }
    });

    const deferredEvent: DocumentExtractionDeferredEvent = {
      name: 'claim/document.extraction_deferred',
      data: { claimId, documentId, reason: route },
    };
    await step.sendEvent('emit-extraction-deferred', deferredEvent);

    return {
      status: 'processed',
      documentId,
      transitioned: true,
      extraction: 'deferred',
      reason: route,
    };
  }

  let extractionResult: ExtractionResult | null = null;
  let extractionFailureReason: string | null = null;

  try {
    extractionResult = (await step.run('claude-extract', async () =>
      extractor(route, {
        documentId: claimed.id,
        fileName: claimed.file_name ?? 'unknown',
      }),
    )) as ExtractionResult;
  } catch (error) {
    extractionFailureReason =
      error instanceof Error ? error.message : String(error);
  }

  if (extractionFailureReason !== null) {
    const failedPersistOutcome = (await step.run(
      'finalize-extraction-failed',
      async () =>
        persistExtractionFailure({
          supabaseAdmin,
          logger,
          claimId,
          documentId,
          route,
          base: finalizeOutcome.extractedData,
          errorMessage: extractionFailureReason,
        }),
    )) as { persisted: boolean };

    if (!failedPersistOutcome.persisted) {
      return {
        status: 'processed',
        documentId,
        transitioned: true,
        extraction: 'failed_unpersisted',
      };
    }

    const failedEvent: DocumentExtractionFailedEvent = {
      name: 'claim/document.extraction_failed',
      data: { claimId, documentId, error: extractionFailureReason },
    };
    await step.sendEvent('emit-extraction-failed', failedEvent);

    return {
      status: 'processed',
      documentId,
      transitioned: true,
      extraction: 'failed',
    };
  }

  if (!extractionResult) {
    throw new Error('extractionResult unexpectedly null in extraction path');
  }

  const extractedData = buildRoutedExtractionData({
    route,
    classifierResult,
    subtypeResult,
    extractionResult,
    base: finalizeOutcome.extractedData,
  });

  if (!extractedData) {
    const inconsistentReason = `Inconsistent extraction payload for route: ${route}`;
    const failedPersistOutcome = (await step.run(
      'finalize-extraction-inconsistent',
      async () =>
        persistExtractionFailure({
          supabaseAdmin,
          logger,
          claimId,
          documentId,
          route,
          base: finalizeOutcome.extractedData,
          errorMessage: inconsistentReason,
        }),
    )) as { persisted: boolean };

    if (failedPersistOutcome.persisted) {
      const failedEvent: DocumentExtractionFailedEvent = {
        name: 'claim/document.extraction_failed',
        data: { claimId, documentId, error: inconsistentReason },
      };
      await step.sendEvent('emit-extraction-failed', failedEvent);
    }

    return {
      status: 'processed',
      documentId,
      transitioned: true,
      extraction: failedPersistOutcome.persisted
        ? 'failed'
        : 'failed_unpersisted',
    };
  }

  await step.run('upsert-pass-extraction-cost', async () => {
    const { error } = await supabaseAdmin.rpc('upsert_pass_increment', {
      p_claim_id: claimId,
      p_pass_number: 1,
      p_calls_increment: 1,
      p_cost_increment: extractionResult.costUsd,
    });

    if (error) {
      throw new Error(`upsert_pass_increment failed: ${error.message}`);
    }
  });

  const successPersistOutcome = (await step.run(
    'finalize-extraction-success',
    async () => {
      const { data, error } = await supabaseAdmin
        .from('documents')
        .update({ extracted_data: extractedData })
        .eq('id', documentId)
        .eq('processing_status', 'processed')
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        logger.warn(
          '[skip-extraction-finalize] state changed before success persistence',
          {
            documentId,
            expected: 'processed',
          },
        );

        return { persisted: false };
      }

      const { error: auditError } = await supabaseAdmin
        .from('audit_log')
        .insert({
          claim_id: claimId,
          actor_type: 'llm',
          actor_id: extractionResult.modelId,
          action: 'document_extraction_completed',
          target_table: 'documents',
          target_id: documentId,
          details: {
            route,
            document_type: classifierResult.documentType,
            document_subtype: subtypeResult.documentSubtype,
            cost_usd: extractionResult.costUsd,
            input_tokens: extractionResult.inputTokens,
            output_tokens: extractionResult.outputTokens,
          },
        });

      if (auditError) {
        logger.error('[audit-failure]', { documentId, error: auditError });
      }
      return { persisted: true };
    },
  )) as { persisted: boolean };

  if (!successPersistOutcome.persisted) {
    return {
      status: 'processed',
      documentId,
      transitioned: true,
      extraction: 'completed_unpersisted',
    };
  }

  const extractedEvent: DocumentExtractedEvent = {
    name: 'claim/document.extracted',
    data: {
      claimId,
      documentId,
      documentType: classifierResult.documentType,
      documentSubtype: subtypeResult.documentSubtype,
    },
  };
  await step.sendEvent('emit-extracted', extractedEvent);

  return {
    status: 'processed',
    documentId,
    transitioned: finalizeOutcome.transitioned,
    extraction: 'completed',
  };
}

type ExtractionResult =
  | ExtractReceiptResult
  | ExtractPoliceResult
  | ExtractHotelGenericResult
  | ExtractMedicalResult;

type BuildExtractionDataInput = {
  route: Exclude<ExtractionRoute, 'skip_dedicated' | 'skip_other'>;
  classifierResult: ClassifyDocumentResult;
  subtypeResult: ClassifySubtypeResult;
  extractionResult: ExtractionResult;
  base: Record<string, unknown>;
};

function buildRoutedExtractionData({
  route,
  classifierResult,
  subtypeResult,
  extractionResult,
  base,
}: BuildExtractionDataInput): RoutedExtractionData | null {
  if (!isExtractionPayloadConsistent(route, extractionResult)) return null;

  return {
    kind: 'extraction',
    route,
    documentType: classifierResult.documentType,
    documentSubtype: subtypeResult.documentSubtype,
    data: extractionResult.data,
    classifier: asRecord(base.classifier),
    subtype_classifier: asRecord(base.subtype_classifier),
    subtype: asRecord(base.subtype),
    processing_time_ms:
      typeof base.processing_time_ms === 'number' ? base.processing_time_ms : 0,
    metadata: {
      classifier: asRecord(base.classifier),
      subtype_classifier: asRecord(base.subtype_classifier),
      subtype: asRecord(base.subtype),
      processing_time_ms:
        typeof base.processing_time_ms === 'number'
          ? base.processing_time_ms
          : 0,
      extraction: {
        route,
        modelId: extractionResult.modelId,
        inputTokens: extractionResult.inputTokens,
        outputTokens: extractionResult.outputTokens,
        costUsd: extractionResult.costUsd,
      },
    },
  } as RoutedExtractionData;
}

function isExtractionPayloadConsistent(
  route: Exclude<ExtractionRoute, 'skip_dedicated' | 'skip_other'>,
  extractionResult: ExtractionResult,
): boolean {
  const data = extractionResult.data as unknown as Record<string, unknown>;

  switch (route) {
    case 'receipt':
      return 'items' in data && 'total' in data;
    case 'police':
      return 'formatAnalysis' in data && 'itemsReported' in data;
    case 'hotel_generic':
      return 'hotelName' in data && 'redFlags' in data;
    case 'medical':
      return 'diagnosisBrief' in data && 'anomalies' in data;
  }
}

async function persistExtractionFailure(input: {
  supabaseAdmin: SupabaseLike;
  logger: LoggerLike;
  claimId: string;
  documentId: string;
  route: Exclude<ExtractionRoute, 'skip_dedicated' | 'skip_other'>;
  base: Record<string, unknown>;
  errorMessage: string;
}): Promise<{ persisted: boolean }> {
  const extractionData = {
    ...input.base,
    extraction_error: {
      route: input.route,
      error: input.errorMessage,
    },
  };
  const { data, error } = await input.supabaseAdmin
    .from('documents')
    .update({ extracted_data: extractionData })
    .eq('id', input.documentId)
    .eq('processing_status', 'processed')
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    input.logger.warn(
      '[skip-extraction-finalize] state changed before failure persistence',
      {
        documentId: input.documentId,
        expected: 'processed',
      },
    );

    return { persisted: false };
  }

  const { error: auditError } = await input.supabaseAdmin
    .from('audit_log')
    .insert({
      claim_id: input.claimId,
      actor_type: 'system',
      actor_id: SYSTEM_ACTOR_ID,
      action: 'document_extraction_failed',
      target_table: 'documents',
      target_id: input.documentId,
      details: { route: input.route, error: input.errorMessage },
    });

  if (auditError) {
    input.logger.error('[audit-failure]', {
      documentId: input.documentId,
      error: auditError,
    });
  }

  return { persisted: true };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

export async function runExtractionByRoute(
  route: Exclude<ExtractionRoute, 'skip_dedicated' | 'skip_other'>,
  input: { documentId: string; fileName: string },
): Promise<ExtractionResult> {
  switch (route) {
    case 'receipt':
      return extractReceiptFromStorage(input);
    case 'police':
      return extractPoliceFromStorage(input);
    case 'hotel_generic':
      return extractHotelGenericFromStorage(input);
    case 'medical':
      return extractMedicalFromStorage(input);
  }
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
