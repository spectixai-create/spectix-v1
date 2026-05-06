/**
 * SPRINT-002A normalized extraction contracts.
 *
 * This module defines JSON-serializable contracts only. SPRINT-002B will wire
 * dedicated subtype prompts/routes to produce these envelopes.
 */

export const NORMALIZED_EXTRACTION_SCHEMA_VERSION = 'sprint-002a.v1' as const;
export const LOW_CONFIDENCE_WARNING_THRESHOLD = 0.55;

export const SUPPORTED_MVP_EXTRACTION_SUBTYPES = [
  'receipt_general',
  'police_report',
  'medical_visit',
  'hotel_letter',
  'flight_booking_or_ticket',
  'boarding_pass',
  'witness_letter',
] as const;

export type SupportedMvpExtractionSubtype =
  (typeof SUPPORTED_MVP_EXTRACTION_SUBTYPES)[number];

export type NormalizedExtractionStatus = 'completed' | 'failed' | 'deferred';

export type NormalizedExtractionRoute =
  | 'receipt_general'
  | 'police_report'
  | 'medical_visit'
  | 'hotel_letter'
  | 'flight_booking_or_ticket'
  | 'boarding_pass'
  | 'witness_letter';

export type NormalizedFieldPresence = 'present' | 'not_present' | 'unknown';

export type NormalizedField<T> =
  | {
      presence: 'present';
      value: T;
      confidence?: number;
    }
  | {
      presence: 'not_present' | 'unknown';
      value: null;
      confidence?: number;
    };

export type NormalizedStringField = NormalizedField<string>;
export type NormalizedNumberField = NormalizedField<number>;
export type NormalizedStringArrayField = NormalizedField<string[]>;
export type NormalizedLineItemArrayField = NormalizedField<
  NormalizedReceiptLineItem[]
>;

export type NormalizedExtractionWarningCode =
  | 'low_confidence'
  | 'field_not_present'
  | 'field_unknown'
  | 'controlled_deferred'
  | 'unsupported_subtype';

export interface NormalizedExtractionWarning {
  code: NormalizedExtractionWarningCode;
  message: string;
  field?: string;
}

export interface NormalizedExtractionFailure {
  code: string;
  message: string;
  blocking: boolean;
  field?: string;
}

export interface NormalizedExtractionModelMetadata {
  model_id?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  prompt_id?: string;
  raw_response_id?: string;
}

type NormalizedExtractionEnvelopeBase = {
  kind: 'normalized_extraction';
  route: NormalizedExtractionRoute;
  subtype: SupportedMvpExtractionSubtype;
  schema_version: typeof NORMALIZED_EXTRACTION_SCHEMA_VERSION;
  source_document_id: string;
  confidence: number;
  warnings: NormalizedExtractionWarning[];
  model_metadata?: NormalizedExtractionModelMetadata;
  classifier?: Record<string, unknown>;
  subtype_classifier?: Record<string, unknown>;
  document_processing?: {
    phase: string;
    terminal: boolean;
    blocking_failure: boolean;
  };
};

export type CompletedNormalizedExtractionEnvelope =
  NormalizedExtractionEnvelopeBase & {
    status: 'completed';
    normalized_data: NormalizedExtractionDataBySubtype;
    extraction_completed_at: string;
  };

export type FailedNormalizedExtractionEnvelope = Omit<
  NormalizedExtractionEnvelopeBase,
  'confidence'
> & {
  status: 'failed';
  confidence?: number;
  normalized_data?: Partial<NormalizedExtractionDataBySubtype>;
  failure: NormalizedExtractionFailure;
  extraction_completed_at?: string;
};

export type DeferredNormalizedExtractionEnvelope = Omit<
  NormalizedExtractionEnvelopeBase,
  'confidence' | 'route' | 'subtype'
> & {
  status: 'deferred';
  route: NormalizedExtractionRoute | string;
  subtype: SupportedMvpExtractionSubtype | string | null;
  confidence?: number;
  normalized_data?: Partial<NormalizedExtractionDataBySubtype>;
  deferred_reason: string;
  extraction_completed_at?: string;
};

export type NormalizedExtractionEnvelope =
  | CompletedNormalizedExtractionEnvelope
  | FailedNormalizedExtractionEnvelope
  | DeferredNormalizedExtractionEnvelope;

export interface NormalizedReceiptLineItem {
  description: NormalizedStringField;
  quantity?: NormalizedNumberField;
  unit_price?: NormalizedNumberField;
  total?: NormalizedNumberField;
}

export interface NormalizedReceiptGeneralData {
  merchant_name: NormalizedStringField;
  transaction_date: NormalizedStringField;
  total_amount: NormalizedNumberField;
  currency: NormalizedStringField;
  expense_summary_or_category: NormalizedStringField;
  document_confidence: NormalizedNumberField;
  tax_amount?: NormalizedNumberField;
  payment_method?: NormalizedStringField;
  receipt_number?: NormalizedStringField;
  location?: NormalizedStringField;
  purchaser_name?: NormalizedStringField;
  line_items?: NormalizedLineItemArrayField;
}

export interface NormalizedPoliceReportData {
  report_or_filing_date: NormalizedStringField;
  incident_date: NormalizedStringField;
  report_or_reference_number: NormalizedStringField;
  police_agency_or_station: NormalizedStringField;
  incident_location: NormalizedStringField;
  incident_summary: NormalizedStringField;
  named_claimant_or_persons: NormalizedStringArrayField;
  officer_name?: NormalizedStringField;
  case_status?: NormalizedStringField;
  loss_theft_damage_type?: NormalizedStringField;
  property_list?: NormalizedStringArrayField;
  witness_references?: NormalizedStringArrayField;
}

export interface NormalizedMedicalVisitData {
  visit_date: NormalizedStringField;
  provider_name: NormalizedStringField;
  patient_name: NormalizedStringField;
  reason_or_diagnosis_summary: NormalizedStringField;
  treatment_or_assessment_summary: NormalizedStringField;
  document_confidence: NormalizedNumberField;
  provider_address?: NormalizedStringField;
  doctor_name?: NormalizedStringField;
  diagnosis_codes?: NormalizedStringArrayField;
  prescribed_medication?: NormalizedStringArrayField;
  follow_up_instructions?: NormalizedStringField;
  invoice_amount?: NormalizedNumberField;
}

export interface NormalizedHotelLetterData {
  hotel_or_property_name: NormalizedStringField;
  guest_name: NormalizedStringField;
  stay_dates_or_incident_date: NormalizedStringField;
  letter_date: NormalizedStringField;
  statement_summary: NormalizedStringField;
  document_confidence: NormalizedNumberField;
  reservation_number?: NormalizedStringField;
  room_number?: NormalizedStringField;
  staff_signer_name_or_title?: NormalizedStringField;
  contact_details?: NormalizedStringField;
  incident_description?: NormalizedStringField;
}

export interface NormalizedFlightBookingOrTicketData {
  passenger_name: NormalizedStringField;
  airline_or_carrier: NormalizedStringField;
  flight_number: NormalizedStringField;
  departure_airport_or_city: NormalizedStringField;
  arrival_airport_or_city: NormalizedStringField;
  departure_datetime: NormalizedStringField;
  booking_or_reference_number: NormalizedStringField;
  document_confidence: NormalizedNumberField;
  arrival_datetime?: NormalizedStringField;
  ticket_number?: NormalizedStringField;
  fare_amount?: NormalizedNumberField;
  currency?: NormalizedStringField;
  seat_or_class?: NormalizedStringField;
  travel_agency?: NormalizedStringField;
}

export interface NormalizedBoardingPassData {
  passenger_name: NormalizedStringField;
  airline_or_carrier: NormalizedStringField;
  flight_number: NormalizedStringField;
  departure_airport: NormalizedStringField;
  arrival_airport: NormalizedStringField;
  flight_date: NormalizedStringField;
  boarding_or_departure_time: NormalizedStringField;
  document_confidence: NormalizedNumberField;
  seat?: NormalizedStringField;
  gate?: NormalizedStringField;
  boarding_group?: NormalizedStringField;
  sequence_number?: NormalizedStringField;
  booking_reference?: NormalizedStringField;
}

export interface NormalizedWitnessLetterData {
  witness_name: NormalizedStringField;
  letter_date: NormalizedStringField;
  relationship_to_claimant: NormalizedStringField;
  incident_date_or_timeframe: NormalizedStringField;
  statement_summary: NormalizedStringField;
  document_confidence: NormalizedNumberField;
  witness_contact_details?: NormalizedStringField;
  signature_presence?: NormalizedStringField;
  location?: NormalizedStringField;
  supporting_facts?: NormalizedStringArrayField;
  contradictions_or_uncertainty_flags?: NormalizedStringArrayField;
}

export type NormalizedExtractionDataBySubtype =
  | {
      subtype: 'receipt_general';
      fields: NormalizedReceiptGeneralData;
    }
  | {
      subtype: 'police_report';
      fields: NormalizedPoliceReportData;
    }
  | {
      subtype: 'medical_visit';
      fields: NormalizedMedicalVisitData;
    }
  | {
      subtype: 'hotel_letter';
      fields: NormalizedHotelLetterData;
    }
  | {
      subtype: 'flight_booking_or_ticket';
      fields: NormalizedFlightBookingOrTicketData;
    }
  | {
      subtype: 'boarding_pass';
      fields: NormalizedBoardingPassData;
    }
  | {
      subtype: 'witness_letter';
      fields: NormalizedWitnessLetterData;
    };

export type NormalizedExtractionValidationIssueCode =
  | 'malformed_payload'
  | 'missing_envelope_field'
  | 'invalid_schema_version'
  | 'unsupported_subtype'
  | 'invalid_status'
  | 'route_subtype_mismatch'
  | 'missing_normalized_data'
  | 'normalized_data_subtype_mismatch'
  | 'missing_required_field'
  | 'invalid_field_shape'
  | 'missing_failure_details'
  | 'missing_deferred_reason'
  | 'unsafe_model_metadata';

export interface NormalizedExtractionValidationIssue {
  code: NormalizedExtractionValidationIssueCode;
  message: string;
  path: string;
  blocking: boolean;
}

export type NormalizedExtractionValidationResult =
  | {
      ok: true;
      payload: NormalizedExtractionEnvelope;
      warnings: NormalizedExtractionWarning[];
      blocking: false;
    }
  | {
      ok: false;
      issues: NormalizedExtractionValidationIssue[];
      warnings: NormalizedExtractionWarning[];
      blocking: boolean;
      deferred?: DeferredNormalizedExtractionEnvelope;
    };

export type NormalizedExtractionFieldType =
  | 'string'
  | 'number'
  | 'string_array'
  | 'line_item_array';

export type NormalizedExtractionRequiredFieldSpec = {
  type: NormalizedExtractionFieldType;
  allowNotPresent: boolean;
};

const ROUTE_BY_SUBTYPE: Record<
  SupportedMvpExtractionSubtype,
  NormalizedExtractionRoute
> = {
  receipt_general: 'receipt_general',
  police_report: 'police_report',
  medical_visit: 'medical_visit',
  hotel_letter: 'hotel_letter',
  flight_booking_or_ticket: 'flight_booking_or_ticket',
  boarding_pass: 'boarding_pass',
  witness_letter: 'witness_letter',
};

const REQUIRED_FIELDS_BY_SUBTYPE: Record<
  SupportedMvpExtractionSubtype,
  Record<string, NormalizedExtractionRequiredFieldSpec>
> = {
  receipt_general: {
    merchant_name: { type: 'string', allowNotPresent: false },
    transaction_date: { type: 'string', allowNotPresent: false },
    total_amount: { type: 'number', allowNotPresent: false },
    currency: { type: 'string', allowNotPresent: false },
    expense_summary_or_category: { type: 'string', allowNotPresent: false },
    document_confidence: { type: 'number', allowNotPresent: false },
  },
  police_report: {
    report_or_filing_date: { type: 'string', allowNotPresent: false },
    incident_date: { type: 'string', allowNotPresent: true },
    report_or_reference_number: { type: 'string', allowNotPresent: true },
    police_agency_or_station: { type: 'string', allowNotPresent: false },
    incident_location: { type: 'string', allowNotPresent: false },
    incident_summary: { type: 'string', allowNotPresent: false },
    named_claimant_or_persons: { type: 'string_array', allowNotPresent: true },
  },
  medical_visit: {
    visit_date: { type: 'string', allowNotPresent: false },
    provider_name: { type: 'string', allowNotPresent: false },
    patient_name: { type: 'string', allowNotPresent: true },
    reason_or_diagnosis_summary: { type: 'string', allowNotPresent: false },
    treatment_or_assessment_summary: { type: 'string', allowNotPresent: false },
    document_confidence: { type: 'number', allowNotPresent: false },
  },
  hotel_letter: {
    hotel_or_property_name: { type: 'string', allowNotPresent: false },
    guest_name: { type: 'string', allowNotPresent: true },
    stay_dates_or_incident_date: { type: 'string', allowNotPresent: false },
    letter_date: { type: 'string', allowNotPresent: false },
    statement_summary: { type: 'string', allowNotPresent: false },
    document_confidence: { type: 'number', allowNotPresent: false },
  },
  flight_booking_or_ticket: {
    passenger_name: { type: 'string', allowNotPresent: false },
    airline_or_carrier: { type: 'string', allowNotPresent: false },
    flight_number: { type: 'string', allowNotPresent: true },
    departure_airport_or_city: { type: 'string', allowNotPresent: false },
    arrival_airport_or_city: { type: 'string', allowNotPresent: false },
    departure_datetime: { type: 'string', allowNotPresent: false },
    booking_or_reference_number: { type: 'string', allowNotPresent: true },
    document_confidence: { type: 'number', allowNotPresent: false },
  },
  boarding_pass: {
    passenger_name: { type: 'string', allowNotPresent: false },
    airline_or_carrier: { type: 'string', allowNotPresent: false },
    flight_number: { type: 'string', allowNotPresent: false },
    departure_airport: { type: 'string', allowNotPresent: false },
    arrival_airport: { type: 'string', allowNotPresent: false },
    flight_date: { type: 'string', allowNotPresent: false },
    boarding_or_departure_time: { type: 'string', allowNotPresent: true },
    document_confidence: { type: 'number', allowNotPresent: false },
  },
  witness_letter: {
    witness_name: { type: 'string', allowNotPresent: true },
    letter_date: { type: 'string', allowNotPresent: true },
    relationship_to_claimant: { type: 'string', allowNotPresent: true },
    incident_date_or_timeframe: { type: 'string', allowNotPresent: true },
    statement_summary: { type: 'string', allowNotPresent: false },
    document_confidence: { type: 'number', allowNotPresent: false },
  },
};

const OPTIONAL_FIELDS_BY_SUBTYPE: Record<
  SupportedMvpExtractionSubtype,
  readonly string[]
> = {
  receipt_general: [
    'tax_amount',
    'payment_method',
    'receipt_number',
    'location',
    'purchaser_name',
    'line_items',
  ],
  police_report: [
    'officer_name',
    'case_status',
    'loss_theft_damage_type',
    'property_list',
    'witness_references',
  ],
  medical_visit: [
    'provider_address',
    'doctor_name',
    'diagnosis_codes',
    'prescribed_medication',
    'follow_up_instructions',
    'invoice_amount',
  ],
  hotel_letter: [
    'reservation_number',
    'room_number',
    'staff_signer_name_or_title',
    'contact_details',
    'incident_description',
  ],
  flight_booking_or_ticket: [
    'arrival_datetime',
    'ticket_number',
    'fare_amount',
    'currency',
    'seat_or_class',
    'travel_agency',
  ],
  boarding_pass: [
    'seat',
    'gate',
    'boarding_group',
    'sequence_number',
    'booking_reference',
  ],
  witness_letter: [
    'witness_contact_details',
    'signature_presence',
    'location',
    'supporting_facts',
    'contradictions_or_uncertainty_flags',
  ],
};

const SECRET_METADATA_KEYS = [
  'api_key',
  'apikey',
  'authorization',
  'bearer',
  'password',
  'secret',
  'service_role',
  'token',
] as const;

export function isSupportedMvpExtractionSubtype(
  value: unknown,
): value is SupportedMvpExtractionSubtype {
  return (
    typeof value === 'string' &&
    (SUPPORTED_MVP_EXTRACTION_SUBTYPES as readonly string[]).includes(value)
  );
}

export function isNormalizedExtractionStatus(
  value: unknown,
): value is NormalizedExtractionStatus {
  return value === 'completed' || value === 'failed' || value === 'deferred';
}

export function expectedRouteForSubtype(
  subtype: SupportedMvpExtractionSubtype,
): NormalizedExtractionRoute {
  return ROUTE_BY_SUBTYPE[subtype];
}

export function getNormalizedExtractionFieldSpecs(
  subtype: SupportedMvpExtractionSubtype,
): {
  required: Record<string, NormalizedExtractionRequiredFieldSpec>;
  optional: readonly string[];
} {
  return {
    required: REQUIRED_FIELDS_BY_SUBTYPE[subtype],
    optional: OPTIONAL_FIELDS_BY_SUBTYPE[subtype],
  };
}

export function buildUnsupportedSubtypeDeferredEnvelope(input: {
  subtype: string | null;
  sourceDocumentId: string;
  route?: NormalizedExtractionRoute | string;
  reason?: string;
  warnings?: NormalizedExtractionWarning[];
}): DeferredNormalizedExtractionEnvelope {
  return {
    kind: 'normalized_extraction',
    route: input.route ?? 'unsupported',
    subtype: input.subtype,
    schema_version: NORMALIZED_EXTRACTION_SCHEMA_VERSION,
    status: 'deferred',
    source_document_id: input.sourceDocumentId,
    warnings: [
      ...(input.warnings ?? []),
      {
        code: 'unsupported_subtype',
        message: `Unsupported subtype deferred: ${input.subtype ?? 'null'}`,
      },
    ],
    deferred_reason:
      input.reason ?? `unsupported_subtype:${input.subtype ?? 'null'}`,
  };
}

export function validateNormalizedExtractionEnvelope(
  payload: unknown,
): NormalizedExtractionValidationResult {
  const issues: NormalizedExtractionValidationIssue[] = [];
  const warnings: NormalizedExtractionWarning[] = [];

  if (!isRecord(payload)) {
    return {
      ok: false,
      issues: [
        issue('malformed_payload', 'Payload must be an object.', '$', true),
      ],
      warnings,
      blocking: true,
    };
  }

  validateEnvelopeBase(payload, issues, warnings);

  const status = payload.status;
  const subtype = payload.subtype;
  const route = payload.route;

  if (isSupportedMvpExtractionSubtype(subtype) && typeof route === 'string') {
    const expectedRoute = expectedRouteForSubtype(subtype);
    if (route !== expectedRoute) {
      issues.push(
        issue(
          'route_subtype_mismatch',
          `Route ${route} does not match subtype ${subtype}.`,
          '$.route',
          true,
        ),
      );
    }
  }

  if (isRecord(payload.model_metadata)) {
    validateModelMetadata(payload.model_metadata, issues);
  }

  if (typeof payload.confidence === 'number') {
    if (
      payload.confidence >= 0 &&
      payload.confidence < LOW_CONFIDENCE_WARNING_THRESHOLD
    ) {
      warnings.push({
        code: 'low_confidence',
        message: 'Low confidence is non-blocking for a schema-valid payload.',
      });
    }
  }

  if (status === 'completed') {
    validateCompletedPayload(payload, issues, warnings);
  } else if (status === 'failed') {
    validateFailedPayload(payload, issues);
  } else if (status === 'deferred') {
    validateDeferredPayload(payload, issues);
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
      warnings,
      blocking: issues.some((entry) => entry.blocking),
    };
  }

  return {
    ok: true,
    payload: payload as NormalizedExtractionEnvelope,
    warnings,
    blocking: false,
  };
}

function validateEnvelopeBase(
  payload: Record<string, unknown>,
  issues: NormalizedExtractionValidationIssue[],
  warnings: NormalizedExtractionWarning[],
) {
  if (payload.kind !== 'normalized_extraction') {
    issues.push(
      issue(
        'missing_envelope_field',
        'kind must be normalized_extraction.',
        '$.kind',
        true,
      ),
    );
  }

  if (payload.schema_version !== NORMALIZED_EXTRACTION_SCHEMA_VERSION) {
    issues.push(
      issue(
        payload.schema_version === undefined
          ? 'missing_envelope_field'
          : 'invalid_schema_version',
        'schema_version is required and must match the current contract.',
        '$.schema_version',
        true,
      ),
    );
  }

  if (!isNormalizedExtractionStatus(payload.status)) {
    issues.push(
      issue(
        'invalid_status',
        'status must be completed, failed, or deferred.',
        '$.status',
        true,
      ),
    );
  }

  if (!isSupportedMvpExtractionSubtype(payload.subtype)) {
    if (payload.status === 'deferred') {
      warnings.push({
        code: 'unsupported_subtype',
        message: 'Unsupported subtype is represented as deferred.',
      });
    } else {
      issues.push(
        issue(
          'unsupported_subtype',
          'Unsupported subtype must be represented as deferred, not completed.',
          '$.subtype',
          true,
        ),
      );
    }
  }

  for (const field of ['route', 'source_document_id']) {
    if (typeof payload[field] !== 'string' || payload[field] === '') {
      issues.push(
        issue(
          'missing_envelope_field',
          `${field} is required.`,
          `$.${field}`,
          true,
        ),
      );
    }
  }

  if (
    payload.status === 'completed' &&
    (typeof payload.extraction_completed_at !== 'string' ||
      payload.extraction_completed_at === '')
  ) {
    issues.push(
      issue(
        'missing_envelope_field',
        'completed payloads require extraction_completed_at.',
        '$.extraction_completed_at',
        true,
      ),
    );
  }

  if (
    payload.status === 'completed' &&
    (typeof payload.confidence !== 'number' ||
      payload.confidence < 0 ||
      payload.confidence > 1)
  ) {
    issues.push(
      issue(
        'missing_envelope_field',
        'completed payloads require confidence from 0 to 1.',
        '$.confidence',
        true,
      ),
    );
  }

  if (!Array.isArray(payload.warnings)) {
    issues.push(
      issue(
        'missing_envelope_field',
        'warnings must be an array.',
        '$.warnings',
        true,
      ),
    );
  }
}

function validateCompletedPayload(
  payload: Record<string, unknown>,
  issues: NormalizedExtractionValidationIssue[],
  warnings: NormalizedExtractionWarning[],
) {
  if (!isRecord(payload.normalized_data)) {
    issues.push(
      issue(
        'missing_normalized_data',
        'completed payloads require normalized_data.',
        '$.normalized_data',
        true,
      ),
    );
    return;
  }

  const subtype = payload.subtype;
  if (!isSupportedMvpExtractionSubtype(subtype)) return;

  if (payload.normalized_data.subtype !== subtype) {
    issues.push(
      issue(
        'normalized_data_subtype_mismatch',
        'normalized_data.subtype must match envelope subtype.',
        '$.normalized_data.subtype',
        true,
      ),
    );
  }

  if (!isRecord(payload.normalized_data.fields)) {
    issues.push(
      issue(
        'missing_normalized_data',
        'normalized_data.fields is required.',
        '$.normalized_data.fields',
        true,
      ),
    );
    return;
  }

  const required = REQUIRED_FIELDS_BY_SUBTYPE[subtype];
  for (const [fieldName, spec] of Object.entries(required)) {
    const value = payload.normalized_data.fields[fieldName];
    const path = `$.normalized_data.fields.${fieldName}`;

    if (value === undefined) {
      issues.push(
        issue(
          'missing_required_field',
          `${fieldName} is required for ${subtype}.`,
          path,
          true,
        ),
      );
      continue;
    }

    const fieldIssue = validateNormalizedField(value, spec.type, path);
    if (fieldIssue) {
      issues.push(fieldIssue);
      continue;
    }

    if (isRecord(value) && value.presence !== 'present') {
      const code =
        value.presence === 'not_present'
          ? 'field_not_present'
          : 'field_unknown';
      warnings.push({
        code,
        message: `${fieldName} is explicitly ${String(value.presence)}.`,
        field: fieldName,
      });

      if (!spec.allowNotPresent) {
        issues.push(
          issue(
            'missing_required_field',
            `${fieldName} must be present for completed ${subtype}.`,
            path,
            true,
          ),
        );
      }
    }
  }
}

function validateFailedPayload(
  payload: Record<string, unknown>,
  issues: NormalizedExtractionValidationIssue[],
) {
  if (!isRecord(payload.failure)) {
    issues.push(
      issue(
        'missing_failure_details',
        'failed payloads require failure details.',
        '$.failure',
        true,
      ),
    );
    return;
  }

  if (
    typeof payload.failure.message !== 'string' ||
    payload.failure.blocking !== true
  ) {
    issues.push(
      issue(
        'missing_failure_details',
        'failed payloads require failure.message and failure.blocking = true.',
        '$.failure',
        true,
      ),
    );
  }
}

function validateDeferredPayload(
  payload: Record<string, unknown>,
  issues: NormalizedExtractionValidationIssue[],
) {
  if (
    typeof payload.deferred_reason !== 'string' ||
    payload.deferred_reason === ''
  ) {
    issues.push(
      issue(
        'missing_deferred_reason',
        'deferred payloads require deferred_reason.',
        '$.deferred_reason',
        false,
      ),
    );
  }
}

function validateModelMetadata(
  metadata: Record<string, unknown>,
  issues: NormalizedExtractionValidationIssue[],
) {
  for (const key of Object.keys(metadata)) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === 'input_tokens' || normalizedKey === 'output_tokens') {
      continue;
    }

    if (
      SECRET_METADATA_KEYS.some((secretKey) =>
        normalizedKey.includes(secretKey),
      )
    ) {
      issues.push(
        issue(
          'unsafe_model_metadata',
          `model_metadata must not include secret-like key ${key}.`,
          `$.model_metadata.${key}`,
          true,
        ),
      );
    }
  }
}

function validateNormalizedField(
  value: unknown,
  type: NormalizedExtractionFieldType,
  path: string,
): NormalizedExtractionValidationIssue | null {
  if (!isRecord(value)) {
    return issue(
      'invalid_field_shape',
      'Normalized field must be an object.',
      path,
      true,
    );
  }

  if (
    value.presence !== 'present' &&
    value.presence !== 'not_present' &&
    value.presence !== 'unknown'
  ) {
    return issue(
      'invalid_field_shape',
      'Normalized field presence is invalid.',
      `${path}.presence`,
      true,
    );
  }

  if (value.presence === 'present') {
    if (!matchesFieldType(value.value, type)) {
      return issue(
        'invalid_field_shape',
        `Normalized field value must match ${type}.`,
        `${path}.value`,
        true,
      );
    }
  } else if (value.value !== null) {
    return issue(
      'invalid_field_shape',
      'not_present and unknown fields must use null value.',
      `${path}.value`,
      true,
    );
  }

  if (
    value.confidence !== undefined &&
    (typeof value.confidence !== 'number' ||
      value.confidence < 0 ||
      value.confidence > 1)
  ) {
    return issue(
      'invalid_field_shape',
      'field confidence must be a number from 0 to 1.',
      `${path}.confidence`,
      true,
    );
  }

  return null;
}

function matchesFieldType(
  value: unknown,
  type: NormalizedExtractionFieldType,
): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string' && value.length > 0;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'string_array':
      return (
        Array.isArray(value) && value.every((item) => typeof item === 'string')
      );
    case 'line_item_array':
      return (
        Array.isArray(value) &&
        value.every((item) => isRecord(item) && isRecord(item.description))
      );
  }
}

function issue(
  code: NormalizedExtractionValidationIssueCode,
  message: string,
  path: string,
  blocking: boolean,
): NormalizedExtractionValidationIssue {
  return { code, message, path, blocking };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
