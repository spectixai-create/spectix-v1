import { NextResponse } from 'next/server';

import { recordClaimantTokenInvalidAttempt } from '@/lib/claimant/audit';
import { mapClaimantRpcError } from '@/lib/claimant/errors';
import { hashClaimantToken } from '@/lib/claimant/tokens';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResult, Document } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
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
  { params }: { params: { claim_id: string } },
): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError('empty_file', 'יש לצרף קובץ', 400);
  }

  const token = readFormString(formData, 'token');
  const questionId = readFormString(formData, 'question_id');
  const file = formData.get('file');

  if (!token || !questionId || !(file instanceof File)) {
    return jsonError('invalid_payload', 'חסרים פרטי העלאה', 400);
  }

  const validationError = validateFile(file);
  if (validationError) return validationError;

  const contentError = await validateFileContent(file);
  if (contentError) return contentError;

  const extension = MIME_TO_EXTENSION[file.type];
  if (!extension) {
    return jsonError('invalid_file_type', 'סוג הקובץ אינו נתמך', 400);
  }

  const supabase = createAdminClient();
  const tokenHash = hashClaimantToken(token);
  const { error: tokenError } = await supabase.rpc(
    'validate_claimant_magic_link',
    {
      p_token_hash: tokenHash,
      p_claim_id: params.claim_id,
    },
  );

  if (tokenError) {
    const mapped = mapClaimantRpcError(tokenError);
    await recordClaimantTokenInvalidAttempt({
      claimId: params.claim_id,
      attemptedEndpoint: '/api/c/[claim_id]/upload',
      code: mapped.code,
      supabase,
    });
    return jsonError(mapped.code, mapped.message, mapped.status);
  }

  const documentId = crypto.randomUUID();
  const path = `claims/${params.claim_id}/claimant-responses/${documentId}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('claim-documents')
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('[claimant-response-storage-error]', uploadError.message);
    return jsonError('storage_error', 'שמירת הקובץ נכשלה', 500);
  }

  const { data: inserted, error: insertError } = await supabase
    .from('documents')
    .insert({
      id: documentId,
      claim_id: params.claim_id,
      document_type: 'other',
      file_path: path,
      file_name: sanitizeFilename(file.name),
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: null,
      processing_status: 'pending',
      response_to_question_id: questionId,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    await supabase.storage.from('claim-documents').remove([path]);
    console.error(
      '[claimant-response-document-insert-error]',
      insertError?.message,
    );
    return jsonError('db_error', 'שמירת המסמך נכשלה', 500);
  }

  const { error: linkError } = await supabase.rpc('link_document_to_question', {
    p_token_hash: tokenHash,
    p_claim_id: params.claim_id,
    p_document_id: documentId,
    p_question_id: questionId,
  });

  if (linkError) {
    await supabase.from('documents').delete().eq('id', documentId);
    await supabase.storage.from('claim-documents').remove([path]);
    const mapped = mapClaimantRpcError(linkError);
    await recordClaimantTokenInvalidAttempt({
      claimId: params.claim_id,
      attemptedEndpoint: '/api/c/[claim_id]/upload',
      code: mapped.code,
      supabase,
    });
    return jsonError(mapped.code, mapped.message, mapped.status);
  }

  const { error: draftError } = await supabase.rpc('save_draft', {
    p_token_hash: tokenHash,
    p_claim_id: params.claim_id,
    p_question_id: questionId,
    p_response_value: {
      type: 'document',
      document_id: documentId,
      file_name: sanitizeFilename(file.name),
    },
  });

  if (draftError) {
    const mapped = mapClaimantRpcError(draftError);
    await recordClaimantTokenInvalidAttempt({
      claimId: params.claim_id,
      attemptedEndpoint: '/api/c/[claim_id]/upload',
      code: mapped.code,
      supabase,
    });
    return jsonError(mapped.code, mapped.message, mapped.status);
  }

  return jsonOk({ document: mapDbRowToDocument(inserted as DbDocumentRow) });
}

function readFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateFile(file: File): NextResponse<ApiResult<never>> | null {
  if (file.size <= MIN_FILE_SIZE_BYTES) {
    return jsonError('empty_file', 'הקובץ ריק', 400);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return jsonError('file_too_large', 'הקובץ גדול מ-4MB', 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return jsonError('invalid_file_type', 'סוג הקובץ אינו נתמך', 400);
  }

  return null;
}

async function validateFileContent(
  file: File,
): Promise<NextResponse<ApiResult<never>> | null> {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());

  if (file.type === 'application/pdf') {
    return bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
      ? null
      : jsonError('invalid_file_content', 'תוכן הקובץ אינו PDF תקין', 400);
  }

  if (file.type === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      ? null
      : jsonError('invalid_file_content', 'תוכן הקובץ אינו JPEG תקין', 400);
  }

  if (file.type === 'image/png') {
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return pngSignature.every((byte, index) => bytes[index] === byte)
      ? null
      : jsonError('invalid_file_content', 'תוכן הקובץ אינו PNG תקין', 400);
  }

  return null;
}

function sanitizeFilename(name: string): string {
  const sanitized = name
    .replace(/\.\.\//g, '')
    .replace(/[\\/\u0000-\u001f\u200e\u200f\u202a-\u202e]/g, '')
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
    fileSize: row.file_size === null ? null : Number(row.file_size),
    mimeType: row.mime_type,
    ocrText: row.ocr_text,
    extractedData: row.extracted_data ?? null,
    processingStatus: row.processing_status,
    responseToQuestionId: row.response_to_question_id ?? null,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

function jsonOk<T>(data: T): NextResponse<ApiResult<T>> {
  return NextResponse.json({ ok: true, data });
}

function jsonError(
  code: string,
  message: string,
  status: number,
): NextResponse<ApiResult<never>> {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}
