import type { Finding, ReadinessScore } from './types';

const WEIGHTS = {
  high: 30,
  medium: 15,
  low: 5,
} as const;

export function computeReadinessScore(findings: Finding[]): ReadinessScore {
  const deduction = findings.reduce(
    (sum, finding) => sum + WEIGHTS[finding.severity],
    0,
  );

  return {
    id: 'rs_v1',
    score: Math.max(0, 100 - deduction),
    computation_basis: 'finding_severity_v1',
    weights_used: WEIGHTS,
  };
}
