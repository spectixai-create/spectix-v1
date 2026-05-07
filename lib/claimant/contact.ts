import type { Claim } from '@/lib/types';

export type ClaimantContactStatus = {
  claimant_email: string | null;
  claimant_phone: string | null;
  claimant_first_name: string | null;
  claim_number: string | null;
  missing_both: boolean;
};

export function normalizeContactValue(
  value: string | null | undefined,
): string | null {
  const normalized = (value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

export function extractFirstName(
  claimantName: string | null | undefined,
): string | null {
  const normalized = normalizeContactValue(claimantName);
  if (!normalized) return null;

  return normalized.split(/\s+/)[0] ?? null;
}

export function getClaimantContactStatus(
  claim: Pick<Claim, 'claimantEmail' | 'claimantPhone' | 'claimantName'> & {
    claimNumber: string | null;
  },
): ClaimantContactStatus {
  const claimant_email = normalizeContactValue(claim.claimantEmail);
  const claimant_phone = normalizeContactValue(claim.claimantPhone);

  return {
    claimant_email,
    claimant_phone,
    claimant_first_name: extractFirstName(claim.claimantName),
    claim_number: normalizeContactValue(claim.claimNumber),
    missing_both: !claimant_email && !claimant_phone,
  };
}

export function buildGreeting(firstName: string | null): string {
  return firstName ? `שלום ${firstName}` : 'שלום';
}
