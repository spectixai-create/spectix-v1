import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/admin';

export const WATCHDOG_ACTOR_ID = 'watchdog-stuck-documents';

type LoggerLike = {
  info: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
};

type StepLike = {
  run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
};

type SupabaseLike = ReturnType<typeof createAdminClient>;

type StuckDocumentRow = {
  id: string;
  claim_id: string;
  created_at: string;
};

export async function runWatchdogStuckDocuments({
  step,
  logger,
  supabaseAdmin = createAdminClient(),
}: {
  step: StepLike;
  logger: LoggerLike;
  supabaseAdmin?: SupabaseLike;
}) {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const stuckDocs = (await step.run('find-stuck-documents', async () => {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('id, claim_id, created_at')
      .eq('processing_status', 'processing')
      .lt('created_at', cutoff)
      .limit(25);

    if (error) throw error;

    return (data ?? []) as StuckDocumentRow[];
  })) as StuckDocumentRow[];

  let transitioned = 0;

  for (const doc of stuckDocs) {
    await step.run(`transition-${doc.id}`, async () => {
      const { data, error } = await supabaseAdmin
        .from('documents')
        .update({
          processing_status: 'failed',
          extracted_data: {
            spike: '03c',
            error: 'stuck_processing_watchdog',
            failure_category: 'watchdog',
          },
        })
        .eq('id', doc.id)
        .eq('processing_status', 'processing')
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        logger.info('[watchdog-skip] state changed before watchdog', {
          documentId: doc.id,
        });

        return;
      }

      transitioned += 1;
      const { error: auditError } = await supabaseAdmin
        .from('audit_log')
        .insert({
          claim_id: doc.claim_id,
          actor_type: 'system',
          actor_id: WATCHDOG_ACTOR_ID,
          action: 'document_processing_failed',
          target_table: 'documents',
          target_id: doc.id,
          details: {
            error: 'stuck_processing_watchdog',
            cutoff,
          },
        });

      if (auditError) {
        logger.error('[audit-failure]', {
          documentId: doc.id,
          error: auditError,
        });
      }
    });
  }

  return { scanned: stuckDocs.length, transitioned };
}

export const watchdogStuckDocuments = inngest.createFunction(
  { id: 'watchdog-stuck-documents', retries: 1 },
  { cron: '*/10 * * * *' },
  async ({ step, logger }) =>
    runWatchdogStuckDocuments({
      step: step as unknown as StepLike,
      logger,
    }),
);
