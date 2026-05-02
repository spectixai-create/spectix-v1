import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

const TEST_PDF = Buffer.concat([
  Buffer.from('%PDF-1.4\n'),
  Buffer.alloc(50 * 1024, 'a'),
  Buffer.from('\n%%EOF'),
]);

test.describe('document upload API', () => {
  test('valid PDF returns document row with pending placeholder state', async ({
    request,
  }) => {
    const claim = await createClaim(request);
    const response = await uploadFile(request, claim.id, {
      buffer: TEST_PDF,
      name: 'supporting-document.pdf',
      mimeType: 'application/pdf',
    });

    expect(response.status()).toBe(201);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.document.documentType).toBe('other');
    expect(json.data.document.processingStatus).toBe('pending');
  });

  test('5 MB upload returns file_too_large', async ({ request }) => {
    const claim = await createClaim(request);
    const response = await uploadFile(request, claim.id, {
      buffer: Buffer.alloc(5 * 1024 * 1024),
      name: 'large.pdf',
      mimeType: 'application/pdf',
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error.code).toBe('file_too_large');
  });

  test('text/plain returns invalid_file_type', async ({ request }) => {
    const claim = await createClaim(request);
    const response = await uploadFile(request, claim.id, {
      buffer: Buffer.alloc(1024, 'a'),
      name: 'notes.txt',
      mimeType: 'text/plain',
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error.code).toBe('invalid_file_type');
  });

  test('valid UUID for missing claim returns claim_not_found', async ({
    request,
  }) => {
    const response = await uploadFile(
      request,
      '00000000-0000-4000-8000-000000000000',
      {
        buffer: TEST_PDF,
        name: 'missing.pdf',
        mimeType: 'application/pdf',
      },
    );

    expect(response.status()).toBe(404);
    expect((await response.json()).error.code).toBe('claim_not_found');
  });

  test('malformed claim id returns invalid_id', async ({ request }) => {
    const response = await uploadFile(request, 'not-a-uuid', {
      buffer: TEST_PDF,
      name: 'bad.pdf',
      mimeType: 'application/pdf',
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error.code).toBe('invalid_id');
  });

  test('reviewed claim rejects uploads', async ({ request }) => {
    const claim = await createClaim(request);
    const supabase = createAdminClientForTests();

    await supabase
      .from('claims')
      .update({ status: 'reviewed' })
      .eq('id', claim.id);

    const response = await uploadFile(request, claim.id, {
      buffer: TEST_PDF,
      name: 'reviewed.pdf',
      mimeType: 'application/pdf',
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error.code).toBe('claim_not_acceptable');
  });

  test('51st document is rejected and no storage object is created', async ({
    request,
  }) => {
    const claim = await createClaim(request);
    const supabase = createAdminClientForTests();
    const seedRows = Array.from({ length: 50 }, (_, index) => ({
      id: crypto.randomUUID(),
      claim_id: claim.id,
      document_type: 'other',
      file_path: `test-only/${claim.id}/${index}.pdf`,
      file_name: `seed-${index}.pdf`,
      file_size: 1024,
      mime_type: 'application/pdf',
      processing_status: 'pending',
    }));

    await supabase.from('documents').insert(seedRows);
    const before = await listStorageObjects(claim.id);
    const response = await uploadFile(request, claim.id, {
      buffer: TEST_PDF,
      name: 'over-limit.pdf',
      mimeType: 'application/pdf',
    });
    const after = await listStorageObjects(claim.id);

    expect(response.status()).toBe(400);
    expect((await response.json()).error.code).toBe('document_limit_reached');
    expect(after).toEqual(before);
  });

  test('public /new flow uploads PDF with anonymous audit trail', async ({
    page,
  }) => {
    await page.goto('/new');
    await fillValidClaimForm(page);
    await page.getByRole('button', { name: 'שלח לבדיקה' }).click();
    await expect(page.getByTestId('success-panel')).toBeVisible({
      timeout: 10000,
    });
    const claimNumber =
      (await page.getByTestId('claim-number').textContent()) ?? '';
    const uploader = page.getByLabel('אזור העלאת מסמכים תומכים');
    const transfer = await page.evaluateHandle(() => {
      const dataTransfer = new DataTransfer();
      const file = new File(
        [new Uint8Array(50 * 1024).fill(65)],
        'public-flow.pdf',
        { type: 'application/pdf' },
      );
      dataTransfer.items.add(file);
      return dataTransfer;
    });

    await uploader.dispatchEvent('drop', { dataTransfer: transfer });
    await expect(page.getByText('הועלה בהצלחה')).toBeVisible({
      timeout: 10000,
    });

    const supabase = createAdminClientForTests();
    const { data: claim } = await supabase
      .from('claims')
      .select('id')
      .eq('claim_number', claimNumber)
      .single();
    expect(claim).not.toBeNull();
    const { data: document } = await supabase
      .from('documents')
      .select('id, uploaded_by')
      .eq('claim_id', claim!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect(document).not.toBeNull();
    const { data: auditLog } = await supabase
      .from('audit_log')
      .select('actor_type, actor_id')
      .eq('target_id', document!.id)
      .eq('action', 'document_uploaded')
      .single();
    expect(auditLog).not.toBeNull();

    expect(document!.uploaded_by).toBeNull();
    expect(auditLog!.actor_type).toBe('system');
    expect(auditLog!.actor_id).toBeNull();
  });

  test('uploaded file exists in storage', async ({ request }) => {
    const claim = await createClaim(request);
    const response = await uploadFile(request, claim.id, {
      buffer: TEST_PDF,
      name: 'storage-check.pdf',
      mimeType: 'application/pdf',
    });
    const json = await response.json();
    const path = json.data.document.filePath as string;
    const { data, error } = await createAdminClientForTests()
      .storage.from('claim-documents')
      .download(path);

    expect(error).toBeNull();
    expect(data?.size).toBeGreaterThan(100);
  });

  test('insert failure cleanup removes uploaded storage object', async ({
    request,
  }) => {
    const claim = await createClaim(request);
    const before = await listStorageObjects(claim.id);
    const response = await uploadFile(
      request,
      claim.id,
      {
        buffer: TEST_PDF,
        name: 'cleanup.pdf',
        mimeType: 'application/pdf',
      },
      { 'x-spectix-test-insert-failure': '1' },
    );
    const after = await listStorageObjects(claim.id);

    expect(response.status()).toBe(500);
    expect((await response.json()).error.code).toBe('upload_partial_failure');
    expect(after).toEqual(before);
  });

  test('3.5 MB fake PDF returns 201', async ({ request }) => {
    const claim = await createClaim(request);
    // Buffer-based fake PDF; sufficient for header-based MIME check.
    const response = await uploadFile(request, claim.id, {
      buffer: Buffer.concat([
        Buffer.from('%PDF-1.4\n'),
        Buffer.alloc(Math.floor(3.5 * 1024 * 1024), 'a'),
        Buffer.from('\n%%EOF'),
      ]),
      name: 'large-but-accepted.pdf',
      mimeType: 'application/pdf',
    });

    expect(response.status()).toBe(201);
  });

  test('demo success mode does not render uploader', async ({ page }) => {
    await page.goto('/new?state=success');

    await expect(page.getByTestId('success-panel')).toBeVisible();
    await expect(page.getByTestId('document-uploader')).toHaveCount(0);
  });
});

async function createClaim(request: APIRequestContext) {
  const response = await request.post('/api/claims', {
    data: validClaimPayload(),
  });

  expect(response.status()).toBe(201);
  const json = await response.json();

  return json.data.claim as { id: string; claimNumber: string };
}

async function uploadFile(
  request: APIRequestContext,
  claimId: string,
  file: { buffer: Buffer; name: string; mimeType: string },
  headers?: Record<string, string>,
) {
  return request.post(`/api/claims/${claimId}/documents`, {
    headers,
    multipart: {
      file: {
        name: file.name,
        mimeType: file.mimeType,
        buffer: file.buffer,
      },
    },
  });
}

async function listStorageObjects(claimId: string) {
  const { data, error } = await createAdminClientForTests()
    .storage.from('claim-documents')
    .list(`claims/${claimId}`);

  expect(error).toBeNull();

  return (data ?? []).map((item) => item.name).sort();
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
    claimantName: 'Document Upload Test',
    insuredName: 'Document Upload Test',
    claimantEmail: 'upload-test@example.com',
    claimantPhone: '0501234567',
    policyNumber: `UPLOAD-${Date.now()}-${Math.random()}`,
    claimType: 'theft',
    incidentDate: '2025-04-15',
    incidentLocation: 'Tel Aviv, Israel',
    amountClaimed: 5000,
    currency: 'ILS',
    summary: 'Document upload test claim summary, long enough to validate.',
    metadata: { tripPurpose: 'tourism' },
  };
}

async function fillValidClaimForm(page: Page) {
  await page.getByLabel('שם מלא *').fill('דנה כהן');
  await page.getByLabel('אימייל *').fill('dana@example.com');
  await page.getByLabel('טלפון *').fill('0501234567');
  await page.getByLabel('מספר פוליסה *').fill(`POL-${Date.now()}`);
  await page.getByLabel('עיסוק *').fill('מעצבת');
  await page.getByRole('combobox', { name: 'סוג התביעה' }).click();
  await page.getByRole('option', { name: 'גניבה' }).click();
  await page.getByLabel('תאריך האירוע *').fill('2025-04-15');
  await page.getByRole('combobox', { name: 'מדינה' }).click();
  await page.getByRole('option', { name: 'תאילנד' }).click();
  await page.getByLabel('עיר *').fill('בנגקוק');
  await page.getByLabel('סכום התביעה *').fill('5000');
  await page
    .getByLabel('תיאור האירוע *')
    .fill('התיק נגנב בזמן מעבר בין המלון למרכז הקניות.');
  await page.getByRole('combobox', { name: 'מטרת הנסיעה' }).click();
  await page.getByRole('option', { name: 'תיירות' }).click();
  await page.getByLabel('קשרים מקומיים').fill('אין');
  await page.getByLabel('מספר נסיעות למדינה זו ב-24 חודשים אחרונים').fill('1');
  await page.getByLabel('מתוכן עם תביעות ביטוח').fill('0');
}
