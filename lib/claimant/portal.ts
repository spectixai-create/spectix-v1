import 'server-only';

import { recordClaimantLinkOpened } from '@/lib/claimant/audit';
import { hashClaimantToken } from '@/lib/claimant/tokens';
import type {
  ClaimantPortalSnapshot,
  ClaimantPortalState,
  ClaimantQuestion,
  ClaimantQuestionAnswerType,
} from '@/lib/claimant/types';
import { createAdminClient } from '@/lib/supabase/admin';

type MagicLinkRow = {
  token_hash: string;
  claim_id: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
};

type ClaimRow = {
  id: string;
  claim_number: string | null;
};

type SynthesisQuestionRow = {
  id: string;
  payload: {
    id?: string;
    text?: string;
    expected_answer_type?: ClaimantQuestionAnswerType;
    context?: Record<string, unknown>;
  };
};

type DispatchRow = {
  question_id: string;
  edited_text: string | null;
};

type DraftOrResponseRow = {
  question_id: string;
  response_value: Record<string, unknown>;
};

type DocumentRow = {
  id: string;
  file_name: string;
  response_to_question_id: string | null;
};

export async function fetchClaimantPortalSnapshot({
  claimId,
  token,
}: {
  claimId: string;
  token: string | null;
}): Promise<ClaimantPortalSnapshot> {
  if (!token) {
    await recordClaimantLinkOpened({ claimId, state: 'invalid' });
    return emptySnapshot('invalid', claimId);
  }

  const supabase = createAdminClient();
  const tokenHash = hashClaimantToken(token);

  const { data: link, error: linkError } = await supabase
    .from('claimant_magic_links')
    .select('token_hash, claim_id, expires_at, used_at, revoked_at')
    .eq('token_hash', tokenHash)
    .eq('claim_id', claimId)
    .maybeSingle();

  if (linkError) throw linkError;
  const state = getLinkState(link as MagicLinkRow | null);
  await recordClaimantLinkOpened({ claimId, state });
  if (state !== 'valid') return emptySnapshot(state, claimId);

  const [
    { data: claimRows, error: claimError },
    { data: questionRows, error: questionError },
    { data: dispatchRows, error: dispatchError },
    { data: draftRows, error: draftError },
    { data: responseRows, error: responseError },
    { data: documentRows, error: documentError },
  ] = await Promise.all([
    supabase.from('claims').select('id, claim_number').eq('id', claimId),
    supabase
      .from('synthesis_results')
      .select('id, payload')
      .eq('claim_id', claimId)
      .eq('pass_number', 3)
      .eq('kind', 'question'),
    supabase
      .from('question_dispatches')
      .select('question_id, edited_text')
      .eq('claim_id', claimId),
    supabase
      .from('question_response_drafts')
      .select('question_id, response_value')
      .eq('claim_id', claimId),
    supabase
      .from('question_responses')
      .select('question_id, response_value')
      .eq('claim_id', claimId),
    supabase
      .from('documents')
      .select('id, file_name, response_to_question_id')
      .eq('claim_id', claimId)
      .not('response_to_question_id', 'is', null),
  ]);

  if (claimError) throw claimError;
  if (questionError) throw questionError;
  if (dispatchError) throw dispatchError;
  if (draftError) throw draftError;
  if (responseError) throw responseError;
  if (documentError) throw documentError;

  const claim = ((claimRows ?? [])[0] ?? null) as ClaimRow | null;
  const dispatches = (dispatchRows ?? []) as DispatchRow[];
  const drafts = new Map(
    ((draftRows ?? []) as DraftOrResponseRow[]).map((row) => [
      row.question_id,
      row.response_value,
    ]),
  );
  const responses = new Map(
    ((responseRows ?? []) as DraftOrResponseRow[]).map((row) => [
      row.question_id,
      row.response_value,
    ]),
  );
  const synthesisQuestions = new Map(
    ((questionRows ?? []) as SynthesisQuestionRow[]).map((row) => [
      String(row.payload.id ?? row.id),
      row.payload,
    ]),
  );

  const questions: ClaimantQuestion[] = dispatches.map((dispatch) => {
    const payload = synthesisQuestions.get(dispatch.question_id);

    return {
      id: dispatch.question_id,
      text: dispatch.edited_text ?? payload?.text ?? 'נא להשיב לשאלה',
      expectedAnswerType: normalizeAnswerType(payload?.expected_answer_type),
      context: payload?.context ? JSON.stringify(payload.context) : null,
      draftValue: drafts.get(dispatch.question_id) ?? null,
      responseValue: responses.get(dispatch.question_id) ?? null,
    };
  });

  return {
    state: 'valid',
    claimId,
    claimNumber: claim?.claim_number ?? null,
    questions,
    documents: ((documentRows ?? []) as DocumentRow[]).map((document) => ({
      id: document.id,
      fileName: document.file_name,
      responseToQuestionId: document.response_to_question_id,
    })),
  };
}

function emptySnapshot(
  state: ClaimantPortalState,
  claimId: string,
): ClaimantPortalSnapshot {
  return {
    state,
    claimId,
    claimNumber: null,
    questions: [],
    documents: [],
  };
}

function getLinkState(link: MagicLinkRow | null): ClaimantPortalState {
  if (!link) return 'invalid';
  if (link.used_at) return 'used';
  if (link.revoked_at) return 'revoked';
  if (new Date(link.expires_at).getTime() <= Date.now()) return 'expired';
  return 'valid';
}

function normalizeAnswerType(
  value: ClaimantQuestionAnswerType | undefined,
): ClaimantQuestionAnswerType {
  if (
    value === 'document' ||
    value === 'confirmation' ||
    value === 'correction' ||
    value === 'text'
  ) {
    return value;
  }

  return 'text';
}
