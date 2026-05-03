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
  DocumentProcessingStatus,
  DocumentProcessFailedEvent,
  DocumentProcessedEvent,
  DocumentSubtype,
  DocumentSubtypeClassifiedEvent,
  DocumentType,
  DocumentUploadedEvent,
  EnrichmentCache,
  ExtractedData,
  Finding,
  FindingEvidence,
  FindingSeverity,
  FindingStatus,
  GapFillMethod,
  Gap,
  GapStatus,
  GenericDocumentExtraction,
  GetClaimResponse,
  HotelLetterExtraction,
  Identifiable,
  MedicalReportExtraction,
  Pass,
  PassCompletedEvent,
  PassStatus,
  PassStartEvent,
  PhotoExtraction,
  PoliceFormatAnalysis,
  PoliceReportExtraction,
  ProcessDocumentRequest,
  ProcessDocumentResponse,
  QuestionStatus,
  QuestionUrgency,
  ReceiptExtraction,
  ReceiptItem,
  RiskBand,
  BriefRecommendation,
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
  claimantEmail: null,
  claimantPhone: null,
  policyNumber: null,
  currentPass: 0,
  totalLlmCostUsd: 0,
  briefText: null,
  briefPassNumber: null,
  briefRecommendation: null,
  briefGeneratedAt: null,
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
      documentSubtype: null,
      filePath: 'claim-uuid/receipt.pdf',
      fileName: 'receipt.pdf',
      fileSize: 12345,
      mimeType: 'application/pdf',
      ocrText: null,
      extractedData,
      processingStatus: 'processed',
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
      severityAdjustedByContext: false,
      severityOriginal: null,
      status: 'open',
      resolvedInPass: null,
      recommendedAction: null,
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
      fillMethod: null,
      fillTarget: null,
      filledInPass: null,
      filledValue: null,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    const question: ClarificationQuestion = {
      id: 'question-uuid',
      claimId: sampleClaim.id,
      question: 'Please clarify the incident date.',
      context: null,
      status: 'pending',
      answer: null,
      answeredAt: null,
      urgency: 'normal',
      resolvedBy: null,
      resolutionNote: null,
      closedAt: null,
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
        documentSubtype: null,
        filePath: 'claim-uuid/file.txt',
        fileName: 'file.txt',
        fileSize: null,
        mimeType: null,
        ocrText: null,
        extractedData: null,
        processingStatus: 'pending',
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
        name: 'claim/document.subtype_classified',
        data: {
          claimId: sampleClaim.id,
          documentId: 'document-uuid',
          documentType: 'receipt',
          documentSubtype: 'general_receipt',
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
    expect(events).toHaveLength(6);
  });

  it('literal unions document allowed values', () => {
    const claimStatus: ClaimStatus = 'ready';
    const documentStatus: DocumentProcessingStatus = 'processed';
    const documentSubtype: DocumentSubtype = 'pharmacy_receipt';
    const severity: FindingSeverity = 'medium';
    const findingStatus: FindingStatus = 'persisted';
    const gapStatus: GapStatus = 'resolved';
    const gapFillMethod: GapFillMethod = 'manual_claimant';
    const questionStatus: QuestionStatus = 'answered';
    const questionUrgency: QuestionUrgency = 'urgent';
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
      documentStatus,
      severity,
      findingStatus,
      gapStatus,
      gapFillMethod,
      questionStatus,
      questionUrgency,
      claimType,
      documentType,
      documentSubtype,
      actorType,
      metadata.tripPurpose,
      evidence.externalSources?.[0],
      receiptItem.description,
      formatAnalysis.overallAuthenticityScore,
    ]).toHaveLength(16);
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
    const subtypeClassified: DocumentSubtypeClassifiedEvent = {
      name: 'claim/document.subtype_classified',
      data: {
        claimId: sampleClaim.id,
        documentId: 'document-uuid',
        documentType: 'receipt',
        documentSubtype: 'medical_receipt',
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
      subtypeClassified,
      started,
      completed,
    ];

    expect(events.map((event) => event.name)).toContain('claim/pass.completed');
  });
});

describe('migration #0002 types', () => {
  it('Pass interface matches DB shape', () => {
    const p: Pass = {
      id: 'uuid',
      claimId: 'uuid',
      passNumber: 1,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      riskBand: null,
      findingsCount: 0,
      gapsCount: 0,
      llmCallsMade: 0,
      costUsd: 0,
      createdAt: '2025-05-03T00:00:00Z',
    };

    expect(p.status).toBe('pending');
  });

  it('PassStatus includes failed', () => {
    const valid: PassStatus[] = [
      'pending',
      'in_progress',
      'completed',
      'skipped',
      'failed',
    ];

    expect(valid).toHaveLength(5);
  });

  it('QuestionStatus includes closed', () => {
    const valid: QuestionStatus[] = ['pending', 'sent', 'answered', 'closed'];

    expect(valid).toHaveLength(4);
  });

  it('Claim has new pipeline fields', () => {
    const c: Partial<Claim> = {
      currentPass: 0,
      totalLlmCostUsd: 0,
      briefText: null,
      briefRecommendation: null,
      claimantEmail: null,
      policyNumber: null,
    };

    expect(c.currentPass).toBe(0);
  });

  it('BriefRecommendation values', () => {
    const valid: BriefRecommendation[] = [
      'approve',
      'request_info',
      'deep_investigation',
      'reject_no_coverage',
    ];

    expect(valid).toHaveLength(4);
  });

  it('GapFillMethod values', () => {
    const valid: GapFillMethod[] = [
      'auto_api',
      'auto_osint',
      'manual_claimant',
      'manual_adjuster',
    ];

    expect(valid).toHaveLength(4);
  });

  it('FindingStatus values', () => {
    const valid: FindingStatus[] = ['open', 'resolved', 'persisted'];

    expect(valid).toHaveLength(3);
  });

  it('Gap has new fill fields', () => {
    const g: Partial<Gap> = {
      fillMethod: 'manual_claimant',
      filledInPass: 1,
      updatedAt: '2025-05-03T00:00:00Z',
    };

    expect(g.fillMethod).toBe('manual_claimant');
  });

  it('ClarificationQuestion has urgency', () => {
    const q: Partial<ClarificationQuestion> = {
      urgency: 'urgent',
      resolvedBy: null,
      closedAt: null,
    };

    expect(q.urgency).toBe('urgent');
  });

  it('Document has processingStatus', () => {
    const d: Partial<Document> = {
      processingStatus: 'pending',
    };

    expect(d.processingStatus).toBe('pending');
  });
});
