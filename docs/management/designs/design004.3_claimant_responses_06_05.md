# SPRINT-DESIGN-004 — Claimant Question Response Flow (iteration 3)

**Date:** 06/05/2026
**Identifier:** SPRINT-DESIGN-004
**Iteration:** 3 (delta from iteration 2)
**Type:** Design only — schema correction only.
**Predecessor:** design004.2 (joint sign-off received from Architect; Codex verification revealed schema mismatch).

**Status:** Ready for Architect re-review (delta is mechanical, not architectural).

---

## Why iteration 3 was needed

design004.2 received triple sign-off from Architect with one explicit condition (per design004.2 §14.2): if `claim_form` schema verification FAILs, design004.3 is required.

Codex verification (`verification_06_05_pre_signoff.md`) returned:

- **Task 1 FAIL:** `public.claims.claim_form` column does not exist. design004.2 assumed contact info lived in a `claim_form` jsonb. Reality: direct columns `claims.claimant_email` and `claims.claimant_phone` (added in Migration 0002).
- **Task 2 AMBIGUOUS:** `app/api/claims/[id]/documents/route.ts:211` hardcodes `p_pass_number: 1` calling `reopen_pass_for_document_processing` RPC. CEO decision: **acceptable, no patch needed.** This is consistent with D-029 (pass_number stable across cycles); document upload re-targeting extraction pass (pass_number=1) is the correct semantic.
- **Task 3 FAIL:** existing reads of `claimant_email`/`claimant_phone` do not normalize for empty string. Resolved by Task 1 fix — pre-check and Inngest payload now consume direct columns with explicit `?? ''` + `.trim()`.

iteration 3 corrects design004.2 in localized sections. All other sections of design004.2 stand unchanged.

---

## Changes from iteration 2

| #   | Section                  | Before (004.2)                                 | After (004.3)                                                                 |
| --- | ------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | §3.1 step 4 pre-check    | `claim.claim_form?.claimant_email`             | `claim.claimant_email` (direct column)                                        |
| 2   | §3.1 step 4 pre-check    | `claim.claim_form?.claimant_phone`             | `claim.claimant_phone` (direct column)                                        |
| 3   | §7.1 email body          | `{first_name}` from `claim_form`               | derived from `claims.claimant_name`: `claimant_name?.split(' ')[0] ?? 'שלום'` |
| 4   | §7.1, §7.2               | `{claim_number}` from `claim_form`             | direct column `claims.claim_number` (existing)                                |
| 5   | §8.5 PII                 | "first_name" listed                            | "first part of claimant_name"                                                 |
| 6   | §14.2 (a)                | claim_form schema check (4-key breakdown)      | replaced with direct column existence check                                   |
| 7   | §14.3 dependencies table | added row: D-029 (pass_number stable) explicit | new row                                                                       |
| 8   | §16 (NEW)                | —                                              | Verification findings documented                                              |
| 9   | §17 (NEW)                | —                                              | Architect's 4 conditions for sprint_ui002.1 captured                          |

All other sections (RPCs, RLS, edge cases, security, acceptance criteria, notification infrastructure, estimate) — **unchanged from design004.2**. Reference design004.2 for full text of unchanged sections.

---

## Section 3.1 — Adjuster dispatch (REVISED)

(Steps 1–3 unchanged.)

**Step 4 — Backend transaction in `/api/claims/[id]/dispatch-questions`:**

```typescript
// Pre-check uses direct columns from claims table (NOT claim_form jsonb).
// claims.claimant_email and claims.claimant_phone exist per Migration 0002.
const email = (claim.claimant_email ?? '').trim();
const phone = (claim.claimant_phone ?? '').trim();

if (!email && !phone) {
  return NextResponse.json({ error: 'missing_contact_info' }, { status: 422 });
}

// Generate magic link
const token = crypto.randomBytes(32).toString('base64url'); // 43 chars
const tokenHash = sha256(token); // hex
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

// Insert claimant_magic_links (atomic with question_dispatches UPSERT)
// ... (as in design004.2 §3.1, no change)

// Fire Inngest event with concrete contact info
await inngest.send({
  name: 'claim/dispatch-questions',
  data: {
    claim_id,
    dispatch_id,
    claimant_email: email || null, // null if empty
    claimant_phone: phone || null,
    claimant_first_name: extractFirstName(claim.claimant_name),
    claim_number: claim.claim_number,
    magic_link_url: `https://app.spectix.com/c/${claim_id}?token=${token}`,
  },
});
```

Helper:

```typescript
function extractFirstName(claimant_name: string | null): string {
  if (!claimant_name) return 'שלום'; // fallback greeting
  const parts = claimant_name.trim().split(/\s+/);
  return parts[0] || 'שלום';
}
```

(Step 5–6 unchanged.)

---

## Section 7 — Notification providers (REVISED)

### 7.1 — Resend

(Endpoint, From, Tier, DKIM/SPF/DMARC — unchanged.)

**Subject:** `תביעה {claim_number} — דרושה התייחסותך`

**Body (HTML + plaintext, Hebrew):**

```text
שלום {claimant_first_name},

בנוגע לתביעה מספר {claim_number}, נדרשת התייחסותך ל-{N} שאלות
לסגירת הטיפול.

[CTA כפתור] ענה עכשיו

ה-link תקף ל-24 שעות.
```

Variables:

- `{claim_number}` = `claims.claim_number` direct column.
- `{claimant_first_name}` = first whitespace-separated token of `claims.claimant_name`, fallback `שלום` if NULL/empty.
- `{N}` = count of questions in this dispatch.

### 7.2 — Twilio (SMS)

**Body:**

```text
Spectix: תביעה {claim_number} — יש {N} שאלות. {full_link} (תוקף 24ש)
```

(Same variable sources as 7.1.)

(7.3 Inngest pattern, 7.4 cost — unchanged.)

---

## Section 8.5 — PII (REVISED)

Notification body (email/SMS) contains:

- `claim_number` (direct column, existing).
- First whitespace-separated token of `claimant_name` (e.g., "דוד" from "דוד כהן").

**Excluded from notification body:**

- Full `claimant_name`.
- Medical details, claim amounts, document content.
- Question text or expected answer types.

`audit_log` claimant entries: `details = {claim_id, question_count, ...}` — NEVER `response_value` or question text. Response content lives only in `question_responses` (RLS-protected).

---

## Section 14.2 — Sign-off gate verifications (REVISED)

**(a) Schema verification — direct contact columns (replaces claim_form check):**

```sql
-- Confirm direct columns exist (per Migration 0002).
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'claims'
  AND column_name IN ('claimant_email', 'claimant_phone', 'claimant_name', 'claim_number')
ORDER BY column_name;

-- Empty/null distribution check.
SELECT
  count(*) FILTER (WHERE COALESCE(claimant_email, '') = '')         AS missing_email,
  count(*) FILTER (WHERE COALESCE(claimant_phone, '') = '')         AS missing_phone,
  count(*) FILTER (WHERE COALESCE(claimant_email, '') = ''
                    AND COALESCE(claimant_phone, '') = '')          AS missing_both,
  count(*)                                                          AS total
FROM claims;
```

**Pass criteria:**

- All 4 columns present with `text` type.
- `missing_both` count is reported (not necessarily zero — it's just informational; pre-check at dispatch endpoint will block these claims).

**(b) Codex grep — verified per `verification_06_05_pre_signoff.md`. ACKNOWLEDGED with note:**

- `app/api/claims/[id]/documents/route.ts:211` hardcoded `p_pass_number: 1` is **acceptable per D-029** (stable pass_number model). Documented as intentional, not a coupling defect.

---

## Section 14.3 — Repo dependencies (REVISED)

| Dependency                                   | Status                                          |
| -------------------------------------------- | ----------------------------------------------- |
| SPRINT-UI-001 (PR #68) merged                | ✅                                              |
| Migration 0008 applied non-prod              | Verified at runtime via Migration 0009 DO block |
| design001.11 (concurrent revision)           | Drafted, signed off                             |
| design002.8 (concurrent revision)            | Drafted, signed off                             |
| **D-029 — pass_number stable across cycles** | NEW — see §16 below                             |

---

## Section 16 (NEW) — Verification findings & D-029

### 16.1 — Codex verification artifact

`verification_06_05_pre_signoff.md` (06/05/2026) executed 3 read-only checks:

| Task                                   | Result                                                            | Resolution                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1 — claim_form schema                  | FAIL — column does not exist                                      | Fixed in this iteration: switched to direct columns `claims.claimant_email` / `claims.claimant_phone` |
| 2 — pass_number coupling               | AMBIGUOUS — `documents/route.ts:211` hardcodes `p_pass_number: 1` | ACKNOWLEDGED — consistent with D-029, no patch                                                        |
| 3 — contact info empty-string handling | FAIL — existing reads don't normalize                             | Resolved by Task 1 fix: dispatch endpoint normalizes with `?? ''` + `.trim()`                         |

### 16.2 — D-029 (NEW DECISION)

**D-029 — pass_number stable across cycles (no pass_kind column).**

> Re-cycles use UPSERT on existing pass_numbers per D-016 (`pass_number=1` for extraction, `=2` for validation, `=3` for synthesis). DELETE+INSERT on `synthesis_results` with `pass_number=3` literal stable across cycles. `question_responses` uses `ON CONFLICT (claim_id, question_id) DO UPDATE`, accepting per-question response history loss as a PII trade-off (audit_log preserves timestamps + counts only). Supersedes Architect's pass_kind proposal that would have required a column addition + backfill on `passes`. Trade-offs documented in design002.8 §re-cycle.

**Trigger to revisit D-029:** if any future cycle requires pass_number > 3 (not anticipated for MVP). On revisit, `pass_kind` column becomes mandatory.

### 16.3 — TECH_DEBT 11R (NEW per Architect note)

**11R — question_responses history audit trail (privacy-preserving append-only).**

Trigger: forensic requirement from pilot insurer ("claimant changed answers between cycles" claim). Scope: append-only audit table that captures hashed response values + timestamps + cycle number. Does NOT capture content (PII). Lets adjuster see "claimant submitted Q1 answer, then changed it on cycle 2" without exposing content.

Owner: post-pilot SPRINT-PROD-BLOCK.

---

## Section 17 (NEW) — Architect conditions for sprint_ui002.1

Per Architect triple sign-off verdict, sprint_ui002.1 implementation spec must address:

### 17.1 — `claim/extraction.completed` short-circuit pattern

Architect identified ambiguity in design004.2 §3.4 step 2: "Fire `claim/extraction.completed` event with metadata indicating 'no new documents'."

**Architect's recommended option (b), CEO accepted:**

`claim-recycle` Inngest function fires `claim/validation.requested` (new event alias) **directly**, bypassing `claim/extraction.completed`. Avoids modifying existing extraction handler.

Implementation in sprint_ui002.1:

- New Inngest event `claim/validation.requested` with payload `{claim_id, source: 'recycle'}`.
- Existing `run-validation-pass` handler subscribes to BOTH `claim/extraction.completed` AND `claim/validation.requested` (multi-trigger).
- If documents WERE uploaded with `response_to_question_id` set during the claimant flow → `claim-recycle` instead fires `claim/extraction.completed` with payload `{claim_id, document_ids: [...]}` to re-extract only new docs.

### 17.2 — `save_draft` lock_timeout

Architect identified `FOR UPDATE` deadlock risk: long-running adjuster `regenerate-link` could block claimant autosave indefinitely.

**Resolution:** add `SET LOCAL lock_timeout = '5s'` at start of `save_draft` RPC body. On timeout, RPC raises `lock_not_available`; route handler returns 503 with retry-after header. Claimant UI shows "Connection slow, retrying..." toast.

**Why lock_timeout over NOWAIT:** NOWAIT throws immediately on contention, even for normal short writes. lock_timeout=5s gives normal operations room while preventing pathological hangs. 5s is short enough that user perceives as "slow" not "stuck".

### 17.3 — TECH_DEBT 11R registration

Per §16.3 above.

### 17.4 — Codex pre-flight artifacts attached

`verification_06_05_pre_signoff.md` is the artifact. Attached to sprint_ui002.1 dispatch package.

---

## Done Criteria — design004 iteration 3

- [x] All 8 decisions from iteration 2 still resolved.
- [x] Schema mismatch fixed: direct columns instead of `claim_form` jsonb.
- [x] D-029 documented (pass_number stable, supersedes pass_kind).
- [x] Verification findings (Task 1 FAIL, 2 AMBIGUOUS, 3 FAIL) addressed.
- [x] TECH_DEBT 11R added.
- [x] Architect 4 conditions for sprint_ui002.1 captured (§17).
- [ ] **Architect re-review of design004.3 delta.** Mechanical, not architectural — fast-track expected.
- [ ] sprint_ui002.1 drafted post re-review.

---

## Cross-References (UPDATED)

- `design004.2_claimant_responses_06_05.md` — full spec text for unchanged sections (RPCs, security, edge cases, etc.). 004.3 is a delta on top.
- `design001.11_state_machine_06_05.md` — actor_type='claimant', audit actions, B.5. Joint sign-off held.
- `design002.8_synthesis_decomposition_06_05.md` — notification metadata, synthesis prompt input. Joint sign-off held.
- `design004.1_claimant_responses_06_05.md` — original skeleton (→ archive).
- `verification_06_05_pre_signoff.md` — Codex verification artifact.
- `sprint_ui002.1` (TBD) — implementation spec, drafted post Architect re-review of 004.3.

---

## Version

design004 — iteration 3 — 06/05/2026
**Filename:** `design004.3_claimant_responses_06_05.md`
**Status:** Architect re-review pending. Delta only — mechanical schema correction + Architect conditions captured.
**Predecessor:** design004.2 (kept; 004.3 is delta on top of it).
**Next step:** Architect fast-track re-review → sprint_ui002.1.
