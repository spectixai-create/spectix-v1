import { CostCapHaltError } from '@/lib/cost-cap';
import {
  SYNTHESIS_TERMINAL_STATUSES,
  runSynthesisPass,
} from '@/inngest/synthesis/run-synthesis-pass';
import {
  computeReadinessScore,
  deriveFindingsFromValidations,
  generateFindingId,
  generateQuestionId,
  generateCustomerQuestionFromFinding,
  generateQuestionsForFindings,
} from '@/lib/synthesis';
import { describe, expect, it, vi } from 'vitest';
import type { ClaimValidationRow, Finding } from '@/lib/synthesis';
import type { ClaimValidationCompletedEvent } from '@/lib/types';

const claimId = '11111111-1111-4111-8111-111111111111';

describe('SPRINT-003A finding derivation', () => {
  it('derives 11.1 name mismatch finding', () => {
    const findings = deriveFindingsFromValidations([
      row('11.1', 'completed', {
        summary: { mismatches: 1, fuzzy_matches: 0 },
        candidates: [{ evidence: evidence('d1', 'fields.passenger_name') }],
      }),
      cleanDateRow(),
      cleanCurrencyRow(),
    ]);

    expect(findings).toContainEqual(
      expect.objectContaining({
        category: 'inconsistency',
        severity: 'high',
        title: 'אי-התאמה בשם בין מסמכים',
      }),
    );
  });

  it('derives 11.1 fuzzy finding', () => {
    const findings = deriveFindingsFromValidations([
      row('11.1', 'completed', {
        summary: { mismatches: 0, fuzzy_matches: 1 },
      }),
      cleanDateRow(),
      cleanCurrencyRow(),
    ]);

    expect(findings).toContainEqual(
      expect.objectContaining({
        severity: 'medium',
        title: 'התאמה חלקית בשם',
      }),
    );
  });

  it('derives 11.1 no-name and failed findings', () => {
    expect(
      deriveFindingsFromValidations([
        row('11.1', 'skipped', { reason: 'no_name_fields' }),
        cleanDateRow(),
        cleanCurrencyRow(),
      ]),
    ).toContainEqual(
      expect.objectContaining({ title: 'לא נמצאו שדות שם לבדיקה' }),
    );

    expect(
      deriveFindingsFromValidations([
        row('11.1', 'failed', { error: 'boom' }),
        cleanDateRow(),
        cleanCurrencyRow(),
      ]),
    ).toContainEqual(expect.objectContaining({ title: 'בדיקת השם כשלה' }));
  });

  it.each([
    ['policy_coverage', 'אירוע מחוץ לתקופת כיסוי', 'high'],
    ['submission_timing', 'תאריך הגשה לפני אירוע', 'medium'],
    ['travel_containment', 'תאריך אירוע לא בתוך תאריכי טיסה/מלון', 'medium'],
    ['document_age', 'תאריך מסמך לפני אירוע', 'low'],
  ])('derives 11.2 %s finding', (ruleId, title, severity) => {
    const findings = deriveFindingsFromValidations([
      cleanNameRow(),
      row('11.2', 'completed', {
        rules: [
          { rule_id: ruleId, status: 'fail', evidence: [evidence('d2', 'x')] },
        ],
      }),
      cleanCurrencyRow(),
    ]);

    expect(findings).toContainEqual(
      expect.objectContaining({ title, severity }),
    );
  });

  it('derives 11.2 missing dates and failed findings', () => {
    expect(
      deriveFindingsFromValidations([
        cleanNameRow(),
        row('11.2', 'skipped', { reason: 'no_dates' }),
        cleanCurrencyRow(),
      ]),
    ).toContainEqual(
      expect.objectContaining({ title: 'חסרים תאריכים לבדיקת תקופת כיסוי' }),
    );

    expect(
      deriveFindingsFromValidations([
        cleanNameRow(),
        row('11.2', 'failed', { error: 'boom' }),
        cleanCurrencyRow(),
      ]),
    ).toContainEqual(expect.objectContaining({ title: 'בדיקת תאריכים כשלה' }));
  });

  it('derives 11.3 outlier, rate failure, and failed findings', () => {
    expect(
      deriveFindingsFromValidations([
        cleanNameRow(),
        cleanDateRow(),
        row('11.3', 'completed', {
          items: [{ status: 'outlier', evidence: [evidence('d3', 'amount')] }],
          summary: { outliers: 1, rate_failure: 0 },
        }),
      ]),
    ).toContainEqual(expect.objectContaining({ title: 'סכום חריג בקבלה' }));

    expect(
      deriveFindingsFromValidations([
        cleanNameRow(),
        cleanDateRow(),
        row('11.3', 'completed', {
          items: [
            { status: 'rate_failure', evidence: [evidence('d3', 'currency')] },
          ],
          summary: { outliers: 0, rate_failure: 1 },
        }),
      ]),
    ).toContainEqual(
      expect.objectContaining({ title: 'לא ניתן לאמת שער חליפין' }),
    );

    expect(
      deriveFindingsFromValidations([
        cleanNameRow(),
        cleanDateRow(),
        row('11.3', 'failed', { error: 'boom' }),
      ]),
    ).toContainEqual(expect.objectContaining({ title: 'בדיקת מטבעות כשלה' }));
  });

  it('derives missing expected layer finding', () => {
    const findings = deriveFindingsFromValidations([
      cleanNameRow(),
      cleanCurrencyRow(),
    ]);

    expect(findings).toContainEqual(
      expect.objectContaining({
        severity: 'high',
        title: 'שכבה 11.2 לא רצה',
      }),
    );
  });
});

describe('SPRINT-003A question generation', () => {
  it('generates specific customer questions with required action metadata', () => {
    const findings: Finding[] = [
      finding('gap', 'medium', 'חסר אישור משטרה', '11.2'),
      finding('gap', 'medium', 'חסרים תאריכים לבדיקת תקופת כיסוי', '11.2'),
      finding('inconsistency', 'high', 'אי-התאמה בשם בין מסמכים', '11.1'),
      finding('gap', 'medium', 'חסרה רשימת פריטים', '11.2'),
      finding('gap', 'medium', 'חסרים פרטי השגחה על התיק', '11.2'),
    ];

    const questions = generateQuestionsForFindings(findings);

    expect(questions.map((question) => question.text)).toEqual([
      'נא להעלות אישור משטרה מקומית על הגניבה, הכולל שם מלא, תאריך אירוע ומיקום.',
      'נא להעלות מסמך הכולל את תאריך האירוע, או להבהיר בכתב את מועד הגניבה.',
      'נא להעלות מסמך שבו מופיע שמך המלא, או אישור משטרה מעודכן הכולל שם מלא.',
      'נא להעלות רשימת פריטים שנגנבו, כולל תיאור כל פריט וסכום נתבע.',
      'נא להבהיר היכן היה התיק בזמן הגניבה והאם היה תחת השגחה.',
    ]);
    expect(questions.map((question) => question.required_action)).toEqual([
      'upload_document',
      'upload_document_or_answer',
      'upload_document',
      'upload_document_or_answer',
      'answer',
    ]);
    expect(questions.map((question) => question.customer_label)).toEqual([
      'אישור משטרה',
      'תאריך אירוע',
      'מסמך עם שם מלא',
      'רשימת פריטים',
      'נסיבות שמירה על התיק',
    ]);
  });

  it('falls back to a finding-specific completion question', () => {
    const generated = generateCustomerQuestionFromFinding(
      finding('gap', 'medium', 'חסר פרט בדיקה ייחודי', '11.2'),
    );

    expect(generated).toMatchObject({
      customer_label: 'השלמת מידע',
      required_action: 'upload_document_or_answer',
    });
    expect(generated?.question).toContain('חסר פרט בדיקה ייחודי');
  });

  it('does not generate questions for layer-not-run, layer-failed, or fuzzy name findings', () => {
    const questions = generateQuestionsForFindings([
      finding('gap', 'high', 'שכבה 11.2 לא רצה', '11.2'),
      finding('gap', 'high', 'בדיקת תאריכים כשלה', '11.2'),
      finding('inconsistency', 'medium', 'התאמה חלקית בשם', '11.1'),
    ]);

    expect(questions).toEqual([]);
  });
});

describe('SPRINT-003A readiness and IDs', () => {
  it('computes readiness score with severity weights and floor', () => {
    expect(computeReadinessScore([]).score).toBe(100);
    expect(
      computeReadinessScore([
        finding('gap', 'high', 'אחד', '11.1'),
        finding('gap', 'medium', 'שתיים', '11.2'),
        finding('gap', 'low', 'שלוש', '11.3'),
      ]),
    ).toMatchObject({
      score: 50,
      computation_basis: 'finding_severity_v1',
      weights_used: { high: 30, medium: 15, low: 5 },
    });
    expect(
      computeReadinessScore(
        Array.from({ length: 4 }, (_, index) =>
          finding('gap', 'high', `גבוה ${index}`, '11.1'),
        ),
      ).score,
    ).toBe(0);
  });

  it('generates deterministic IDs independent of object key order', () => {
    expect(generateFindingId({ a: 1, b: { c: 2, d: 3 } })).toBe(
      generateFindingId({ b: { d: 3, c: 2 }, a: 1 }),
    );
    expect(generateQuestionId({ z: 1, a: 2 })).toBe(
      generateQuestionId({ a: 2, z: 1 }),
    );
  });
});

describe('SPRINT-003A handler orchestration', () => {
  it('creates pass 3, reads validation pass 2, writes results, finalizes, and emits event', async () => {
    const supabase = new FakeSynthesisSupabase({
      validations: [cleanNameRow(), cleanDateRow(), cleanCurrencyRow()],
    });
    const step = createStep();

    const result = await runSynthesisPass({
      event: validationCompletedEvent(),
      step: step as never,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
    });

    expect(result).toMatchObject({
      status: 'completed',
      passNumber: 3,
      finalStatus: 'ready',
    });
    expect(supabase.pass.status).toBe('completed');
    expect(supabase.claim.status).toBe('ready');
    expect(supabase.synthesisResults).toContainEqual(
      expect.objectContaining({ kind: 'readiness_score', pass_number: 3 }),
    );
    expect(step.sendEvent).toHaveBeenCalledWith('emit-synthesis-completed', {
      name: 'claim/synthesis.completed',
      data: { claimId, passNumber: 3 },
    });
  });

  it('updates claim to pending_info when questions or high findings exist', async () => {
    const supabase = new FakeSynthesisSupabase({
      validations: [
        row('11.1', 'completed', {
          summary: { mismatches: 1, fuzzy_matches: 0 },
        }),
        cleanDateRow(),
        cleanCurrencyRow(),
      ],
    });

    await runSynthesisPass({
      event: validationCompletedEvent(),
      step: createStep() as never,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
    });

    expect(supabase.claim.status).toBe('pending_info');
    expect(supabase.synthesisResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'finding' }),
        expect.objectContaining({ kind: 'question' }),
        expect.objectContaining({ kind: 'readiness_score' }),
      ]),
    );
  });

  it('re-cycle replaces prior pass 3 results', async () => {
    const supabase = new FakeSynthesisSupabase({
      validations: [cleanNameRow(), cleanDateRow(), cleanCurrencyRow()],
      synthesisResults: [
        { claim_id: claimId, pass_number: 3, kind: 'finding', payload: {} },
      ],
    });

    await runSynthesisPass({
      event: validationCompletedEvent(),
      step: createStep() as never,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
    });

    expect(supabase.synthesisResults).toHaveLength(1);
    expect(supabase.synthesisResults[0]).toMatchObject({
      kind: 'readiness_score',
      pass_number: 3,
    });
  });

  it('transaction failure preserves prior synthesis results', async () => {
    const prior = {
      claim_id: claimId,
      pass_number: 3,
      kind: 'finding',
      payload: { id: 'prior' },
    };
    const supabase = new FakeSynthesisSupabase({
      validations: [cleanNameRow(), cleanDateRow(), cleanCurrencyRow()],
      synthesisResults: [prior],
      failReplace: true,
    });

    await expect(
      runSynthesisPass({
        event: validationCompletedEvent(),
        step: createStep() as never,
        logger: createLogger(),
        supabaseAdmin: supabase as never,
      }),
    ).rejects.toThrow('replace failed');

    expect(supabase.synthesisResults).toEqual([prior]);
  });

  it('halts before persistence when claim is cost capped', async () => {
    const supabase = new FakeSynthesisSupabase({
      claimStatus: 'cost_capped',
      validations: [cleanNameRow(), cleanDateRow(), cleanCurrencyRow()],
    });

    await expect(
      runSynthesisPass({
        event: validationCompletedEvent(),
        step: createStep() as never,
        logger: createLogger(),
        supabaseAdmin: supabase as never,
      }),
    ).rejects.toBeInstanceOf(CostCapHaltError);
    expect(supabase.synthesisResults).toEqual([]);
  });

  it('terminal status guard includes rejected_no_coverage', () => {
    expect(SYNTHESIS_TERMINAL_STATUSES).toContain('rejected_no_coverage');
  });
});

function row(
  layerId: ClaimValidationRow['layer_id'],
  status: ClaimValidationRow['status'],
  payload: Record<string, unknown>,
  passNumber = 2,
): ClaimValidationRow {
  return {
    id: `${layerId}-${status}`,
    claim_id: claimId,
    pass_number: passNumber,
    layer_id: layerId,
    status,
    payload,
  };
}

function cleanNameRow() {
  return row('11.1', 'completed', {
    summary: { mismatches: 0, fuzzy_matches: 0 },
  });
}

function cleanDateRow() {
  return row('11.2', 'completed', {
    rules: [
      { rule_id: 'policy_coverage', status: 'pass' },
      { rule_id: 'submission_timing', status: 'pass' },
      { rule_id: 'travel_containment', status: 'pass' },
      { rule_id: 'document_age', status: 'pass' },
    ],
  });
}

function cleanCurrencyRow() {
  return row('11.3', 'completed', {
    items: [],
    summary: { outliers: 0, rate_failure: 0 },
  });
}

function evidence(documentId: string, fieldPath: string) {
  return {
    document_id: documentId,
    field_path: fieldPath,
    normalized_value: 'safe-value',
  };
}

function finding(
  category: Finding['category'],
  severity: Finding['severity'],
  title: string,
  sourceLayerId: Finding['source_layer_id'],
): Finding {
  return {
    id: generateFindingId({ category, severity, title, sourceLayerId }),
    category,
    severity,
    title,
    description: title,
    evidence: [],
    source_layer_id: sourceLayerId,
  };
}

function validationCompletedEvent(): ClaimValidationCompletedEvent {
  return {
    name: 'claim/validation.completed',
    data: { claimId, passNumber: 2 },
  };
}

function createStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    sendEvent: vi.fn(async () => undefined),
  };
}

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

class FakeSynthesisSupabase {
  claim: { id: string; status: string; total_llm_cost_usd: number };
  pass = { claim_id: claimId, pass_number: 3, status: 'pending' };
  validations: ClaimValidationRow[];
  synthesisResults: Array<Record<string, unknown>>;
  auditLog: Array<Record<string, unknown>> = [];

  constructor(
    private readonly options: {
      claimStatus?: string;
      validations?: ClaimValidationRow[];
      synthesisResults?: Array<Record<string, unknown>>;
      failReplace?: boolean;
    } = {},
  ) {
    this.claim = {
      id: claimId,
      status: options.claimStatus ?? 'processing',
      total_llm_cost_usd: 0,
    };
    this.validations = options.validations ?? [];
    this.synthesisResults = options.synthesisResults ?? [];
  }

  from(table: string) {
    return new FakeQuery(this, table);
  }

  async rpc(name: string, payload: Record<string, unknown>) {
    if (name !== 'replace_synthesis_results') {
      return { data: null, error: new Error(`unexpected rpc: ${name}`) };
    }
    if (this.options.failReplace) {
      return { data: null, error: new Error('replace failed') };
    }

    const passNumber = payload.p_pass_number as number;
    this.synthesisResults = this.synthesisResults.filter(
      (row) => row.claim_id !== claimId || row.pass_number !== passNumber,
    );
    const rows = payload.p_results as Array<Record<string, unknown>>;
    this.synthesisResults.push(
      ...rows.map((row) => ({
        claim_id: claimId,
        pass_number: passNumber,
        kind: row.kind,
        payload: row.payload,
      })),
    );

    return { data: null, error: null };
  }
}

class FakeQuery {
  private payload: Record<string, unknown> | null = null;
  private filters = new Map<string, unknown>();
  private blocked = false;

  constructor(
    private readonly db: FakeSynthesisSupabase,
    private readonly table: string,
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.set(column, value);
    return this;
  }

  not(_column: string, _operator: string, value: string) {
    if (this.table === 'claims' && this.payload) {
      const blocked = value
        .replace(/[()]/g, '')
        .split(',')
        .includes(this.db.claim.status);
      this.blocked = blocked;
    }
    return this;
  }

  upsert(payload: Record<string, unknown>) {
    this.payload = payload;
    if (this.table === 'passes') {
      this.db.pass = { ...this.db.pass, ...payload };
    }
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.payload = payload;
    return this;
  }

  async insert(payload: Record<string, unknown>) {
    if (this.table === 'audit_log') this.db.auditLog.push(payload);
    return { error: null };
  }

  async maybeSingle() {
    if (this.table === 'claims' && this.payload && !this.blocked) {
      this.db.claim = { ...this.db.claim, ...this.payload };
      return { data: this.db.claim, error: null };
    }
    if (this.table === 'claims' && this.payload && this.blocked) {
      return { data: null, error: null };
    }
    if (this.table === 'claims') {
      return { data: this.db.claim, error: null };
    }
    if (this.table === 'passes') return { data: this.db.pass, error: null };
    return { data: this.payload, error: null };
  }

  then(resolve: (value: { data: unknown; error: null }) => void) {
    if (this.table === 'claim_validations') {
      const claimFilter = this.filters.get('claim_id');
      const passFilter = this.filters.get('pass_number');
      resolve({
        data: this.db.validations.filter(
          (row) =>
            row.claim_id === claimFilter && row.pass_number === passFilter,
        ),
        error: null,
      });
      return;
    }

    resolve({ data: this.payload, error: null });
  }
}
