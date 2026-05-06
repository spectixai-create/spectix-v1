import type { DocumentSubtype, DocumentType } from '@/lib/types';

export type LayerStatus = 'completed' | 'failed' | 'skipped';
export type ValidationLayerId = '11.1' | '11.2' | '11.3';

export type ValidationRoute =
  | 'receipt_general'
  | 'police_report'
  | 'medical_visit'
  | 'hotel_letter'
  | 'flight_booking_or_ticket'
  | 'boarding_pass'
  | 'witness_letter'
  | string;

export type EvidenceRef = {
  document_id: string;
  field_path: string;
  raw_value?: string;
  normalized_value?: string;
};

export type ValidationLayerResult<P> = {
  layer_id: ValidationLayerId;
  status: LayerStatus;
  payload: P;
};

export type NormalizedFieldKind = 'name' | 'date' | 'amount' | 'currency';

export type NormalizedFieldRef = EvidenceRef & {
  route: ValidationRoute | null;
  document_type?: DocumentType | string | null;
  document_subtype?: DocumentSubtype | string | null;
  field_name: string;
  kind: NormalizedFieldKind;
  value: unknown;
};

export type NormalizedValidationInput = {
  document_id: string;
  document_type?: DocumentType | string | null;
  document_subtype?: DocumentSubtype | string | null;
  extracted_data: unknown;
};

export type NormalizedFieldsCollection = {
  fields: NormalizedFieldRef[];
  included_documents: number;
  skipped_broad_fallback: EvidenceRef[];
  skipped_non_normalized: EvidenceRef[];
};

export type NameMatchOutcome = 'exact' | 'fuzzy' | 'mismatch';

export type NameMatchPayload = {
  canonical_name: string | null;
  outcome: NameMatchOutcome | 'skipped';
  reason?: 'no_name_fields';
  candidates: Array<{
    value: string;
    normalized: string;
    evidence: EvidenceRef;
    match: NameMatchOutcome;
    similarity: number;
  }>;
  summary: {
    total_name_fields: number;
    exact_matches: number;
    fuzzy_matches: number;
    mismatches: number;
    witness_name_fields_excluded: number;
    skipped_broad_fallback_documents: number;
  };
};

export type DateRuleStatus = 'pass' | 'fail' | 'skipped';

export type DateRuleResult = {
  rule_id:
    | 'policy_coverage'
    | 'submission_timing'
    | 'travel_containment'
    | 'document_age';
  status: DateRuleStatus;
  reason?: string;
  evidence: EvidenceRef[];
};

export type DateValidationPayload = {
  reason?: 'no_dates';
  timeline: Array<{
    date: string;
    source: EvidenceRef;
  }>;
  rules: DateRuleResult[];
  summary: {
    total_date_fields: number;
    pass: number;
    fail: number;
    skipped: number;
    skipped_broad_fallback_documents: number;
  };
};

export type CurrencyItemStatus =
  | 'ok'
  | 'rate_failure'
  | 'non_positive_amount'
  | 'outlier';

export type CurrencyValidationPayload = {
  reason?: 'no_amount_fields';
  settlement_currency: string;
  items: Array<{
    amount: number;
    currency: string;
    normalized_amount: number | null;
    rate: number | null;
    status: CurrencyItemStatus;
    reasons: string[];
    evidence: EvidenceRef[];
  }>;
  total_normalized: number;
  summary: {
    total_amount_fields: number;
    ok: number;
    rate_failure: number;
    non_positive_amount: number;
    outliers: number;
    skipped_broad_fallback_documents: number;
  };
};

export type ValidationClaimContext = {
  id: string;
  claimantName: string | null;
  insuredName: string | null;
  incidentDate: string | null;
  currency: string | null;
  createdAt?: string | null;
  metadata?: Record<string, unknown> | null;
};
