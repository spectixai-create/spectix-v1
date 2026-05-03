import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { expect, test, type APIRequestContext } from '@playwright/test';

const TEST_PDF = Buffer.concat([
  Buffer.from('%PDF-1.4\n'),
  Buffer.alloc(50 * 1024, 'r'),
  Buffer.from('\n%%EOF'),
]);

test.describe('document classification pipeline', () => {
  test.setTimeout(60_000);

  test('EC1 receipt PDF processes with classifier metadata and pass cost', async ({
    request,
  }) => {
    const claim = await createClaim(request);
    const document = await uploadDocument(
      request,
      claim.id,
      'receipt-test.pdf',
    );
    await waitForDbStatus(document.id, 'processed');

    const supabase = createAdminClientForTests();
    const { data: row } = await supabase
      .from('documents')
      .select('document_type, extracted_data')
      .eq('id', document.id)
      .single();
    const { data: pass } = await supabase
      .from('passes')
      .select('llm_calls_made, cost_usd')
      .eq('claim_id', claim.id)
      .eq('pass_number', 1)
      .single();
    const { data: audit } = await supabase
      .from('audit_log')
      .select('actor_type, details')
      .eq('target_id', document.id)
      .eq('action', 'document_processing_completed')
      .single();

    expect(row?.document_type).toBe('receipt');
    expect(row?.extracted_data?.classifier?.confidence).toBeGreaterThan(0.5);
    expect(audit?.actor_type).toBe('llm');
    expect(Number(pass?.cost_usd)).toBeGreaterThan(0);
  });

  test('EC2 forced failure audits system process actor', async ({
    request,
  }) => {
    const claim = await createClaim(request);
    const document = await uploadDocument(request, claim.id, 'test_[FAIL].pdf');
    await waitForDbStatus(document.id, 'failed');

    const { data: audit } = await createAdminClientForTests()
      .from('audit_log')
      .select('actor_type, actor_id')
      .eq('target_id', document.id)
      .eq('action', 'document_processing_failed')
      .single();

    expect(audit).toMatchObject({
      actor_type: 'system',
      actor_id: 'inngest:process-document',
    });
  });

  test('EC3 status endpoint exposes polling shape', async ({ request }) => {
    const claim = await createClaim(request);
    const document = await uploadDocument(request, claim.id, 'receipt-ui.pdf');

    await waitForDbStatus(document.id, 'processed');

    const response = await request.get(
      `/api/claims/${claim.id}/documents/${document.id}/status`,
    );
    const json = await response.json();

    expect(response.status()).toBe(200);
    expect(json.data).toMatchObject({
      documentId: document.id,
      processing_status: 'processed',
      document_type: 'receipt',
    });
  });

  test('EC4 status endpoint double-key check returns document_not_found', async ({
    request,
  }) => {
    const claim = await createClaim(request);
    const otherClaim = await createClaim(request);
    const document = await uploadDocument(request, claim.id, 'receipt.pdf');

    const response = await request.get(
      `/api/claims/${otherClaim.id}/documents/${document.id}/status`,
    );
    const json = await response.json();

    expect(response.status()).toBe(404);
    expect(json.error.code).toBe('document_not_found');
  });
});

async function createClaim(request: APIRequestContext) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await request.post('/api/claims', {
      data: {
        claimantName: 'Classification Test',
        insuredName: 'Classification Test',
        claimantEmail: 'classification-test@example.com',
        claimantPhone: '0501234567',
        policyNumber: `CLASSIFY-${Date.now()}-${Math.random()}-${attempt}`,
        claimType: 'theft',
        incidentDate: '2025-04-15',
        incidentLocation: 'Tel Aviv, Israel',
        amountClaimed: 5000,
        currency: 'ILS',
        summary: 'Document classification test claim summary, long enough.',
        metadata: { tripPurpose: 'tourism' },
      },
    });

    if (response.status() === 409) continue;

    expect(response.status()).toBe(201);

    return (await response.json()).data.claim as { id: string };
  }

  throw new Error('Failed to create claim after claim_number collisions');
}

async function uploadDocument(
  request: APIRequestContext,
  claimId: string,
  fileName: string,
) {
  const response = await request.post(`/api/claims/${claimId}/documents`, {
    multipart: {
      file: { name: fileName, mimeType: 'application/pdf', buffer: TEST_PDF },
    },
  });
  expect(response.status()).toBe(201);

  return (await response.json()).data.document as { id: string };
}

async function waitForDbStatus(
  documentId: string,
  status: 'processed' | 'failed',
) {
  const deadline = Date.now() + 45_000;
  const supabase = createAdminClientForTests();

  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from('documents')
      .select('processing_status')
      .eq('id', documentId)
      .maybeSingle();

    if (error) throw error;
    if (data?.processing_status === status) {
      return data;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${documentId} -> ${status}`);
}

function createAdminClientForTests() {
  const env = readEnvLocal();
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error('Missing Supabase test environment.');

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function readEnvLocal() {
  const content = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
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
