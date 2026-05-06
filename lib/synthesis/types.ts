import type { EvidenceRef, ValidationLayerId } from '@/lib/validation';

export type FindingCategory = 'gap' | 'anomaly' | 'inconsistency';
export type FindingSeverity = 'low' | 'medium' | 'high';
export type QuestionAnswerType =
  | 'text'
  | 'document'
  | 'confirmation'
  | 'correction';

export type Finding = {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  evidence: EvidenceRef[];
  source_layer_id?: ValidationLayerId;
};

export type ClarificationQuestion = {
  id: string;
  text: string;
  related_finding_id: string;
  expected_answer_type: QuestionAnswerType;
  context?: Record<string, unknown>;
};

export type ReadinessScore = {
  id: 'rs_v1';
  score: number;
  computation_basis: 'finding_severity_v1';
  weights_used: {
    high: 30;
    medium: 15;
    low: 5;
  };
};

export type ClaimValidationRow = {
  id?: string;
  claim_id: string;
  pass_number: number;
  layer_id: ValidationLayerId;
  status: 'completed' | 'failed' | 'skipped';
  payload: Record<string, unknown>;
  created_at?: string;
};

export type SynthesisResultKind = 'finding' | 'question' | 'readiness_score';

export type SynthesisResultRow = {
  claim_id: string;
  pass_number: number;
  kind: SynthesisResultKind;
  payload: Finding | ClarificationQuestion | ReadinessScore;
};

export type SynthesisOutput = {
  findings: Finding[];
  questions: ClarificationQuestion[];
  readinessScore: ReadinessScore;
};
