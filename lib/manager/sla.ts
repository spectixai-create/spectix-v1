import type { ClaimStatus, RiskBand } from '@/lib/types';

export type SlaStatus = 'within_sla' | 'near_breach' | 'breached' | 'resolved';

export type HandlingStatus =
  | 'in_progress'
  | 'waiting_for_customer'
  | 'ready_for_decision'
  | 'enhanced_review'
  | 'investigation'
  | 'resolved'
  | 'system_attention';

export function getSlaStatus(daysOpen: number, status: ClaimStatus): SlaStatus {
  if (isResolvedClaimStatus(status)) return 'resolved';
  if (daysOpen >= 4) return 'breached';
  if (daysOpen >= 3) return 'near_breach';
  return 'within_sla';
}

export function getSlaLabel(status: SlaStatus): string {
  switch (status) {
    case 'near_breach':
      return 'מתקרב לחריגה';
    case 'breached':
      return 'בחריגת SLA';
    case 'resolved':
      return 'טופל';
    case 'within_sla':
    default:
      return 'תקין';
  }
}

export function isStuckClaim(
  claim: {
    daysOpen: number;
    status: ClaimStatus;
    updatedAt?: string | null;
  },
  now = new Date(),
): boolean {
  if (isResolvedClaimStatus(claim.status)) return false;
  if (claim.daysOpen >= 4) return true;

  if (!claim.updatedAt) return false;

  return daysBetween(claim.updatedAt, now) >= 3;
}

export function getHandlingStatus({
  status,
  riskBand,
  escalatedToInvestigator,
}: {
  status: ClaimStatus;
  riskBand: RiskBand | null;
  escalatedToInvestigator: boolean;
}): HandlingStatus {
  if (isResolvedClaimStatus(status)) return 'resolved';
  if (status === 'errored' || status === 'cost_capped') {
    return 'system_attention';
  }
  if (escalatedToInvestigator) return 'investigation';
  if (status === 'pending_info') return 'waiting_for_customer';
  if (status === 'ready') return 'ready_for_decision';
  if (riskBand === 'red' || riskBand === 'orange') return 'enhanced_review';
  return 'in_progress';
}

export function getHandlingStatusLabel(status: HandlingStatus): string {
  switch (status) {
    case 'waiting_for_customer':
      return 'ממתין ללקוח';
    case 'ready_for_decision':
      return 'מוכן להחלטה';
    case 'enhanced_review':
      return 'בדיקה מוגברת';
    case 'investigation':
      return 'בחקירה';
    case 'resolved':
      return 'טופל';
    case 'system_attention':
      return 'דורש טיפול מערכת';
    case 'in_progress':
    default:
      return 'בטיפול';
  }
}

export function isResolvedClaimStatus(status: ClaimStatus): boolean {
  return status === 'reviewed' || status === 'rejected_no_coverage';
}

export function daysBetween(value: string, now = new Date()): number {
  const ageMs = now.getTime() - new Date(value).getTime();
  return Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
}
