import { computeReadinessScore } from './readiness-score';
import { deriveFindingsFromValidations } from './finding-derivation';
import { generateQuestionsForFindings } from './question-generation';
import { deriveTheftMetadataFindings } from './theft-metadata-findings';
import type {
  ClaimSynthesisContext,
  ClaimValidationRow,
  SynthesisOutput,
} from './types';
import type { ClaimantResponseContext } from './types';

export function runSynthesisForValidationRows(
  validationRows: ClaimValidationRow[],
  claimantResponses: ClaimantResponseContext[] = [],
  claimContext?: ClaimSynthesisContext | null,
): SynthesisOutput {
  const findings = [
    ...deriveFindingsFromValidations(validationRows),
    ...deriveTheftMetadataFindings(claimContext),
  ];
  const questions = generateQuestionsForFindings(findings);
  const readinessScore = computeReadinessScore(findings);

  return { findings, questions, readinessScore, claimantResponses };
}
