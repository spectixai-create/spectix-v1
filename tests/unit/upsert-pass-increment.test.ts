import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  'supabase/migrations/0004_classifier_prep.sql',
  'utf8',
);

describe('upsert_pass_increment migration helper', () => {
  it('P1 creates the RPC in migration 0004', () => {
    expect(sql).toContain(
      'create or replace function public.upsert_pass_increment',
    );
  });

  it('P2 uses claim-level conflict target for cumulative pass accounting', () => {
    expect(sql).toContain('on conflict (claim_id, pass_number) do update');
    expect(sql).toContain(
      'llm_calls_made = passes.llm_calls_made + excluded.llm_calls_made',
    );
    expect(sql).toContain('cost_usd = passes.cost_usd + excluded.cost_usd');
  });

  it('P3 rollback drops the RPC', () => {
    const down = readFileSync(
      'supabase/rollbacks/0004_classifier_prep.down.sql',
      'utf8',
    );

    expect(down).toContain(
      'drop function if exists public.upsert_pass_increment',
    );
  });
});
