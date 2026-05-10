import type { Claim, ClaimStatus, SynthesisResult } from '@/lib/types';
import type {
  AuditInsert,
  BriefFinding,
  BriefQuestion,
  ClaimDetailSnapshot,
  ClaimListItem,
  ClaimListQuery,
  ClaimListResponse,
  DocumentWithSignedUrl,
  FindingEvidenceView,
  QuestionDispatchState,
  ReadinessScoreView,
} from '@/lib/adjuster/types';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

const SEVERITY_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function normalizeClaimListQuery(
  query: ClaimListQuery,
): Required<Pick<ClaimListQuery, 'sort' | 'page' | 'pageSize'>> &
  Pick<ClaimListQuery, 'status' | 'search'> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(query.pageSize ?? DEFAULT_PAGE_SIZE)),
  );

  return {
    status: query.status ?? 'all',
    sort: query.sort ?? 'newest',
    search: query.search?.trim() || undefined,
    page,
    pageSize,
  };
}

export function composeClaimListResponse({
  claims,
  synthesisResults,
  query,
  now = new Date(),
}: {
  claims: Claim[];
  synthesisResults: SynthesisResult[];
  query: ClaimListQuery;
  now?: Date;
}): ClaimListResponse {
  const normalized = normalizeClaimListQuery(query);
  const resultsByClaim = groupSynthesisByClaim(synthesisResults);
  const search = normalized.search?.toLocaleLowerCase('he-IL');

  const filtered = claims
    .filter((claim) =>
      normalized.status && normalized.status !== 'all'
        ? claim.status === normalized.status
        : true,
    )
    .filter((claim) => {
      if (!search) return true;

      return [
        claim.claimNumber,
        claim.claimantName,
        claim.insuredName,
        claim.policyNumber,
        claim.incidentLocation,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase('he-IL').includes(search),
        );
    })
    .map((claim) =>
      composeClaimListItem(claim, resultsByClaim.get(claim.id) ?? [], now),
    )
    .sort((a, b) => compareClaimListItems(a, b, normalized.sort));
  const summary = composeClaimListSummary(filtered);

  const start = (normalized.page - 1) * normalized.pageSize;
  const items = filtered.slice(start, start + normalized.pageSize);

  return {
    items,
    page: normalized.page,
    pageSize: normalized.pageSize,
    total: filtered.length,
    summary,
  };
}

export function composeClaimDetailSnapshot({
  claim,
  passes,
  documents,
  validations,
  synthesisResults,
  questionDispatches,
  auditLog,
}: Omit<ClaimDetailSnapshot, 'findings' | 'questions' | 'readinessScore'> & {
  questionDispatches: QuestionDispatchState[];
}): ClaimDetailSnapshot {
  const dispatchesByQuestion = new Map(
    questionDispatches.map((dispatch) => [dispatch.questionId, dispatch]),
  );
  const documentsById = new Map(
    documents.map((document) => [document.id, document]),
  );

  return {
    claim,
    passes: [...passes].sort((a, b) => a.passNumber - b.passNumber),
    documents,
    validations: [...validations].sort((a, b) =>
      a.layerId.localeCompare(b.layerId),
    ),
    findings: synthesisResults.flatMap((result) =>
      mapFindingResult(result, documentsById),
    ),
    questions: synthesisResults.flatMap((result) =>
      mapQuestionResult(result, dispatchesByQuestion),
    ),
    readinessScore: mapReadinessScore(
      [...synthesisResults]
        .reverse()
        .find((result) => result.kind === 'readiness_score') ?? null,
    ),
    synthesisResults,
    auditLog: [...auditLog].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  };
}

export function canApprove(status: ClaimStatus): boolean {
  return status === 'ready';
}

export function canReject(status: ClaimStatus): boolean {
  return [
    'ready',
    'reviewed',
    'pending_info',
    'errored',
    'cost_capped',
  ].includes(status);
}

export function canEscalate(status: ClaimStatus): boolean {
  return status !== 'rejected_no_coverage';
}

export function canRequestInfo(status: ClaimStatus): boolean {
  return status === 'ready' || status === 'pending_info';
}

export function buildAdjusterAudit({
  claimId,
  actorId,
  action,
  details,
  targetTable = 'claims',
}: {
  claimId: string;
  actorId: string;
  action: AuditInsert['action'];
  details: Record<string, unknown>;
  targetTable?: AuditInsert['target_table'];
}): AuditInsert {
  return {
    claim_id: claimId,
    actor_type: 'user',
    actor_id: actorId,
    action,
    target_table: targetTable,
    target_id: claimId,
    details: {
      claim_id: claimId,
      ...details,
    },
  };
}

export function validateRejectReason(reason: unknown): string | null {
  if (typeof reason !== 'string') return null;
  const trimmed = reason.trim();
  if (!trimmed || trimmed.length > 500) return null;
  return trimmed;
}

export type RejectionPayload = {
  reason: string;
  policyClause: string;
  customerMessage: string;
};

export function validateRejectionPayload(
  value: unknown,
): RejectionPayload | null {
  if (!isRecord(value)) return null;

  const reason = validateBoundedText(value.reason, 500);
  const policyClause = validateBoundedText(value.policy_clause, 500);
  const customerMessage = validateBoundedText(value.customer_message, 2500);

  if (!reason || !policyClause || !customerMessage) return null;

  return { reason, policyClause, customerMessage };
}

export function buildDefaultRejectionCustomerMessage({
  customerName,
  claimNumber,
  rejectionReason,
  policyClause,
  additionalExplanation,
}: {
  customerName: string | null;
  claimNumber: string | null;
  rejectionReason: string;
  policyClause: string;
  additionalExplanation?: string | null;
}): string {
  const name = customerName?.trim() || 'לקוח/ה';
  const number = claimNumber?.trim() || 'התביעה';
  const explanation = additionalExplanation?.trim();

  return `שלום ${name},

לאחר בדיקת התביעה מספר ${number}, לא ניתן לאשר את התביעה בשלב זה.

סיבת ההחלטה:
${rejectionReason}

הבסיס להחלטה:
${policyClause}${explanation ? `\n\n${explanation}` : ''}

בברכה,
מחלקת תביעות`;
}

export function normalizeQuestionIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const ids = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return ids.length > 0 ? Array.from(new Set(ids)) : null;
}

export function normalizeEditedTexts(
  value: unknown,
): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([key, text]) => [key, text.trim()] as const)
    .filter(([, text]) => text.length > 0);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function planQuestionDispatches({
  claimId,
  questionIds,
  existing,
  actorId,
  now,
  editedTexts,
}: {
  claimId: string;
  questionIds: string[];
  existing: QuestionDispatchState[];
  actorId: string;
  now: string;
  editedTexts?: Record<string, string>;
}) {
  const existingById = new Map(
    existing.map((dispatch) => [dispatch.questionId, dispatch]),
  );

  return {
    insertRows: questionIds
      .filter((questionId) => !existingById.has(questionId))
      .map((questionId) => ({
        claim_id: claimId,
        question_id: questionId,
        first_dispatched_at: now,
        last_dispatched_at: now,
        dispatched_by: actorId,
        last_dispatched_by: actorId,
        edited_text: editedTexts?.[questionId] ?? null,
      })),
    updateRows: questionIds
      .map((questionId) => existingById.get(questionId))
      .filter((dispatch): dispatch is QuestionDispatchState =>
        Boolean(dispatch),
      )
      .map((dispatch) => ({
        questionId: dispatch.questionId,
        lastDispatchedAt: now,
        lastDispatchedBy: actorId,
        editedText: editedTexts?.[dispatch.questionId] ?? dispatch.editedText,
      })),
  };
}

function composeClaimListItem(
  claim: Claim,
  synthesisResults: SynthesisResult[],
  now: Date,
): ClaimListItem {
  const readinessScore = mapReadinessScore(
    [...synthesisResults]
      .reverse()
      .find((result) => result.kind === 'readiness_score') ?? null,
  );
  const topFinding = synthesisResults
    .flatMap((result) => mapFindingResult(result))
    .sort(
      (a, b) =>
        (SEVERITY_WEIGHT[b.severity] ?? 0) - (SEVERITY_WEIGHT[a.severity] ?? 0),
    )[0];

  return {
    id: claim.id,
    claimNumber: claim.claimNumber,
    status: claim.status,
    claimantName: claim.claimantName,
    insuredName: claim.insuredName,
    claimType: claim.claimType,
    incidentLocation: claim.incidentLocation,
    amountClaimed: claim.amountClaimed,
    currency: claim.currency,
    readinessScore: readinessScore?.score ?? null,
    riskBand: claim.riskBand,
    riskScore: claim.riskScore,
    topFindingCategory: topFinding?.category ?? null,
    topFindingSeverity: topFinding?.severity ?? null,
    daysOpen: calculateDaysOpen(claim.createdAt, now),
    escalatedToInvestigator: claim.escalatedToInvestigator,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  };
}

function composeClaimListSummary(items: ClaimListItem[]) {
  return {
    totalOpen: items.filter(
      (item) => !['reviewed', 'rejected_no_coverage'].includes(item.status),
    ).length,
    ready: items.filter((item) => item.status === 'ready').length,
    pendingInfo: items.filter((item) => item.status === 'pending_info').length,
    highRisk: items.filter(
      (item) => item.riskBand === 'red' || item.riskBand === 'orange',
    ).length,
  };
}

function compareClaimListItems(
  a: ClaimListItem,
  b: ClaimListItem,
  sort: NonNullable<ClaimListQuery['sort']>,
): number {
  switch (sort) {
    case 'oldest':
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case 'score_desc':
      return (b.readinessScore ?? -1) - (a.readinessScore ?? -1);
    case 'days_open_desc':
      return b.daysOpen - a.daysOpen;
    case 'newest':
    default:
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
}

function calculateDaysOpen(createdAt: string, now: Date): number {
  const ageMs = now.getTime() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
}

function groupSynthesisByClaim(
  results: SynthesisResult[],
): Map<string, SynthesisResult[]> {
  const grouped = new Map<string, SynthesisResult[]>();

  for (const result of results) {
    const existing = grouped.get(result.claimId) ?? [];
    existing.push(result);
    grouped.set(result.claimId, existing);
  }

  return grouped;
}

function mapFindingResult(
  result: SynthesisResult,
  documentsById?: Map<string, DocumentWithSignedUrl>,
): BriefFinding[] {
  if (result.kind !== 'finding' || !isRecord(result.payload)) return [];

  return [
    {
      id: stringValue(result.payload.id, result.id),
      category: stringValue(result.payload.category, 'gap'),
      severity: severityValue(result.payload.severity),
      title: stringValue(result.payload.title, 'ממצא ללא כותרת'),
      description: stringValue(result.payload.description, ''),
      evidence: Array.isArray(result.payload.evidence)
        ? result.payload.evidence.flatMap((item) => {
            const evidence = mapFindingEvidence(item, documentsById);

            return evidence ? [evidence] : [];
          })
        : [],
      sourceLayerId: nullableString(result.payload.source_layer_id),
    },
  ];
}

function mapFindingEvidence(
  value: unknown,
  documentsById?: Map<string, DocumentWithSignedUrl>,
): FindingEvidenceView | null {
  if (!isRecord(value)) return null;

  const documentId = nullableString(value.document_id);
  const document = documentId ? documentsById?.get(documentId) : undefined;
  const fieldPath = nullableString(value.field_path);
  const fieldName =
    nullableString(value.field_name) ?? deriveFieldName(fieldPath);
  const rawValue = conciseEvidenceValue(value.raw_value);
  const normalizedValue = conciseEvidenceValue(value.normalized_value);
  const expectedValue = firstConciseEvidenceValue(
    value.expected_value,
    value.expected,
    value.expectedValue,
  );
  const foundValue = firstConciseEvidenceValue(
    value.found_value,
    value.found,
    value.foundValue,
    value.raw_value,
    value.normalized_value,
  );
  const sourceQuote = firstConciseEvidenceValue(
    value.source_quote,
    value.sourceQuote,
    value.quote,
    value.source_text,
  );
  const explanation = firstConciseEvidenceValue(
    value.explanation,
    value.reason,
  );
  const recommendedAction = firstConciseEvidenceValue(
    value.recommended_action,
    value.recommendedAction,
  );

  if (
    !documentId &&
    !fieldPath &&
    !rawValue &&
    !normalizedValue &&
    !expectedValue &&
    !foundValue &&
    !sourceQuote &&
    !explanation &&
    !recommendedAction
  ) {
    return null;
  }

  return {
    documentId,
    documentFileName: document?.fileName ?? null,
    documentType:
      document?.documentType ?? nullableString(value.document_type) ?? null,
    documentSubtype:
      document?.documentSubtype ??
      nullableString(value.document_subtype) ??
      null,
    fieldPath,
    fieldName,
    rawValue,
    normalizedValue,
    expectedValue,
    foundValue,
    sourceQuote,
    explanation,
    recommendedAction,
  };
}

function deriveFieldName(fieldPath: string | null): string | null {
  if (!fieldPath) return null;

  const parts = fieldPath.split('.').filter(Boolean);
  const fieldsIndex = parts.lastIndexOf('fields');

  if (fieldsIndex >= 0 && parts[fieldsIndex + 1]) {
    return parts[fieldsIndex + 1];
  }

  const last = parts.at(-1);
  const previous = parts.at(-2);

  if (last === 'value' && previous) {
    return previous;
  }

  return last ?? fieldPath;
}

function conciseEvidenceValue(value: unknown): string | null {
  const text =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : null;

  if (!text) return null;

  const normalized = text.replace(/\s+/g, ' ').trim();

  return normalized.length > 0 && normalized.length <= 120 ? normalized : null;
}

function firstConciseEvidenceValue(...values: unknown[]): string | null {
  for (const value of values) {
    const concise = conciseEvidenceValue(value);
    if (concise) return concise;
  }

  return null;
}

function validateBoundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function mapQuestionResult(
  result: SynthesisResult,
  dispatchesByQuestion: Map<string, QuestionDispatchState>,
): BriefQuestion[] {
  if (result.kind !== 'question' || !isRecord(result.payload)) return [];

  const id = stringValue(result.payload.id, result.id);

  return [
    {
      id,
      text: stringValue(result.payload.text, 'שאלה ללא טקסט'),
      relatedFindingId: nullableString(result.payload.related_finding_id),
      expectedAnswerType: stringValue(
        result.payload.expected_answer_type,
        'text',
      ),
      requiredAction: nullableString(result.payload.required_action),
      customerLabel: nullableString(result.payload.customer_label),
      context: nullableString(result.payload.context),
      dispatch: dispatchesByQuestion.get(id) ?? null,
    },
  ];
}

function mapReadinessScore(
  result: SynthesisResult | null,
): ReadinessScoreView | null {
  if (
    !result ||
    result.kind !== 'readiness_score' ||
    !isRecord(result.payload)
  ) {
    return null;
  }

  return {
    id: stringValue(result.payload.id, 'rs_v1'),
    score: numberValue(result.payload.score, 0),
    computationBasis: stringValue(
      result.payload.computation_basis,
      'finding_severity_v1',
    ),
    weightsUsed: isRecord(result.payload.weights_used)
      ? Object.fromEntries(
          Object.entries(result.payload.weights_used).map(([key, value]) => [
            key,
            numberValue(value, 0),
          ]),
        )
      : {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function severityValue(value: unknown): BriefFinding['severity'] {
  return value === 'high' || value === 'medium' || value === 'low'
    ? value
    : 'medium';
}
