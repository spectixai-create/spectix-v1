/**
 * Validates a redirect-target path is safe (no open redirect).
 * Apply AFTER URL-decoding, not before.
 */
export function isSafeNext(next: string | null | undefined): boolean {
  if (!next) return false;
  if (!next.startsWith('/')) return false;
  if (next.startsWith('//')) return false;
  if (next.startsWith('/\\')) return false;
  if (next.startsWith('/api/')) return false;
  if (next === '/login') return false;

  return true;
}

/** Returns next if safe, else default fallback */
export function safeNextOrDefault(
  next: string | null | undefined,
  fallback: string = '/dashboard',
): string {
  return isSafeNext(next) ? next! : fallback;
}
