// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { FindingsTab } from '@/components/adjuster/findings-tab';
import { composeClaimDetailSnapshot } from '@/lib/adjuster/service';
import type { DocumentWithSignedUrl } from '@/lib/adjuster/types';
import type { Claim, SynthesisResult } from '@/lib/types';

describe('findings evidence display', () => {
  afterEach(() => cleanup());

  it('renders document-specific evidence with file name, type, and values', () => {
    const snapshot = composeClaimDetailSnapshot({
      claim: claim(),
      documents: [documentRow()],
      passes: [],
      validations: [],
      synthesisResults: [
        finding([
          {
            document_id: 'doc-1',
            field_path:
              'extracted_data.normalized_data.fields.patient_name.value',
            expected_value: 'שם המבוטחת',
            raw_value: 'דנה כהן',
            normalized_value: 'dana cohen',
            recommended_action: 'לאמת שם מול המסמכים.',
          },
        ]),
      ],
      questionDispatches: [],
      auditLog: [],
    });

    const { container } = render(<FindingsTab findings={snapshot.findings} />);

    expect(screen.getByText('receipt.pdf')).toBeTruthy();
    expect(screen.getByText('קבלה / קבלה כללית')).toBeTruthy();
    expect(screen.getByText(/patient_name/)).toBeTruthy();
    expect(screen.getByText('שם המבוטחת')).toBeTruthy();
    expect(screen.getByText('דנה כהן')).toBeTruthy();
    expect(screen.getByText('לאמת שם מול המסמכים.')).toBeTruthy();
    expect(container.textContent).not.toContain('"document_id"');
    expect(container.textContent).not.toContain('"field_path"');
  });

  it('renders a clear claim-level fallback when evidence has no document id', () => {
    const snapshot = composeClaimDetailSnapshot({
      claim: claim(),
      documents: [documentRow()],
      passes: [],
      validations: [],
      synthesisResults: [
        finding([
          {
            field_path: 'claims.incident_date',
            normalized_value: '2026-05-01',
          },
        ]),
      ],
      questionDispatches: [],
      auditLog: [],
    });

    render(<FindingsTab findings={snapshot.findings} />);

    expect(screen.getByText('נתוני תביעה')).toBeTruthy();
    expect(screen.getByText(/claims\.incident_date/)).toBeTruthy();
    expect(screen.getByText('2026-05-01')).toBeTruthy();
  });

  it('always renders a source block and missing values for findings without evidence rows', () => {
    const snapshot = composeClaimDetailSnapshot({
      claim: claim(),
      documents: [],
      passes: [],
      validations: [],
      synthesisResults: [finding([])],
      questionDispatches: [],
      auditLog: [],
    });

    render(<FindingsTab findings={snapshot.findings} />);

    expect(screen.getByText('נתוני תביעה')).toBeTruthy();
    expect(screen.getAllByText('לא נמצא').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('פעולה מומלצת')).toBeTruthy();
  });
});

function finding(evidence: unknown[]): SynthesisResult {
  return {
    id: 'finding-1',
    claimId: 'claim-1',
    passNumber: 3,
    kind: 'finding',
    payload: {
      id: 'finding-1',
      category: 'inconsistency',
      severity: 'high',
      title: 'אי-התאמה בשם',
      description: 'נמצאה אי-התאמה בין שדות במסמכים.',
      evidence,
      source_layer_id: '11.1',
    },
    createdAt: '2026-05-10T00:00:00Z',
  };
}

function claim(): Claim {
  return {
    id: 'claim-1',
    claimNumber: '2026-001',
    status: 'ready',
    riskBand: null,
    riskScore: null,
    claimType: 'medical',
    insuredName: 'דנה כהן',
    claimantName: 'דנה כהן',
    incidentDate: '2026-05-01',
    tripStartDate: '2026-04-25',
    tripEndDate: '2026-05-05',
    preTripInsurance: 'yes',
    incidentLocation: 'פריז',
    amountClaimed: 1000,
    currency: 'ILS',
    currencyCode: 'ILS',
    summary: null,
    metadata: null,
    claimantEmail: null,
    claimantPhone: null,
    policyNumber: 'POL-1',
    currentPass: 3,
    totalLlmCostUsd: 0,
    briefText: null,
    briefPassNumber: null,
    briefRecommendation: null,
    briefGeneratedAt: null,
    escalatedToInvestigator: false,
    createdAt: '2026-05-10T00:00:00Z',
    updatedAt: '2026-05-10T00:00:00Z',
  };
}

function documentRow(): DocumentWithSignedUrl {
  return {
    id: 'doc-1',
    claimId: 'claim-1',
    documentType: 'receipt',
    documentSubtype: 'general_receipt',
    filePath: 'claims/claim-1/receipt.pdf',
    fileName: 'receipt.pdf',
    fileSize: 1000,
    mimeType: 'application/pdf',
    ocrText: null,
    extractedData: null,
    processingStatus: 'processed',
    responseToQuestionId: null,
    uploadedBy: null,
    createdAt: '2026-05-10T00:00:00Z',
    signedUrl: null,
  };
}
