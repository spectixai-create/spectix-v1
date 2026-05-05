import { describe, expect, it, vi } from 'vitest';

import {
  NormalizedExtractorLLMError,
  NormalizedExtractorPreCallError,
  buildExtractionSystemPrompt,
  extractBoardingPassNormalizedFromStorage,
  extractFlightBookingOrTicketNormalizedFromStorage,
  extractHotelLetterNormalizedFromStorage,
  extractMedicalVisitNormalizedFromStorage,
  extractPoliceReportNormalizedFromStorage,
  extractReceiptGeneralNormalizedFromStorage,
  extractWitnessLetterNormalizedFromStorage,
} from '@/lib/llm/extract/normalized';
import { parseClaudeJSON } from '@/lib/llm/client';
import type {
  NormalizedExtractionEnvelope,
  SupportedMvpExtractionSubtype,
} from '@/lib/extraction-contracts';

type Extractor = (
  input: { documentId: string; fileName: string },
  deps?: {
    supabaseAdmin?: never;
    callClaude?: never;
  },
) => Promise<unknown>;

const routeCases: Array<{
  subtype: SupportedMvpExtractionSubtype;
  requiredField: string;
  extract: Extractor;
}> = [
  {
    subtype: 'receipt_general',
    requiredField: 'merchant_name',
    extract: extractReceiptGeneralNormalizedFromStorage as Extractor,
  },
  {
    subtype: 'police_report',
    requiredField: 'police_agency_or_station',
    extract: extractPoliceReportNormalizedFromStorage as Extractor,
  },
  {
    subtype: 'medical_visit',
    requiredField: 'visit_date',
    extract: extractMedicalVisitNormalizedFromStorage as Extractor,
  },
  {
    subtype: 'hotel_letter',
    requiredField: 'hotel_or_property_name',
    extract: extractHotelLetterNormalizedFromStorage as Extractor,
  },
  {
    subtype: 'flight_booking_or_ticket',
    requiredField: 'passenger_name',
    extract: extractFlightBookingOrTicketNormalizedFromStorage as Extractor,
  },
  {
    subtype: 'boarding_pass',
    requiredField: 'passenger_name',
    extract: extractBoardingPassNormalizedFromStorage as Extractor,
  },
  {
    subtype: 'witness_letter',
    requiredField: 'statement_summary',
    extract: extractWitnessLetterNormalizedFromStorage as Extractor,
  },
];

describe('normalized MVP extractors', () => {
  it.each(routeCases)(
    '$subtype success returns a validated envelope',
    async ({ subtype, extract }) => {
      const result = (await extract(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: fakeClaude(modelPayload(subtype)) as never,
      })) as { data: NormalizedExtractionEnvelope; costUsd: number };

      expect(result.data).toMatchObject({
        kind: 'normalized_extraction',
        route: subtype,
        subtype,
        status: 'completed',
        source_document_id: 'doc-id',
        normalized_data: { subtype },
      });
      expect(result.costUsd).toBeGreaterThan(0);
    },
  );

  it.each(routeCases)(
    '$subtype prompt is generated from contract field specs',
    ({ subtype, requiredField }) => {
      const prompt = buildExtractionSystemPrompt(subtype);

      expect(prompt).toContain(`Normalized subtype: ${subtype}`);
      expect(prompt).toContain(requiredField);
    },
  );

  it('police_report normalizes visible incident date evidence into report_or_filing_date', async () => {
    const payload = modelPayload('police_report');
    const fields = payload.normalized_data.fields as Record<string, unknown>;
    delete fields.report_or_filing_date;
    fields.incident_date = present('2026-05-03');

    const result = (await extractPoliceReportNormalizedFromStorage(
      baseInput(),
      {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: fakeClaude(payload) as never,
      },
    )) as { data: NormalizedExtractionEnvelope };

    expect(normalizedFields(result).report_or_filing_date).toMatchObject({
      presence: 'present',
      value: '2026-05-03',
    });
  });

  it('police_report prompt documents date synonym mapping without loosening the contract', () => {
    const prompt = buildExtractionSystemPrompt('police_report');

    expect(prompt).toContain('report_or_filing_date');
    expect(prompt).toContain('incident date');
    expect(prompt).toContain('Do not invent report_or_filing_date');
  });

  it('boarding_pass normalizes departure datetime into flight_date', async () => {
    const payload = modelPayload('boarding_pass');
    const fields = payload.normalized_data.fields as Record<string, unknown>;
    delete fields.flight_date;
    fields.departure_datetime = present('2026-05-03T10:00:00+03:00');

    const result = (await extractBoardingPassNormalizedFromStorage(
      baseInput(),
      {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: fakeClaude(payload) as never,
      },
    )) as { data: NormalizedExtractionEnvelope };

    expect(normalizedFields(result).flight_date).toMatchObject({
      presence: 'present',
      value: '2026-05-03',
    });
  });

  it('boarding_pass prompt documents date synonym mapping without loosening the contract', () => {
    const prompt = buildExtractionSystemPrompt('boarding_pass');

    expect(prompt).toContain('flight_date');
    expect(prompt).toContain('departure/boarding datetime');
    expect(prompt).toContain('Do not invent flight_date');
  });

  it('boarding_pass does not fabricate flight_date from time-only evidence', async () => {
    const payload = modelPayload('boarding_pass');
    const fields = payload.normalized_data.fields as Record<string, unknown>;
    delete fields.flight_date;
    fields.departure_datetime = present('10:00');

    await expect(
      extractBoardingPassNormalizedFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: fakeClaude(payload) as never,
      }),
    ).rejects.toBeInstanceOf(NormalizedExtractorLLMError);
  });

  it.each(routeCases)(
    '$subtype tolerates fenced/prose dirty JSON',
    async ({ subtype, extract }) => {
      const raw = `Model note before JSON\n\`\`\`json\n${JSON.stringify(
        modelPayload(subtype),
      )}\n\`\`\`\nignored tail`;

      const result = (await extract(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: fakeClaudeFromRaw(raw) as never,
      })) as { data: NormalizedExtractionEnvelope };

      expect(result.data.normalized_data?.subtype).toBe(subtype);
    },
  );

  it.each(routeCases)(
    '$subtype pre-call failure is controlled',
    async ({ extract }) => {
      await expect(
        extract(baseInput(), {
          supabaseAdmin: fakeSupabase({ filePath: null }) as never,
        }),
      ).rejects.toBeInstanceOf(NormalizedExtractorPreCallError);
    },
  );

  it.each(routeCases)(
    '$subtype LLM API failure is controlled',
    async ({ extract }) => {
      await expect(
        extract(baseInput(), {
          supabaseAdmin: fakeSupabase() as never,
          callClaude: throwingClaude() as never,
        }),
      ).rejects.toBeInstanceOf(NormalizedExtractorLLMError);
    },
  );

  it.each(routeCases)(
    '$subtype malformed JSON is controlled',
    async ({ extract }) => {
      await expect(
        extract(baseInput(), {
          supabaseAdmin: fakeSupabase() as never,
          callClaude: parsedNullClaude() as never,
        }),
      ).rejects.toBeInstanceOf(NormalizedExtractorLLMError);
    },
  );

  it.each(routeCases)(
    '$subtype schema validation failure is controlled',
    async ({ subtype, extract }) => {
      const payload = {
        ...modelPayload(subtype),
        normalized_data: {
          ...modelPayload(subtype).normalized_data,
          subtype: 'receipt_general',
        },
      };

      if (subtype === 'receipt_general') {
        payload.normalized_data.subtype = 'police_report';
      }

      await expect(
        extract(baseInput(), {
          supabaseAdmin: fakeSupabase() as never,
          callClaude: fakeClaude(payload) as never,
        }),
      ).rejects.toBeInstanceOf(NormalizedExtractorLLMError);
    },
  );

  it.each(routeCases)(
    '$subtype low-confidence valid payload records warning',
    async ({ subtype, extract }) => {
      const result = (await extract(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: fakeClaude({
          ...modelPayload(subtype),
          confidence: 0.4,
        }) as never,
      })) as { data: NormalizedExtractionEnvelope };

      expect(result.data.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'low_confidence' }),
        ]),
      );
    },
  );

  it.each(routeCases)(
    '$subtype missing required field fails validation',
    async ({ subtype, requiredField, extract }) => {
      const payload = modelPayload(subtype);
      delete (payload.normalized_data.fields as Record<string, unknown>)[
        requiredField
      ];

      await expect(
        extract(baseInput(), {
          supabaseAdmin: fakeSupabase() as never,
          callClaude: fakeClaude(payload) as never,
        }),
      ).rejects.toBeInstanceOf(NormalizedExtractorLLMError);
    },
  );
});

function baseInput() {
  return { documentId: 'doc-id', fileName: 'evidence.pdf' };
}

function normalizedFields(result: { data: NormalizedExtractionEnvelope }) {
  return (
    result.data.normalized_data as unknown as {
      fields: Record<string, unknown>;
    }
  ).fields;
}

function modelPayload(subtype: SupportedMvpExtractionSubtype) {
  return {
    confidence: 0.9,
    warnings: [],
    normalized_data: normalizedData(subtype),
  };
}

function normalizedData(subtype: SupportedMvpExtractionSubtype) {
  switch (subtype) {
    case 'receipt_general':
      return {
        subtype,
        fields: {
          merchant_name: present('Pharmacy'),
          transaction_date: present('2026-04-30'),
          total_amount: present(125.5),
          currency: present('ILS'),
          expense_summary_or_category: present('medicine'),
          document_confidence: present(0.92),
        },
      };
    case 'police_report':
      return {
        subtype,
        fields: {
          report_or_filing_date: present('2026-04-30'),
          incident_date: notPresent(),
          report_or_reference_number: notPresent(),
          police_agency_or_station: present('Central Station'),
          incident_location: present('Athens'),
          incident_summary: present('Theft report filed by claimant.'),
          named_claimant_or_persons: present(['Test Claimant']),
        },
      };
    case 'medical_visit':
      return {
        subtype,
        fields: {
          visit_date: present('2026-04-30'),
          provider_name: present('City Clinic'),
          patient_name: notPresent(),
          reason_or_diagnosis_summary: present('Minor illness'),
          treatment_or_assessment_summary: present('Examined and discharged'),
          document_confidence: present(0.9),
        },
      };
    case 'hotel_letter':
      return {
        subtype,
        fields: {
          hotel_or_property_name: present('Hotel Central'),
          guest_name: notPresent(),
          stay_dates_or_incident_date: present('2026-04-29'),
          letter_date: present('2026-04-30'),
          statement_summary: present('Hotel confirms reported incident.'),
          document_confidence: present(0.88),
        },
      };
    case 'flight_booking_or_ticket':
      return {
        subtype,
        fields: {
          passenger_name: present('Test Claimant'),
          airline_or_carrier: present('Example Air'),
          flight_number: notPresent(),
          departure_airport_or_city: present('TLV'),
          arrival_airport_or_city: present('ATH'),
          departure_datetime: present('2026-04-29T08:30:00Z'),
          booking_or_reference_number: notPresent(),
          document_confidence: present(0.91),
        },
      };
    case 'boarding_pass':
      return {
        subtype,
        fields: {
          passenger_name: present('Test Claimant'),
          airline_or_carrier: present('Example Air'),
          flight_number: present('EA123'),
          departure_airport: present('TLV'),
          arrival_airport: present('ATH'),
          flight_date: present('2026-04-29'),
          boarding_or_departure_time: notPresent(),
          document_confidence: present(0.93),
        },
      };
    case 'witness_letter':
      return {
        subtype,
        fields: {
          witness_name: notPresent(),
          letter_date: notPresent(),
          relationship_to_claimant: notPresent(),
          incident_date_or_timeframe: notPresent(),
          statement_summary: present('Witness describes the incident.'),
          document_confidence: present(0.86),
        },
      };
  }
}

function present<T>(value: T) {
  return { presence: 'present' as const, value, confidence: 0.9 };
}

function notPresent() {
  return { presence: 'not_present' as const, value: null, confidence: 0.8 };
}

function fakeClaude(parsed: Record<string, unknown>) {
  return vi.fn(async () => ({
    parsed,
    parseError: null,
    rawText: JSON.stringify(parsed),
    modelId: 'test-model',
    inputTokens: 100,
    outputTokens: 25,
    costUsd: 0.000675,
  }));
}

function fakeClaudeFromRaw(rawText: string) {
  return vi.fn(async () => {
    const { parsed, error } = parseClaudeJSON(rawText);

    return {
      parsed,
      parseError: error,
      rawText,
      modelId: 'test-model',
      inputTokens: 100,
      outputTokens: 25,
      costUsd: 0.000675,
    };
  });
}

function throwingClaude() {
  return vi.fn(async () => {
    throw new Error('sdk down');
  });
}

function parsedNullClaude() {
  return vi.fn(async () => ({
    parsed: null,
    parseError: 'bad json',
    rawText: '{',
    modelId: 'test-model',
    inputTokens: 1,
    outputTokens: 1,
    costUsd: 0.000001,
  }));
}

function fakeSupabase(options?: {
  mimeType?: string;
  filePath?: string | null;
  downloadError?: boolean;
}) {
  return {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        single() {
          return Promise.resolve({
            data: {
              file_path:
                options && 'filePath' in options
                  ? options.filePath
                  : 'claims/claim/doc.pdf',
              mime_type: options?.mimeType ?? 'application/pdf',
            },
            error: null,
          });
        },
      };
    },
    storage: {
      from() {
        return {
          download() {
            if (options?.downloadError) {
              return Promise.resolve({
                data: null,
                error: { message: 'download failed' },
              });
            }

            return Promise.resolve({
              data: new Blob(['fake document bytes']),
              error: null,
            });
          },
        };
      },
    },
  };
}
