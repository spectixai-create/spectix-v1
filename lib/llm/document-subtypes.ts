import type { DocumentSubtype, DocumentType } from '@/lib/types';

/**
 * Two-tier classification mapping (D-018).
 *
 * INVARIANT: union(values) equals all 37 DocumentSubtype values, no duplicates.
 */
export const SUBTYPES_BY_DOCUMENT_TYPE: Record<
  DocumentType,
  readonly DocumentSubtype[]
> = {
  police_report: ['police_report'],
  hotel_letter: ['hotel_letter'],
  witness_letter: ['witnesses'],
  photo: ['photos'],
  receipt: [
    'general_receipt',
    'medical_receipt',
    'repair_estimate_or_invoice',
    'pharmacy_receipt',
  ],
  medical_report: [
    'medical_visit',
    'discharge_summary',
    'medical_record_12mo',
    'medical_evacuation',
    'prescription',
  ],
  flight_doc: [
    'flight_booking',
    'flight_ticket',
    'boarding_pass',
    'border_records',
    'pir_report',
    'flight_cancellation_letter',
    'replacement_booking',
  ],
  other: [
    'claim_form',
    'policy',
    'policy_terms',
    'insurance_proposal',
    'id_or_passport',
    'bank_account_confirmation',
    'power_of_attorney',
    'medical_confidentiality_waiver',
    'incident_affidavit',
    'serial_or_imei',
    'damage_report',
    'rental_contract',
    'driver_license',
    'third_party_details',
    'travel_advisory',
    'embassy_contact_proof',
    'employer_letter',
  ],
} as const;

export const ALL_DOCUMENT_SUBTYPES = Object.values(
  SUBTYPES_BY_DOCUMENT_TYPE,
).flat() as DocumentSubtype[];

export const SUBTYPE_LABELS_HE: Record<DocumentSubtype, string> = {
  claim_form: 'טופס תביעה',
  policy: 'פוליסה',
  policy_terms: 'תקנון פוליסה',
  insurance_proposal: 'הצעה לביטוח',
  id_or_passport: 'תעודת זהות או דרכון',
  bank_account_confirmation: 'אישור חשבון בנק',
  power_of_attorney: 'ייפוי כוח',
  medical_confidentiality_waiver: 'ויתור על סודיות רפואית',
  flight_booking: 'הזמנת טיסה',
  flight_ticket: 'כרטיס טיסה',
  boarding_pass: 'כרטיס עלייה למטוס',
  border_records: 'רישום משרד הפנים',
  incident_affidavit: 'תצהיר אירוע',
  police_report: 'דוח משטרה',
  pir_report: 'דוח אי-סדירות כבודה (PIR)',
  hotel_letter: 'מכתב מהמלון או נותן שירות',
  general_receipt: 'קבלה',
  photos: 'תמונות',
  serial_or_imei: 'מספר סידורי או IMEI',
  witnesses: 'עדויות',
  medical_visit: 'אישור רפואי',
  discharge_summary: 'סיכום אשפוז',
  medical_receipt: 'קבלה רפואית',
  pharmacy_receipt: 'קבלת בית מרקחת',
  prescription: 'מרשם רפואי',
  medical_record_12mo: 'תיק רפואי 12 חודשים',
  medical_evacuation: 'אישור פינוי רפואי',
  flight_cancellation_letter: 'אישור חברת תעופה לביטול או איחור',
  replacement_booking: 'אישור הזמנה חלופית או הקדמה',
  damage_report: 'דוח נזק',
  rental_contract: 'חוזה השכרה',
  driver_license: 'רישיון נהיגה',
  repair_estimate_or_invoice: 'הערכת תיקון או חשבונית תיקון',
  third_party_details: "פרטי צד ג'",
  travel_advisory: 'הוראת פינוי או אזהרת מסע',
  embassy_contact_proof: 'אישור התקשרות עם השגרירות',
  employer_letter: 'מכתב מעסיק',
};

export type DagPhase = 1 | 2 | 3 | 'pass2_plus';

export const SUBTYPE_DAG_PHASE: Record<DocumentSubtype, DagPhase> = {
  claim_form: 1,
  policy: 1,
  policy_terms: 1,
  id_or_passport: 1,
  bank_account_confirmation: 1,
  incident_affidavit: 1,
  insurance_proposal: 2,
  power_of_attorney: 2,
  medical_confidentiality_waiver: 2,
  flight_booking: 2,
  flight_ticket: 2,
  boarding_pass: 2,
  border_records: 2,
  flight_cancellation_letter: 2,
  police_report: 3,
  pir_report: 3,
  hotel_letter: 3,
  general_receipt: 3,
  photos: 3,
  serial_or_imei: 3,
  witnesses: 3,
  medical_visit: 3,
  discharge_summary: 3,
  medical_receipt: 3,
  pharmacy_receipt: 3,
  prescription: 3,
  medical_evacuation: 3,
  replacement_booking: 3,
  damage_report: 3,
  rental_contract: 3,
  driver_license: 3,
  repair_estimate_or_invoice: 3,
  third_party_details: 3,
  travel_advisory: 3,
  embassy_contact_proof: 3,
  employer_letter: 3,
  medical_record_12mo: 'pass2_plus',
};

export function canSkipSubtypeClassification(broad: DocumentType): boolean {
  return SUBTYPES_BY_DOCUMENT_TYPE[broad].length === 1;
}

export function getOnlySubtype(broad: DocumentType): DocumentSubtype {
  const subtypes = SUBTYPES_BY_DOCUMENT_TYPE[broad];
  const onlySubtype = subtypes.at(0);

  if (subtypes.length !== 1 || !onlySubtype) {
    throw new Error(
      `getOnlySubtype called on broad type with ${subtypes.length} subtypes: ${broad}`,
    );
  }

  return onlySubtype;
}
