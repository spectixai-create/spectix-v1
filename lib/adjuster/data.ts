import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  buildAdjusterAudit,
  canEscalate,
  canRequestInfo,
  composeClaimDetailSnapshot,
  composeClaimListResponse,
  planQuestionDispatches,
} from '@/lib/adjuster/service';
import type {
  AuditLogView,
  ClaimDetailSnapshot,
  ClaimListQuery,
  ClaimListResponse,
  DocumentWithSignedUrl,
  QuestionDispatchState,
} from '@/lib/adjuster/types';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  AuditLog,
  Claim,
  ClaimStatus,
  ClaimValidation,
  Document,
  Pass,
  QuestionDispatch,
  SynthesisResult,
} from '@/lib/types';

type DbClaimRow = {
  id: string;
  claim_number: string;
  status: ClaimStatus;
  risk_band: Claim['riskBand'];
  risk_score: number | string | null;
  claim_type: Claim['claimType'];
  insured_name: string | null;
  claimant_name: string | null;
  incident_date: string | null;
  trip_start_date?: string | null;
  trip_end_date?: string | null;
  pre_trip_insurance?: Claim['preTripInsurance'];
  incident_location: string | null;
  amount_claimed: number | string | null;
  currency: string;
  currency_code?: string | null;
  summary: string | null;
  metadata: Claim['metadata'];
  claimant_email: string | null;
  claimant_phone: string | null;
  policy_number: string | null;
  current_pass: number | string | null;
  total_llm_cost_usd: number | string | null;
  brief_text: string | null;
  brief_pass_number: number | null;
  brief_recommendation: Claim['briefRecommendation'];
  brief_generated_at: string | null;
  escalated_to_investigator: boolean | null;
  created_at: string;
  updated_at: string;
};

type DbPassRow = {
  id: string;
  claim_id: string;
  pass_number: number;
  status: Pass['status'];
  started_at: string | null;
  completed_at: string | null;
  risk_band: Pass['riskBand'];
  findings_count: number | string | null;
  gaps_count: number | string | null;
  llm_calls_made: number | string | null;
  cost_usd: number | string | null;
  created_at: string;
};

type DbDocumentRow = {
  id: string;
  claim_id: string;
  document_type: Document['documentType'];
  document_subtype: Document['documentSubtype'];
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

type DbClaimValidationRow = {
  id: string;
  claim_id: string;
  pass_number: number;
  layer_id: ClaimValidation['layerId'];
  status: ClaimValidation['status'];
  payload: Record<string, unknown>;
  created_at: string;
};

type DbSynthesisResultRow = {
  id: string;
  claim_id: string;
  pass_number: number;
  kind: SynthesisResult['kind'];
  payload: Record<string, unknown>;
  created_at: string;
};

type DbQuestionDispatchRow = {
  question_id: string;
  claim_id: string;
  first_dispatched_at: string;
  last_dispatched_at: string;
  dispatched_by: string;
  last_dispatched_by: string;
  edited_text: string | null;
  notification_sent_at?: string | null;
  notification_attempts?: number | string | null;
  notification_last_error?: string | null;
  notification_channel?: 'email' | 'sms' | 'both' | null;
};

type DbAuditLogRow = {
  id: string;
  claim_id: string | null;
  actor_type: AuditLog['actorType'];
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type AdjusterActionResult =
  | { ok: true; snapshot: ClaimDetailSnapshot }
  | { ok: false; status: number; code: string; message: string };

export async function fetchClaimsList(
  query: ClaimListQuery,
): Promise<ClaimListResponse> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;

  const claims = (data ?? []).map((row) => mapClaim(row as DbClaimRow));
  const synthesisResults = await fetchSynthesisResultsForClaims(
    supabase,
    claims.map((claim) => claim.id),
  );

  return composeClaimListResponse({
    claims,
    synthesisResults,
    query,
  });
}

export async function fetchClaimDetail(
  claimId: string,
): Promise<ClaimDetailSnapshot | null> {
  const supabase = createAdminClient();
  const { data: claimRow, error: claimError } = await supabase
    .from('claims')
    .select('*')
    .eq('id', claimId)
    .maybeSingle();

  if (claimError) throw claimError;
  if (!claimRow) return null;

  const [
    documents,
    passes,
    validations,
    synthesisResults,
    dispatches,
    auditLog,
  ] = await Promise.all([
    fetchDocuments(supabase, claimId),
    fetchPasses(supabase, claimId),
    fetchValidations(supabase, claimId),
    fetchSynthesisResults(supabase, claimId),
    fetchQuestionDispatches(supabase, claimId),
    fetchAuditLog(supabase, claimId),
  ]);

  return composeClaimDetailSnapshot({
    claim: mapClaim(claimRow as DbClaimRow),
    documents,
    passes,
    validations,
    synthesisResults,
    questionDispatches: dispatches,
    auditLog,
  });
}

export async function approveClaim(
  claimId: string,
  actorId: string,
): Promise<AdjusterActionResult> {
  const supabase = createAdminClient();
  const updated = await updateClaimStatus(supabase, claimId, 'reviewed', [
    'ready',
  ]);

  if (!updated) {
    return actionError(409, 'invalid_state', 'ניתן לאשר רק תיק שמוכן להחלטה');
  }

  await insertAudit(
    supabase,
    buildAdjusterAudit({
      claimId,
      actorId,
      action: 'adjuster_decision_approve',
      details: { from_status: 'ready', to_status: 'reviewed' },
    }),
  );

  return fetchSnapshotResult(claimId);
}

export async function rejectClaim(
  claimId: string,
  actorId: string,
  reason: string,
): Promise<AdjusterActionResult> {
  const supabase = createAdminClient();
  const updated = await updateClaimStatus(
    supabase,
    claimId,
    'rejected_no_coverage',
    ['ready', 'reviewed', 'pending_info', 'errored', 'cost_capped'],
  );

  if (!updated) {
    return actionError(409, 'invalid_state', 'לא ניתן לדחות תיק במצב הנוכחי');
  }

  await insertAudit(
    supabase,
    buildAdjusterAudit({
      claimId,
      actorId,
      action: 'adjuster_decision_reject',
      details: { reason, to_status: 'rejected_no_coverage' },
    }),
  );

  return fetchSnapshotResult(claimId);
}

export async function escalateClaim(
  claimId: string,
  actorId: string,
): Promise<AdjusterActionResult> {
  const supabase = createAdminClient();
  const state = await fetchClaimActionState(supabase, claimId);

  if (!state) return actionError(404, 'not_found', 'התיק לא נמצא');
  if (!canEscalate(state.status)) {
    return actionError(409, 'invalid_state', 'לא ניתן להסלים תיק שנדחה');
  }

  const updated = await updateEscalation(supabase, claimId, true);
  if (!updated) {
    return actionError(409, 'update_failed', 'עדכון ההסלמה נכשל');
  }

  await insertAudit(
    supabase,
    buildAdjusterAudit({
      claimId,
      actorId,
      action: 'adjuster_escalate',
      details: { escalated_to_investigator: true },
    }),
  );

  return fetchSnapshotResult(claimId);
}

export async function unescalateClaim(
  claimId: string,
  actorId: string,
): Promise<AdjusterActionResult> {
  const supabase = createAdminClient();
  const state = await fetchClaimActionState(supabase, claimId);

  if (!state) return actionError(404, 'not_found', 'התיק לא נמצא');
  if (!state.escalatedToInvestigator) {
    return actionError(409, 'invalid_state', 'התיק אינו מסומן להסלמה');
  }

  const updated = await updateEscalation(supabase, claimId, false);
  if (!updated) {
    return actionError(409, 'update_failed', 'עדכון ההסלמה נכשל');
  }

  await insertAudit(
    supabase,
    buildAdjusterAudit({
      claimId,
      actorId,
      action: 'adjuster_unescalate',
      details: { escalated_to_investigator: false },
    }),
  );

  return fetchSnapshotResult(claimId);
}

export async function requestClaimInfo({
  claimId,
  actorId,
  questionIds,
  editedTexts,
}: {
  claimId: string;
  actorId: string;
  questionIds: string[];
  editedTexts?: Record<string, string>;
}): Promise<AdjusterActionResult> {
  const supabase = createAdminClient();
  const state = await fetchClaimActionState(supabase, claimId);

  if (!state) return actionError(404, 'not_found', 'התיק לא נמצא');
  if (!canRequestInfo(state.status)) {
    return actionError(
      409,
      'invalid_state',
      'ניתן לבקש מידע רק מתיק מוכן או ממתין למידע',
    );
  }

  const now = new Date().toISOString();
  const existing = await fetchQuestionDispatchesForQuestions(
    supabase,
    claimId,
    questionIds,
  );
  const { insertRows, updateRows } = planQuestionDispatches({
    claimId,
    questionIds,
    existing,
    actorId,
    now,
    editedTexts,
  });

  if (insertRows.length > 0) {
    const { error } = await supabase
      .from('question_dispatches')
      .insert(insertRows);
    if (error) throw error;
  }

  const updateResults = await Promise.all(
    updateRows.map((dispatch) =>
      supabase
        .from('question_dispatches')
        .update({
          last_dispatched_at: dispatch.lastDispatchedAt,
          last_dispatched_by: dispatch.lastDispatchedBy,
          edited_text: dispatch.editedText,
        })
        .eq('claim_id', claimId)
        .eq('question_id', dispatch.questionId),
    ),
  );
  const updateError = updateResults.find((result) => result.error)?.error;
  if (updateError) throw updateError;

  const statusUpdated = await updateClaimStatus(
    supabase,
    claimId,
    'pending_info',
    ['ready', 'pending_info'],
  );

  if (!statusUpdated) {
    return actionError(409, 'invalid_state', 'סטטוס התיק השתנה בזמן השליחה');
  }

  await insertAudit(
    supabase,
    buildAdjusterAudit({
      claimId,
      actorId,
      action: 'adjuster_request_info',
      targetTable: 'question_dispatches',
      details: {
        question_ids: questionIds,
        questions_count: questionIds.length,
        edited_count: Object.keys(editedTexts ?? {}).length,
      },
    }),
  );

  return fetchSnapshotResult(claimId);
}

async function fetchSynthesisResultsForClaims(
  supabase: SupabaseClient,
  claimIds: string[],
): Promise<SynthesisResult[]> {
  if (claimIds.length === 0) return [];

  const { data, error } = await supabase
    .from('synthesis_results')
    .select('*')
    .in('claim_id', claimIds)
    .eq('pass_number', 3);

  if (error) throw error;
  return (data ?? []).map((row) =>
    mapSynthesisResult(row as DbSynthesisResultRow),
  );
}

async function fetchDocuments(
  supabase: SupabaseClient,
  claimId: string,
): Promise<DocumentWithSignedUrl[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return Promise.all(
    (data ?? []).map(async (row) => {
      const document = mapDocument(row as DbDocumentRow);
      const { data: signedData } = await supabase.storage
        .from('claim-documents')
        .createSignedUrl(document.filePath, 60 * 60);

      return {
        ...document,
        signedUrl: signedData?.signedUrl ?? null,
      };
    }),
  );
}

async function fetchPasses(
  supabase: SupabaseClient,
  claimId: string,
): Promise<Pass[]> {
  const { data, error } = await supabase
    .from('passes')
    .select('*')
    .eq('claim_id', claimId)
    .order('pass_number', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapPass(row as DbPassRow));
}

async function fetchValidations(
  supabase: SupabaseClient,
  claimId: string,
): Promise<ClaimValidation[]> {
  const { data, error } = await supabase
    .from('claim_validations')
    .select('*')
    .eq('claim_id', claimId)
    .order('layer_id', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) =>
    mapClaimValidation(row as DbClaimValidationRow),
  );
}

async function fetchSynthesisResults(
  supabase: SupabaseClient,
  claimId: string,
): Promise<SynthesisResult[]> {
  const { data, error } = await supabase
    .from('synthesis_results')
    .select('*')
    .eq('claim_id', claimId)
    .eq('pass_number', 3)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) =>
    mapSynthesisResult(row as DbSynthesisResultRow),
  );
}

async function fetchQuestionDispatches(
  supabase: SupabaseClient,
  claimId: string,
): Promise<QuestionDispatchState[]> {
  const { data, error } = await supabase
    .from('question_dispatches')
    .select('*')
    .eq('claim_id', claimId);

  if (error) throw error;
  return (data ?? []).map((row) =>
    mapQuestionDispatch(row as DbQuestionDispatchRow),
  );
}

async function fetchQuestionDispatchesForQuestions(
  supabase: SupabaseClient,
  claimId: string,
  questionIds: string[],
): Promise<QuestionDispatch[]> {
  const { data, error } = await supabase
    .from('question_dispatches')
    .select('*')
    .eq('claim_id', claimId)
    .in('question_id', questionIds);

  if (error) throw error;
  return (data ?? []).map((row) =>
    mapQuestionDispatch(row as DbQuestionDispatchRow),
  );
}

async function fetchAuditLog(
  supabase: SupabaseClient,
  claimId: string,
): Promise<AuditLogView[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []).map((row) => mapAuditLog(row as DbAuditLogRow));
}

async function fetchClaimActionState(
  supabase: SupabaseClient,
  claimId: string,
): Promise<{
  status: ClaimStatus;
  escalatedToInvestigator: boolean;
} | null> {
  const { data, error } = await supabase
    .from('claims')
    .select('status, escalated_to_investigator')
    .eq('id', claimId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as {
    status: ClaimStatus;
    escalated_to_investigator: boolean | null;
  };

  return {
    status: row.status,
    escalatedToInvestigator: row.escalated_to_investigator ?? false,
  };
}

async function updateClaimStatus(
  supabase: SupabaseClient,
  claimId: string,
  status: ClaimStatus,
  allowedStatuses: ClaimStatus[],
): Promise<boolean> {
  const { data, error } = await supabase
    .from('claims')
    .update({ status })
    .eq('id', claimId)
    .in('status', allowedStatuses)
    .select('id');

  if (error) throw error;
  return Array.isArray(data) && data.length === 1;
}

async function updateEscalation(
  supabase: SupabaseClient,
  claimId: string,
  value: boolean,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('claims')
    .update({ escalated_to_investigator: value })
    .eq('id', claimId)
    .select('id');

  if (error) throw error;
  return Array.isArray(data) && data.length === 1;
}

async function insertAudit(
  supabase: SupabaseClient,
  audit: ReturnType<typeof buildAdjusterAudit>,
): Promise<void> {
  const { error } = await supabase.from('audit_log').insert(audit);
  if (error) throw error;
}

async function fetchSnapshotResult(
  claimId: string,
): Promise<AdjusterActionResult> {
  const snapshot = await fetchClaimDetail(claimId);

  if (!snapshot) {
    return actionError(404, 'not_found', 'התיק לא נמצא לאחר העדכון');
  }

  return { ok: true, snapshot };
}

function actionError(
  status: number,
  code: string,
  message: string,
): AdjusterActionResult {
  return { ok: false, status, code, message };
}

function mapClaim(row: DbClaimRow): Claim {
  return {
    id: row.id,
    claimNumber: row.claim_number,
    status: row.status,
    riskBand: row.risk_band ?? null,
    riskScore: toNullableNumber(row.risk_score),
    claimType: row.claim_type,
    insuredName: row.insured_name,
    claimantName: row.claimant_name,
    incidentDate: row.incident_date,
    tripStartDate: row.trip_start_date ?? null,
    tripEndDate: row.trip_end_date ?? null,
    preTripInsurance: row.pre_trip_insurance ?? null,
    incidentLocation: row.incident_location,
    amountClaimed: toNullableNumber(row.amount_claimed),
    currency: row.currency,
    currencyCode: row.currency_code ?? row.currency,
    summary: row.summary,
    metadata: row.metadata ?? null,
    claimantEmail: row.claimant_email,
    claimantPhone: row.claimant_phone,
    policyNumber: row.policy_number,
    currentPass: Number(row.current_pass ?? 0),
    totalLlmCostUsd: Number(row.total_llm_cost_usd ?? 0),
    briefText: row.brief_text,
    briefPassNumber: row.brief_pass_number,
    briefRecommendation: row.brief_recommendation ?? null,
    briefGeneratedAt: row.brief_generated_at,
    escalatedToInvestigator: row.escalated_to_investigator ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPass(row: DbPassRow): Pass {
  return {
    id: row.id,
    claimId: row.claim_id,
    passNumber: Number(row.pass_number),
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    riskBand: row.risk_band ?? null,
    findingsCount: Number(row.findings_count ?? 0),
    gapsCount: Number(row.gaps_count ?? 0),
    llmCallsMade: Number(row.llm_calls_made ?? 0),
    costUsd: Number(row.cost_usd ?? 0),
    createdAt: row.created_at,
  };
}

function mapDocument(row: DbDocumentRow): Document {
  return {
    id: row.id,
    claimId: row.claim_id,
    documentType: row.document_type,
    documentSubtype: row.document_subtype,
    filePath: row.file_path,
    fileName: row.file_name,
    fileSize: row.file_size === null ? null : Number(row.file_size),
    mimeType: row.mime_type,
    ocrText: row.ocr_text,
    extractedData: row.extracted_data,
    processingStatus: row.processing_status,
    responseToQuestionId: row.response_to_question_id ?? null,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

function mapClaimValidation(row: DbClaimValidationRow): ClaimValidation {
  return {
    id: row.id,
    claimId: row.claim_id,
    passNumber: Number(row.pass_number),
    layerId: row.layer_id,
    status: row.status,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

function mapSynthesisResult(row: DbSynthesisResultRow): SynthesisResult {
  return {
    id: row.id,
    claimId: row.claim_id,
    passNumber: Number(row.pass_number),
    kind: row.kind,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

function mapQuestionDispatch(row: DbQuestionDispatchRow): QuestionDispatch {
  return {
    questionId: row.question_id,
    claimId: row.claim_id,
    firstDispatchedAt: row.first_dispatched_at,
    lastDispatchedAt: row.last_dispatched_at,
    dispatchedBy: row.dispatched_by,
    lastDispatchedBy: row.last_dispatched_by,
    editedText: row.edited_text,
    notificationSentAt: row.notification_sent_at ?? null,
    notificationAttempts: Number(row.notification_attempts ?? 0),
    notificationLastError: row.notification_last_error ?? null,
    notificationChannel: row.notification_channel ?? null,
  };
}

function mapAuditLog(row: DbAuditLogRow): AuditLogView {
  return {
    id: row.id,
    claimId: row.claim_id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    action: row.action,
    targetTable: row.target_table,
    targetId: row.target_id,
    details: row.details,
    createdAt: row.created_at,
  };
}

function toNullableNumber(value: number | string | null): number | null {
  if (value === null) return null;
  return Number(value);
}
