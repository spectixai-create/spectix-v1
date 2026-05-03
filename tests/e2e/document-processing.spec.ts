import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { expect, test, type APIRequestContext } from '@playwright/test';

const TEST_PDF = Buffer.concat([
  Buffer.from('%PDF-1.4\n'),
  Buffer.alloc(50 * 1024, 'a'),
  Buffer.from('\n%%EOF'),
]);

test.describe('document processing pipeline', () => {
  test('E1 upload transitions to processed with audit triplet', async ({
    request,
  }) => {
    const claim = await createClaim(request);
    const document = await uploadDocument(request, claim.id, 'pipeline.pdf');

    await waitForProcessingStatus(document.id, 'processed');
    const supabase = createAdminClientForTests();
    const { data: row } = await supabase
      .from('documents')
      .select('processing_status, extracted_data')
      .eq('id', document.id)
      .single();
    const actions = await auditActions(document.id);

    expect(row?.processing_status).toBe('processed');
    expect(row?.extracted_data?.stub).toBe(true);
    expect(actions).toEqual(
      expect.arrayContaining([
        'document_uploaded',
        'document_processing_started',
        'document_processing_completed',
      ]),
    );
  });

  test('E2 [FAIL] filename transitions to failed', async ({ request }) => {
    const claim = await createClaim(request);
    const document = await uploadDocument(
      request,
      claim.id,
      'evidence_[FAIL].pdf',
    );

    await waitForProcessingStatus(document.id, 'failed');
    const supabase = createAdminClientForTests();
    const { data: row } = await supabase
      .from('documents')
      .select('processing_status, extracted_data')
      .eq('id', document.id)
      .single();
    const actions = await auditActions(document.id);

    expect(row?.processing_status).toBe('failed');
    expect(row?.extracted_data?.error).toBe('simulated_failure');
    expect(actions).toContain('document_processing_failed');
  });

  test('E3 duplicate event sends produce one completed audit', async ({
    request,
  }) => {
    const claim = await createClaim(request);
    const document = await uploadDocument(request, claim.id, 'idempotent.pdf');

    await waitForProcessingStatus(document.id, 'processed');
    await sendDocumentUploadedEvent(claim.id, document.id);
    await sendDocumentUploadedEvent(claim.id, document.id);
    await new Promise((resolve) => setTimeout(resolve, 2_000));

    const actions = await auditActions(document.id);
    const completed = actions.filter(
      (action) => action === 'document_processing_completed',
    );

    expect(completed).toHaveLength(1);
  });
});

async function createClaim(request: APIRequestContext) {
  const response = await request.post('/api/claims', {
    data: validClaimPayload(),
  });
  expect(response.status()).toBe(201);

  return (await response.json()).data.claim as {
    id: string;
    claimNumber: string;
  };
}

async function uploadDocument(
  request: APIRequestContext,
  claimId: string,
  fileName: string,
) {
  const response = await request.post(`/api/claims/${claimId}/documents`, {
    multipart: {
      file: {
        name: fileName,
        mimeType: 'application/pdf',
        buffer: TEST_PDF,
      },
    },
  });
  expect(response.status()).toBe(201);

  return (await response.json()).data.document as { id: string };
}

async function waitForProcessingStatus(
  documentId: string,
  expectedStatus: 'processed' | 'failed',
) {
  const supabase = createAdminClientForTests();
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const { data } = await supabase
      .from('documents')
      .select('processing_status')
      .eq('id', documentId)
      .single();

    if (data?.processing_status === expectedStatus) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${documentId} -> ${expectedStatus}`);
}

async function auditActions(documentId: string) {
  const { data, error } = await createAdminClientForTests()
    .from('audit_log')
    .select('action')
    .eq('target_id', documentId)
    .order('created_at', { ascending: true });

  expect(error).toBeNull();

  return (data ?? []).map((row) => row.action as string);
}

async function sendDocumentUploadedEvent(claimId: string, docId: string) {
  process.env.INNGEST_DEV = '1';
  process.env.INNGEST_BASE_URL = 'http://localhost:8288';
  const { Inngest } = await import('inngest');
  const inngest = new Inngest({ id: 'spectix-poc' });

  await inngest.send({
    name: 'claim/document.uploaded',
    data: { claimId, documentId: docId },
  });
}

function createAdminClientForTests() {
  const env = readEnvLocal();
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase test environment.');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function readEnvLocal() {
  const path = join(process.cwd(), '.env.local');
  const content = readFileSync(path, 'utf8');
  const entries = content
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [
        line.slice(0, index),
        line.slice(index + 1).replace(/^"|"$/g, ''),
      ];
    });

  return Object.fromEntries(entries) as Record<string, string | undefined>;
}

function validClaimPayload() {
  return {
    claimantName: 'Document Processing Test',
    insuredName: 'Document Processing Test',
    claimantEmail: 'processing-test@example.com',
    claimantPhone: '0501234567',
    policyNumber: `PROCESS-${Date.now()}-${Math.random()}`,
    claimType: 'theft',
    incidentDate: '2025-04-15',
    incidentLocation: 'Tel Aviv, Israel',
    amountClaimed: 5000,
    currency: 'ILS',
    summary: 'Document processing test claim summary, long enough to validate.',
    metadata: { tripPurpose: 'tourism' },
  };
}
