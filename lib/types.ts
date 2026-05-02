/**
 * Spectix — source-of-truth types
 *
 * Mirrors /supabase/migrations/0001_initial_schema.sql exactly.
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

/**
 * Document derived status — NOT a DB column.
 * Computed from ocr_text and extracted_data presence:
 *   'pending'    -> no ocr_text AND no extracted_data
 *   'processing' -> Inngest job in flight (requires migration #0002 to
 *                   track properly; currently no reliable way to detect)
 *   'processed'  -> extracted_data is not null
 *   'failed'     -> requires migration #0002 (sentinel column or status
 *                   column); currently impossible to derive reliably
 * TODO: Migration #0002 should add a documents.processing_status column
 * to make this derivable from a single source.
 */
export type DocumentDerivedStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed';

/**
 * Finding severity — 3 levels per README and llm_prompts.md.
 * 'critical' may be added in future if rules emit it.
 */
export type FindingSeverity = 'low' | 'medium' | 'high';

/** Gap status — DB column 'status' default 'open' */
export type GapStatus = 'open' | 'resolved' | 'ignored';

/**
 * Question status — DB column 'status' default 'pending'.
 * NOTE: #02b sample data UI used 'closed', urgency, resolvedBy,
 * resolutionNote, closedAt — none exist in current schema.
 * Pre-refactor decision required: either drop these UI features
 * (matches DB), or add migration #0002 to support them. Tracked
 * in project_status.md as decision pending.
 */
export type QuestionStatus = 'pending' | 'sent' | 'answered';

/** Risk band — used across UI and brief generation */
export type RiskBand = 'green' | 'yellow' | 'orange' | 'red';

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
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  claimId: string;
  documentType: DocumentType;
  filePath: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  ocrText: string | null;
  extractedData: ExtractedData | null;
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
  createdAt: string;
}

export interface ClarificationQuestion {
  id: string;
  claimId: string;
  question: string;
  context: string | null;
  status: QuestionStatus;
  answer: string | null;
  answeredAt: string | null;
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
  // Pipeline state (will likely become columns in #0002)
  currentPass?: number;
  totalLlmCostUsd?: number;
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
  | { kind: 'police_report'; data: PoliceReportExtraction }
  | { kind: 'hotel_letter'; data: HotelLetterExtraction }
  | { kind: 'receipt'; data: ReceiptExtraction }
  | { kind: 'medical_report'; data: MedicalReportExtraction }
  | { kind: 'witness_letter'; data: GenericDocumentExtraction }
  | { kind: 'flight_doc'; data: GenericDocumentExtraction }
  | { kind: 'photo'; data: PhotoExtraction }
  | { kind: 'other'; data: GenericDocumentExtraction };

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
  | PassStartEvent
  | PassCompletedEvent;
