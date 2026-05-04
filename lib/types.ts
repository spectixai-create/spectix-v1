/**
 * Spectix — source-of-truth types
 *
 * Mirrors /supabase/migrations/0001_initial_schema.sql through
 * /supabase/migrations/0005_document_subtype.sql.
 * On schema change: update migration FIRST, then this file.
 * Future migrations may extend; do not add speculative fields here.
 *
 * This file is consumed under tsconfig noUncheckedIndexedAccess.
 * JSONB-typed fields and arrays return T | undefined on indexed access.
 * Consumers must handle undefined explicitly.
 */

// Section A: Status literal unions

/**
 * Claim statuses — DB column 'status' default 'intake'.
 * Other values used as workflow progresses through pipeline.
 */
export type ClaimStatus =
  | 'intake'
  | 'processing'
  | 'pending_info'
  | 'ready'
  | 'reviewed'
  | 'rejected_no_coverage'
  | 'cost_capped';

export type PassStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'failed';

export type DocumentProcessingStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed';

/**
 * Finding severity — 3 levels per README and llm_prompts.md.
 * 'critical' may be added in future if rules emit it.
 */
export type FindingSeverity = 'low' | 'medium' | 'high';

export type FindingStatus = 'open' | 'resolved' | 'persisted';

/** Gap status — DB column 'status' default 'open' */
export type GapStatus = 'open' | 'resolved' | 'ignored';

export type GapFillMethod =
  | 'auto_api'
  | 'auto_osint'
  | 'manual_claimant'
  | 'manual_adjuster';

/**
 * Question status — DB column 'status' default 'pending'.
 * Migration #0002 added 'closed' plus question lifecycle fields.
 */
export type QuestionStatus = 'pending' | 'sent' | 'answered' | 'closed';

export type QuestionUrgency = 'urgent' | 'normal';

/** Risk band — used across UI and brief generation */
export type RiskBand = 'green' | 'yellow' | 'orange' | 'red';

export type BriefRecommendation =
  | 'approve'
  | 'request_info'
  | 'deep_investigation'
  | 'reject_no_coverage';

/**
 * Claim types — DB column is plain text; this union documents allowed
 * values per test_scenarios.md categories.
 */
export type ClaimType =
  | 'baggage'
  | 'theft'
  | 'loss'
  | 'medical'
  | 'flight_cancellation'
  | 'flight_delay'
  | 'liability'
  | 'emergency'
  | 'misrepresentation'
  | 'other';

/**
 * Document types — from llm_prompts.md Prompt 01 output.
 * CRITICAL: changing these breaks LLM contract.
 */
export type DocumentType =
  | 'police_report'
  | 'hotel_letter'
  | 'receipt'
  | 'medical_report'
  | 'witness_letter'
  | 'flight_doc'
  | 'photo'
  | 'other';

/**
 * Document subtypes — fine-grained classification per D-018.
 *
 * 37 values matching public.documents.document_subtype CHECK in migration 0005.
 * IDs are stable snake_case English. Hebrew display labels live in
 * /lib/llm/document-subtypes.ts.
 */
export type DocumentSubtype =
  | 'claim_form'
  | 'policy'
  | 'policy_terms'
  | 'insurance_proposal'
  | 'id_or_passport'
  | 'bank_account_confirmation'
  | 'power_of_attorney'
  | 'medical_confidentiality_waiver'
  | 'flight_booking'
  | 'flight_ticket'
  | 'boarding_pass'
  | 'border_records'
  | 'incident_affidavit'
  | 'police_report'
  | 'pir_report'
  | 'hotel_letter'
  | 'general_receipt'
  | 'photos'
  | 'serial_or_imei'
  | 'witnesses'
  | 'medical_visit'
  | 'discharge_summary'
  | 'medical_receipt'
  | 'pharmacy_receipt'
  | 'prescription'
  | 'medical_record_12mo'
  | 'medical_evacuation'
  | 'flight_cancellation_letter'
  | 'replacement_booking'
  | 'damage_report'
  | 'rental_contract'
  | 'driver_license'
  | 'repair_estimate_or_invoice'
  | 'third_party_details'
  | 'travel_advisory'
  | 'embassy_contact_proof'
  | 'employer_letter';

/** Audit actor types */
export type AuditActorType =
  | 'system'
  | 'rule_engine'
  | 'llm'
  | 'gap_analyzer'
  | 'user';

// Section B: Core entity interfaces (mirror DB exactly)

export interface Claim {
  id: string;
  claimNumber: string;
  status: ClaimStatus;
  riskBand: RiskBand | null;
  riskScore: number | null;
  claimType: ClaimType | null;
  insuredName: string | null;
  claimantName: string | null;
  incidentDate: string | null;
  incidentLocation: string | null;
  amountClaimed: number | null;
  currency: string;
  summary: string | null;
  metadata: ClaimMetadata | null;
  /** Added in migration #0002. */
  claimantEmail: string | null;
  /** Added in migration #0002. */
  claimantPhone: string | null;
  /** Added in migration #0002. Indexed for R01/R08 queries. */
  policyNumber: string | null;
  /**
   * Pipeline state. DB default 0. Updated atomically by the passes trigger.
   */
  currentPass: number;
  /** Cost cap state. DB default 0. Updated atomically by the passes trigger. */
  totalLlmCostUsd: number;
  /** Raw Prompt 09 plain-text output. */
  briefText: string | null;
  /** Which pass produced the current brief. */
  briefPassNumber: number | null;
  /** Queryable recommendation extracted from the current brief. */
  briefRecommendation: BriefRecommendation | null;
  briefGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pass — mirrors public.passes table from migration #0002.
 * Pipeline pass state, normalized table replacing earlier passes_history
 * JSONB design. Failed passes are UPDATEd in place, not re-inserted.
 */
export interface Pass {
  id: string;
  claimId: string;
  passNumber: number;
  status: PassStatus;
  startedAt: string | null;
  completedAt: string | null;
  riskBand: RiskBand | null;
  findingsCount: number;
  gapsCount: number;
  llmCallsMade: number;
  costUsd: number;
  createdAt: string;
}

export interface Document {
  id: string;
  claimId: string;
  documentType: DocumentType;
  /**
   * Added in migration #0005 (D-018). Null until subtype classifier runs,
   * and remains null when the subtype classifier returns an invalid id.
   */
  documentSubtype: DocumentSubtype | null;
  filePath: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  ocrText: string | null;
  extractedData: ExtractedData | null;
  /** Added in migration #0002. CHECK constraint enforces valid values. */
  processingStatus: DocumentProcessingStatus;
  uploadedBy: string | null;
  createdAt: string;
}

export interface Finding {
  id: string;
  claimId: string;
  ruleId: string;
  passNumber: number;
  severity: FindingSeverity | null;
  title: string;
  description: string | null;
  evidence: FindingEvidence | null;
  confidence: number | null;
  /** Added in migration #0002. */
  severityAdjustedByContext: boolean;
  /** Added in migration #0002. Pre-Layer-5 severity for audit trail. */
  severityOriginal: FindingSeverity | null;
  /** Added in migration #0002. Tracks finding state across passes. */
  status: FindingStatus;
  /** Added in migration #0002. */
  resolvedInPass: number | null;
  /** Added in migration #0002. */
  recommendedAction: string | null;
  createdAt: string;
}

export interface Gap {
  id: string;
  claimId: string;
  gapType: string;
  description: string;
  status: GapStatus;
  resolution: string | null;
  resolvedAt: string | null;
  /** Added in migration #0002. */
  fillMethod: GapFillMethod | null;
  fillTarget: string | null;
  filledInPass: number | null;
  filledValue: Record<string, unknown> | null;
  createdAt: string;
  /** Added in migration #0002. Trigger updates on UPDATE. */
  updatedAt: string;
}

export interface ClarificationQuestion {
  id: string;
  claimId: string;
  question: string;
  context: string | null;
  status: QuestionStatus;
  answer: string | null;
  answeredAt: string | null;
  /** Added in migration #0002. CHECK constraint enforces valid values. */
  urgency: QuestionUrgency;
  /**
   * Added in migration #0002. UUID with no DB-level FK to auth.users;
   * application code validates user existence.
   */
  resolvedBy: string | null;
  resolutionNote: string | null;
  closedAt: string | null;
  createdAt: string;
}

export interface EnrichmentCache {
  id: string;
  cacheKey: string;
  provider: string;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  expiresAt: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  claimId: string | null;
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  targetTable: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

// Section C: JSONB shapes

/**
 * ClaimMetadata — flexible extension for fields not yet first-class columns.
 * Future migrations may promote these to columns.
 */
export type ClaimMetadata = {
  // Layer 0.5 trip context (not yet in DB columns)
  tripPurpose?:
    | 'tourism'
    | 'business'
    | 'family_visit'
    | 'medical'
    | 'study'
    | 'other';
  localConnections?: string;
  prevTrips24m?: number;
  prevTripsWithClaims?: number;
  profession?: string;
  country?: string;
  city?: string;
  // Layer 5 context multiplier
  contextMultiplier?: number;
  contextMultiplierReasons?: string[];
} & {
  // Open extension point for forward compatibility
  [key: string]: unknown;
};

/**
 * ExtractedData — discriminated union per document_type.
 * Each variant matches output JSON of llm_prompts.md Prompts 02-05.
 * NOTE: HotelLetterExtraction and MedicalReportExtraction shapes are
 * inferred from llm_prompts.md shorthand; may need adjustment when
 * Spike #03 finalizes the prompts.
 */
export type ExtractedData =
  | DocumentClassificationMetadata
  | RoutedExtractionData
  | { kind: 'police_report'; data: PoliceReportExtraction }
  | { kind: 'hotel_letter'; data: HotelLetterExtraction }
  | { kind: 'receipt'; data: ReceiptExtraction }
  | { kind: 'medical_report'; data: MedicalReportExtraction }
  | { kind: 'witness_letter'; data: GenericDocumentExtraction }
  | { kind: 'flight_doc'; data: GenericDocumentExtraction }
  | { kind: 'photo'; data: PhotoExtraction }
  | { kind: 'other'; data: GenericDocumentExtraction };

export interface DocumentClassificationMetadata {
  kind: 'classification';
  spike: string;
  classifier: Record<string, unknown>;
  subtype_classifier: Record<string, unknown>;
  subtype: Record<string, unknown>;
  processing_time_ms: number;
  document_processing?: DocumentProcessingLifecycleMetadata;
  extraction_error?: {
    route?: string;
    error: string;
    blocking?: boolean;
  };
}

export type RoutedExtractionData = DocumentExtractionTopLevelMetadata &
  (
    | {
        kind: 'extraction';
        route: 'receipt';
        documentType: DocumentType;
        documentSubtype: DocumentSubtype | null;
        data: ReceiptExtraction;
        metadata: DocumentExtractionMetadata;
      }
    | {
        kind: 'extraction';
        route: 'police';
        documentType: DocumentType;
        documentSubtype: DocumentSubtype | null;
        data: PoliceReportExtraction;
        metadata: DocumentExtractionMetadata;
      }
    | {
        kind: 'extraction';
        route: 'hotel_generic';
        documentType: DocumentType;
        documentSubtype: DocumentSubtype | null;
        data: HotelLetterExtraction;
        metadata: DocumentExtractionMetadata;
      }
    | {
        kind: 'extraction';
        route: 'medical';
        documentType: DocumentType;
        documentSubtype: DocumentSubtype | null;
        data: MedicalReportExtraction;
        metadata: DocumentExtractionMetadata;
      }
  );

export interface DocumentExtractionTopLevelMetadata {
  classifier: Record<string, unknown>;
  subtype_classifier: Record<string, unknown>;
  subtype: Record<string, unknown>;
  processing_time_ms: number;
  document_processing?: DocumentProcessingLifecycleMetadata;
}

export interface DocumentExtractionMetadata {
  classifier: Record<string, unknown>;
  subtype_classifier: Record<string, unknown>;
  subtype: Record<string, unknown>;
  processing_time_ms: number;
  extraction: {
    route: 'receipt' | 'police' | 'hotel_generic' | 'medical';
    modelId: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
}

export interface DocumentProcessingLifecycleMetadata {
  phase:
    | 'classification_complete'
    | 'extraction_deferred'
    | 'extraction_completed'
    | 'extraction_failed_blocking'
    | 'extraction_failed_non_blocking'
    | 'processing_failed';
  terminal: boolean;
  blocking_failure: boolean;
}

/**
 * PoliceReportExtraction — from llm_prompts.md Prompt 03.
 * Two-tier structure: extracted fields + format_analysis.
 */
export interface PoliceReportExtraction {
  caseNumber: string | null;
  reportDate: string | null;
  incidentDate: string | null;
  stationName: string | null;
  stationCity: string | null;
  officerName: string | null;
  officerRank: string | null;
  reporterName: string | null;
  incidentSummary: string | null;
  itemsReported: string[];
  formatAnalysis: PoliceFormatAnalysis;
}

export interface PoliceFormatAnalysis {
  caseNumberFormatMatch: boolean | null;
  caseNumberFormatNotes: string;
  elementsPresent: string[];
  elementsMissing: string[];
  anomaliesDetected: Array<{ type: string; description: string }>;
  overallAuthenticityScore: number | null;
  scoreReasoning: string;
}

/** HotelLetterExtraction — inferred from Prompt 04 shorthand */
export interface HotelLetterExtraction {
  hotelName: string | null;
  hotelAddress: string | null;
  letterDate: string | null;
  guestName: string | null;
  stayStartDate: string | null;
  stayEndDate: string | null;
  incidentReportedToHotel: boolean | null;
  hotelActions: string | null;
  signedBy: string | null;
  onLetterhead: boolean | null;
  languageQuality: string | null;
  redFlags: string[];
}

/** ReceiptExtraction — from llm_prompts.md Prompt 02 */
export interface ReceiptExtraction {
  storeName: string | null;
  storeAddress: string | null;
  storePhone: string | null;
  receiptDate: string | null;
  receiptNumber: string | null;
  items: ReceiptItem[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string | null;
  paymentMethod: string | null;
}

export interface ReceiptItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
}

/**
 * MedicalReportExtraction — from Prompt 05 shorthand.
 * Privacy: 'diagnosisBrief' (NOT full diagnosis) per llm_prompts.md note.
 */
export interface MedicalReportExtraction {
  patientName: string | null;
  dateOfTreatment: string | null;
  facility: string | null;
  facilityAddress: string | null;
  diagnosisBrief: string | null;
  treatmentBrief: string | null;
  totalCost: number | null;
  currency: string | null;
  attendingDoctor: string | null;
  anomalies: string[];
}

/**
 * GenericDocumentExtraction — used for witness_letter, flight_doc, other.
 * These all flow through Prompt 04 (Hotel Letter / Generic Document)
 * until dedicated prompts are written.
 */
export interface GenericDocumentExtraction {
  issuer: string | null;
  date: string | null;
  summary: string;
  keyClaims: string[];
  languageQuality: string | null;
  redFlags: string[];
}

/** PhotoExtraction — minimal shape; Prompt for photos TBD */
export interface PhotoExtraction {
  description: string | null;
  visibleObjects: string[];
  timestampMetadata: string | null;
  locationMetadata: string | null;
}

/** FindingEvidence — open jsonb that varies by finding type */
export interface FindingEvidence {
  sourceDocuments?: string[];
  externalSources?: string[];
  llmPromptsUsed?: string[];
  contextSnippets?: string[];
  [key: string]: unknown;
}

// Section D: API contracts

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

/**
 * CreateClaimRequest — note: claimNumber is auto-generated server-side.
 * Format: 'YYYY-NNN' (year-sequence), generated by /api/claims POST handler.
 */
export interface CreateClaimRequest {
  claimantName: string;
  insuredName: string;
  claimType: ClaimType;
  incidentDate: string;
  incidentLocation: string;
  amountClaimed: number;
  currency: string;
  summary: string;
  metadata?: ClaimMetadata;
}

export interface CreateClaimResponse {
  claim: Claim;
}

export interface GetClaimResponse {
  claim: Claim;
  documents: Document[];
  findings: Finding[];
  gaps: Gap[];
  questions: ClarificationQuestion[];
}

export interface ProcessDocumentRequest {
  documentId: string;
}

export interface ProcessDocumentResponse {
  document: Document;
}

export interface UpdateClaimStatusRequest {
  claimId: string;
  status: ClaimStatus;
  reason?: string;
}

// Section E: Helper types

export type Identifiable = { id: string };
export type Timestamps = { createdAt: string; updatedAt?: string };

// Section F: Inngest event types

/**
 * Event types dispatched via Inngest workflows.
 * Used by Spike #03+ for background document processing and pipeline runs.
 * Defining here avoids retroactive type updates.
 */

export interface DocumentUploadedEvent {
  name: 'claim/document.uploaded';
  data: {
    claimId: string;
    documentId: string;
  };
}

export interface DocumentProcessedEvent {
  name: 'claim/document.processed';
  data: {
    claimId: string;
    documentId: string;
    documentType: DocumentType;
  };
}

export interface DocumentProcessFailedEvent {
  name: 'claim/document.process_failed';
  data: {
    claimId: string;
    documentId: string;
    error: string;
  };
}

/**
 * Emitted when subtype classification completes with a valid subtype.
 * Not emitted when the LLM returned an invalid subtype id.
 */
export interface DocumentSubtypeClassifiedEvent {
  name: 'claim/document.subtype_classified';
  data: {
    claimId: string;
    documentId: string;
    documentType: DocumentType;
    documentSubtype: DocumentSubtype;
  };
}

export interface DocumentExtractedEvent {
  name: 'claim/document.extracted';
  data: {
    claimId: string;
    documentId: string;
    documentType: DocumentType;
    documentSubtype: DocumentSubtype | null;
  };
}

export interface DocumentExtractionFailedEvent {
  name: 'claim/document.extraction_failed';
  data: {
    claimId: string;
    documentId: string;
    error: string;
  };
}

export interface DocumentExtractionDeferredEvent {
  name: 'claim/document.extraction_deferred';
  data: {
    claimId: string;
    documentId: string;
    reason: 'skip_dedicated' | 'skip_other';
  };
}

export interface PassStartEvent {
  name: 'claim/pass.start';
  data: {
    claimId: string;
    passNumber: number;
  };
}

export interface PassCompletedEvent {
  name: 'claim/pass.completed';
  data: {
    claimId: string;
    passNumber: number;
  };
}

export type SpectixInngestEvent =
  | DocumentUploadedEvent
  | DocumentProcessedEvent
  | DocumentProcessFailedEvent
  | DocumentSubtypeClassifiedEvent
  | DocumentExtractedEvent
  | DocumentExtractionFailedEvent
  | DocumentExtractionDeferredEvent
  | PassStartEvent
  | PassCompletedEvent;
