# SPRINT-UI-002B — Claimant Question Response Flow (Core, no notifications)

**Date:** 06/05/2026
**Identifier:** sprint_ui002b.1
**Type:** Implementation spec for Codex.
**Source spec:** `sprint_ui002.1_claimant_responses_implementation_06_05.md` (full UI-002 spec). UI-002B is the **core scope split** per UI-002A decision report.
**Predecessor sprint:** UI-002A (`sprint_ui002a.1_preflight_06_05.md` → PR #70).
**Status:** Ready for CEO GPT verification → Codex dispatch (after PR #70 merges to main).
**Estimated effort:** 11-14 days (10-12 core + 1-2 extraction handler patch).

---

## 1. Why a split sprint

Per UI-002A decision report (`docs/management/verifications/preflight_decision_06_05.md`):

- **Check A (contact columns):** FAIL distributional only — schema OK, seed data sparse. Runtime pre-check handles. **Not a blocker.**
- **Check B (empty-string sweep):** POLISH-ONLY — no existing dispatch path conflicts with the new normalization pattern.
- **Check C (extraction handler):** needs-patch — `process-document` handles single `documentId`, doesn't accept array. UI-002B includes event fan-out patch.
- **Check D (`reopen_pass` lifecycle):** PASS — documented in `docs/architecture/passes_lifecycle.md`.
- **Check E (Resend/Twilio infra):** vov-action-required — env vars not in repo, Vercel inspection blocked. **Notifications gated.**

Net effect: full `sprint_ui002.1` (19 days) splits into:

- **UI-002B (this sprint):** 11-14 days — core response flow without external notifications.
- **UI-002C (later, gated):** 4-5 days — Resend + Twilio + Inngest fallback. Dispatched after vov procures providers and confirms env readiness.

---

## 2. Scope IN (UI-002B)

| Component                                                                     | Source spec ref                        | Notes                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration 0009 (3 new tables, 3 ALTERs, 3 RPCs)                               | sprint_ui002.1 §3.1                    | Full migration as specified. **No notification metadata changes deferred** — the `question_dispatches` ALTER stays in this migration to keep schema in one place; columns are populated only when UI-002C ships. |
| `save_draft`, `link_document_to_question`, `finalize_question_responses` RPCs | sprint_ui002.1 §3.1 + design004.2 §4.4 | Includes `SET LOCAL lock_timeout = '5s'` per Architect condition.                                                                                                                                                |
| `/api/claims/[id]/dispatch-questions` (modified — see §3.1 below)             | sprint_ui002.1 §3.2 + design004.3 §3.1 | Returns magic link URL to adjuster. **Does NOT fire notification Inngest event.**                                                                                                                                |
| `/api/claims/[id]/regenerate-link`                                            | sprint_ui002.1 §3.2                    | Same pattern; returns new URL.                                                                                                                                                                                   |
| Claimant public routes (`/c/[claim_id]` GET + draft/upload/finalize POST)     | sprint_ui002.1 §3.3                    | Full implementation.                                                                                                                                                                                             |
| Frontend claimant page (4 renderers, autosave, finalize, RTL)                 | sprint_ui002.1 §3.6                    | Full implementation.                                                                                                                                                                                             |
| Brief view patches (badges, bulk dispatch button, regenerate-link)            | sprint_ui002.1 §3.7                    | Plus new "Copy link" button after dispatch (see §3.1 below).                                                                                                                                                     |
| `claim-recycle` Inngest function                                              | sprint_ui002.1 §3.5                    | Includes extraction handler fan-out patch (see §3.2 below).                                                                                                                                                      |
| `run-validation-pass` multi-trigger                                           | sprint_ui002.1 §3.5                    | Subscribes to `claim/extraction.completed` AND `claim/validation.requested`.                                                                                                                                     |
| Migration 0009 `audit_log` actor_type CHECK extension                         | sprint_ui002.1 §3.1                    | Per design001.11 K.7.                                                                                                                                                                                            |
| ENV validation at startup (modified — see §3.3 below)                         | sprint_ui002.1 §3.8                    | **No Resend/Twilio var requirements.** `SKIP_NOTIFICATIONS` check stays.                                                                                                                                         |
| Tests (E2E + smoke)                                                           | sprint_ui002.1 §3.9                    | Adjusted scope — see §3.4 below.                                                                                                                                                                                 |

---

## 3. Scope OUT (deferred to UI-002C)

| Component                                                                                   | Reason                                                   |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Resend integration (`lib/claimant/notifications.ts` Resend client)                          | Provider not procured                                    |
| Twilio integration                                                                          | Provider not procured                                    |
| `/api/webhooks/resend/route.ts`                                                             | No provider yet                                          |
| `/api/webhooks/twilio/route.ts`                                                             | No provider yet                                          |
| `claimant-notify` Inngest function (email→SMS fallback with `waitForEvent`)                 | Depends on providers                                     |
| Population of `question_dispatches.notification_*` columns                                  | Schema lands in UI-002B; columns stay NULL until UI-002C |
| `extractFirstName` + `buildGreeting` helpers (per Architect condition #7)                   | No notification body in UI-002B; defer to UI-002C        |
| ENV var validation for `RESEND_API_KEY`, `TWILIO_*`, etc.                                   | Not used in UI-002B                                      |
| TECH_DEBT 11G (Resend failover), 11H (WhatsApp), 11N (Resend tier), 11P (late bounce retry) | Notification-only entries                                |

---

## 4. Modifications to sprint_ui002.1

### 4.1 — `dispatch-questions` endpoint behavior change

**Original (sprint_ui002.1 §3.2):**

> Generate magic link, INSERT `claimant_magic_links`, UPSERT `question_dispatches`, fire Inngest `claim/dispatch-questions` event with `claimant_email`/`claimant_phone`/`claimant_first_name`/`claim_number`/`magic_link_url`.

**UI-002B:**

- Pre-check direct columns (per design004.3 §3.1) for visibility, but DOES NOT block on missing contact info — adjuster can still get a link to share manually.
- Generate token + hash + URL.
- INSERT `claimant_magic_links`.
- UPSERT `question_dispatches`.
- **Skip Inngest event.** No notification dispatched.
- Return JSON to adjuster:

  ```json
  {
    "magic_link_url": "https://app.spectix.com/c/{claim_id}?token={token}",
    "expires_at": "2026-05-07T14:30:00Z",
    "contact_status": {
      "claimant_email": "...",
      "claimant_phone": "...",
      "missing_both": false
    },
    "dispatched_question_count": 4
  }
  ```

- Audit `adjuster_request_info` action (existing, per design001.11 H.2).

**Adjuster brief view (sprint_ui002.1 §3.7) gains:**

- After successful dispatch → modal/toast displays the URL with a copy button: "Link generated — share with claimant."
- If `contact_status.missing_both === true` → warning banner: "No contact info on file — share link manually via WhatsApp / phone."
- If contact info exists → informational banner: "Notifications not yet active. Share link manually via the email/phone shown."

**Why this works for pilot pre-LOI:** adjuster ops staff handle ~30-40 claims/day. Manual link sharing for the first 5-10 pilot claims is acceptable friction. UI-002C automates once Resend/Twilio procured.

### 4.2 — `claim-recycle` Inngest function with extraction fan-out

**Original (sprint_ui002.1 §3.5):**

> Branch on `newDocIds.length > 0`: Path B fires `claim/extraction.completed` with `document_ids` array; Path A fires `claim/validation.requested` direct.

**UI-002B (per Check C finding):** existing `process-document` handler accepts single `documentId`. Path B implementation patches via **event fan-out**:

```typescript
// Path B — re-extract new docs only (fan-out per existing single-doc handler)
if (newDocIds.length > 0) {
  await Promise.all(
    newDocIds.map((documentId) =>
      step.sendEvent(`extract-${documentId}`, {
        name: 'claim/document.uploaded', // existing event handled by process-document
        data: { documentId, claim_id, source: 'recycle' },
      }),
    ),
  );
  // Validation triggered when all extractions complete via existing chain.
  // process-document fires `claim/extraction.completed` after each; run-validation-pass
  // is idempotent (UPSERT pass_number=2 per design002.7) — multi-trigger safe.
}
```

**Codex pre-implementation step:** verify in PR description that `run-validation-pass` UPSERT is genuinely idempotent under N concurrent triggers. If not — switch Path B to aggregation pattern (last extraction fires validation):

```typescript
// Aggregation alternative if needed
const completionCounter = await step.run('init-counter', async () => {
  await supabaseAdmin.from('recycle_completion_tracker').insert({
    claim_id,
    expected: newDocIds.length,
    completed: 0,
  });
});
// process-document increments counter; when completed === expected, fires validation.
```

Decision (idempotent vs aggregation) documented in PR description; not a design-level concern.

**Path A unchanged** (no new docs → fire `claim/validation.requested` direct).

### 4.3 — ENV validation reduced

**Original (sprint_ui002.1 §3.8):**

> Production boot fails if `SKIP_NOTIFICATIONS` set OR if any of `RESEND_API_KEY`/`TWILIO_*`/`RESEND_WEBHOOK_SECRET` missing.

**UI-002B:**

```typescript
if (process.env.NODE_ENV === 'production') {
  if ('SKIP_NOTIFICATIONS' in process.env) {
    throw new Error(
      'SKIP_NOTIFICATIONS env var must NOT be set in production (any value)',
    );
  }
  if (!process.env.APP_BASE_URL) {
    throw new Error('Missing required env: APP_BASE_URL');
  }
  // Resend/Twilio vars NOT required in UI-002B. Will be added in UI-002C.
}
```

`.env.example` includes Resend/Twilio var names commented out with note `# Required in UI-002C`.

### 4.4 — Tests adjusted

E2E suite for UI-002B:

- `e2e/claimant_flow_core.spec.ts` — happy path: dispatch → response copies URL from API JSON → claimant opens → answers 4 question types → finalize → claim status check.
- `e2e/claimant_flow_security.spec.ts` — token states (expired, used, revoked, invalid).
- `e2e/claimant_flow_recycle.spec.ts` — re-cycle with documents (Path B fan-out) and without (Path A direct).

Deferred to UI-002C:

- `e2e/claimant_flow_notification.spec.ts` — Resend bounce mock → SMS fallback.

---

## 5. Architect conditions — UI-002B status

Per Architect joint sign-off conditions for sprint_ui002.1:

| #   | Condition                                                        | UI-002B status                                                                                                                                                      |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `claim/extraction.completed` short-circuit pattern (Path A vs B) | ✅ implemented per §4.2 (with fan-out for Path B)                                                                                                                   |
| 2   | `save_draft` lock_timeout=5s                                     | ✅ in RPC body                                                                                                                                                      |
| 3   | TECH_DEBT 11R registration (response history audit trail)        | ✅ in this sprint's TECH_DEBT updates                                                                                                                               |
| 4   | Codex pre-flight artifacts attached                              | ✅ done in UI-002A (PR #70)                                                                                                                                         |
| 5   | Extraction handler subset capability                             | ✅ resolved by event fan-out (Check C "needs-patch" addressed in §4.2)                                                                                              |
| 6   | TECH_DEBT 11S registration                                       | ✅ resolved differently — `passes_lifecycle.md` created in UI-002A; no separate TECH_DEBT entry needed (lowercase `11s` already exists in repo for unrelated topic) |
| 7   | `extractFirstName` polish                                        | ⏳ deferred to UI-002C (no notification body in UI-002B)                                                                                                            |

---

## 6. TECH_DEBT updates (delta from sprint_ui002.1 §5)

In `docs/TECH_DEBT.md`, add entries for UI-002B:

```markdown
## 11J — Document upload virus scanning

(unchanged from sprint_ui002.1)

## 11K — Multi-cycle synthesis prompt summarization

(unchanged)

## 11L — Short link service `s.spectix.com`

**Trigger:** SMS multi-segment rate >30%.
**Owner:** UI-002C follow-up.

## 11M — Notification preference per claimant

(unchanged)

## 11Q — Storage cleanup for orphaned uploads

(unchanged)

## 11R — question_responses history audit trail (privacy-preserving)

(per Architect condition #3; unchanged from sprint_ui002.1)

## 11T — Production rate limiter (Redis-backed)

**Trigger:** pre-production scale.
**Approach:** swap in-memory LRU rate limiter for Upstash Redis.
**Owner:** SPRINT-PROD-BLOCK.
```

**Removed from sprint_ui002.1 entries (deferred to UI-002C):**

- 11G (Notification multi-provider failover)
- 11H (WhatsApp V2)
- 11N (Resend tier upgrade)
- 11P (Late bounce auto-SMS retry)

**Removed entirely:** 11S (sprint_ui002.1 had it; resolved in UI-002A via `passes_lifecycle.md`; no entry needed).

**Stays out (was 11I in sprint_ui002.1):** Multi-language UI — applies regardless of UI-002B/C; not new in this sprint.

---

## 7. DECISIONS — D-029 already documented

D-029 was registered in design004.3 §16.2 + UI-002A pre-flight context. UI-002B does not introduce new decisions. CEO Claude confirms D-029 is in `docs/DECISIONS.md` after PR #70 merges (verify in CEO GPT pre-dispatch check for this sprint).

If D-029 not yet in `docs/DECISIONS.md` after PR #70 merge → UI-002B PR includes the entry per sprint_ui002.1 §6 wording.

---

## 8. Files to create / modify

### Create

- `supabase/migrations/{timestamp}_claimant_responses.sql`
- `supabase/rollbacks/{timestamp}_claimant_responses.down.sql`
- `app/api/claims/[id]/dispatch-questions/route.ts`
- `app/api/claims/[id]/regenerate-link/route.ts`
- `app/c/[claim_id]/page.tsx` + layout
- `app/api/c/[claim_id]/draft/route.ts`
- `app/api/c/[claim_id]/upload/route.ts`
- `app/api/c/[claim_id]/finalize/route.ts`
- `app/c/[claim_id]/_components/*` (~10 files: QuestionList, 4 renderers, AutosaveIndicator, SubmitButton, error pages, DonePage)
- `app/(adjuster)/claims/[id]/_components/DispatchSection.tsx`
- `inngest/functions/claim-recycle.ts`
- `lib/claimant/tokens.ts` (hash + generate)
- `lib/claimant/contact.ts` (helpers — `extractFirstName` etc. created but unused in UI-002B; ready for UI-002C)
- `e2e/claimant_flow_core.spec.ts`
- `e2e/claimant_flow_security.spec.ts`
- `e2e/claimant_flow_recycle.spec.ts`

### Modify

- `app/(adjuster)/claims/[id]/_components/QuestionsList.tsx` (badges per question)
- `inngest/functions/run-validation-pass.ts` (multi-trigger subscription)
- `instrumentation.ts` (ENV validation reduced per §4.3)
- `.env.example` (commented-out Resend/Twilio vars with UI-002C marker)
- `middleware.ts` (rate limiting per design004.2 §8.3)

### NOT created in UI-002B (UI-002C)

- `app/api/webhooks/resend/route.ts`
- `app/api/webhooks/twilio/route.ts`
- `inngest/functions/claimant-notify.ts`
- `lib/claimant/notifications.ts`
- `e2e/claimant_flow_notification.spec.ts`

---

## 9. Pre-flight (already done in UI-002A)

Codex does NOT re-run UI-002A checks. References artifacts merged via PR #70:

- `docs/management/verifications/preflight_a_contact_columns.md`
- `docs/management/verifications/preflight_b_empty_string_sweep.md`
- `docs/management/verifications/preflight_c_extraction_handler.md`
- `docs/management/verifications/preflight_e_notification_infra.md`
- `docs/management/verifications/preflight_decision_06_05.md`
- `docs/architecture/passes_lifecycle.md`

**One additional pre-implementation check** (in PR description):

- Verify `run-validation-pass` UPSERT is idempotent under multi-trigger (per §4.2). If not — switch Path B to aggregation pattern. Document the choice in PR description.

---

## 10. Done criteria

Per design004.2 §10 — adjusted for UI-002B core scope:

### 10.1 — Adjuster path (modified)

- [ ] Brief view shows `not_dispatched` for new questions.
- [ ] Pre-check warns (does NOT block) when contact info missing — banner only.
- [ ] Dispatch returns `magic_link_url` in JSON response within 5 seconds.
- [ ] Brief view modal shows URL with copy button after dispatch.
- [ ] Regenerate-link revokes old, returns new URL.

### 10.2 — Claimant path (unchanged)

Per sprint_ui002.1 §10.2 / design004.2 §10.2 — all 6 items.

### 10.3 — Re-cycle (modified)

- [ ] Path A (no docs) — `claim/validation.requested` fires; validation runs; synthesis runs; final state correct.
- [ ] Path B (with docs) — fan-out fires N `claim/document.uploaded`; all extractions complete; validation runs once; synthesis runs; final state correct.
- [ ] Synthesis prompt receives `question_responses` per design002.8 query.

### 10.4 — Security (unchanged minus webhooks)

Per design004.2 §10.4 — items 1-5 + 7 + 8. Skip "webhook signature invalid → 401" (no webhooks in UI-002B).

### 10.5 — Notification fallback (deferred entirely)

All items moved to UI-002C done criteria.

### 10.6 — UI-002B-specific

- [ ] All 4 contact columns confirmed during runtime (graceful handling on null).
- [ ] D-029 entry in `docs/DECISIONS.md`.
- [ ] TECH_DEBT entries 11J, 11K, 11L, 11M, 11Q, 11R, 11T registered.
- [ ] design004.2 SUPERSEDED header for §3.1, §7, §14.2 references design004.3.

---

## 11. Out of scope (UI-002B)

(Per design004.1 §"Out of Scope" + design004.2 §11 + this sprint's notifications gating:)

- All UI-002C scope (notifications, webhooks, providers).
- Native mobile app.
- WhatsApp.
- Multi-language UI (11I).
- Voice input.
- Real-time chat.
- Push notifications.
- Resumable uploads.
- File preview before upload.
- Virus scanning (11J).
- Multi-cycle summarization (11K).
- 2FA on magic link.
- Production Redis rate limiter (11T).

---

## 12. Cross-references

- `sprint_ui002.1_claimant_responses_implementation_06_05.md` — full UI-002 spec (UI-002B + UI-002C combined). Source of truth for unchanged sections.
- `sprint_ui002a.1_preflight_06_05.md` (PR #70) — pre-flight; produced verification artifacts UI-002B references.
- `design004.2` + `design004.3` — joint design.
- `design001.11` + `design002.8` — concurrent revisions.
- `docs/architecture/passes_lifecycle.md` (PR #70) — `reopen_pass_for_document_processing` semantics.
- D-016 + D-029 — pass_number stable model.

---

## 13. UI-002C handoff (for context, not this sprint)

When vov procures Resend account + Twilio Israel number (~2.5h vov work):

1. CEO Claude drafts `sprint_ui002c.1_claimant_notifications_06_05.md` referencing this sprint's foundation.
2. Scope: Resend client, Twilio client, 2 webhook routes, `claimant-notify` Inngest with `waitForEvent`, ENV validation extension, TECH_DEBT 11G/11H/11N/11P registration, `extractFirstName` + `buildGreeting` activation in notification body, `extractFirstName` Architect condition #7 closed.
3. Estimated 4-5 days.
4. Adjuster dispatch endpoint switches from "return URL" to "fire Inngest event" (one-line change in route handler).

---

## Version

sprint_ui002b.1 — 06/05/2026
**Filename:** `sprint_ui002b.1_claimant_responses_core_06_05.md`
**Status:** Ready for CEO GPT verification → Codex dispatch (after PR #70 merges to main).
**Predecessor:** UI-002A (PR #70).
**Successor:** UI-002C (gated on vov infra procurement).
**Next:** CEO GPT verifies main HEAD post PR #70 merge + scope sanity → handoff package to Codex.
