# SPRINT-002D — Errored State + Soft Cost Cap (v1.1)

**Date:** 06/05/2026
**Identifier:** SPRINT-002D
**Iteration:** 2 (v1.1)
**Predecessor:** v1.0 (iteration 1) — superseded after CEO GPT identified 5 precision issues that would cause Codex to build on unverified API/conventions.

**Status:** Implementation-ready after v1.1 fixes. Pending dispatch from CEO GPT after preconditions met.

**Scope unchanged from v1.0:** errored state + admin recovery + soft cost cap. ~3-4 days. Other audit gaps remain deferred per D-028.

---

## Changes From v1.0

| #   | Issue                             | Fix                                                                                                                                                                                 | Section           |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | `.on('failure')` API not verified | Codex pre-implementation check #4: verify exact failure-handler API supported by installed Inngest SDK. If unsupported, stop and report correct pattern before coding.              | Preconditions     |
| 2   | "All Inngest functions" too broad | Scope failure handlers to claim-scoped functions only. Codex reports excluded functions explicitly.                                                                                 | Part A            |
| 3   | `claim_id` vs `claimId` naming    | Use existing event payload shape from `lib/types.ts`. Do not invent.                                                                                                                | Part A pseudocode |
| 4   | Admin role check undefined        | Codex inspects existing auth/admin conventions first. If none exists, endpoint defaults to 403 unless service-role/internal caller pattern established. No new RBAC in this sprint. | Part A            |
| 5   | Cost guard accounting ambiguous   | Wrapper only checks cap + returns cost. Existing accounting path stays responsible for recording cost. No double-counting. Tests required.                                          | Part B            |

---

## Preconditions

**HARD GATE:** Codex must NOT begin implementation until ALL of:

1. SYNC-001 PR merged to main. claim.status vocabulary + D-020-D-026 + TECH_DEBT 11v in repo.
2. PR #62 (AUDIT-001 findings) merged.
3. CEO authorization to start.
4. **NEW:** Codex verifies exact Inngest failure-handler API for installed SDK version:
   ```bash
   cat package.json | grep inngest
   # Then inspect inngest SDK exports for failure handler patterns.
   ```
   Codex must confirm one of:
   - `.on('failure', handler)` supported on InngestFunction.
   - Alternative pattern (e.g., `onFailure` config option, separate failure-event subscription).
   - Document chosen pattern in implementation PR.
   - **If neither pattern available: STOP and report. Do not invent.**
5. **NEW:** Codex verifies existing event payload shapes in `lib/types.ts`:
   ```bash
   grep -n "claimId\|claim_id" lib/types.ts inngest/events/*.ts 2>/dev/null
   ```
   Use the convention found. Spec uses `claimId` below as default but defers to actual repo convention.
6. **NEW:** Codex inspects existing admin auth conventions:

   ```bash
   grep -rn "isAdmin\|role.*admin\|service_role" app/api/ lib/auth/ 2>/dev/null
   ```

   - If admin pattern exists: use it.
   - If only service_role/internal caller pattern: use that with documented restriction.
   - If neither: endpoint returns 403 unconditionally; document as TECH_DEBT 11x ("admin RBAC for retry endpoint").

If any precondition fails — Codex returns precondition status, no code, no PR.

---

## CEO Decisions Embedded in This Sprint

Add to `docs/DECISIONS.md` as part of this sprint's PR:

### D-027 — Backend Lifecycle Canonical = Event/Pass-Driven

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
AUDIT-001 (06/05/2026) identified that design001.6 specifies a fine-grained 11-state claim vocabulary with guarded transitions, while shipped main uses event/pass-driven lifecycle (Inngest events `claim/extraction.completed`, `claim/validation.completed` + `passes` table for stage tracking). The fine-grained vocabulary was a planning artifact that diverged from 6 months of implementation.

**Decision:**
Backend lifecycle is canonical = event/pass-driven model. `claim.status` carries only coarse UI-hint values: `intake`, `processing`, `pending_info`, `ready`, `reviewed`, `cost_capped`, `errored`, `rejected` (plus existing `rejected_no_coverage` if Codex confirms it's in current main). Stage tracking (extraction/validation/synthesis in progress) is derived by the UI from `passes` table state + `claim_validations` rows + future synthesis_results rows.

Fine-grained state vocabulary (`documents_open`, `extraction_complete`, `validating`, `validation_complete`, `synthesizing`) is deferred to V2 hardening or removed entirely if UI proves it doesn't need them.

**Reasoning:**

- Implementation has been event-driven for 6 months. Fighting it costs weeks.
- UI hasn't been built yet. UI requirements drive the vocabulary, not the spec.
- `passes` table already encodes stage state. UI reads it directly.
- Single source of truth: events + passes.

**Trade-offs accepted:**

- Lose declarative claim-state machine. UI must compose state from multiple tables.

**Revisit when:**

- UI sprint shows compositing claim state from passes + validations is painful.

**Supersedes:** design001.6 Section A — to be revised in design001.7 after SPRINT-002D ships.

---

### D-028 — SPRINT-002D Scope = Minimal Pre-Synthesis Prerequisites

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
AUDIT-001 identified 4 GAPs + 7 PARTIALs vs design001.6.

**Decision:**
SPRINT-002D scope is minimal — only items that are real production risk before synthesis ships:

1. `errored` state + admin recovery — prevents stuck claims.
2. Soft cost cap enforcement — prevents runaway LLM cost when synthesis adds R04/R09 LLM calls.

Other audit-identified items deferred:

- Upload conflict 409 policy → TECH_DEBT 11w (UX sprint).
- Fine-grained state vocabulary migration → not needed (per D-027).
- Guarded transitions per state → not needed (per D-027).
- Race condition policies D.2-D.5 → TECH_DEBT 11w.

**Reasoning:**

- `errored` is real risk: stuck claims = manual DB intervention.
- Cost cap is real risk: synthesis with LLM calls + no enforcement = unbounded cost.
- Other items are UX polish or V2 hardening.

**Trade-offs accepted:**

- design001.6 spec stays misaligned with main on cosmetic items until design001.7.

**Revisit when:**

- Cost cap soft tolerance proves insufficient → TECH_DEBT 11v (hard cap).

---

## Architecture

### Part A — `errored` State + Admin Recovery

**Database:**

`claims.status` CHECK constraint must allow `errored` value.

```sql
-- Migration: extend claims.status CHECK to include 'errored'
-- Codex inspects current CHECK from main, writes appropriate ALTER.
-- Backfill: no rows currently 'errored' (new state).
```

**Inngest function failure handling (FIX #1, #2, #3):**

Codex first verifies (per Precondition #4) which failure-handler pattern Inngest SDK supports. Then applies it ONLY to **claim-scoped functions** — functions where the event payload contains a derivable claim identifier.

**Identifying claim-scoped functions:**

- Codex enumerates all Inngest functions in `inngest/`.
- For each: examine event subscription + payload type.
- Mark "claim-scoped" if payload contains `claimId` (or repo's chosen field name).
- Mark "non-claim-scoped" if payload is system-level / batch / cleanup / etc.
- **Exclude non-claim-scoped from failure handler addition.**
- Document the exclusion list in implementation PR.

**Failure handler logic (pseudocode using payload field name TBD by Precondition #5):**

```typescript
// Pseudocode — actual API form depends on Precondition #4 output.
// Field name depends on Precondition #5 output (claimId or claim_id).

inngest.createFunction(
  {
    id: 'extraction-fn',
    // Other config...
    onFailure: async ({ event, error }) => {
      const claimId = event.data.claimId; // ← uses repo convention
      if (!claimId) return; // skip if cannot derive (defensive)

      await transitionClaimToErrored(claimId, {
        error_class: classifyError(error),
        last_pass_number: await getLastCompletedPassNumber(claimId),
        error_message: error.message.slice(0, 500),
      });
    },
  },
  // Trigger config...
);
```

`transitionClaimToErrored`:

- Guarded UPDATE: `UPDATE claims SET status='errored', updated_at=now() WHERE id=$1 AND status NOT IN ('errored', 'rejected', 'ready')`.
- Audit log entry: action `claim_errored`, details `{ error_class, last_pass_number, error_message }`.

**Admin recovery endpoint (FIX #4):**

New API route: `POST /api/admin/claims/:id/retry`

**Auth gate (per Precondition #6):**

- If repo has existing admin role pattern: use it.
- If repo has service_role / internal caller pattern (e.g., header check, env-based): use it with restriction documented.
- If neither: endpoint returns 403 unconditionally. Add `TECH_DEBT 11x` entry: "Admin RBAC for retry endpoint — endpoint is functionally complete but inaccessible until RBAC pattern established."
- **Codex does NOT invent a new RBAC model.**

**Recovery logic:**

- Verify auth (per above).
- Verify claim.status = `errored`. Else 409.
- Derive last good state from passes:
  ```sql
  SELECT pass_number FROM passes
  WHERE claim_id = $1 AND status = 'completed'
  ORDER BY pass_number DESC LIMIT 1;
  ```
- Map (per pass_number completed):
  - none → re-fire `claim/extraction.start` (or equivalent — verify exact event name from main).
  - pass=1 → re-fire `claim/extraction.completed`.
  - pass=2 → re-fire `claim/validation.completed`.
  - pass=3 → set claim.status to `ready` directly. Synthesis already done.
- Update claim.status to `processing`.
- Audit log: action `claim_error_recovered`.

**Tests:**

- Unit: `transitionClaimToErrored` guarded UPDATE behavior.
- Unit: admin retry derivation from passes table for each pass_number scenario.
- Unit: auth gate behavior — 403 if no auth pattern.
- Integration: simulate Inngest failure → verify claim transitions to errored (only for claim-scoped functions).
- Integration: admin retry on errored claim → verify event re-fired.

### Part B — Soft Cost Cap Enforcement (FIX #5)

**Wrapper responsibility — read-only check:**

`callClaudeWithCostGuard` does TWO things only:

1. **Reads** current `total_llm_cost_usd` + claim status.
2. **Halts** (throws CostCapHaltError) if cap reached or claim in halt-state.

It does **NOT** record cost. Cost recording stays with existing accounting paths.

**TS contracts:**

```typescript
// lib/cost-cap/types.ts
export const COST_CAP_USD = 2.0;

export class CostCapHaltError extends NonRetriableError {
  constructor(claim_id: string, reason: string) {
    super(`Cost cap halt for ${claim_id}: ${reason}`);
  }
}
```

**Wrapper:**

```typescript
// lib/cost-cap/guard.ts
import { NonRetriableError } from 'inngest';

export async function callClaudeWithCostGuard<T>(
  claimId: string,
  callFn: () => Promise<T>,
): Promise<T> {
  // PRE-CALL: read claim cost + status (single query)
  const { total_llm_cost_usd, status } = await getClaimCostAndStatus(claimId);

  if (
    status === 'cost_capped' ||
    status === 'rejected' ||
    status === 'errored'
  ) {
    throw new CostCapHaltError(claimId, `non-active state: ${status}`);
  }

  if (total_llm_cost_usd >= COST_CAP_USD) {
    await transitionClaimToCostCapped(claimId);
    throw new CostCapHaltError(claimId, `reached $${COST_CAP_USD} cap`);
  }

  // PROCEED: invoke wrapped call. Cost recording is the responsibility of
  // existing accounting paths (e.g., upsert_pass_increment RPC called by caller
  // after successful response). Wrapper does NOT record cost.
  return callFn();
}
```

**Critical invariant:**

> Cost is recorded by existing pass accounting RPC (`upsert_pass_increment`). Wrapper does not call it. Existing call sites already increment cost after successful Claude response. Wrapper is purely read + halt.

**Verification by Codex before integration:**

- Identify the canonical cost-recording call site for each LLM invocation.
- Confirm cost-recording happens AFTER the LLM response (not inside guard).
- If cost-recording is currently inconsistent across call sites: document but do not refactor in this sprint (TECH_DEBT entry instead).

**Integration points:**

Codex enumerates current LLM call sites — likely:

- `lib/llm/classify-broad.ts` (Prompt 01)
- `lib/llm/classify-subtype.ts` (Prompt 01b)
- `lib/llm/extract.ts` and 7 normalized routes
- Future: synthesis LLM calls (SPRINT-003A+)

For each: wrap the call, leave existing cost-recording untouched.

**`transitionClaimToCostCapped`:**

- Guarded UPDATE: `UPDATE claims SET status='cost_capped', updated_at=now() WHERE id=$1 AND status NOT IN ('cost_capped', 'rejected', 'ready')`.
- Audit: action `claim_cost_capped`, details `{ total_cost_usd, threshold_usd: COST_CAP_USD }`.

**Race condition (acceptable for MVP):**
With Inngest concurrency cap of 5, multiple LLM calls can pass guard at $1.95 → all settle → ~$2.45 total. Documented as soft cap. Hard cap = TECH_DEBT 11v.

**Tests (FIX #5 — explicit no-double-counting):**

- Unit: `callClaudeWithCostGuard` halts when cap reached (cap-respect test).
- Unit: NonRetriableError type confirmed (Inngest no-retry test).
- Unit: guarded UPDATE idempotent on Inngest replay.
- **Unit: wrapper does NOT call cost-recording RPC** (no-double-count test). Verify by mocking `upsert_pass_increment` and confirming wrapper never invokes it.
- Integration: simulated cost accumulation from existing accounting → cap reached → next call throws CostCapHaltError. Verify only one accounting record per LLM call (no double-count).

### Part C — Spec correction

After SPRINT-002D ships:

- CEO Claude writes design001.7 (full spec revision per D-027).
- design001.6 moved to `docs/management/archive/`.

**Not part of this sprint.**

---

## Migration Detail

```sql
-- migration: 0006_errored_state_and_cost_cap.sql

-- IMPORTANT: Codex first runs:
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE 'claims_status%';
-- to get current CHECK definition. Then writes ALTER from observed state.

-- Codex also runs:
-- SELECT status, count(*) FROM claims GROUP BY status;
-- to verify all current values are accommodated in new CHECK.

BEGIN;

ALTER TABLE claims DROP CONSTRAINT IF EXISTS <observed_constraint_name>;

-- Build new CHECK list from: observed values + 'errored' (the addition).
-- Codex documents observed values + new list in PR.
ALTER TABLE claims ADD CONSTRAINT claims_status_valid CHECK (
  status IN (<observed values>, 'errored')
);

COMMIT;

-- down: restore observed constraint without 'errored' (assuming no rows have errored value yet).
```

Codex documents in PR description:

- Observed CHECK before.
- Observed distinct status values + counts.
- New CHECK after.

---

## File Layout

```
/lib/
  /cost-cap/
    types.ts                       ← CostCapHaltError + COST_CAP_USD
    guard.ts                       ← callClaudeWithCostGuard (read+halt only)
    transition.ts                  ← transitionClaimToCostCapped (DB)
    index.ts                       ← exports
  /errored/
    transition.ts                  ← transitionClaimToErrored (DB)
    recovery.ts                    ← deriveLastGoodState + retry handlers
    index.ts                       ← exports

/app/api/admin/claims/[id]/retry/
  route.ts                         ← POST endpoint (auth gate per Precondition #6)

/inngest/
  (existing claim-scoped functions modified to add failure handler)
  (non-claim-scoped functions unchanged)

/supabase/migrations/
  0006_errored_state_and_cost_cap.sql

/docs/
  DECISIONS.md                     ← append D-027, D-028 (in same PR)
  TECH_DEBT.md                     ← append 11w (upload conflict deferral), possibly 11x (admin RBAC if no pattern exists)
  management/sprints/
    sprint002d.2_errored_costcap_06_05.md  ← THIS spec, included in PR

/tests/unit/
  cost-cap.test.ts                 ← guard behavior + no-double-count
  errored.test.ts                  ← transition + recovery + auth gate
/tests/integration/
  errored-flow.test.ts             ← Inngest failure → errored
  cost-cap-flow.test.ts            ← cost accumulation → cost_capped (no double-count)
  admin-retry.test.ts              ← errored claim recovery
```

---

## Hard Rules

- No changes to extraction routes (only LLM-call site wrapping).
- No changes to validation layers (PR #60 stays as-is).
- No new npm deps.
- Migration follows D-015 (up + down + reversible).
- Smoke not in this PR (CEO authorizes separately).
- Cost cap default = $2.00 hardcoded constant.
- Wrapper does NOT record cost (FIX #5 invariant).
- Failure handlers only on claim-scoped functions (FIX #2).
- No new RBAC model (FIX #4).
- Use repo's existing event payload field convention (FIX #3).
- Inngest failure-handler API verified before coding (FIX #1).

---

## Done Criteria

- [ ] All 6 preconditions verified by Codex with documented findings.
- [ ] Migration applied + reversible.
- [ ] Failure handlers added only to claim-scoped functions; exclusion list documented.
- [ ] All LLM call sites wrapped with `callClaudeWithCostGuard`.
- [ ] Wrapper verified to NOT call cost-recording RPC (no-double-count test passes).
- [ ] Admin retry endpoint implemented per chosen auth pattern (or returns 403 with TECH_DEBT 11x).
- [ ] D-027 and D-028 added to `docs/DECISIONS.md`.
- [ ] TECH_DEBT 11w added (upload conflict deferral). 11x added if no admin pattern.
- [ ] sprint002d.2 spec file added to `docs/management/sprints/`.
- [ ] All unit + integration tests passing.
- [ ] PR description documents:
  - Inngest failure-handler API used (verified per Precondition #4).
  - Event payload field convention (verified per Precondition #5).
  - Admin auth pattern used (verified per Precondition #6).
  - Current claims.status CHECK before/after.
  - Current audit_log.action CHECK before/after (if applicable).
  - List of LLM call sites wrapped + cost-recording paths confirmed unchanged.
  - List of Inngest functions modified + exclusion list (non-claim-scoped).
- [ ] CEO approves merge.
- [ ] Smoke gate (separate) — CEO authorizes non-prod smoke.
- [ ] Post-smoke: SPRINT-003A unblocked.

---

## Version

sprint002d — iteration 2 (v1.1) — 06/05/2026
**Filename:** `sprint002d.2_errored_costcap_06_05.md`
**Status:** Implementation-ready after CEO GPT precision review.
**Predecessor:** v1.0 (iteration 1) — superseded due to 5 unverified API/convention assumptions.
**Next step:** CEO GPT confirms v1.1 closes all 5 blockers → produces Codex handoff after SYNC-001 + PR #62 merged → Codex precondition checks → implementation.
