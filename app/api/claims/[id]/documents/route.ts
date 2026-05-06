import { NextResponse } from 'next/server';

import { inngest } from '@/inngest/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { ApiResult, Document } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ACCEPTING_STATUSES = new Set(['intake', 'processing', 'pending_info']);
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const MAX_DOCUMENTS_PER_CLAIM = 50;
const MIN_FILE_SIZE_BYTES = 100;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

type RouteContext = {
  params: {
    id: string;
  };
};

type DbDocumentRow = {
  id: string;
  claim_id: string;
  document_type: Document['documentType'];
  document_subtype?: Document['documentSubtype'];
  file_path: string;
  file_name: string;
  file_size: number | string | null;
  mime_type: string | null;
  ocr_text: string | null;
  extracted_data: Document['extractedData'];
  processing_status: Document['processingStatus'];
  response_to_question_id?: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const claimId = params.id;

  if (!isUuid(claimId)) {
    return jsonError('invalid_id', 'Malformed claim id', 400);
  }

  const supabaseAdmin = createAdminClient();
  const { data: claim, error: claimError } = await supabaseAdmin
    .from('claims')
    .select('id, status')
    .eq('id', claimId)
    .maybeSingle();

  if (claimError) {
    console.error('[claim-upload-claim-query-failed]', claimError);

    return jsonError('db_error', 'Database error', 500);
  }

  if (!claim) {
    return jsonError('claim_not_found', 'Claim not found', 404);
  }

  if (!ACCEPTING_STATUSES.has(String(claim.status))) {
    return jsonError(
      'claim_not_acceptable',
      'Claim does not accept additional documents',
      400,
    );
  }

  const { count, error: countError } = await supabaseAdmin
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('claim_id', claimId);

  if (countError) {
    console.error('[claim-upload-count-failed]', countError);

    return jsonError('db_error', 'Database error', 500);
  }

  if ((count ?? 0) >= MAX_DOCUMENTS_PER_CLAIM) {
    return jsonError(
      'document_limit_reached',
      'Document limit reached for claim',
      400,
    );
  }

  const serverClient = createServerClient();
  const {
    data: { session },
  } = await serverClient.auth.getSession();
  const actorType: 'user' | 'system' = session ? 'user' : 'system';
  const actorId: string | null = session?.user?.id ?? null;
  const uploadedBy: string | null = session?.user?.id ?? null;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError('empty_file', 'File is required', 400);
  }

  const file = formData.get('file');

  if (!(file instanceof File)) {
    return jsonError('empty_file', 'File is required', 400);
  }

  const validationError = validateFile(file);
  if (validationError) {
    return validationError;
  }

  const documentId = crypto.randomUUID();
  const extension = MIME_TO_EXTENSION[file.type];

  if (!extension) {
    return jsonError('invalid_file_type', 'Unsupported file type', 400);
  }

  const path = `claims/${claimId}/${documentId}.${extension}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from('claim-documents')
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('[storage-error]', uploadError);

    return jsonError('storage_error', 'Storage upload failed', 500);
  }

  const testInsertFailure =
    process.env.NODE_ENV !== 'production' &&
    request.headers.get('x-spectix-test-insert-failure') === '1';

  const insertResult = testInsertFailure
    ? {
        data: null,
        error: { message: 'Forced insert failure for test seam' },
      }
    : await supabaseAdmin
        .from('documents')
        .insert({
          id: documentId,
          claim_id: claimId,
          document_type: 'other',
          file_path: path,
          file_name: sanitizeFilename(file.name),
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: uploadedBy,
          processing_status: 'pending',
        })
        .select()
        .single();

  if (insertResult.error || !insertResult.data) {
    await supabaseAdmin.storage.from('claim-documents').remove([path]);
    console.error('[orphan-storage]', {
      claimId,
      documentId,
      path,
      error: insertResult.error?.message,
    });

    return jsonError('upload_partial_failure', 'Upload partially failed', 500);
  }

  const document = mapDbRowToDocument(insertResult.data as DbDocumentRow);
  const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
    claim_id: claimId,
    actor_type: actorType,
    actor_id: actorId,
    action: 'document_uploaded',
    target_table: 'documents',
    target_id: documentId,
    details: {
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    },
  });

  if (auditError) {
    console.error('[audit-failure]', { documentId, error: auditError.message });
  }

  const { error: reopenError } = await supabaseAdmin.rpc(
    'reopen_pass_for_document_processing',
    {
      p_claim_id: claimId,
      p_pass_number: 1,
      p_reason: 'document_uploaded',
      p_document_id: documentId,
    },
  );

  if (reopenError) {
    console.error('[pass-reopen-failure]', {
      claimId,
      documentId,
      error: reopenError.message,
    });

    return jsonError('pass_reopen_failed', 'Upload partially failed', 500);
  }

  const { count: newCount } = await supabaseAdmin
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('claim_id', claimId);

  if (newCount && newCount > MAX_DOCUMENTS_PER_CLAIM) {
    console.error('[soft-limit-exceeded]', {
      claimId,
      documentCount: newCount,
      documentId,
    });
  }

  try {
    await inngest.send({
      name: 'claim/document.uploaded',
      data: { claimId, documentId },
    });
  } catch (error) {
    console.error('[inngest-send-failure]', { documentId, error });
  }

  return NextResponse.json(
    {
      ok: true,
      data: { document },
    } satisfies ApiResult<{ document: Document }>,
    { status: 201 },
  );
}

function validateFile(file: File): NextResponse<ApiResult<never>> | null {
  if (file.size <= MIN_FILE_SIZE_BYTES) {
    return jsonError('empty_file', 'File is empty', 400);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return jsonError('file_too_large', 'File exceeds 4 MB limit', 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return jsonError('invalid_file_type', 'Unsupported file type', 400);
  }

  return null;
}

function jsonError(
  code: string,
  message: string,
  status: number,
): NextResponse<ApiResult<never>> {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message },
    },
    { status },
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function sanitizeFilename(name: string): string {
  const sanitized = name
    .replace(/\.\.\//g, '')
    .replace(/[\\/\u0000\u0001-\u001f\u200e\u200f\u202a-\u202e]/g, '')
    .trim();

  return (sanitized || 'document').slice(0, 255);
}

function mapDbRowToDocument(row: DbDocumentRow): Document {
  return {
    id: row.id,
    claimId: row.claim_id,
    documentType: row.document_type,
    documentSubtype: row.document_subtype ?? null,
    filePath: row.file_path,
    fileName: row.file_name,
    fileSize: toNullableNumber(row.file_size),
    mimeType: row.mime_type,
    ocrText: row.ocr_text,
    extractedData: row.extracted_data ?? null,
    processingStatus: row.processing_status,
    responseToQuestionId: row.response_to_question_id ?? null,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

function toNullableNumber(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(value);
}
