import type { ClaimStatus } from '@/lib/types';

export type ScoreBand = 'red' | 'yellow' | 'green';

export function getScoreBand(score: number | null): ScoreBand | null {
  if (score === null) return null;
  if (score <= 40) return 'red';
  if (score <= 70) return 'yellow';
  return 'green';
}

export function getClaimStatusClass(status: ClaimStatus): string {
  switch (status) {
    case 'intake':
    case 'processing':
      return 'border-blue-200 bg-blue-50 text-blue-900';
    case 'ready':
      return 'border-risk-green/30 bg-risk-green/10 text-risk-green';
    case 'pending_info':
      return 'border-risk-yellow/40 bg-risk-yellow/10 text-risk-yellow';
    case 'reviewed':
      return 'border-muted-foreground/20 bg-muted text-muted-foreground';
    case 'cost_capped':
    case 'errored':
      return 'border-risk-red/40 bg-risk-red/10 text-risk-red';
    case 'rejected_no_coverage':
      return 'border-red-900/40 bg-red-950/10 text-red-900';
  }
}

export function getScoreBandClass(score: number | null): string {
  const band = getScoreBand(score);

  switch (band) {
    case 'green':
      return 'border-risk-green/30 bg-risk-green/10 text-risk-green';
    case 'yellow':
      return 'border-risk-yellow/40 bg-risk-yellow/10 text-risk-yellow';
    case 'red':
      return 'border-risk-red/40 bg-risk-red/10 text-risk-red';
    case null:
      return 'border-muted-foreground/20 bg-muted text-muted-foreground';
  }
}
