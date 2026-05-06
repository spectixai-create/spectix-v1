import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  buildClaimantMagicLinkUrl,
  hashClaimantToken,
} from '@/lib/claimant/tokens';
import {
  extractFirstName,
  getClaimantContactStatus,
  normalizeContactValue,
} from '@/lib/claimant/contact';
import { validateUi002bRuntimeEnv } from '@/instrumentation';

describe('UI-002B claimant token and contact helpers', () => {
  it('hashes tokens without exposing the raw token in the URL helper', () => {
    const token = 'raw-token-for-test';
    const hash = hashClaimantToken(token);

    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(token);
    expect(
      buildClaimantMagicLinkUrl({
        baseUrl: 'https://app.example',
        claimId: 'claim-1',
        token,
      }),
    ).toBe('https://app.example/c/claim-1?token=raw-token-for-test');
  });

  it('normalizes empty contact values before dispatch pre-checks', () => {
    expect(normalizeContactValue('  ')).toBeNull();
    expect(normalizeContactValue(null)).toBeNull();
    expect(normalizeContactValue(' user@example.com ')).toBe(
      'user@example.com',
    );
    expect(extractFirstName('  דנה כהן  ')).toBe('דנה');

    expect(
      getClaimantContactStatus({
        claimantEmail: '',
        claimantPhone: '  ',
        claimantName: 'דנה כהן',
        claimNumber: 'CLM-1',
      }),
    ).toMatchObject({
      claimant_email: null,
      claimant_phone: null,
      claimant_first_name: 'דנה',
      missing_both: true,
    });
  });

  it('keeps UI-002B production env validation limited to APP_BASE_URL and SKIP_NOTIFICATIONS', () => {
    expect(() =>
      validateUi002bRuntimeEnv({
        NODE_ENV: 'production',
        NEXT_PHASE: 'phase-production-build',
      } as NodeJS.ProcessEnv),
    ).not.toThrow();

    expect(() =>
      validateUi002bRuntimeEnv({
        NODE_ENV: 'production',
        APP_BASE_URL: 'https://app.example',
        SKIP_NOTIFICATIONS: '',
      } as NodeJS.ProcessEnv),
    ).toThrow(/SKIP_NOTIFICATIONS/);

    expect(() =>
      validateUi002bRuntimeEnv({
        NODE_ENV: 'production',
        APP_BASE_URL: 'https://app.example',
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });
});

describe('UI-002B migration and recycle contracts', () => {
  it('creates claimant response tables, RPCs, claimant audit support, and rollback', () => {
    const migration = readFileSync(
      'supabase/migrations/20260506210000_claimant_responses.sql',
      'utf8',
    );
    const rollback = readFileSync(
      'supabase/rollbacks/20260506210000_claimant_responses.down.sql',
      'utf8',
    );

    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS public.question_response_drafts',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS public.question_responses',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS public.claimant_magic_links',
    );
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.save_draft');
    expect(migration).toContain('set_config');
    expect(migration).toContain('claimant_response_submitted');
    expect(migration).toContain("'claimant'");
    expect(rollback).toContain(
      'DROP TABLE IF EXISTS public.claimant_magic_links',
    );
  });

  it('registers recycle and validation events without notification providers', () => {
    const registry = readFileSync('inngest/functions/index.ts', 'utf8');
    const recycle = readFileSync('inngest/functions/claim-recycle.ts', 'utf8');
    const validation = readFileSync(
      'inngest/functions/run-validation-pass.ts',
      'utf8',
    );

    expect(registry).toContain('claimRecycleFunction');
    expect(recycle).toContain("event: 'claim/responses.submitted'");
    expect(recycle).toContain("name: 'claim/document.uploaded'");
    expect(recycle).toContain("name: 'claim/validation.requested'");
    expect(validation).toContain("event: 'claim/validation.requested'");
    expect(recycle).not.toContain('claimant-notify');
    expect(recycle).not.toContain('RESEND_API_KEY');
    expect(recycle).not.toContain('TWILIO');
  });
});
