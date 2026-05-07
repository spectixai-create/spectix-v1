import { inngest } from '../client';
import { handleClaimScopedFunctionFailure } from './claim-failure';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  collectNormalizedExtractionFields,
  getDefaultExchangeRateProvider,
  runCurrencyValidationLayer,
  runDateValidationLayer,
  runNameMatchLayer,
  type ExchangeRateProvider,
  type LayerStatus,
  type ValidationClaimContext,
  type ValidationLayerId,
  type ValidationLayerResult,
} from '@/lib/validation';
import type {
  ClaimExtractionCompletedEvent,
  ClaimValidationRequestedEvent,
  ClaimValidationCompletedEvent,
} from '@/lib/types';

export const VALIDATION_PASS_NUMBER = 2;
export const VALIDATION_SYSTEM_ACTOR_ID = 'inngest:run-validation-pass';

export const RUN_VALIDATION_PASS_CONFIG = {
  id: 'run-validation-pass',
  retries: 3,
  concurrency: { limit: 1, key: 'event.data.claimId' },
} as const;

type LoggerLike = {
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
};

type StepEvent = ClaimValidationCompletedEvent;

type StepLike = {
  run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
  sendEvent: (name: string, payload: StepEvent) => Promise<unknown>;
};

type SupabaseLike = ReturnType<typeof createAdminClient>;

type ClaimRow = {
  id: string;
  claimant_name: string | null;
  insured_name: string | null;
  incident_date: string | null;
  currency: string | null;
  created_at: string | null;
  metadata: Record<string, unknown> | null;
};

type DocumentRow = {
  id: string;
  document_type: string | null;
  document_subtype: string | null;
  extracted_data: unknown;
};

type RunValidationPassArgs = {
  event: ClaimExtractionCompletedEvent | ClaimValidationRequestedEvent;
  step: StepLike;
  logger: LoggerLike;
  supabaseAdmin?: SupabaseLike;
  exchangeRateProvider?: ExchangeRateProvider;
};

export async function runValidationPass({
  event,
  step,
  logger,
  supabaseAdmin = createAdminClient(),
  exchangeRateProvider = getDefaultExchangeRateProvider(),
}: RunValidationPassArgs) {
  const { claimId } = event.data;

  const context = (await step.run('load-validation-inputs', async () => {
    const { data: claimData, error: claimError } = await supabaseAdmin
      .from('claims')
      .select(
        'id, claimant_name, insured_name, incident_date, currency, created_at, metadata',
      )
      .eq('id', claimId)
      .maybeSingle();

    if (claimError) throw claimError;
    if (!claimData) throw new Error(`claim not found: ${claimId}`);

    const { data: documentData, error: documentError } = await supabaseAdmin
      .from('documents')
      .select('id, document_type, document_subtype, extracted_data')
      .eq('claim_id', claimId);

    if (documentError) throw documentError;

    return {
      claim: claimData as ClaimRow,
      documents: (documentData ?? []) as DocumentRow[],
    };
  })) as { claim: ClaimRow; documents: DocumentRow[] };

  const validationPass = (await step.run(
    'create-validation-pass-row',
    async () => {
      const startedAt = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from('passes')
        .upsert(
          {
            claim_id: claimId,
            pass_number: VALIDATION_PASS_NUMBER,
            status: 'in_progress',
            started_at: startedAt,
            completed_at: null,
            llm_calls_made: 0,
            cost_usd: 0,
          },
          { onConflict: 'claim_id,pass_number' },
        )
        .select('pass_number')
        .maybeSingle();

      if (error) throw error;

      return data as { pass_number: number } | null;
    },
  )) as { pass_number: number } | null;

  if (!validationPass) {
    throw new Error('validation pass row was not created');
  }

  const collection = collectNormalizedExtractionFields(
    context.documents.map((document) => ({
      document_id: document.id,
      document_type: document.document_type,
      document_subtype: document.document_subtype,
      extracted_data: document.extracted_data,
    })),
  );
  const claim = toClaimContext(context.claim);

  const layerResults = [
    await runLayer({
      layerId: '11.1',
      step,
      logger,
      supabaseAdmin,
      claimId,
      run: async () => runNameMatchLayer(collection),
    }),
    await runLayer({
      layerId: '11.2',
      step,
      logger,
      supabaseAdmin,
      claimId,
      run: async () => runDateValidationLayer({ collection, claim }),
    }),
    await runLayer({
      layerId: '11.3',
      step,
      logger,
      supabaseAdmin,
      claimId,
      run: async () =>
        runCurrencyValidationLayer({
          collection,
          claim,
          provider: exchangeRateProvider,
        }),
    }),
  ];

  await step.run('finalize-validation-pass', async () => {
    const { data, error } = await supabaseAdmin
      .from('passes')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('claim_id', claimId)
      .eq('pass_number', VALIDATION_PASS_NUMBER)
      .select('pass_number')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('validation pass finalization affected no rows');
  });

  const completedEvent: ClaimValidationCompletedEvent = {
    name: 'claim/validation.completed',
    data: { claimId, passNumber: VALIDATION_PASS_NUMBER },
  };
  await step.sendEvent('emit-validation-completed', completedEvent);

  return {
    status: 'completed',
    claimId,
    passNumber: VALIDATION_PASS_NUMBER,
    layers: layerResults.map((result) => ({
      layer_id: result.layer_id,
      status: result.status,
    })),
  };
}

async function runLayer<P extends Record<string, unknown>>({
  layerId,
  step,
  logger,
  supabaseAdmin,
  claimId,
  run,
}: {
  layerId: ValidationLayerId;
  step: StepLike;
  logger: LoggerLike;
  supabaseAdmin: SupabaseLike;
  claimId: string;
  run: () => Promise<ValidationLayerResult<P>>;
}): Promise<ValidationLayerResult<P | Record<string, unknown>>> {
  await step.run(`audit-layer-${layerId}-started`, async () => {
    await writeAudit({
      supabaseAdmin,
      logger,
      claimId,
      layerId,
      action: 'claim_validation_layer_started',
    });
  });

  let result: ValidationLayerResult<P | Record<string, unknown>>;
  try {
    result = (await step.run(
      `layer-${layerId}`,
      run,
    )) as ValidationLayerResult<P>;
  } catch (error) {
    result = {
      layer_id: layerId,
      status: 'failed',
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }

  await step.run(`persist-layer-${layerId}`, async () => {
    const { error } = await supabaseAdmin.from('claim_validations').upsert(
      {
        claim_id: claimId,
        pass_number: VALIDATION_PASS_NUMBER,
        layer_id: result.layer_id,
        status: result.status,
        payload: result.payload,
      },
      { onConflict: 'claim_id,pass_number,layer_id' },
    );

    if (error) throw error;
  });

  await step.run(`audit-layer-${layerId}-${result.status}`, async () => {
    await writeAudit({
      supabaseAdmin,
      logger,
      claimId,
      layerId,
      action: actionForStatus(result.status),
      status: result.status,
    });
  });

  return result;
}

async function writeAudit({
  supabaseAdmin,
  logger,
  claimId,
  layerId,
  action,
  status,
}: {
  supabaseAdmin: SupabaseLike;
  logger: LoggerLike;
  claimId: string;
  layerId: ValidationLayerId;
  action: string;
  status?: LayerStatus;
}) {
  const details: Record<string, unknown> = {
    layer_id: layerId,
    pass_number: VALIDATION_PASS_NUMBER,
    cost_usd: 0,
  };
  if (status) details.status = status;

  const { error } = await supabaseAdmin.from('audit_log').insert({
    claim_id: claimId,
    actor_type: 'system',
    actor_id: VALIDATION_SYSTEM_ACTOR_ID,
    action,
    target_table: 'claim_validations',
    target_id: null,
    details,
  });

  if (error) {
    logger.error('[validation-audit-failure]', { claimId, layerId, error });
  }
}

function actionForStatus(status: LayerStatus): string {
  if (status === 'completed') return 'claim_validation_layer_completed';
  if (status === 'skipped') return 'claim_validation_layer_skipped';
  return 'claim_validation_layer_failed';
}

function toClaimContext(row: ClaimRow): ValidationClaimContext {
  return {
    id: row.id,
    claimantName: row.claimant_name,
    insuredName: row.insured_name,
    incidentDate: row.incident_date,
    currency: row.currency,
    createdAt: row.created_at,
    metadata: row.metadata,
  };
}

export const runValidationPassFunction = inngest.createFunction(
  {
    ...RUN_VALIDATION_PASS_CONFIG,
    onFailure: async ({ event, error, step, logger }) =>
      handleClaimScopedFunctionFailure({
        event,
        error,
        step: step as unknown as {
          run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
        },
        logger,
        functionId: RUN_VALIDATION_PASS_CONFIG.id,
      }),
  },
  [
    { event: 'claim/extraction.completed' },
    { event: 'claim/validation.requested' },
  ],
  async ({ event, step, logger }) =>
    runValidationPass({
      event: event as
        | ClaimExtractionCompletedEvent
        | ClaimValidationRequestedEvent,
      step: step as unknown as StepLike,
      logger,
    }),
);
