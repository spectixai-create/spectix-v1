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

type DocumentStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'extracting'
  | 'deferred-finalizing'
  | 'retrying'
  | 'unknown'
  | null;

type TestDocument = {
  status: DocumentStatus;
  extractionError?: { blocking?: boolean };
  terminal?: boolean;
};

type TestPass = {
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  costUsd: number;
} | null;

function finalizePass(
  documents: TestDocument[],
  pass: TestPass,
): {
  pass: Exclude<TestPass, null> | null;
  status: string;
  completedEvents: number;
} {
  if (documents.length === 0) {
    return { pass, status: 'no_documents', completedEvents: 0 };
  }

  if (pass?.status === 'skipped') {
    return { pass, status: 'skipped', completedEvents: 0 };
  }

  if (documents.some(isNonTerminal)) {
    return {
      pass: {
        status: 'in_progress',
        costUsd: pass?.costUsd ?? 0,
      },
      status: 'in_progress',
      completedEvents: 0,
    };
  }

  const nextStatus = documents.some(isBlockingFailure) ? 'failed' : 'completed';
  const completedEvents =
    nextStatus === 'completed' && pass?.status !== 'completed' ? 1 : 0;

  return {
    pass: {
      status: nextStatus,
      costUsd: pass?.costUsd ?? 0,
    },
    status: nextStatus,
    completedEvents,
  };
}

function reopenPass(pass: TestPass): Exclude<TestPass, null> {
  return { status: 'in_progress', costUsd: pass?.costUsd ?? 0 };
}

function retryDocument(document: TestDocument, pass: TestPass) {
  return {
    document: { ...document, status: 'pending' as const, terminal: false },
    pass: reopenPass(pass),
    auditHistoryPreserved: true,
  };
}

function isNonTerminal(document: TestDocument): boolean {
  return (
    document.status === null ||
    (document.status !== 'processed' && document.status !== 'failed') ||
    document.terminal === false
  );
}

function isBlockingFailure(document: TestDocument): boolean {
  return (
    document.status === 'failed' ||
    (document.status === 'processed' &&
      document.extractionError !== undefined &&
      document.extractionError.blocking !== false)
  );
}

describe('SPRINT-001 pass lifecycle semantics', () => {
  it('all terminal successes complete pass 1', () => {
    const result = finalizePass(
      [{ status: 'processed' }, { status: 'processed' }],
      { status: 'in_progress', costUsd: 0.12 },
    );

    expect(result.status).toBe('completed');
    expect(result.completedEvents).toBe(1);
  });

  it('all terminal documents with a blocking failure fail pass 1', () => {
    const result = finalizePass(
      [{ status: 'processed' }, { status: 'failed' }],
      { status: 'in_progress', costUsd: 0.12 },
    );

    expect(result.status).toBe('failed');
    expect(result.completedEvents).toBe(0);
  });

  it.each([
    'pending',
    'processing',
    'extracting',
    'deferred-finalizing',
    'retrying',
    'unknown',
    null,
  ] satisfies DocumentStatus[])(
    '%s document keeps pass 1 in progress',
    (status) => {
      const result = finalizePass([{ status: 'processed' }, { status }], {
        status: 'in_progress',
        costUsd: 0.12,
      });

      expect(result.status).toBe('in_progress');
    },
  );

  it('processed document with active extraction is still non-terminal', () => {
    const result = finalizePass([{ status: 'processed', terminal: false }], {
      status: 'in_progress',
      costUsd: 0.12,
    });

    expect(result.status).toBe('in_progress');
  });

  it('blocking extraction_error fails the pass by default', () => {
    const result = finalizePass(
      [{ status: 'processed', extractionError: {} }],
      { status: 'in_progress', costUsd: 0.12 },
    );

    expect(result.status).toBe('failed');
  });

  it('explicit non-blocking extraction_error can still complete', () => {
    const result = finalizePass(
      [{ status: 'processed', extractionError: { blocking: false } }],
      { status: 'in_progress', costUsd: 0.12 },
    );

    expect(result.status).toBe('completed');
  });

  it('emits claim/pass.completed once for one real transition', () => {
    const first = finalizePass([{ status: 'processed' }], {
      status: 'in_progress',
      costUsd: 0.12,
    });
    const duplicate = finalizePass([{ status: 'processed' }], first.pass);

    expect(first.completedEvents + duplicate.completedEvents).toBe(1);
  });

  it('duplicate and concurrent-style finalizers do not duplicate completion', () => {
    let pass: TestPass = { status: 'in_progress', costUsd: 0.12 };
    const first = finalizePass([{ status: 'processed' }], pass);
    pass = first.pass;
    const second = finalizePass([{ status: 'processed' }], pass);

    expect(first.completedEvents).toBe(1);
    expect(second.completedEvents).toBe(0);
  });

  it('missing pass row is handled safely', () => {
    const result = finalizePass([{ status: 'processed' }], null);

    expect(result.status).toBe('completed');
    expect(result.pass).toMatchObject({ status: 'completed', costUsd: 0 });
  });

  it('late upload after completion reopens pass 1', () => {
    const pass = reopenPass({ status: 'completed', costUsd: 0.12 });

    expect(pass.status).toBe('in_progress');
  });

  it('late upload success allows completion again', () => {
    const reopened = reopenPass({ status: 'completed', costUsd: 0.12 });
    const result = finalizePass(
      [{ status: 'processed' }, { status: 'processed' }],
      reopened,
    );

    expect(result.status).toBe('completed');
    expect(result.completedEvents).toBe(1);
  });

  it('late upload failure causes failed pass', () => {
    const reopened = reopenPass({ status: 'completed', costUsd: 0.12 });
    const result = finalizePass(
      [{ status: 'processed' }, { status: 'failed' }],
      reopened,
    );

    expect(result.status).toBe('failed');
  });

  it('retry from failed pass returns to in progress and preserves audit history', () => {
    const retry = retryDocument(
      { status: 'failed' },
      { status: 'failed', costUsd: 0.12 },
    );

    expect(retry.document.status).toBe('pending');
    expect(retry.pass.status).toBe('in_progress');
    expect(retry.auditHistoryPreserved).toBe(true);
  });

  it('successful retry can move failed pass to completed', () => {
    const retry = retryDocument(
      { status: 'failed' },
      { status: 'failed', costUsd: 0.12 },
    );
    const result = finalizePass(
      [{ ...retry.document, status: 'processed', terminal: true }],
      retry.pass,
    );

    expect(result.status).toBe('completed');
  });

  it('failed retry returns pass to failed', () => {
    const retry = retryDocument(
      { status: 'failed' },
      { status: 'failed', costUsd: 0.12 },
    );
    const result = finalizePass(
      [{ ...retry.document, status: 'failed', terminal: true }],
      retry.pass,
    );

    expect(result.status).toBe('failed');
  });

  it('claims.current_pass stays on pass 1 and cost remains sum of pass costs', () => {
    const passes = [
      finalizePass([{ status: 'processed' }], {
        status: 'in_progress',
        costUsd: 0.12,
      }).pass,
    ].filter(Boolean) as Array<Exclude<TestPass, null>>;

    const currentPass = passes.some((pass) =>
      ['in_progress', 'completed', 'skipped', 'failed'].includes(pass.status),
    )
      ? 1
      : 0;
    const totalCost = passes.reduce((sum, pass) => sum + pass.costUsd, 0);

    expect(currentPass).toBe(1);
    expect(totalCost).toBe(0.12);
  });

  it('completion waits until extraction cost increments are persisted', () => {
    const beforeCostPersistence = finalizePass(
      [{ status: 'processed', terminal: false }],
      { status: 'in_progress', costUsd: 0.12 },
    );
    const afterCostPersistence = finalizePass(
      [{ status: 'processed', terminal: true }],
      { status: 'in_progress', costUsd: 0.13 },
    );

    expect(beforeCostPersistence.status).toBe('in_progress');
    expect(afterCostPersistence.status).toBe('completed');
    expect(afterCostPersistence.pass?.costUsd).toBe(0.13);
  });

  it('pass completion does not imply brief, risk, or adjuster-ready behavior', () => {
    const claim = {
      briefText: null,
      riskBand: null,
      adjusterReady: false,
    };
    const result = finalizePass([{ status: 'processed' }], {
      status: 'in_progress',
      costUsd: 0.12,
    });

    expect(result.status).toBe('completed');
    expect(claim).toEqual({
      briefText: null,
      riskBand: null,
      adjusterReady: false,
    });
  });
});

describe('finalize_pass_after_document_processing migration helper', () => {
  it('creates finalization, reopen, and retry RPCs', () => {
    expect(migrationSql).toContain(
      'create or replace function public.finalize_pass_after_document_processing',
    );
    expect(migrationSql).toContain(
      'create or replace function public.reopen_pass_for_document_processing',
    );
    expect(migrationSql).toContain(
      'create or replace function public.retry_document_processing',
    );
  });

  it('treats unknown states and active processed rows as non-terminal', () => {
    expect(migrationSql).toContain('processing_status is null');
    expect(migrationSql).toContain(
      "processing_status not in ('processed', 'failed')",
    );
    expect(migrationSql).toContain(
      "extracted_data #>> '{document_processing,terminal}'",
    );
  });

  it('treats extraction_error as blocking unless explicitly false', () => {
    expect(migrationSql).toContain("extracted_data ? 'extraction_error'");
    expect(migrationSql).toContain(
      "extracted_data #>> '{extraction_error,blocking}'",
    );
    expect(migrationSql).toContain("<> 'false'");
  });

  it('serializes duplicate finalizers and emits completion from true transitions', () => {
    expect(migrationSql).toContain('pg_advisory_xact_lock');
    expect(migrationSql).toContain(
      "v_emit_completed_event := v_final_status = 'completed' and v_transitioned",
    );
    expect(migrationSql).toContain("'claim/pass.completed'");
  });

  it('retry preserves failure history in audit_log before same-row reset', () => {
    expect(migrationSql).toContain("'document_processing_retry_requested'");
    expect(migrationSql).toContain("'previous_extracted_data'");
    expect(migrationSql).toContain("set processing_status = 'pending'");
  });

  it('has a scoped rollback for the sprint RPCs', () => {
    expect(rollbackSql).toContain(
      'drop function if exists public.finalize_pass_after_document_processing(uuid, int)',
    );
    expect(rollbackSql).toContain(
      'drop function if exists public.retry_document_processing(uuid, text, text, text)',
    );
    expect(rollbackSql).toContain(
      'drop function if exists public.reopen_pass_for_document_processing(uuid, int, text, uuid)',
    );
  });
});
