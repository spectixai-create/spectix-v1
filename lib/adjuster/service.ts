import type { Claim, ClaimStatus, SynthesisResult } from '@/lib/types';
import type {
  AuditInsert,
  BriefFinding,
  BriefQuestion,
  ClaimDetailSnapshot,
  ClaimListItem,
  ClaimListQuery,
  ClaimListResponse,
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

  const start = (normalized.page - 1) * normalized.pageSize;
  const items = filtered.slice(start, start + normalized.pageSize);

  return {
    items,
    page: normalized.page,
    pageSize: normalized.pageSize,
    total: filtered.length,
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

  return {
    claim,
    passes: [...passes].sort((a, b) => a.passNumber - b.passNumber),
    documents,
    validations: [...validations].sort((a, b) =>
      a.layerId.localeCompare(b.layerId),
    ),
    findings: synthesisResults.flatMap(mapFindingResult),
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
    .flatMap(mapFindingResult)
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
    topFindingCategory: topFinding?.category ?? null,
    daysOpen: calculateDaysOpen(claim.createdAt, now),
    escalatedToInvestigator: claim.escalatedToInvestigator,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
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

function mapFindingResult(result: SynthesisResult): BriefFinding[] {
  if (result.kind !== 'finding' || !isRecord(result.payload)) return [];

  return [
    {
      id: stringValue(result.payload.id, result.id),
      category: stringValue(result.payload.category, 'gap'),
      severity: severityValue(result.payload.severity),
      title: stringValue(result.payload.title, 'ממצא ללא כותרת'),
      description: stringValue(result.payload.description, ''),
      evidence: Array.isArray(result.payload.evidence)
        ? result.payload.evidence
        : [],
      sourceLayerId: nullableString(result.payload.source_layer_id),
    },
  ];
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
