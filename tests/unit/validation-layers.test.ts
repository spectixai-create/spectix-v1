import { describe, expect, it, vi } from 'vitest';

import {
  FakeExchangeRateProvider,
  collectNormalizedExtractionFields,
  parseAmount,
  runCurrencyValidationLayer,
  runDateValidationLayer,
  runNameMatchLayer,
} from '@/lib/validation';
import { runValidationPass } from '@/inngest/functions/run-validation-pass';
import type { ClaimExtractionCompletedEvent } from '@/lib/types';
import type { ExchangeRateProvider } from '@/lib/validation';

const claimId = '11111111-1111-4111-8111-111111111111';

describe('SPRINT-002C name_match layer', () => {
  it('exact match completes when names normalize identically', () => {
    const result = runNameMatchLayer(
      collection([
        doc('d1', 'receipt_general', { purchaser_name: field('Dana Cohen') }),
        doc('d2', 'boarding_pass', { passenger_name: field('Dana Cohen') }),
      ]),
    );

    expect(result.status).toBe('completed');
    expect(result.payload.outcome).toBe('exact');
    expect(result.payload.summary.exact_matches).toBe(2);
  });

  it('fuzzy match accepts similarity at or above threshold', () => {
    const result = runNameMatchLayer(
      collection([
        doc('d1', 'receipt_general', {
          purchaser_name: field('Jonatan Cohen'),
        }),
        doc('d2', 'boarding_pass', { passenger_name: field('Jonathan Cohen') }),
      ]),
    );

    expect(result.status).toBe('completed');
    expect(result.payload.outcome).toBe('fuzzy');
    expect(result.payload.summary.fuzzy_matches).toBe(1);
  });

  it('mismatch records candidate mismatches without failing the layer', () => {
    const result = runNameMatchLayer(
      collection([
        doc('d1', 'receipt_general', { purchaser_name: field('Dana Cohen') }),
        doc('d2', 'boarding_pass', { passenger_name: field('Avi Levi') }),
      ]),
    );

    expect(result.status).toBe('completed');
    expect(result.payload.outcome).toBe('mismatch');
    expect(result.payload.summary.mismatches).toBe(1);
  });

  it('excludes witness_letter name fields', () => {
    const result = runNameMatchLayer(
      collection([
        doc('d1', 'receipt_general', { purchaser_name: field('Dana Cohen') }),
        doc('d2', 'witness_letter', { witness_name: field('Avi Levi') }),
      ]),
    );

    expect(result.payload.summary.witness_name_fields_excluded).toBe(1);
    expect(result.payload.summary.total_name_fields).toBe(1);
  });

  it('normalizes whitespace, case, and diacritics', () => {
    const result = runNameMatchLayer(
      collection([
        doc('d1', 'receipt_general', {
          purchaser_name: field('  JOSE  COHEN '),
        }),
        doc('d2', 'boarding_pass', { passenger_name: field('José Cohen') }),
      ]),
    );

    expect(result.payload.outcome).toBe('exact');
  });

  it('skips when no name fields exist', () => {
    const result = runNameMatchLayer(collection([]));

    expect(result.status).toBe('skipped');
    expect(result.payload.reason).toBe('no_name_fields');
  });
});

describe('SPRINT-002C date validation layer', () => {
  it('passes policy coverage when incident is inside metadata policy range', () => {
    const result = runDateValidationLayer({
      collection: collection([
        doc('d1', 'police_report', {
          report_or_filing_date: field('2026-05-02'),
        }),
      ]),
      claim: claim({ incidentDate: '2026-05-02' }),
    });

    expect(rule(result.payload, 'policy_coverage')?.status).toBe('pass');
  });

  it('fails policy coverage when incident is outside metadata policy range', () => {
    const result = runDateValidationLayer({
      collection: collection([
        doc('d1', 'police_report', {
          report_or_filing_date: field('2026-05-02'),
        }),
      ]),
      claim: claim({ incidentDate: '2026-06-02' }),
    });

    expect(rule(result.payload, 'policy_coverage')?.status).toBe('fail');
  });

  it('checks submission ordering from claim created_at', () => {
    const result = runDateValidationLayer({
      collection: collection([
        doc('d1', 'police_report', {
          report_or_filing_date: field('2026-05-02'),
        }),
      ]),
      claim: claim({
        incidentDate: '2026-05-02',
        createdAt: '2026-05-01T00:00:00Z',
      }),
    });

    expect(rule(result.payload, 'submission_timing')?.status).toBe('fail');
  });

  it('checks travel containment from flight date range', () => {
    const result = runDateValidationLayer({
      collection: collection([
        doc('d1', 'flight_booking_or_ticket', {
          departure_datetime: field('2026-05-01T10:00:00Z'),
          arrival_datetime: field('2026-05-10T10:00:00Z'),
        }),
      ]),
      claim: claim({ incidentDate: '2026-05-05' }),
    });

    expect(rule(result.payload, 'travel_containment')?.status).toBe('pass');
  });

  it('flags future document dates in document_age', () => {
    const result = runDateValidationLayer({
      collection: collection([
        doc('d1', 'police_report', {
          report_or_filing_date: field('2026-05-08'),
        }),
      ]),
      claim: claim({ incidentDate: '2026-05-02' }),
      now: new Date('2026-05-06T00:00:00Z'),
    });

    expect(rule(result.payload, 'document_age')?.status).toBe('fail');
  });

  it('skips when no dates exist', () => {
    const result = runDateValidationLayer({
      collection: collection([]),
      claim: claim(),
    });

    expect(result.status).toBe('skipped');
    expect(result.payload.reason).toBe('no_dates');
  });
});

describe('SPRINT-002C currency validation layer', () => {
  it('normalizes a single same-currency amount', async () => {
    const result = await runCurrencyValidationLayer({
      collection: collection([
        doc('d1', 'receipt_general', {
          total_amount: field(100),
          currency: field('ILS'),
        }),
      ]),
      claim: claim({ currency: 'ILS' }),
      provider: new FakeExchangeRateProvider(),
    });

    expect(result.status).toBe('completed');
    expect(result.payload.total_normalized).toBe(100);
  });

  it('normalizes multiple currencies with fake rates', async () => {
    const result = await runCurrencyValidationLayer({
      collection: collection([
        doc('d1', 'receipt_general', {
          total_amount: field(100),
          currency: field('USD'),
        }),
        doc('d2', 'flight_booking_or_ticket', {
          fare_amount: field(50),
          currency: field('EUR'),
        }),
      ]),
      claim: claim({ currency: 'ILS' }),
      provider: new FakeExchangeRateProvider(),
    });

    expect(result.payload.total_normalized).toBe(570);
  });

  it('defaults missing settlement currency to ILS', async () => {
    const result = await runCurrencyValidationLayer({
      collection: collection([
        doc('d1', 'receipt_general', {
          total_amount: field(25),
          currency: field('ILS'),
        }),
      ]),
      claim: claim({ currency: null }),
      provider: new FakeExchangeRateProvider(),
    });

    expect(result.payload.settlement_currency).toBe('ILS');
  });

  it('continues with rate_failure when provider returns null', async () => {
    const provider: ExchangeRateProvider = { getRate: vi.fn(async () => null) };
    const result = await runCurrencyValidationLayer({
      collection: collection([
        doc('d1', 'receipt_general', {
          total_amount: field(100),
          currency: field('JPY'),
        }),
      ]),
      claim: claim({ currency: 'ILS' }),
      provider,
    });

    expect(result.payload.items[0]?.status).toBe('rate_failure');
  });

  it('detects outliers', async () => {
    const result = await runCurrencyValidationLayer({
      collection: collection([
        doc('d1', 'receipt_general', {
          total_amount: field(10),
          currency: field('ILS'),
        }),
        doc('d2', 'receipt_general', {
          total_amount: field(11),
          currency: field('ILS'),
        }),
        doc('d3', 'receipt_general', {
          total_amount: field(1000),
          currency: field('ILS'),
        }),
      ]),
      claim: claim({ currency: 'ILS' }),
      provider: new FakeExchangeRateProvider(),
    });

    expect(result.payload.summary.outliers).toBe(1);
  });

  it('parses dirty amount strings with symbols, commas, and spaces', () => {
    expect(parseAmount(' ₪ 1,234.50 ')).toBe(1234.5);
  });
});

describe('SPRINT-002C validation pass integration', () => {
  it('persists three layer rows, completes pass 2, and emits validation completed', async () => {
    const supabase = new FakeValidationSupabase();
    const step = createStep();

    const result = await runValidationPass({
      event: extractionCompletedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      exchangeRateProvider: new FakeExchangeRateProvider(),
    });

    expect(result).toMatchObject({
      status: 'completed',
      claimId,
      passNumber: 2,
    });
    expect(supabase.claimValidations).toHaveLength(3);
    expect(supabase.pass).toMatchObject({
      pass_number: 2,
      status: 'completed',
    });
    expect(step.sendEvent).toHaveBeenCalledWith(
      'emit-validation-completed',
      expect.objectContaining({ name: 'claim/validation.completed' }),
    );
  });
});

function collection(rows: ReturnType<typeof doc>[]) {
  return collectNormalizedExtractionFields(rows);
}

function doc(id: string, route: string, fields: Record<string, unknown>) {
  return {
    document_id: id,
    document_type: 'receipt',
    document_subtype: null,
    extracted_data: {
      kind: 'normalized_extraction',
      route,
      subtype: route,
      normalized_data: { fields },
    },
  };
}

function field(value: unknown) {
  return { value, presence: 'present' };
}

function claim(overrides: Partial<ReturnType<typeof claimBase>> = {}) {
  return {
    ...claimBase(),
    ...overrides,
  };
}

function claimBase() {
  return {
    id: claimId,
    claimantName: 'Dana Cohen',
    insuredName: 'Dana Cohen',
    incidentDate: '2026-05-02',
    currency: 'ILS' as string | null,
    createdAt: '2026-05-06T00:00:00Z',
    metadata: {
      policy_start_date: '2026-05-01',
      policy_end_date: '2026-05-31',
    },
  };
}

function rule(
  payload: ReturnType<typeof runDateValidationLayer>['payload'],
  ruleId: string,
) {
  return payload.rules.find((candidate) => candidate.rule_id === ruleId);
}

function extractionCompletedEvent(): ClaimExtractionCompletedEvent {
  return {
    name: 'claim/extraction.completed',
    data: { claimId, passNumber: 1 },
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

class FakeValidationSupabase {
  claim = {
    id: claimId,
    claimant_name: 'Dana Cohen',
    insured_name: 'Dana Cohen',
    incident_date: '2026-05-02',
    currency: 'ILS',
    created_at: '2026-05-06T00:00:00Z',
    metadata: {
      policy_start_date: '2026-05-01',
      policy_end_date: '2026-05-31',
    },
  };
  documents = [
    {
      id: 'd1',
      document_type: 'receipt',
      document_subtype: 'general_receipt',
      extracted_data: {
        kind: 'normalized_extraction',
        route: 'receipt_general',
        subtype: 'receipt_general',
        normalized_data: {
          fields: {
            purchaser_name: field('Dana Cohen'),
            transaction_date: field('2026-05-03'),
            total_amount: field(100),
            currency: field('ILS'),
          },
        },
      },
    },
    {
      id: 'd2',
      document_type: 'flight_doc',
      document_subtype: 'boarding_pass',
      extracted_data: {
        kind: 'normalized_extraction',
        route: 'boarding_pass',
        subtype: 'boarding_pass',
        normalized_data: {
          fields: {
            passenger_name: field('Dana Cohen'),
            flight_date: field('2026-05-02'),
          },
        },
      },
    },
  ];
  pass = { claim_id: claimId, pass_number: 2, status: 'pending' };
  claimValidations: Record<string, unknown>[] = [];
  auditLog: Record<string, unknown>[] = [];

  from(table: string) {
    return new FakeValidationQuery(this, table);
  }
}

class FakeValidationQuery {
  private payload: Record<string, unknown> | null = null;
  private filters = new Map<string, unknown>();

  constructor(
    private readonly client: FakeValidationSupabase,
    private readonly table: string,
  ) {}

  select(_columns: string) {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.set(column, value);
    return this;
  }

  upsert(payload: Record<string, unknown>) {
    this.payload = payload;
    if (this.table === 'passes') {
      this.client.pass = { ...this.client.pass, ...payload };
    }
    if (this.table === 'claim_validations') {
      this.client.claimValidations.push(payload);
    }
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.payload = payload;
    if (this.table === 'passes') {
      this.client.pass = { ...this.client.pass, ...payload };
    }
    return this;
  }

  async insert(payload: Record<string, unknown>) {
    if (this.table === 'audit_log') this.client.auditLog.push(payload);
    return { error: null };
  }

  async maybeSingle() {
    if (this.table === 'claims')
      return { data: this.client.claim, error: null };
    if (this.table === 'passes') return { data: this.client.pass, error: null };
    return { data: this.payload, error: null };
  }

  then(resolve: (value: { data: unknown; error: null }) => void) {
    if (this.table === 'documents') {
      resolve({ data: this.client.documents, error: null });
      return;
    }
    resolve({ data: null, error: null });
  }
}
