import { NonRetriableError } from 'inngest';

import { inngest } from '../client';
import { handleClaimScopedFunctionFailure } from '../functions/claim-failure';
import { callClaudeWithCostGuard } from '@/lib/cost-cap';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  runSynthesisForValidationRows,
  type ClaimSynthesisContext,
  type ClaimantResponseContext,
  type ClaimValidationRow,
  type SynthesisResultRow,
} from '@/lib/synthesis';
import type {
  ClaimSynthesisCompletedEvent,
  ClaimValidationCompletedEvent,
} from '@/lib/types';

export const SYNTHESIS_PASS_NUMBER = 3;
export const SYNTHESIS_VALIDATION_PASS_NUMBER = 2;
export const SYNTHESIS_SYSTEM_ACTOR_ID = 'inngest:run-synthesis-pass';
export const SYNTHESIS_TERMINAL_STATUSES = [
  'rejected',
  'rejected_no_coverage',
  'errored',
  'cost_capped',
  'ready',
] as const;

export const RUN_SYNTHESIS_PASS_CONFIG = {
  id: 'run-synthesis-pass',
  retries: 3,
  concurrency: { limit: 1, key: 'event.data.claimId' },
} as const;

type LoggerLike = {
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
};

type StepEvent = ClaimSynthesisCompletedEvent;

type StepLike = {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  sendEvent: (name: string, payload: StepEvent) => Promise<unknown>;
};

type SupabaseLike = ReturnType<typeof createAdminClient>;

type QuestionResponseRow = {
  question_id: string;
  response_value: Record<string, unknown>;
};

type ClaimContextRow = {
  id: string;
  claim_type: string | null;
  metadata: Record<string, unknown> | null;
  amount_claimed: number | string | null;
  currency: string | null;
};

type PreviousQuestionRow = {
  payload: {
    id?: string;
    text?: string;
    expected_answer_type?: string;
  };
};

type RunSynthesisPassArgs = {
  event: ClaimValidationCompletedEvent;
  step: StepLike;
  logger: LoggerLike;
  supabaseAdmin?: SupabaseLike;
};

export async function runSynthesisPass({
  event,
  step,
  logger,
  supabaseAdmin = createAdminClient(),
}: RunSynthesisPassArgs) {
  const { claimId, passNumber } = event.data;
  if (passNumber !== SYNTHESIS_VALIDATION_PASS_NUMBER) {
    throw new NonRetriableError(
      `SPRINT-003A only supports validation pass ${SYNTHESIS_VALIDATION_PASS_NUMBER}`,
    );
  }

  await step.run('check-cap-and-create-pass', async () => {
    await callClaudeWithCostGuard({
      claimId,
      supabaseAdmin,
      call: async () => null,
    });

    const startedAt = new Date().toISOString();
    const { error: passError } = await supabaseAdmin.from('passes').upsert(
      {
        claim_id: claimId,
        pass_number: SYNTHESIS_PASS_NUMBER,
        status: 'in_progress',
        started_at: startedAt,
        completed_at: null,
        llm_calls_made: 0,
        cost_usd: 0,
      },
      { onConflict: 'claim_id,pass_number' },
    );
    if (passError) throw passError;

    await writeAudit({
      supabaseAdmin,
      logger,
      claimId,
      action: 'claim_synthesis_started',
      details: {
        pass_number: SYNTHESIS_PASS_NUMBER,
        validation_pass_number: passNumber,
        cost_usd: 0,
      },
    });
  });

  const validationRows = await step.run('read-validations', async () => {
    const { data, error } = await supabaseAdmin
      .from('claim_validations')
      .select(
        'id, claim_id, pass_number, layer_id, status, payload, created_at',
      )
      .eq('claim_id', claimId)
      .eq('pass_number', SYNTHESIS_VALIDATION_PASS_NUMBER);

    if (error) throw error;
    return (data ?? []) as ClaimValidationRow[];
  });

  const claimantResponses = await step.run(
    'read-claimant-responses',
    async () => {
      const { data: responses, error: responsesError } = await supabaseAdmin
        .from('question_responses')
        .select('question_id, response_value')
        .eq('claim_id', claimId);

      if (responsesError) throw responsesError;
      if (!responses || responses.length === 0) return [];

      const { data: previousQuestions, error: questionsError } =
        await supabaseAdmin
          .from('synthesis_results')
          .select('payload')
          .eq('claim_id', claimId)
          .eq('pass_number', SYNTHESIS_PASS_NUMBER)
          .eq('kind', 'question');

      if (questionsError) throw questionsError;

      const questionPayloads = new Map(
        ((previousQuestions ?? []) as PreviousQuestionRow[]).map((row) => [
          String(row.payload.id ?? ''),
          row.payload,
        ]),
      );

      return ((responses ?? []) as QuestionResponseRow[]).map((response) => {
        const question = questionPayloads.get(response.question_id);

        return {
          question_id: response.question_id,
          question_text: question?.text ?? null,
          expected_answer_type: normalizeQuestionAnswerType(
            question?.expected_answer_type,
          ),
          response_value: response.response_value,
        } satisfies ClaimantResponseContext;
      });
    },
  );

  const claimContext = await step.run('read-claim-context', async () => {
    const { data, error } = await supabaseAdmin
      .from('claims')
      .select('id, claim_type, metadata, amount_claimed, currency')
      .eq('id', claimId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return mapClaimContext(data as ClaimContextRow);
  });

  const findings = await step.run('derive-findings', async () => {
    return runSynthesisForValidationRows(
      validationRows,
      claimantResponses,
      claimContext,
    ).findings;
  });

  const questions = await step.run('generate-questions', async () => {
    return runSynthesisForValidationRows(
      validationRows,
      claimantResponses,
      claimContext,
    ).questions;
  });

  const readinessScore = await step.run('compute-readiness-score', async () => {
    return runSynthesisForValidationRows(
      validationRows,
      claimantResponses,
      claimContext,
    ).readinessScore;
  });

  await step.run('persist-synthesis-results', async () => {
    const rows: SynthesisResultRow[] = [
      ...findings.map((finding) => ({
        claim_id: claimId,
        pass_number: SYNTHESIS_PASS_NUMBER,
        kind: 'finding' as const,
        payload: finding,
      })),
      ...questions.map((question) => ({
        claim_id: claimId,
        pass_number: SYNTHESIS_PASS_NUMBER,
        kind: 'question' as const,
        payload: question,
      })),
      {
        claim_id: claimId,
        pass_number: SYNTHESIS_PASS_NUMBER,
        kind: 'readiness_score',
        payload: readinessScore,
      },
    ];

    const { error } = await supabaseAdmin.rpc('replace_synthesis_results', {
      p_claim_id: claimId,
      p_pass_number: SYNTHESIS_PASS_NUMBER,
      p_results: rows.map((row) => ({
        kind: row.kind,
        payload: row.payload,
      })),
    });

    if (error) throw error;
  });

  const finalStatus =
    questions.length > 0 ||
    findings.some((finding) => finding.severity === 'high')
      ? 'pending_info'
      : 'ready';

  await step.run('finalize-synthesis-pass', async () => {
    const completedAt = new Date().toISOString();
    const { error: passError } = await supabaseAdmin.from('passes').upsert(
      {
        claim_id: claimId,
        pass_number: SYNTHESIS_PASS_NUMBER,
        status: 'completed',
        completed_at: completedAt,
        findings_count: findings.length,
        gaps_count: findings.filter((finding) => finding.category === 'gap')
          .length,
        llm_calls_made: 0,
        cost_usd: 0,
      },
      { onConflict: 'claim_id,pass_number' },
    );
    if (passError) throw passError;

    const { data: claimUpdate, error: claimError } = await supabaseAdmin
      .from('claims')
      .update({ status: finalStatus, updated_at: completedAt })
      .eq('id', claimId)
      .not('status', 'in', `(${SYNTHESIS_TERMINAL_STATUSES.join(',')})`)
      .select('id, status')
      .maybeSingle();
    if (claimError) throw claimError;

    await writeAudit({
      supabaseAdmin,
      logger,
      claimId,
      action: 'claim_synthesis_completed',
      details: {
        pass_number: SYNTHESIS_PASS_NUMBER,
        findings_count: findings.length,
        questions_count: questions.length,
        question_labels: questions.map((question) => question.customer_label),
        claimant_response_count: claimantResponses.length,
        score: readinessScore.score,
        final_status: finalStatus,
        claim_status_updated: Boolean(claimUpdate),
        cost_usd: 0,
      },
    });
  });

  const completedEvent: ClaimSynthesisCompletedEvent = {
    name: 'claim/synthesis.completed',
    data: { claimId, passNumber: SYNTHESIS_PASS_NUMBER },
  };
  await step.sendEvent('emit-synthesis-completed', completedEvent);

  return {
    status: 'completed',
    claimId,
    passNumber: SYNTHESIS_PASS_NUMBER,
    findingsCount: findings.length,
    questionsCount: questions.length,
    claimantResponseCount: claimantResponses.length,
    readinessScore: readinessScore.score,
    finalStatus,
  };
}

function normalizeQuestionAnswerType(
  value: string | undefined,
): ClaimantResponseContext['expected_answer_type'] {
  if (
    value === 'text' ||
    value === 'document' ||
    value === 'confirmation' ||
    value === 'correction'
  ) {
    return value;
  }

  return null;
}

function mapClaimContext(row: ClaimContextRow): ClaimSynthesisContext {
  const amount =
    row.amount_claimed === null || row.amount_claimed === undefined
      ? null
      : Number(row.amount_claimed);

  return {
    id: row.id,
    claim_type: row.claim_type ?? null,
    metadata: row.metadata ?? null,
    amount_claimed: Number.isFinite(amount) ? amount : null,
    currency: row.currency ?? null,
  };
}

async function writeAudit({
  supabaseAdmin,
  logger,
  claimId,
  action,
  details,
}: {
  supabaseAdmin: SupabaseLike;
  logger: LoggerLike;
  claimId: string;
  action: string;
  details: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from('audit_log').insert({
    claim_id: claimId,
    actor_type: 'system',
    actor_id: SYNTHESIS_SYSTEM_ACTOR_ID,
    action,
    target_table: 'synthesis_results',
    target_id: null,
    details,
  });

  if (error) {
    logger.error('[synthesis-audit-failure]', { claimId, action, error });
  }
}

export const runSynthesisPassFunction = inngest.createFunction(
  {
    ...RUN_SYNTHESIS_PASS_CONFIG,
    onFailure: async ({ event, error, step, logger }) =>
      handleClaimScopedFunctionFailure({
        event,
        error,
        step: step as unknown as {
          run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
        },
        logger,
        functionId: RUN_SYNTHESIS_PASS_CONFIG.id,
      }),
  },
  { event: 'claim/validation.completed' },
  async ({ event, step, logger }) =>
    runSynthesisPass({
      event: event as ClaimValidationCompletedEvent,
      step: step as unknown as StepLike,
      logger,
    }),
);
