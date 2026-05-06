import { computeReadinessScore } from './readiness-score';
import { deriveFindingsFromValidations } from './finding-derivation';
import { generateQuestionsForFindings } from './question-generation';
import type { ClaimValidationRow, SynthesisOutput } from './types';
import type { ClaimantResponseContext } from './types';

export function runSynthesisForValidationRows(
  validationRows: ClaimValidationRow[],
  claimantResponses: ClaimantResponseContext[] = [],
): SynthesisOutput {
  const findings = deriveFindingsFromValidations(validationRows);
  const questions = generateQuestionsForFindings(findings);
  const readinessScore = computeReadinessScore(findings);

  return { findings, questions, readinessScore, claimantResponses };
}
