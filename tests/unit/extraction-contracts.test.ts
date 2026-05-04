import { describe, expect, it } from 'vitest';

import {
  NORMALIZED_EXTRACTION_SCHEMA_VERSION,
  SUPPORTED_MVP_EXTRACTION_SUBTYPES,
  type NormalizedExtractionEnvelope,
  type SupportedMvpExtractionSubtype,
  validateNormalizedExtractionEnvelope,
} from '@/lib/extraction-contracts';
import type { ExtractedData } from '@/lib/types';

const sourceDocumentId = '22222222-2222-4222-8222-222222222222';

describe('SPRINT-002A extraction schema contracts', () => {
  it('supported subtype list includes exactly the 7 MVP subtypes', () => {
    expect(SUPPORTED_MVP_EXTRACTION_SUBTYPES).toEqual([
      'receipt_general',
      'police_report',
      'medical_visit',
      'hotel_letter',
      'flight_booking_or_ticket',
      'boarding_pass',
      'witness_letter',
    ]);
  });

  it('every completed payload must include normalized envelope fields', () => {
    const payload = completedEnvelope('receipt_general');

    expect(validateNormalizedExtractionEnvelope(payload)).toMatchObject({
      ok: true,
    });
    expect(payload).toMatchObject({
      kind: 'normalized_extraction',
      route: 'receipt_general',
      subtype: 'receipt_general',
      schema_version: NORMALIZED_EXTRACTION_SCHEMA_VERSION,
      status: 'completed',
      normalized_data: expect.any(Object),
      confidence: expect.any(Number),
      warnings: expect.any(Array),
      source_document_id: sourceDocumentId,
      extraction_completed_at: expect.any(String),
    });
  });

  it('schema_version is required', () => {
    const payload = completedEnvelope('receipt_general') as Record<
      string,
      unknown
    >;
    delete payload.schema_version;

    const result = validateNormalizedExtractionEnvelope(payload);

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      issues: [expect.objectContaining({ path: '$.schema_version' })],
    });
  });

  it('status must be completed, failed, or deferred', () => {
    const payload = {
      ...completedEnvelope('receipt_general'),
      status: 'done',
    };

    const result = validateNormalizedExtractionEnvelope(payload);

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      issues: [expect.objectContaining({ code: 'invalid_status' })],
    });
  });

  it.each([
    'receipt_general',
    'police_report',
    'medical_visit',
    'hotel_letter',
    'flight_booking_or_ticket',
    'boarding_pass',
    'witness_letter',
  ] satisfies SupportedMvpExtractionSubtype[])(
    '%s valid payload passes',
    (subtype) => {
      const result = validateNormalizedExtractionEnvelope(
        completedEnvelope(subtype),
      );

      expect(result).toMatchObject({ ok: true, blocking: false });
    },
  );

  it('unsupported subtype is deferred and not completed', () => {
    const deferred = {
      ...baseEnvelope(),
      route: 'receipt_general',
      subtype: 'passport',
      status: 'deferred',
      deferred_reason: 'unsupported_subtype:passport',
    };
    const completed = {
      ...deferred,
      status: 'completed',
      normalized_data: completedEnvelope('receipt_general').normalized_data,
      confidence: 0.9,
      extraction_completed_at: '2026-05-04T00:00:00.000Z',
    };

    expect(validateNormalizedExtractionEnvelope(deferred)).toMatchObject({
      ok: true,
    });
    expect(validateNormalizedExtractionEnvelope(completed)).toMatchObject({
      ok: false,
      blocking: true,
    });
  });

  it('malformed payload fails validation', () => {
    const result = validateNormalizedExtractionEnvelope('not-json-object');

    expect(result).toMatchObject({
      ok: false,
      blocking: true,
      issues: [expect.objectContaining({ code: 'malformed_payload' })],
    });
  });

  it('route/subtype mismatch fails validation', () => {
    const payload = {
      ...completedEnvelope('receipt_general'),
      route: 'police_report',
    };

    const result = validateNormalizedExtractionEnvelope(payload);

    expect(result).toMatchObject({
      ok: false,
      blocking: true,
      issues: [expect.objectContaining({ code: 'route_subtype_mismatch' })],
    });
  });

  it('missing required field fails unless represented as controlled deferred', () => {
    const missing = completedEnvelope('receipt_general');
    delete (
      missing.normalized_data.fields as unknown as Record<string, unknown>
    ).merchant_name;
    const deferred = {
      ...baseEnvelope(),
      route: 'receipt_general',
      subtype: 'receipt_general',
      status: 'deferred',
      deferred_reason: 'required_field_unavailable:merchant_name',
    };

    expect(validateNormalizedExtractionEnvelope(missing)).toMatchObject({
      ok: false,
      blocking: true,
    });
    expect(validateNormalizedExtractionEnvelope(deferred)).toMatchObject({
      ok: true,
    });
  });

  it('if-present required fields can explicitly represent not_present', () => {
    const payload = completedEnvelope('police_report');
    (
      payload.normalized_data.fields as unknown as Record<string, unknown>
    ).incident_date = notPresent();

    const result = validateNormalizedExtractionEnvelope(payload);

    expect(result).toMatchObject({ ok: true, blocking: false });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'field_not_present',
          field: 'incident_date',
        }),
      ]),
    );
  });

  it('low-confidence valid payload is non-blocking warning', () => {
    const payload = {
      ...completedEnvelope('receipt_general'),
      confidence: 0.4,
    };
    const result = validateNormalizedExtractionEnvelope(payload);

    expect(result).toMatchObject({ ok: true, blocking: false });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'low_confidence' }),
      ]),
    );
  });

  it('failed payload includes blocking failure details', () => {
    const payload = {
      ...baseEnvelope(),
      route: 'receipt_general',
      subtype: 'receipt_general',
      status: 'failed',
      failure: {
        code: 'missing_required_field',
        message: 'merchant_name missing',
        blocking: true,
        field: 'merchant_name',
      },
    };

    expect(validateNormalizedExtractionEnvelope(payload)).toMatchObject({
      ok: true,
    });
  });

  it('deferred payload includes reason', () => {
    const payload = {
      ...baseEnvelope(),
      route: 'receipt_general',
      subtype: 'receipt_general',
      status: 'deferred',
      deferred_reason: 'unsupported_route_until_sprint_002b',
    };

    expect(validateNormalizedExtractionEnvelope(payload)).toMatchObject({
      ok: true,
    });
  });

  it('model_metadata does not require or expose secrets', () => {
    const safe = {
      ...completedEnvelope('receipt_general'),
      model_metadata: {
        model_id: 'claude-sonnet',
        input_tokens: 100,
        output_tokens: 25,
        cost_usd: 0.01,
      },
    };
    const unsafe = {
      ...safe,
      model_metadata: {
        model_id: 'claude-sonnet',
        api_key: 'should-not-be-here',
      },
    };

    expect(validateNormalizedExtractionEnvelope(safe)).toMatchObject({
      ok: true,
    });
    expect(validateNormalizedExtractionEnvelope(unsafe)).toMatchObject({
      ok: false,
      blocking: true,
    });
  });

  it('classifier/subtype metadata preservation is compatible with the envelope', () => {
    const payload = {
      ...completedEnvelope('receipt_general'),
      classifier: { document_type: 'receipt', confidence: 0.91 },
      subtype_classifier: {
        document_subtype: 'general_receipt',
        confidence: 0.88,
      },
    };
    const extractedData: ExtractedData = payload;

    expect(validateNormalizedExtractionEnvelope(extractedData)).toMatchObject({
      ok: true,
    });
  });
});

function baseEnvelope() {
  return {
    kind: 'normalized_extraction',
    schema_version: NORMALIZED_EXTRACTION_SCHEMA_VERSION,
    source_document_id: sourceDocumentId,
    warnings: [],
  };
}

function completedEnvelope(
  subtype: SupportedMvpExtractionSubtype,
): NormalizedExtractionEnvelope & { status: 'completed' } {
  return {
    ...baseEnvelope(),
    route: subtype,
    subtype,
    status: 'completed',
    confidence: 0.92,
    extraction_completed_at: '2026-05-04T00:00:00.000Z',
    normalized_data: normalizedData(subtype),
  } as NormalizedExtractionEnvelope & { status: 'completed' };
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
