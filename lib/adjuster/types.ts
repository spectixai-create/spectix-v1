import type {
  AuditActorType,
  Claim,
  ClaimStatus,
  ClaimValidation,
  Document,
  FindingSeverity,
  Pass,
  RiskBand,
  SynthesisResult,
} from '@/lib/types';

export type ClaimSort = 'newest' | 'oldest' | 'score_desc' | 'days_open_desc';

export type ClaimListQuery = {
  status?: ClaimStatus | 'all';
  sort?: ClaimSort;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ClaimListItem = {
  id: string;
  claimNumber: string;
  status: ClaimStatus;
  claimantName: string | null;
  insuredName: string | null;
  claimType: string | null;
  incidentLocation: string | null;
  amountClaimed: number | null;
  currency: string;
  readinessScore: number | null;
  riskBand: RiskBand | null;
  riskScore: number | null;
  topFindingCategory: string | null;
  topFindingSeverity: FindingSeverity | null;
  daysOpen: number;
  escalatedToInvestigator: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClaimListSummary = {
  totalOpen: number;
  ready: number;
  pendingInfo: number;
  highRisk: number;
};

export type ClaimListResponse = {
  items: ClaimListItem[];
  page: number;
  pageSize: number;
  total: number;
  summary: ClaimListSummary;
};

export type DocumentWithSignedUrl = Document & {
  signedUrl: string | null;
};

export type QuestionDispatchState = {
  questionId: string;
  firstDispatchedAt: string;
  lastDispatchedAt: string;
  dispatchedBy: string;
  lastDispatchedBy: string;
  editedText: string | null;
  notificationSentAt?: string | null;
  notificationAttempts?: number;
  notificationLastError?: string | null;
  notificationChannel?: 'email' | 'sms' | 'both' | null;
};

export type BriefFinding = {
  id: string;
  category: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  evidence: unknown[];
  sourceLayerId: string | null;
};

export type BriefQuestion = {
  id: string;
  text: string;
  relatedFindingId: string | null;
  expectedAnswerType: string;
  context: string | null;
  dispatch: QuestionDispatchState | null;
};

export type ReadinessScoreView = {
  id: string;
  score: number;
  computationBasis: string;
  weightsUsed: Record<string, number>;
};

export type AuditLogView = {
  id: string;
  claimId: string | null;
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  targetTable: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export type ClaimDetailSnapshot = {
  claim: Claim;
  passes: Pass[];
  documents: DocumentWithSignedUrl[];
  validations: ClaimValidation[];
  findings: BriefFinding[];
  questions: BriefQuestion[];
  readinessScore: ReadinessScoreView | null;
  synthesisResults: SynthesisResult[];
  auditLog: AuditLogView[];
};

export type AdjusterAuditAction =
  | 'adjuster_decision_approve'
  | 'adjuster_decision_reject'
  | 'adjuster_request_info'
  | 'adjuster_escalate'
  | 'adjuster_unescalate';

export type AuditInsert = {
  claim_id: string;
  actor_type: 'user';
  actor_id: string;
  action: AdjusterAuditAction;
  target_table: 'claims' | 'question_dispatches' | 'claimant_magic_links';
  target_id: string;
  details: Record<string, unknown>;
};
