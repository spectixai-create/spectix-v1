import type {
  ClarificationQuestion,
  Document,
  SynthesisResult,
} from '@/lib/types';

export type ClaimantPortalState =
  | 'valid'
  | 'invalid'
  | 'expired'
  | 'revoked'
  | 'used'
  | 'done';

export type ClaimantQuestionAnswerType =
  | 'text'
  | 'document'
  | 'confirmation'
  | 'correction';

export type ClaimantQuestion = {
  id: string;
  text: string;
  expectedAnswerType: ClaimantQuestionAnswerType;
  context: string | null;
  draftValue: Record<string, unknown> | null;
  responseValue: Record<string, unknown> | null;
};

export type ClaimantPortalSnapshot = {
  state: ClaimantPortalState;
  claimId: string;
  claimNumber: string | null;
  questions: ClaimantQuestion[];
  documents: Pick<Document, 'id' | 'fileName' | 'responseToQuestionId'>[];
};

export type ClaimantQuestionPayload = ClarificationQuestion & {
  expected_answer_type?: ClaimantQuestionAnswerType;
};

export function isQuestionResult(
  result: SynthesisResult,
): result is SynthesisResult & {
  kind: 'question';
  payload: ClaimantQuestionPayload;
} {
  return result.kind === 'question';
}
