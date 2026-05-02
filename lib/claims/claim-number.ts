/**
 * Generates next claim number in YYYY-NNN format for the current year.
 *
 * Uses MAX-based query to handle deletion gaps gracefully. Holes in sequence
 * are intentional gaps, not reused. The caller handles unique collisions.
 */
export async function generateClaimNumber(): Promise<string> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();
  const year = new Date().getFullYear();
  const yearPrefix = `${year}-`;

  const { data, error } = await supabase
    .from('claims')
    .select('claim_number')
    .like('claim_number', `${yearPrefix}%`)
    .order('claim_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to query latest claim_number: ${error.message}`);
  }

  let nextSequence = 1;
  const claimNumber =
    typeof data?.claim_number === 'string' ? data.claim_number : null;

  if (claimNumber) {
    const parsed = parseClaimNumber(claimNumber);
    if (parsed) {
      nextSequence = parsed.sequence + 1;
    }
  }

  return `${year}-${String(nextSequence).padStart(3, '0')}`;
}

export function parseClaimNumber(
  claimNumber: string,
): { year: number; sequence: number } | null {
  const match = claimNumber.match(/^(\d{4})-(\d{3})$/);
  const yearPart = match?.[1];
  const sequencePart = match?.[2];

  if (!yearPart || !sequencePart) {
    return null;
  }

  return {
    year: parseInt(yearPart, 10),
    sequence: parseInt(sequencePart, 10),
  };
}
