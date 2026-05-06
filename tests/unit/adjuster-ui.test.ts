import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildAdjusterAudit,
  canApprove,
  canEscalate,
  canReject,
  canRequestInfo,
  composeClaimDetailSnapshot,
  composeClaimListResponse,
  normalizeEditedTexts,
  normalizeQuestionIds,
  planQuestionDispatches,
  validateRejectReason,
} from '@/lib/adjuster/service';
import type {
  AuditLogView,
  DocumentWithSignedUrl,
  QuestionDispatchState,
} from '@/lib/adjuster/types';
import type {
  Claim,
  ClaimValidation,
  Pass,
  SynthesisResult,
} from '@/lib/types';

describe('SPRINT-UI-001 claim list composition', () => {
  it('filters, sorts, and paginates claims', () => {
    const response = composeClaimListResponse({
      claims: [
        claim({ id: 'c1', claimNumber: '2026-001', status: 'ready' }),
        claim({
          id: 'c2',
          claimNumber: '2026-002',
          status: 'pending_info',
          createdAt: '2026-05-01T00:00:00Z',
        }),
        claim({
          id: 'c3',
          claimNumber: '2026-003',
          status: 'ready',
          createdAt: '2026-04-01T00:00:00Z',
        }),
      ],
      synthesisResults: [
        readiness('c1', 82),
        readiness('c3', 30),
        finding('c3', 'gap', 'high'),
      ],
      query: { status: 'ready', sort: 'score_desc', page: 1, pageSize: 1 },
      now: new Date('2026-05-06T00:00:00Z'),
    });

    expect(response.total).toBe(2);
    expect(response.items).toHaveLength(1);
    expect(response.items[0]).toMatchObject({
      claimNumber: '2026-001',
      readinessScore: 82,
      daysOpen: 5,
    });
  });

  it('searches across claim number, names, policy, and location', () => {
    const response = composeClaimListResponse({
      claims: [
        claim({ id: 'c1', insuredName: 'יעל כהן', policyNumber: 'POL-1' }),
        claim({
          id: 'c2',
          insuredName: 'דני לוי',
          policyNumber: 'POL-2',
          incidentLocation: 'רומא',
        }),
      ],
      synthesisResults: [],
      query: { search: 'רומא' },
      now: new Date('2026-05-06T00:00:00Z'),
    });

    expect(response.items.map((item) => item.id)).toEqual(['c2']);
  });
});

describe('SPRINT-UI-001 detail snapshot composition', () => {
  it('groups findings, questions, readiness score, dispatch state, and audit', () => {
    const snapshot = composeClaimDetailSnapshot({
      claim: claim({ id: 'c1' }),
      documents: [documentRow()],
      passes: [pass(2), pass(1)],
      validations: [validation('11.2'), validation('11.1')],
      synthesisResults: [
        finding('c1', 'gap', 'high'),
        question('c1', 'q_1'),
        readiness('c1', 70),
      ],
      questionDispatches: [dispatch('q_1')],
      auditLog: [
        audit('a1', '2026-05-06T10:00:00Z'),
        audit('a2', '2026-05-06T11:00:00Z'),
      ],
    });

    expect(snapshot.passes.map((item) => item.passNumber)).toEqual([1, 2]);
    expect(snapshot.validations.map((item) => item.layerId)).toEqual([
      '11.1',
      '11.2',
    ]);
    expect(snapshot.findings).toHaveLength(1);
    expect(snapshot.questions[0]?.dispatch?.questionId).toBe('q_1');
    expect(snapshot.readinessScore?.score).toBe(70);
    expect(snapshot.auditLog.map((item) => item.id)).toEqual(['a2', 'a1']);
  });
});

describe('SPRINT-UI-001 action rules', () => {
  it('guards approve, reject, escalate, and request-info statuses', () => {
    expect(canApprove('ready')).toBe(true);
    expect(canApprove('pending_info')).toBe(false);
    expect(canReject('rejected_no_coverage')).toBe(false);
    expect(canReject('cost_capped')).toBe(true);
    expect(canEscalate('rejected_no_coverage')).toBe(false);
    expect(canRequestInfo('pending_info')).toBe(true);
    expect(canRequestInfo('reviewed')).toBe(false);
  });

  it('requires a bounded reject reason and uses rejected_no_coverage flow', () => {
    expect(validateRejectReason('  אין כיסוי בפוליסה  ')).toBe(
      'אין כיסוי בפוליסה',
    );
    expect(validateRejectReason('')).toBeNull();
    expect(validateRejectReason('x'.repeat(501))).toBeNull();
  });

  it('builds adjuster audit entries without top-level cost_usd', () => {
    const audit = buildAdjusterAudit({
      claimId: 'c1',
      actorId: 'user-1',
      action: 'adjuster_decision_approve',
      details: { to_status: 'reviewed' },
    });

    expect(audit).toMatchObject({
      actor_type: 'user',
      actor_id: 'user-1',
      action: 'adjuster_decision_approve',
      target_table: 'claims',
    });
    expect(audit).not.toHaveProperty('cost_usd');
    expect(audit.details).not.toHaveProperty('cost_usd');
  });

  it('normalizes request-info ids and edited texts for idempotent dispatch', () => {
    expect(normalizeQuestionIds(['q1', 'q1', ' ', 7, 'q2'])).toEqual([
      'q1',
      'q2',
    ]);
    expect(normalizeEditedTexts({ q1: '  הבהרה  ', q2: '', q3: 4 })).toEqual({
      q1: 'הבהרה',
    });
  });

  it('plans request-info redispatch while preserving first dispatch metadata', () => {
    const plan = planQuestionDispatches({
      claimId: 'c1',
      questionIds: ['q1', 'q2'],
      existing: [dispatch('q1')],
      actorId: 'u2',
      now: '2026-05-06T02:00:00Z',
      editedTexts: { q1: 'נוסח חדש', q2: 'שאלה חדשה' },
    });

    expect(plan.insertRows).toEqual([
      expect.objectContaining({
        question_id: 'q2',
        first_dispatched_at: '2026-05-06T02:00:00Z',
        dispatched_by: 'u2',
      }),
    ]);
    expect(plan.updateRows).toEqual([
      {
        questionId: 'q1',
        lastDispatchedAt: '2026-05-06T02:00:00Z',
        lastDispatchedBy: 'u2',
        editedText: 'נוסח חדש',
      },
    ]);
    expect(plan.updateRows[0]).not.toHaveProperty('firstDispatchedAt');
  });
});

describe('SPRINT-UI-001 migration constraints', () => {
  it('keeps all adjuster API routes auth-gated', () => {
    const routeFiles = [
      'app/api/claims/route.ts',
      'app/api/claims/[id]/route.ts',
      'app/api/claims/[id]/approve/route.ts',
      'app/api/claims/[id]/reject/route.ts',
      'app/api/claims/[id]/escalate/route.ts',
      'app/api/claims/[id]/unescalate/route.ts',
      'app/api/claims/[id]/request-info/route.ts',
    ];

    for (const file of routeFiles) {
      expect(readFileSync(file, 'utf8')).toContain('requireApiUser');
    }
  });

  it('adds question_dispatches without auth.users FK and no audit cost column', () => {
    const migration = readFileSync(
      'supabase/migrations/20260506160000_ui_support.sql',
      'utf8',
    );

    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS public.question_dispatches',
    );
    expect(migration).toContain('escalated_to_investigator');
    expect(migration).not.toContain('auth.users');
    expect(migration).not.toContain('cost_usd');
  });

  it('has a reversible rollback for UI support', () => {
    const rollback = readFileSync(
      'supabase/rollbacks/20260506160000_ui_support.down.sql',
      'utf8',
    );

    expect(rollback).toContain(
      'DROP TABLE IF EXISTS public.question_dispatches',
    );
    expect(rollback).toContain(
      'DROP COLUMN IF EXISTS escalated_to_investigator',
    );
  });
});

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'c1',
    claimNumber: '2026-001',
    status: 'ready',
    riskBand: null,
    riskScore: null,
    claimType: 'theft',
    insuredName: 'יעל כהן',
    claimantName: 'יעל כהן',
    incidentDate: '2026-05-01',
    incidentLocation: 'פריז',
    amountClaimed: 1000,
    currency: 'ILS',
    summary: null,
    metadata: null,
    claimantEmail: null,
    claimantPhone: null,
    policyNumber: 'POL-1',
    currentPass: 3,
    totalLlmCostUsd: 0.2,
    briefText: null,
    briefPassNumber: null,
    briefRecommendation: null,
    briefGeneratedAt: null,
    escalatedToInvestigator: false,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-06T00:00:00Z',
    ...overrides,
  };
}

function readiness(claimId: string, score: number): SynthesisResult {
  return {
    id: `${claimId}-rs`,
    claimId,
    passNumber: 3,
    kind: 'readiness_score',
    payload: {
      id: 'rs_v1',
      score,
      computation_basis: 'finding_severity_v1',
      weights_used: { high: 30, medium: 15, low: 5 },
    },
    createdAt: '2026-05-06T00:00:00Z',
  };
}

function finding(
  claimId: string,
  category: string,
  severity: 'low' | 'medium' | 'high',
): SynthesisResult {
  return {
    id: `${claimId}-${category}`,
    claimId,
    passNumber: 3,
    kind: 'finding',
    payload: {
      id: `${claimId}-${category}`,
      category,
      severity,
      title: 'ממצא בדיקה',
      description: 'תיאור',
      evidence: [{ document_id: 'd1', field_path: 'fields.name' }],
      source_layer_id: '11.1',
    },
    createdAt: '2026-05-06T00:00:00Z',
  };
}

function question(claimId: string, id: string): SynthesisResult {
  return {
    id,
    claimId,
    passNumber: 3,
    kind: 'question',
    payload: {
      id,
      text: 'נא להבהיר את תאריך האירוע',
      related_finding_id: `${claimId}-gap`,
      expected_answer_type: 'text',
      context: null,
    },
    createdAt: '2026-05-06T00:00:00Z',
  };
}

function documentRow(): DocumentWithSignedUrl {
  return {
    id: 'd1',
    claimId: 'c1',
    documentType: 'receipt',
    documentSubtype: 'general_receipt',
    filePath: 'claims/c1/receipt.pdf',
    fileName: 'receipt.pdf',
    fileSize: 1000,
    mimeType: 'application/pdf',
    ocrText: null,
    extractedData: null,
    processingStatus: 'processed',
    uploadedBy: null,
    createdAt: '2026-05-06T00:00:00Z',
    signedUrl: 'https://signed.example/receipt.pdf',
  };
}

function pass(passNumber: number): Pass {
  return {
    id: `p${passNumber}`,
    claimId: 'c1',
    passNumber,
    status: 'completed',
    startedAt: '2026-05-06T00:00:00Z',
    completedAt: '2026-05-06T00:01:00Z',
    riskBand: null,
    findingsCount: 0,
    gapsCount: 0,
    llmCallsMade: 0,
    costUsd: 0,
    createdAt: '2026-05-06T00:00:00Z',
  };
}

function validation(layerId: ClaimValidation['layerId']): ClaimValidation {
  return {
    id: layerId,
    claimId: 'c1',
    passNumber: 2,
    layerId,
    status: 'completed',
    payload: {},
    createdAt: '2026-05-06T00:00:00Z',
  };
}

function dispatch(questionId: string): QuestionDispatchState {
  return {
    questionId,
    firstDispatchedAt: '2026-05-06T00:00:00Z',
    lastDispatchedAt: '2026-05-06T01:00:00Z',
    dispatchedBy: 'u1',
    lastDispatchedBy: 'u1',
    editedText: null,
  };
}

function audit(id: string, createdAt: string): AuditLogView {
  return {
    id,
    claimId: 'c1',
    actorType: 'user',
    actorId: 'u1',
    action: 'adjuster_decision_approve',
    targetTable: 'claims',
    targetId: 'c1',
    details: {},
    createdAt,
  };
}
