import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  ApiError,
  ApiResult,
  AuditActorType,
  AuditLog,
  Claim,
  ClaimMetadata,
  ClaimStatus,
  ClaimType,
  ClarificationQuestion,
  CreateClaimRequest,
  CreateClaimResponse,
  Document,
  DocumentDerivedStatus,
  DocumentProcessFailedEvent,
  DocumentProcessedEvent,
  DocumentType,
  DocumentUploadedEvent,
  EnrichmentCache,
  ExtractedData,
  Finding,
  FindingEvidence,
  FindingSeverity,
  Gap,
  GapStatus,
  GenericDocumentExtraction,
  GetClaimResponse,
  HotelLetterExtraction,
  Identifiable,
  MedicalReportExtraction,
  PassCompletedEvent,
  PassStartEvent,
  PhotoExtraction,
  PoliceFormatAnalysis,
  PoliceReportExtraction,
  ProcessDocumentRequest,
  ProcessDocumentResponse,
  QuestionStatus,
  ReceiptExtraction,
  ReceiptItem,
  RiskBand,
  SpectixInngestEvent,
  Timestamps,
  UpdateClaimStatusRequest,
} from './types';

const sampleClaim: Claim = {
  id: 'claim-uuid',
  claimNumber: '2025-001',
  status: 'intake',
  riskBand: null,
  riskScore: null,
  claimType: 'baggage',
  insuredName: 'Test Insured',
  claimantName: 'Test Claimant',
  incidentDate: '2025-01-01',
  incidentLocation: 'Tel Aviv',
  amountClaimed: 1000,
  currency: 'ILS',
  summary: 'test',
  metadata: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const receiptExtraction: ReceiptExtraction = {
  storeName: 'Test',
  storeAddress: null,
  storePhone: null,
  receiptDate: null,
  receiptNumber: null,
  items: [],
  subtotal: null,
  tax: null,
  total: 100,
  currency: 'ILS',
  paymentMethod: null,
};

describe('types compile', () => {
  it('Claim accepts valid shape', () => {
    const c: Claim = sampleClaim;

    expect(c.status).toBe('intake');
    expectTypeOf(c).toMatchTypeOf<Identifiable>();
    expectTypeOf(c).toMatchTypeOf<Timestamps>();
  });

  it('all 7 entity interfaces accept valid shapes', () => {
    const extractedData: ExtractedData = {
      kind: 'receipt',
      data: receiptExtraction,
    };

    const document: Document = {
      id: 'document-uuid',
      claimId: sampleClaim.id,
      documentType: 'receipt',
      filePath: 'claim-uuid/receipt.pdf',
      fileName: 'receipt.pdf',
      fileSize: 12345,
      mimeType: 'application/pdf',
      ocrText: null,
      extractedData,
      uploadedBy: null,
      createdAt: '2025-01-01T00:00:00Z',
    };

    const finding: Finding = {
      id: 'finding-uuid',
      claimId: sampleClaim.id,
      ruleId: 'R03',
      passNumber: 1,
      severity: 'high',
      title: 'Finding title',
      description: null,
      evidence: {
        sourceDocuments: [document.id],
        contextSnippets: ['excerpt'],
      },
      confidence: 0.91,
      createdAt: '2025-01-01T00:00:00Z',
    };

    const gap: Gap = {
      id: 'gap-uuid',
      claimId: sampleClaim.id,
      gapType: 'missing_document',
      description: 'Missing police report',
      status: 'open',
      resolution: null,
      resolvedAt: null,
      createdAt: '2025-01-01T00:00:00Z',
    };

    const question: ClarificationQuestion = {
      id: 'question-uuid',
      claimId: sampleClaim.id,
      question: 'Please clarify the incident date.',
      context: null,
      status: 'pending',
      answer: null,
      answeredAt: null,
      createdAt: '2025-01-01T00:00:00Z',
    };

    const cache: EnrichmentCache = {
      id: 'cache-uuid',
      cacheKey: 'places:store:test',
      provider: 'google_places',
      requestPayload: { query: 'Test store' },
      responsePayload: null,
      expiresAt: '2025-02-01T00:00:00Z',
      createdAt: '2025-01-01T00:00:00Z',
    };

    const audit: AuditLog = {
      id: 'audit-uuid',
      claimId: sampleClaim.id,
      actorType: 'system',
      actorId: null,
      action: 'claim_created',
      targetTable: 'claims',
      targetId: sampleClaim.id,
      details: { claimNumber: sampleClaim.claimNumber },
      createdAt: '2025-01-01T00:00:00Z',
    };

    expect([
      sampleClaim,
      document,
      finding,
      gap,
      question,
      cache,
      audit,
    ]).toHaveLength(7);
  });

  it('ExtractedData discriminates by kind', () => {
    const x: ExtractedData = {
      kind: 'receipt',
      data: receiptExtraction,
    };

    if (x.kind === 'receipt') {
      expectTypeOf(x.data.storeName).toEqualTypeOf<string | null>();
    }
  });

  it('RiskBand only accepts 4 values', () => {
    const valid: RiskBand[] = ['green', 'yellow', 'orange', 'red'];

    expect(valid).toHaveLength(4);
  });

  it('PoliceReportExtraction includes formatAnalysis', () => {
    const p: PoliceReportExtraction = {
      caseNumber: null,
      reportDate: null,
      incidentDate: null,
      stationName: null,
      stationCity: null,
      officerName: null,
      officerRank: null,
      reporterName: null,
      incidentSummary: null,
      itemsReported: [],
      formatAnalysis: {
        caseNumberFormatMatch: null,
        caseNumberFormatNotes: '',
        elementsPresent: [],
        elementsMissing: [],
        anomaliesDetected: [],
        overallAuthenticityScore: null,
        scoreReasoning: '',
      },
    };

    expect(p.formatAnalysis.elementsPresent).toEqual([]);
  });

  it('document extraction variants accept current prompt shapes', () => {
    const hotel: HotelLetterExtraction = {
      hotelName: null,
      hotelAddress: null,
      letterDate: null,
      guestName: null,
      stayStartDate: null,
      stayEndDate: null,
      incidentReportedToHotel: null,
      hotelActions: null,
      signedBy: null,
      onLetterhead: null,
      languageQuality: null,
      redFlags: [],
    };

    const generic: GenericDocumentExtraction = {
      issuer: null,
      date: null,
      summary: 'summary',
      keyClaims: [],
      languageQuality: null,
      redFlags: [],
    };

    const medical: MedicalReportExtraction = {
      patientName: null,
      dateOfTreatment: null,
      facility: null,
      facilityAddress: null,
      diagnosisBrief: null,
      treatmentBrief: null,
      totalCost: null,
      currency: null,
      attendingDoctor: null,
      anomalies: [],
    };

    const photo: PhotoExtraction = {
      description: null,
      visibleObjects: [],
      timestampMetadata: null,
      locationMetadata: null,
    };

    const variants: ExtractedData[] = [
      { kind: 'hotel_letter', data: hotel },
      { kind: 'witness_letter', data: generic },
      { kind: 'flight_doc', data: generic },
      { kind: 'medical_report', data: medical },
      { kind: 'photo', data: photo },
      { kind: 'other', data: generic },
    ];

    expect(variants.map((variant) => variant.kind)).toContain('flight_doc');
  });

  it('API contracts and Inngest events type-check', () => {
    const createRequest: CreateClaimRequest = {
      claimantName: 'Test Claimant',
      insuredName: 'Test Insured',
      claimType: 'theft',
      incidentDate: '2025-01-01',
      incidentLocation: 'Bangkok',
      amountClaimed: 1000,
      currency: 'ILS',
      summary: 'Created by test',
      metadata: { tripPurpose: 'tourism' },
    };

    const createResponse: CreateClaimResponse = { claim: sampleClaim };
    const getResponse: GetClaimResponse = {
      claim: sampleClaim,
      documents: [],
      findings: [],
      gaps: [],
      questions: [],
    };
    const processRequest: ProcessDocumentRequest = {
      documentId: 'document-uuid',
    };
    const processResponse: ProcessDocumentResponse = {
      document: {
        id: processRequest.documentId,
        claimId: sampleClaim.id,
        documentType: 'other',
        filePath: 'claim-uuid/file.txt',
        fileName: 'file.txt',
        fileSize: null,
        mimeType: null,
        ocrText: null,
        extractedData: null,
        uploadedBy: null,
        createdAt: '2025-01-01T00:00:00Z',
      },
    };
    const updateStatus: UpdateClaimStatusRequest = {
      claimId: sampleClaim.id,
      status: 'processing',
      reason: 'test',
    };
    const apiResult: ApiResult<GetClaimResponse> = {
      ok: true,
      data: getResponse,
    };
    const apiError: ApiError = {
      code: 'bad_request',
      message: 'Invalid request',
    };

    const events: SpectixInngestEvent[] = [
      {
        name: 'claim/document.uploaded',
        data: { claimId: sampleClaim.id, documentId: 'document-uuid' },
      },
      {
        name: 'claim/document.processed',
        data: {
          claimId: sampleClaim.id,
          documentId: 'document-uuid',
          documentType: 'receipt',
        },
      },
      {
        name: 'claim/document.process_failed',
        data: {
          claimId: sampleClaim.id,
          documentId: 'document-uuid',
          error: 'OCR failed',
        },
      },
      {
        name: 'claim/pass.start',
        data: { claimId: sampleClaim.id, passNumber: 1 },
      },
      {
        name: 'claim/pass.completed',
        data: { claimId: sampleClaim.id, passNumber: 1 },
      },
    ];

    expect(createRequest.claimType).toBe('theft');
    expect(createResponse.claim.id).toBe(sampleClaim.id);
    expect(processResponse.document.documentType).toBe('other');
    expect(updateStatus.status).toBe('processing');
    expect(apiResult.ok).toBe(true);
    expect(apiError.code).toBe('bad_request');
    expect(events).toHaveLength(5);
  });

  it('literal unions document allowed values', () => {
    const claimStatus: ClaimStatus = 'ready';
    const derivedStatus: DocumentDerivedStatus = 'processed';
    const severity: FindingSeverity = 'medium';
    const gapStatus: GapStatus = 'resolved';
    const questionStatus: QuestionStatus = 'answered';
    const claimType: ClaimType = 'medical';
    const documentType: DocumentType = 'police_report';
    const actorType: AuditActorType = 'gap_analyzer';
    const metadata: ClaimMetadata = {
      tripPurpose: 'business',
      contextMultiplierReasons: ['Profession relevant to claim'],
      arbitraryFutureField: true,
    };
    const evidence: FindingEvidence = {
      externalSources: ['https://example.com'],
      customPayload: { ok: true },
    };
    const receiptItem: ReceiptItem = {
      description: 'Camera',
      quantity: 1,
      unitPrice: 100,
      total: 100,
    };
    const formatAnalysis: PoliceFormatAnalysis = {
      caseNumberFormatMatch: true,
      caseNumberFormatNotes: '',
      elementsPresent: ['case_number'],
      elementsMissing: [],
      anomaliesDetected: [],
      overallAuthenticityScore: 90,
      scoreReasoning: 'Looks valid',
    };

    expect([
      claimStatus,
      derivedStatus,
      severity,
      gapStatus,
      questionStatus,
      claimType,
      documentType,
      actorType,
      metadata.tripPurpose,
      evidence.externalSources?.[0],
      receiptItem.description,
      formatAnalysis.overallAuthenticityScore,
    ]).toHaveLength(12);
  });

  it('individual Inngest event interfaces match the shared union', () => {
    const uploaded: DocumentUploadedEvent = {
      name: 'claim/document.uploaded',
      data: { claimId: sampleClaim.id, documentId: 'document-uuid' },
    };
    const processed: DocumentProcessedEvent = {
      name: 'claim/document.processed',
      data: {
        claimId: sampleClaim.id,
        documentId: 'document-uuid',
        documentType: 'receipt',
      },
    };
    const failed: DocumentProcessFailedEvent = {
      name: 'claim/document.process_failed',
      data: {
        claimId: sampleClaim.id,
        documentId: 'document-uuid',
        error: 'failed',
      },
    };
    const started: PassStartEvent = {
      name: 'claim/pass.start',
      data: { claimId: sampleClaim.id, passNumber: 1 },
    };
    const completed: PassCompletedEvent = {
      name: 'claim/pass.completed',
      data: { claimId: sampleClaim.id, passNumber: 1 },
    };

    const events: SpectixInngestEvent[] = [
      uploaded,
      processed,
      failed,
      started,
      completed,
    ];

    expect(events.map((event) => event.name)).toContain('claim/pass.completed');
  });
});
