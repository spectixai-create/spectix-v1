import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const DEFAULT_LINK_TTL_HOURS = 24;

export function generateClaimantToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashClaimantToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isSameTokenHash(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');

  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function getClaimantLinkExpiry(now = new Date()): string {
  return new Date(
    now.getTime() + DEFAULT_LINK_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();
}

export function resolveAppBaseUrl(request?: Request): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }

  return 'http://localhost:3000';
}

export function buildClaimantMagicLinkUrl({
  baseUrl,
  claimId,
  token,
}: {
  baseUrl: string;
  claimId: string;
  token: string;
}): string {
  const url = new URL(`/c/${claimId}`, `${baseUrl.replace(/\/$/, '')}/`);
  url.searchParams.set('token', token);
  return url.toString();
}
