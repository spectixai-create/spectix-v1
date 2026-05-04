import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const migrationSql = readFileSync(
  'supabase/migrations/20260504111946_pass_lifecycle_completion.sql',
  'utf8',
);
const rollbackSql = readFileSync(
  'supabase/rollbacks/20260504111946_pass_lifecycle_completion.down.sql',
  'utf8',
);

describe('finalize_pass_after_document_processing migration helper', () => {
  it('creates an idempotent claim-level pass lifecycle RPC', () => {
    expect(migrationSql).toContain(
      'create or replace function public.finalize_pass_after_document_processing',
    );
    expect(migrationSql).toContain(
      "processing_status in ('pending', 'processing')",
    );
    expect(migrationSql).toContain("processing_status = 'failed'");
    expect(migrationSql).toContain("when v_failed_documents > 0 then 'failed'");
    expect(migrationSql).toContain("else 'completed'");
  });

  it('uses the claim id filter before evaluating document terminal state', () => {
    expect(migrationSql).toContain('where claim_id = p_claim_id');
  });

  it('preserves completed_at on repeated same-status finalization', () => {
    expect(migrationSql).toContain('when public.passes.completed_at is null');
    expect(migrationSql).toContain(
      'or public.passes.status is distinct from excluded.status',
    );
    expect(migrationSql).toContain('else public.passes.completed_at');
  });

  it('has a rollback that drops only the lifecycle RPC', () => {
    expect(rollbackSql).toContain(
      'drop function if exists public.finalize_pass_after_document_processing(uuid, int)',
    );
  });
});
