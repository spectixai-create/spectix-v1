import {
  ALL_DOCUMENT_SUBTYPES,
  SUBTYPES_BY_DOCUMENT_TYPE,
} from '@/lib/llm/document-subtypes';
import type { DocumentSubtype, DocumentType } from '@/lib/types';

export type ExtractionRoute =
  | 'receipt'
  | 'police'
  | 'hotel_generic'
  | 'medical'
  | 'skip_dedicated'
  | 'skip_other';

const SUBTYPE_TO_PROMPT_ROUTE: Record<DocumentSubtype, ExtractionRoute> = {
  general_receipt: 'receipt',
  medical_receipt: 'receipt',
  pharmacy_receipt: 'receipt',
  repair_estimate_or_invoice: 'receipt',

  police_report: 'police',

  policy_terms: 'hotel_generic',
  insurance_proposal: 'hotel_generic',
  power_of_attorney: 'hotel_generic',
  medical_confidentiality_waiver: 'hotel_generic',
  flight_booking: 'hotel_generic',
  flight_ticket: 'hotel_generic',
  hotel_letter: 'hotel_generic',
  witnesses: 'hotel_generic',
  flight_cancellation_letter: 'hotel_generic',
  replacement_booking: 'hotel_generic',
  damage_report: 'hotel_generic',
  rental_contract: 'hotel_generic',
  travel_advisory: 'hotel_generic',
  embassy_contact_proof: 'hotel_generic',
  employer_letter: 'hotel_generic',

  medical_visit: 'medical',

  claim_form: 'skip_dedicated',
  policy: 'skip_dedicated',
  id_or_passport: 'skip_dedicated',
  bank_account_confirmation: 'skip_dedicated',
  boarding_pass: 'skip_dedicated',
  border_records: 'skip_dedicated',
  incident_affidavit: 'skip_dedicated',
  pir_report: 'skip_dedicated',
  serial_or_imei: 'skip_dedicated',
  discharge_summary: 'skip_dedicated',
  prescription: 'skip_dedicated',
  medical_record_12mo: 'skip_dedicated',
  medical_evacuation: 'skip_dedicated',
  driver_license: 'skip_dedicated',
  third_party_details: 'skip_dedicated',
  photos: 'skip_dedicated',
};

export function routeBySubtype(
  broad: DocumentType,
  subtype: DocumentSubtype | null,
): ExtractionRoute {
  if (subtype === null) return 'skip_other';
  if (broad === 'other') return 'skip_other';

  if (!SUBTYPES_BY_DOCUMENT_TYPE[broad].includes(subtype)) {
    throw new Error(
      `Impossible broad/subtype pair: ${broad} + ${subtype}. Check classifier output.`,
    );
  }

  const route = SUBTYPE_TO_PROMPT_ROUTE[subtype];
  if (!route) {
    throw new Error(
      `Unmapped subtype: ${subtype}. Update SUBTYPE_TO_PROMPT_ROUTE.`,
    );
  }

  return route;
}

export function assertAllSubtypesMapped(): void {
  const missing = ALL_DOCUMENT_SUBTYPES.filter(
    (subtype) => !SUBTYPE_TO_PROMPT_ROUTE[subtype],
  );

  if (missing.length > 0) {
    throw new Error(`Unmapped subtypes: ${missing.join(', ')}`);
  }
}
