import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  ApiResult,
  DocumentProcessingStatus,
  DocumentType,
} from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    id: string;
    docId: string;
  };
};

type StatusResponse = {
  documentId: string;
  processing_status: DocumentProcessingStatus;
  document_type: DocumentType;
  error_message?: string;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  if (!isUuid(params.id) || !isUuid(params.docId)) {
    return jsonError('invalid_id', 'Malformed claim or document id', 400);
  }

  const { data, error } = await createAdminClient()
    .from('documents')
    .select('id, processing_status, document_type, extracted_data')
    .eq('claim_id', params.id)
    .eq('id', params.docId)
    .maybeSingle();

  if (error) {
    console.error('[document-status-query-failed]', error);

    return jsonError('db_error', 'Database error', 500);
  }

  if (!data) {
    return jsonError('document_not_found', 'Document not found', 404);
  }

  const response: StatusResponse = {
    documentId: data.id as string,
    processing_status: data.processing_status as DocumentProcessingStatus,
    document_type: data.document_type as DocumentType,
  };
  const errorMessage = getErrorMessage(data.extracted_data);

  if (response.processing_status === 'failed' && errorMessage) {
    response.error_message = errorMessage;
  }

  return NextResponse.json(
    { ok: true, data: response } satisfies ApiResult<StatusResponse>,
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}

function jsonError(
  code: string,
  message: string,
  status: number,
): NextResponse<ApiResult<never>> {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getErrorMessage(value: unknown): string | undefined {
  if (
    value &&
    typeof value === 'object' &&
    'error' in value &&
    typeof value.error === 'string'
  ) {
    return value.error;
  }

  return undefined;
}
