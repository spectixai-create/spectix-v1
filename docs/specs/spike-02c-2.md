# Spike #02c-2 - POST /api/claims + form wiring

Status: READY
Owner: Codex
Branch: backend-claims-api
Estimated effort: 1 day
Priority: P1 high
Reference decisions: D-007, D-014

## Context

Migration #0002 is live. Schema supports all intake form fields. This spike wires the intake form, currently mock submit, to a real API endpoint that writes to Supabase.

Not in scope:

- Document upload to Storage.
- Inngest dispatch.
- Email/SMS to claimant.
- Sentry/Logflare integration.

CEO decisions applied:

- UI changes are in scope for `components/intake/intake-form.tsx` and `components/intake/states/success-panel.tsx`.
- Claim number generation uses a MAX-based query and a single INSERT with no retry.
- Form values translate Hebrew labels to English values through `intake-options.ts`.
- Trip context fields go to `ClaimMetadata`.
- Incident date validation uses Asia/Jerusalem.
- Strict Zod validation, no passthrough.
- Hebrew error mapping stays local until 4+ sites need it.

## Files to create

1. [lib/schemas/claim.ts](../../lib/schemas/claim.ts)
   - Zod schema for intake claim creation.
2. [lib/claims/claim-number.ts](../../lib/claims/claim-number.ts)
   - `generateClaimNumber()` and `parseClaimNumber()`.
3. [lib/claims/claim-number.test.ts](../../lib/claims/claim-number.test.ts)
   - Parser tests.
4. [lib/intake/build-payload.ts](../../lib/intake/build-payload.ts)
   - Maps intake form values to API payload.
5. [lib/intake/build-payload.test.ts](../../lib/intake/build-payload.test.ts)
   - Mapping tests.
6. [app/api/claims/route.ts](../../app/api/claims/route.ts)
   - Public `POST /api/claims`.
7. [tests/e2e/claims-api.spec.ts](../../tests/e2e/claims-api.spec.ts)
   - API, form, demo-regression, and concurrency tests.

## Files to update

1. [components/intake/intake-form.tsx](../../components/intake/intake-form.tsx)
   - Replace mock submit with real fetch to `/api/claims`.
2. [components/intake/states/success-panel.tsx](../../components/intake/states/success-panel.tsx)
   - Accept `claimNumber` prop and add test ids.
3. [lib/sample-data/intake-options.ts](../../lib/sample-data/intake-options.ts)
   - Fix values if they do not match `ClaimType` and `ClaimMetadata.tripPurpose`.
4. [docs/API_CONTRACTS.md](../API_CONTRACTS.md)
   - Document `POST /api/claims`.
5. [docs/CONVENTIONS.md](../CONVENTIONS.md)
   - Add API error-code convention.
6. [docs/TECH_DEBT.md](../TECH_DEBT.md)
   - Add rate-limit, idempotency, error-message, and audit-action tech debt.
7. [docs/CURRENT_STATE.md](../CURRENT_STATE.md)
   - Mark #02c-2 done and #03 next.
8. [lib/version.ts](../../lib/version.ts)
   - Bump to Spike #14, build date `2025-05-03`.

## Files MUST NOT touch

- `supabase/migrations/*`
- `lib/types.ts`
- `lib/sample-data/sample-claim.ts`
- `lib/sample-data/sample-questions.ts`
- `components/dashboard/*`
- `components/claim/*`
- `components/questions/*`
- `app/(adjuster)/*`
- `app/(auth)/*`
- `lib/auth/*`
- `middleware.ts`
- `inngest/*`

## Edge Cases

1. Empty body POST returns `400 invalid_json`.
2. Extra fields are stripped by Zod.
3. Concurrent claim-number generation may collide; unique violation returns `409 claim_number_collision`.
4. Year boundary resets sequence to `001`.
5. DB connection error returns `500 db_error`.
6. Audit log failure returns `201` with `warnings: ['audit_log_failed']`.
7. Client double-submit is prevented by a `useRef` lock.
8. `/api/claims` is public.
9. Incident date is compared against today in Asia/Jerusalem.
10. Cold-start delay shows Hebrew helper text after 3 seconds.

## Acceptance Criteria

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, and `pnpm build` pass.
- `pnpm test:e2e` passes, including new claims API tests.
- Valid `POST /api/claims` returns `201` and `claimNumber` in `YYYY-NNN` format.
- Validation errors return `400` with details.
- Real intake flow works locally and production smoke is documented.
- Demo modes still work.
- `claim_number` is sequential per year via MAX-based query.
- `intake-options.ts` values match canonical unions.
- Version and docs are updated.

## Self-Verification

- Read [AGENTS.md](../../AGENTS.md) and [docs/CURRENT_STATE.md](../CURRENT_STATE.md).
- Verify migration #0002 is applied with `npx supabase migration list`.
- Verify `lib/types.ts` has post-#0002 fields.
- Verify intake option values match type unions before writing schemas.
- Run all checks before push.
- Run local dev smoke test before PR.
- Open PR via gh CLI titled `Spike #02c-2: POST /api/claims + form wiring`.
