# SPRINT-UI-002 — Claimant Question Response Flow (Implementation Spec)

**Date:** 06/05/2026
**Identifier:** sprint_ui002.1
**Type:** Implementation spec for Codex.
**Source designs (signed):**

- `design001.11_state_machine_06_05.md`
- `design002.8_synthesis_decomposition_06_05.md`
- `design004.2_claimant_responses_06_05.md`
- `design004.3_claimant_responses_06_05.md` (delta on 004.2)
- `verification_06_05_pre_signoff.md` (Codex pre-flight artifact)

**Status:** Ready for CEO GPT verification → Codex dispatch.
**Estimated effort:** ~19 days (per design004.2 §13).

---

## 1. Scope

Build claimant-facing UI + notification infrastructure that closes the loop opened by SPRINT-UI-001's adjuster Request Info action. Deliverables:

- Migration `0009_claimant_responses.sql` (3 new tables, 3 RPCs, 3 ALTERs).
- Adjuster endpoints: `/api/claims/[id]/dispatch-questions`, `/api/claims/[id]/regenerate-link`.
- Claimant public routes: `GET /c/[claim_id]`, `POST /api/c/[claim_id]/draft|upload|finalize`.
- Webhook routes: `/api/webhooks/resend`, `/api/webhooks/twilio`.
- Inngest functions: `claimant-notify` (email→SMS fallback with `waitForEvent`), `claim-recycle` (claimant submit → re-cycle).
- Frontend: `/c/[claim_id]` claimant page with 4 renderers (text, document, confirmation, correction), autosave, finalize button, Hebrew RTL.
- UI-001 brief view patches: dispatch button, dispatch indicators per question, regenerate-link, missing-contact banner.

---

## 2. Pre-flight (Codex executes BEFORE writing code)

These checks gate the implementation. Each produces an artifact appended to the PR description.

### 2.1 — Direct contact column existence (Supabase non-prod `aozbgunwhafabfmuwjol`)

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='claims'
  AND column_name IN ('claimant_email', 'claimant_phone', 'claimant_name', 'claim_number')
ORDER BY column_name;

SELECT
  count(*) FILTER (WHERE COALESCE(claimant_email, '') = '') AS missing_email,
  count(*) FILTER (WHERE COALESCE(claimant_phone, '') = '') AS missing_phone,
  count(*) FILTER (WHERE COALESCE(claimant_email, '') = '' AND COALESCE(claimant_phone, '') = '') AS missing_both,
  count(*) AS total
FROM claims;
```

**Pass:** all 4 columns present.
**Fail:** missing column → STOP, escalate to CEO Claude.

### 2.2 — Empty-string handling sweep (extends Task 3 from `verification_06_05_pre_signoff.md`)

```bash
grep -rn "claimant_email\|claimant_phone" app/ lib/ inngest/ supabase/
```

For every read of these columns in the codebase (not just `dispatch-questions` route), verify normalization with `?? ''` + `.trim()` semantics OR confirm context doesn't need it (e.g., schema definitions, type fields, raw API response mapping where downstream handles).

**Output:** `precheck_empty_string_sweep.md` — table per hit: file:line | context | needs patch Y/N | patch description.

If any **dispatch-related** read needs patching → include patches in this PR. Other reads (display-only) can be flagged for future polish.

### 2.3 — Extraction handler subset processing capability (Architect condition §5.1)

Inspect existing extraction Inngest function:

```bash
grep -rn "extraction.completed\|process-document\|claim/extraction" inngest/
```

Read `inngest/functions/process-document.ts` and identify:

- Does the handler accept a `document_ids: uuid[]` payload field and process only those?
- OR does it process "all documents in claim with status='pending'"?

**If subset-capable:** Path B (selective re-extraction) viable as-designed. No handler patch.
**If not subset-capable:** patch handler to accept optional `document_ids` filter. Add ~1 day to estimate. Document in PR description as scope addition.

**Output:** `precheck_extraction_handler.md` — verdict + patch description if needed.

### 2.4 — `reopen_pass_for_document_processing` RPC semantics documentation (TECH_DEBT 11S)

```bash
grep -rn "reopen_pass_for_document_processing" supabase/ inngest/ app/
```

Read the RPC definition (`supabase/migrations/20260504111946_pass_lifecycle_completion.sql`). Document in this PR:

- What columns it modifies on `passes` (status, started_at, cost_usd retention?).
- When it's called and from where.

**Output:** add a note to `docs/architecture/passes_lifecycle.md` (create if not exists, ~30 lines). This closes TECH_DEBT 11S in this PR.

---

## 3. Implementation tasks (in order)

### 3.1 — Migration 0009

File: `supabase/migrations/{timestamp}_claimant_responses.sql`

Per design004.2 §4 + design004.3 §3.1 (revised pre-check) + design001.11 K.7 (actor_type CHECK update):

1. DO block: `RAISE EXCEPTION 'Migration 0008 must be applied first'` if `question_dispatches` absent.
2. CREATE TABLE `question_response_drafts`, `question_responses`, `claimant_magic_links` (per 004.2 §4.2).
3. ALTER `documents` ADD COLUMN `response_to_question_id text NULL` + index.
4. ALTER `audit_log` CHECK constraint update for `actor_type` (add `'claimant'`).
5. ALTER `question_dispatches` ADD 4 notification metadata columns.
6. CREATE FUNCTION `save_draft` (with **`SET LOCAL lock_timeout = '5s'`** at top of body — per Architect condition §5.2).
7. CREATE FUNCTION `link_document_to_question`.
8. CREATE FUNCTION `finalize_question_responses` (atomic with state transition + audit insert + `SET LOCAL lock_timeout = '5s'`).
9. RLS ON for all 3 new tables, deny-all-by-default policies.

Rollback file: `supabase/rollbacks/{timestamp}_claimant_responses.down.sql` — DROP FUNCTION, DROP TABLE, ALTER reverse.

### 3.2 — Adjuster dispatch endpoints

File: `app/api/claims/[id]/dispatch-questions/route.ts`

Per design004.3 §3.1:

- Pre-check using **direct columns** (`claim.claimant_email`, `claim.claimant_phone`, `claim.claimant_name`, `claim.claim_number` — NOT `claim_form`).
- 422 `missing_contact_info` if both empty/null.
- Generate token (32-byte base64url) + SHA-256 hash.
- INSERT `claimant_magic_links` with `created_by = adjuster_id`.
- UPSERT `question_dispatches` (per design002.8 schema).
- Fire Inngest `claim/dispatch-questions` with payload including `claimant_first_name` (extracted helper).
- Audit `adjuster_request_info` (existing) — no change to action name; details include `question_ids` per design001.11.

Helper file: `lib/claimant/contact.ts`:

```typescript
export function extractFirstName(claimant_name: string | null): string {
  // Returns just the first name token, or empty string. Caller wraps with greeting.
  if (!claimant_name) return '';
  const parts = claimant_name.trim().split(/\s+/);
  return parts[0] ?? '';
}

export function buildGreeting(first_name: string): string {
  // Architect condition §5.7 — avoid "שלום שלום" double.
  return first_name ? `שלום ${first_name}` : 'שלום';
}
```

File: `app/api/claims/[id]/regenerate-link/route.ts`

Per design004.3 §3.2:

- Find latest active link → `UPDATE claimant_magic_links SET revoked_at = now()` for that row.
- Generate new link (same as dispatch flow).
- Fire re-dispatch event.
- Rate limit 1/hour per claim_id.

### 3.3 — Claimant public routes

Files:

- `app/c/[claim_id]/page.tsx` — server component, validates token, renders state-appropriate page.
- `app/api/c/[claim_id]/draft/route.ts` — calls RPC `save_draft`. Maps RPC error codes to HTTP: `P0001` → 401, `P0002` → 410, `P0003` → 401, `P0004` → 401, `lock_not_available` → 503 with `Retry-After: 5`.
- `app/api/c/[claim_id]/upload/route.ts` — Supabase Storage upload (anon client, restricted bucket policy on `claim-documents`), then RPC `link_document_to_question`. Magic-byte verification per design004.2 §8.4.
- `app/api/c/[claim_id]/finalize/route.ts` — RPC `finalize_question_responses`. On success, fire Inngest `claim/responses.submitted`.

Token validation pattern (in landing page server component):

```typescript
// Broad query — does NOT use idx_claimant_magic_links_active (which filters revoked)
const { data: row } = await supabase
  .from('claimant_magic_links')
  .select('used_at, revoked_at, expires_at')
  .eq('token_hash', sha256(token))
  .eq('claim_id', claim_id)
  .maybeSingle();

const state = !row
  ? 'invalid'
  : row.revoked_at
    ? 'revoked'
    : row.used_at
      ? 'used'
      : new Date(row.expires_at) < new Date()
        ? 'expired'
        : 'valid';

// Audit on every GET
await auditLog({
  action: 'claimant_link_opened',
  actor_type: 'claimant',
  actor_id: claim_id,
  details: { claim_id, valid: state === 'valid', state },
});
```

Rate limiter: middleware `middleware.ts` at app root, scope-per-route per design004.2 §8.3. Use `@upstash/ratelimit` or equivalent. If no Redis available, use in-memory LRU with note "MVP only, replace pre-prod" (TECH_DEBT 11T — new entry).

### 3.4 — Webhooks

Files:

- `app/api/webhooks/resend/route.ts` — verify HMAC-SHA256 with `RESEND_WEBHOOK_SECRET`, parse event, fire Inngest `resend/email.received` with `dispatch_id` extracted from email metadata tag.
- `app/api/webhooks/twilio/route.ts` — verify Twilio signature, fire `twilio/sms.received`.

Both update `question_dispatches.notification_*` columns directly via service_role write (these are not user-facing, server-internal only).

### 3.5 — Inngest functions

File: `inngest/functions/claimant-notify.ts`

Per design004.2 §7.3:

- Trigger: `claim/dispatch-questions`.
- Path A: `claimant_email` set → send Resend → `step.waitForEvent('resend/email.received', { match: 'data.dispatch_id', timeout: '30m' })`.
- If timeout OR webhook reports `bounced`/`complaint` AND `claimant_phone` set → SMS fallback via Twilio.
- Path B: only `claimant_phone` → SMS direct.
- Update `question_dispatches.notification_*` after each step.

File: `inngest/functions/claim-recycle.ts`

Per design004.3 §17.1 (Architect condition §5.1) — branch on document presence:

```typescript
export const claimRecycle = inngest.createFunction(
  { id: 'claim-recycle' },
  { event: 'claim/responses.submitted' },
  async ({ event, step }) => {
    const { claim_id } = event.data;

    // Find documents uploaded during the just-finalized claimant flow.
    // Filter: response_to_question_id IS NOT NULL AND created_at > last_synthesis_pass completed_at.
    const newDocIds = await step.run('find-new-claimant-docs', async () => {
      const { data: lastSynth } = await supabaseAdmin
        .from('passes')
        .select('completed_at')
        .eq('claim_id', claim_id)
        .eq('pass_number', 3)
        .single();
      const { data: docs } = await supabaseAdmin
        .from('documents')
        .select('id')
        .eq('claim_id', claim_id)
        .not('response_to_question_id', 'is', null)
        .gt('created_at', lastSynth?.completed_at ?? '1970-01-01');
      return (docs ?? []).map((d) => d.id);
    });

    if (newDocIds.length > 0) {
      // Path B: re-extract new docs only
      // Requires extraction handler to support document_ids subset (verified in §2.3 pre-flight)
      await step.sendEvent('trigger-extraction', {
        name: 'claim/extraction.completed',
        data: { claim_id, source: 'recycle', document_ids: newDocIds },
      });
    } else {
      // Path A: skip extraction, go straight to validation
      await step.sendEvent('trigger-validation', {
        name: 'claim/validation.requested',
        data: { claim_id, source: 'recycle' },
      });
    }
  },
);
```

**Note:** if pre-flight §2.3 finds extraction handler does NOT support subset → fall back to Path A only (always skip extraction). Document the fallback decision in PR description and update this function accordingly.

File: `inngest/functions/run-validation-pass.ts` — patch existing function to subscribe to BOTH `claim/extraction.completed` AND `claim/validation.requested` (multi-trigger).

### 3.6 — Frontend (claimant page)

Files in `app/c/[claim_id]/`:

- `page.tsx` — server component (token validation, layout).
- `_components/QuestionList.tsx` — client component, RTL, all questions on one page.
- `_components/renderers/TextRenderer.tsx` (textarea, char counter, max 1000).
- `_components/renderers/DocumentRenderer.tsx` (file picker with `capture="environment"`, multi-file, MIME whitelist).
- `_components/renderers/ConfirmationRenderer.tsx` (radio Yes/No + optional comment).
- `_components/renderers/CorrectionRenderer.tsx` (read-only original + textarea corrected).
- `_components/AutosaveIndicator.tsx` ("נשמר" / "שומר..." / "שגיאה").
- `_components/SubmitButton.tsx` (disabled until all answered, confirmation modal).
- `_components/ExpiredPage.tsx`, `RevokedPage.tsx`, `UsedPage.tsx`, `InvalidPage.tsx`, `DonePage.tsx`.

Layout:

- Tailwind `dir="rtl"` on `/c/*` root.
- `<head>` includes `<meta name="referrer" content="no-referrer">`.
- Mobile-first; touch targets ≥44px; tested on iOS Safari + Android Chrome.

Autosave: 500ms debounced on `blur` event per field. Optimistic UI; rollback on RPC error.

### 3.7 — UI-001 brief view patches

File: `app/(adjuster)/claims/[id]/_components/QuestionsList.tsx` (existing from UI-001):

- Add badge per question: `not_dispatched` | `dispatched HH:MM` | `responded HH:MM` | `expired` | `revoked`.
- Conditional "regenerate link" button when `expired` or `revoked`.

File: `app/(adjuster)/claims/[id]/_components/DispatchSection.tsx` (new):

- "[שלח שאלות לתובע]" button (bulk dispatch).
- Disabled if no `not_dispatched` questions.
- Red banner "לא ניתן לשלוח — חסרים פרטי קשר" if both `claimant_email` and `claimant_phone` empty.

### 3.8 — Environment variables

Add to `.env.example`:

```bash
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
APP_BASE_URL=https://app.spectix.com
```

Add startup validation in `instrumentation.ts` per design004.2 §8.7:

- In production: throw if `SKIP_NOTIFICATIONS` env var exists (any value).
- Verify all required env keys set in production.

### 3.9 — Tests

E2E (Playwright):

- `e2e/claimant_flow.spec.ts` — full happy path: dispatch → email mock → claimant opens link → answers all 4 question types → finalize → claim status check.
- `e2e/claimant_flow_security.spec.ts` — token states (expired, used, revoked, invalid) → correct error pages + HTTP codes.
- `e2e/claimant_flow_fallback.spec.ts` — Resend bounce mock → SMS fallback fires → Twilio mock confirms.

Smoke (Codex executes pre-merge):

```bash
pnpm test:e2e -- --grep "claimant"
pnpm test:smoke
```

---

## 4. Architect conditions captured (5 total + 2 new from iteration 3 review)

| #   | Condition                                                                  | Implementation site                                                      |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | `claim/extraction.completed` short-circuit pattern (Path A vs B branching) | §3.5 `claim-recycle` Inngest function                                    |
| 2   | `save_draft` lock_timeout=5s                                               | §3.1 RPC body                                                            |
| 3   | TECH_DEBT 11R registration                                                 | §5 below                                                                 |
| 4   | Codex pre-flight artifacts attached to PR                                  | §2 outputs in PR description                                             |
| 5   | Extraction handler subset capability check                                 | §2.3 pre-flight                                                          |
| 6   | TECH_DEBT 11S — `reopen_pass_for_document_processing` documentation        | §2.4 produces `docs/architecture/passes_lifecycle.md`                    |
| 7   | `extractFirstName` polish — avoid "שלום שלום"                              | §3.2 helper file `lib/claimant/contact.ts` with separate `buildGreeting` |

---

## 5. TECH_DEBT entries to register

In `docs/TECH_DEBT.md`:

```markdown
## 11J — Document upload virus scanning

**Trigger:** pre-production hardening.
**Owner:** SPRINT-PROD-BLOCK.
**Approach:** ClamAV sidecar on Storage upload OR Cloudflare R2 with built-in scan.

## 11K — Multi-cycle synthesis prompt summarization

**Trigger:** claims with >2 cycles in pilot.
**Owner:** post-pilot.
**Approach:** older cycles compressed to 1-line summary in synthesis prompt to bound token cost.

## 11L — Short link service `s.spectix.com`

**Trigger:** SMS multi-segment rate >30%.
**Owner:** SPRINT-UI-002 follow-up.

## 11M — Notification preference per claimant

**Trigger:** claimant feedback.

## 11N — Resend tier upgrade

**Trigger:** >2K dispatches/month.

## 11O — SMS code 2FA on magic link

**Trigger:** pilot insurer enhanced auth requirement.

## 11P — Late bounce auto-SMS retry

**Trigger:** bounce-after-delivered rate >5%.

## 11Q — Storage cleanup for orphaned uploads

**Trigger:** post-pilot ops review.

## 11R — question_responses history audit trail (privacy-preserving)

**Trigger:** forensic requirement from pilot insurer (claimant-changed-answer claim).
**Approach:** append-only audit table with hashed response values + timestamps + cycle number. NO content stored.
**Owner:** SPRINT-PROD-BLOCK.

## 11S — `reopen_pass_for_document_processing` RPC canonical documentation

**Trigger:** sign-off finding (Architect note, design004.3 review).
**Approach:** documented in this PR via §2.4 → `docs/architecture/passes_lifecycle.md`.
**Status:** RESOLVED IN SPRINT-UI-002.

## 11T — Production rate limiter (Redis-backed)

**Trigger:** pre-production scale.
**Approach:** swap in-memory LRU rate limiter for Upstash Redis or equivalent.
**Owner:** SPRINT-PROD-BLOCK.
```

---

## 6. DECISIONS to register

In `docs/DECISIONS.md`:

```markdown
## D-029 — pass_number stable across cycles (no pass_kind column)

**Date:** 06/05/2026
**Source:** design004.2 + design002.8 + Architect joint sign-off.

Re-cycles use UPSERT on existing pass_numbers per D-016 (`pass_number=1` extraction, `=2` validation, `=3` synthesis). DELETE+INSERT on `synthesis_results` with `pass_number=3` literal stable across cycles. `question_responses` uses `ON CONFLICT (claim_id, question_id) DO UPDATE`, accepting per-question response history loss as a PII trade-off (audit_log preserves timestamps + counts only).

**Supersedes:** Architect's pass_kind proposal (would have required column add + backfill on `passes`).

**Trigger to revisit:** any future cycle requiring pass_number > 3 (not anticipated for MVP). On revisit, `pass_kind` column becomes mandatory.
```

---

## 7. Files to create

**Migrations:**

- `supabase/migrations/{timestamp}_claimant_responses.sql`
- `supabase/rollbacks/{timestamp}_claimant_responses.down.sql`

**API routes:**

- `app/api/claims/[id]/dispatch-questions/route.ts`
- `app/api/claims/[id]/regenerate-link/route.ts`
- `app/c/[claim_id]/page.tsx` + layout
- `app/api/c/[claim_id]/draft/route.ts`
- `app/api/c/[claim_id]/upload/route.ts`
- `app/api/c/[claim_id]/finalize/route.ts`
- `app/api/webhooks/resend/route.ts`
- `app/api/webhooks/twilio/route.ts`

**Inngest:**

- `inngest/functions/claimant-notify.ts`
- `inngest/functions/claim-recycle.ts`
- patch `inngest/functions/run-validation-pass.ts` (multi-trigger)

**Components:**

- `app/c/[claim_id]/_components/*` (~10 files)
- `app/(adjuster)/claims/[id]/_components/DispatchSection.tsx` (new)
- patch `app/(adjuster)/claims/[id]/_components/QuestionsList.tsx`

**Lib:**

- `lib/claimant/contact.ts` (helpers)
- `lib/claimant/notifications.ts` (Resend + Twilio clients)
- `lib/claimant/tokens.ts` (hash + generate)

**Docs:**

- `docs/architecture/passes_lifecycle.md` (closes 11S)

**Tests:**

- `e2e/claimant_flow.spec.ts`
- `e2e/claimant_flow_security.spec.ts`
- `e2e/claimant_flow_fallback.spec.ts`

---

## 8. Out of scope (per design004.1 §"Out of Scope" and design004.2 §11)

- Native mobile app.
- WhatsApp notification (TECH_DEBT 11E).
- Multi-language UI (11F).
- Voice input.
- Real-time chat.
- Push notifications.
- Resumable uploads.
- File preview before upload.
- Virus scanning (11J).
- Multi-cycle summarization (11K).
- Short link service (11L).
- 2FA (11O).
- Production Redis rate limiter (11T).

---

## 9. Done criteria

Per design004.2 §10 (acceptance criteria) — all 5 categories must pass:

- [ ] 10.1 Adjuster path (5 items)
- [ ] 10.2 Claimant path (6 items)
- [ ] 10.3 Re-cycle (4 items)
- [ ] 10.4 Security (8 items)
- [ ] 10.5 Notification fallback (5 items)

Plus this sprint:

- [ ] All 4 pre-flight artifacts (§2.1-2.4) attached to PR description.
- [ ] Migration 0009 applied non-prod, smoke passes.
- [ ] All 7 Architect conditions implemented (§4 table).
- [ ] DECISIONS.md updated with D-029.
- [ ] TECH_DEBT.md updated with 11J-11T entries.
- [ ] design001.10, design002.7, design004.1 archived (header `**SUPERSEDED by [filename]. See archive note.**` added; files moved to `docs/management/archive/` if archive directory exists, otherwise SUPERSEDED header sufficient).
- [ ] design004.2 has SUPERSEDED note pointing to design004.3 for §3.1 pre-check, §7 notification body, §14.2 verification SQL.

---

## 10. Cross-references

- design004.2 + design004.3 (claimant flow design, joint).
- design001.11 (state machine, claimant audit semantics).
- design002.8 (synthesis decomposition, notification metadata, prompt input).
- verification_06_05_pre_signoff.md (Codex pre-flight artifact, attached to PR).
- D-016 (pass_number semantics, foundation for D-029).
- D-029 (pass_number stable, registered in this sprint).

---

## Version

sprint_ui002.1 — 06/05/2026
**Filename:** `sprint_ui002.1_claimant_responses_implementation_06_05.md`
**Status:** Ready for CEO GPT verification → Codex dispatch.
**Next:** CEO GPT confirms repo HEAD + scope sanity → handoff to Codex with this spec + 4 design docs + verification artifact.
