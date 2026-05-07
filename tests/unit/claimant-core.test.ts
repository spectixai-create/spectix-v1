import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  buildClaimantLinkOpenedAudit,
  buildClaimantTokenInvalidAudit,
  claimantTokenStateFromErrorCode,
} from '@/lib/claimant/audit';
import { mapClaimantRpcError } from '@/lib/claimant/errors';
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

  it('guards finalize by pending_info before response side effects', () => {
    const migration = readFileSync(
      'supabase/migrations/20260506210000_claimant_responses.sql',
      'utf8',
    );
    const guardIndex = migration.indexOf("v_claim_status <> 'pending_info'");
    const responseInsertIndex = migration.indexOf(
      'INSERT INTO public.question_responses',
    );
    const draftDeleteIndex = migration.indexOf(
      'DELETE FROM public.question_response_drafts',
    );
    const tokenUseIndex = migration.indexOf(
      'UPDATE public.claimant_magic_links',
    );
    const submittedAuditIndex = migration.indexOf(
      "'claimant_response_submitted'",
    );

    expect(migration).toContain(
      "RAISE EXCEPTION 'claim_not_pending_info' USING ERRCODE = 'P0009'",
    );
    expect(migration).toContain(
      "RAISE EXCEPTION 'claim_not_found' USING ERRCODE = 'P0010'",
    );
    expect(guardIndex).toBeGreaterThan(-1);
    expect(responseInsertIndex).toBeGreaterThan(guardIndex);
    expect(draftDeleteIndex).toBeGreaterThan(guardIndex);
    expect(tokenUseIndex).toBeGreaterThan(guardIndex);
    expect(submittedAuditIndex).toBeGreaterThan(guardIndex);
  });

  it('maps non-pending finalize to HTTP 409 before recycle event emission', () => {
    const mapped = mapClaimantRpcError({
      code: 'P0009',
      message: 'claim_not_pending_info',
    });
    const finalizeRoute = readFileSync(
      'app/api/c/[claim_id]/finalize/route.ts',
      'utf8',
    );
    const errorReturnIndex = finalizeRoute.indexOf('return jsonError(');
    const recycleEmitIndex = finalizeRoute.indexOf(
      "name: 'claim/responses.submitted'",
    );

    expect(mapped).toMatchObject({
      status: 409,
      code: 'claim_not_pending_info',
    });
    expect(errorReturnIndex).toBeGreaterThan(-1);
    expect(recycleEmitIndex).toBeGreaterThan(errorReturnIndex);
  });

  it('records claimant audit actions without token, link, or response leakage', () => {
    const opened = buildClaimantLinkOpenedAudit({
      claimId: 'claim-1',
      state: 'valid',
    });
    const invalid = buildClaimantTokenInvalidAudit({
      claimId: 'claim-1',
      attemptedEndpoint: '/api/c/[claim_id]/finalize',
      state: 'expired',
    });
    const serializedDetails = JSON.stringify([opened.details, invalid.details]);

    expect(opened).toMatchObject({
      action: 'claimant_link_opened',
      actor_type: 'claimant',
      actor_id: 'claim-1',
      details: { claim_id: 'claim-1', valid: true, state: 'valid' },
    });
    expect(invalid).toMatchObject({
      action: 'claimant_token_invalid',
      actor_type: 'claimant',
      actor_id: 'claim-1',
      details: {
        claim_id: 'claim-1',
        attempted_endpoint: '/api/c/[claim_id]/finalize',
        state: 'expired',
      },
    });
    expect(serializedDetails).not.toContain('token=');
    expect(serializedDetails).not.toContain('token_hash');
    expect(serializedDetails).not.toContain('magic_link_url');
    expect(serializedDetails).not.toContain('response_value');
  });

  it('claimant GET path logs valid and invalid link-opened states', () => {
    const portalSource = readFileSync('lib/claimant/portal.ts', 'utf8');
    const openedAuditCalls = portalSource.match(
      /recordClaimantLinkOpened/g,
    ) ?? ['import'];

    expect(openedAuditCalls).toHaveLength(3);
    expect(portalSource).toContain(
      "await recordClaimantLinkOpened({ claimId, state: 'invalid' })",
    );
    expect(portalSource).toContain(
      'await recordClaimantLinkOpened({ claimId, state })',
    );
  });

  it('logs invalid-token audits from claimant RPC routes only for token states', () => {
    expect(claimantTokenStateFromErrorCode('token_not_found')).toBe('invalid');
    expect(claimantTokenStateFromErrorCode('token_expired')).toBe('expired');
    expect(claimantTokenStateFromErrorCode('token_used')).toBe('used');
    expect(claimantTokenStateFromErrorCode('token_revoked')).toBe('revoked');
    expect(
      claimantTokenStateFromErrorCode('claim_not_pending_info'),
    ).toBeNull();

    for (const route of [
      'app/api/c/[claim_id]/draft/route.ts',
      'app/api/c/[claim_id]/upload/route.ts',
      'app/api/c/[claim_id]/finalize/route.ts',
    ]) {
      const source = readFileSync(route, 'utf8');
      expect(source).toContain('recordClaimantTokenInvalidAttempt');
    }
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
