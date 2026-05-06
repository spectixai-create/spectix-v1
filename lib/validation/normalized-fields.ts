import type {
  NormalizedFieldKind,
  NormalizedFieldRef,
  NormalizedFieldsCollection,
  NormalizedValidationInput,
  ValidationRoute,
} from './types';

const ROUTE_FIELD_KINDS: Record<string, Record<string, NormalizedFieldKind>> = {
  receipt_general: {
    purchaser_name: 'name',
    merchant_name: 'name',
    transaction_date: 'date',
    total_amount: 'amount',
    tax_amount: 'amount',
    currency: 'currency',
  },
  police_report: {
    named_claimant_or_persons: 'name',
    officer_name: 'name',
    police_agency_or_station: 'name',
    report_or_filing_date: 'date',
    incident_date: 'date',
  },
  medical_visit: {
    patient_name: 'name',
    provider_name: 'name',
    doctor_name: 'name',
    visit_date: 'date',
    invoice_amount: 'amount',
  },
  hotel_letter: {
    guest_name: 'name',
    hotel_or_property_name: 'name',
    staff_signer_name_or_title: 'name',
    stay_dates_or_incident_date: 'date',
    letter_date: 'date',
  },
  flight_booking_or_ticket: {
    passenger_name: 'name',
    airline_or_carrier: 'name',
    travel_agency: 'name',
    departure_datetime: 'date',
    arrival_datetime: 'date',
    fare_amount: 'amount',
    currency: 'currency',
  },
  boarding_pass: {
    passenger_name: 'name',
    airline_or_carrier: 'name',
    flight_date: 'date',
    boarding_or_departure_time: 'date',
  },
  witness_letter: {
    witness_name: 'name',
    relationship_to_claimant: 'name',
    witness_contact_details: 'name',
    letter_date: 'date',
    incident_date_or_timeframe: 'date',
  },
};

export function collectNormalizedExtractionFields(
  rows: NormalizedValidationInput[],
): NormalizedFieldsCollection {
  const fields: NormalizedFieldRef[] = [];
  const skippedBroadFallback: NormalizedFieldsCollection['skipped_broad_fallback'] =
    [];
  const skippedNonNormalized: NormalizedFieldsCollection['skipped_non_normalized'] =
    [];
  let includedDocuments = 0;

  for (const row of rows) {
    const extracted = asRecord(row.extracted_data);
    const kind = stringOrNull(extracted.kind);

    if (kind === 'extraction') {
      skippedBroadFallback.push({
        document_id: row.document_id,
        field_path: 'extracted_data',
        normalized_value: 'skipped_broad_fallback',
      });
      continue;
    }

    if (kind !== 'normalized_extraction') {
      skippedNonNormalized.push({
        document_id: row.document_id,
        field_path: 'extracted_data.kind',
        normalized_value: kind ?? 'missing',
      });
      continue;
    }

    const route = stringOrNull(extracted.route) as ValidationRoute | null;
    const fieldKinds = route ? (ROUTE_FIELD_KINDS[route] ?? {}) : {};
    const normalizedData = asRecord(extracted.normalized_data);
    const normalizedFields = asRecord(normalizedData.fields);
    includedDocuments += 1;

    for (const [fieldName, fieldValue] of Object.entries(normalizedFields)) {
      const fieldKind = fieldKinds[fieldName];
      if (!fieldKind) continue;

      pushFieldRefs({
        refs: fields,
        row,
        route,
        fieldName,
        fieldValue,
        fieldKind,
      });
    }
  }

  return {
    fields,
    included_documents: includedDocuments,
    skipped_broad_fallback: skippedBroadFallback,
    skipped_non_normalized: skippedNonNormalized,
  };
}

export function getFieldsByKind(
  collection: NormalizedFieldsCollection,
  kind: NormalizedFieldKind,
): NormalizedFieldRef[] {
  return collection.fields.filter((field) => field.kind === kind);
}

function pushFieldRefs({
  refs,
  row,
  route,
  fieldName,
  fieldValue,
  fieldKind,
}: {
  refs: NormalizedFieldRef[];
  row: NormalizedValidationInput;
  route: ValidationRoute | null;
  fieldName: string;
  fieldValue: unknown;
  fieldKind: NormalizedFieldKind;
}) {
  const envelope = asRecord(fieldValue);
  const raw = envelope.raw_value ?? envelope.source_text;
  const value = 'value' in envelope ? envelope.value : fieldValue;
  const values = Array.isArray(value) ? value : [value];

  values.forEach((item, index) => {
    if (!isPresentScalar(item)) return;

    refs.push({
      document_id: row.document_id,
      document_type: row.document_type,
      document_subtype: row.document_subtype,
      route,
      field_name: fieldName,
      field_path: `extracted_data.normalized_data.fields.${fieldName}.value${
        Array.isArray(value) ? `[${index}]` : ''
      }`,
      kind: fieldKind,
      value: item,
      raw_value: isPresentScalar(raw) ? String(raw) : undefined,
      normalized_value: String(item),
    });
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isPresentScalar(value: unknown): value is string | number {
  return (
    (typeof value === 'string' && value.trim().length > 0) ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}
