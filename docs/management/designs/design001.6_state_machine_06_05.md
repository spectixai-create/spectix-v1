# Pipeline State Machine + Sync Contracts v1.5 (iteration 6)

**Date:** 06/05/2026
**Identifier:** SPRINT-DESIGN-001
**Predecessor:** v1.4 (06/05/2026, iteration 5) — superseded after Architect approved with conditional sign-off pending 3 mandatory additions + 6 polish.
**Status:** CEO revision incorporating all Architect v1.4 items. Ready for final Architect sign-off.

---

## Changes From v1.4

### Architect mandatory additions

| #   | Change                                                                                                                               | Location      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| A1  | Done Criteria: User confirms D-019 content via direct DECISIONS.md file inspection (30 seconds, removes conditional sign-off).       | Done Criteria |
| A2  | Done Criteria gating: DECISIONS.md updates (D-020 through D-026) committed BEFORE SPRINT-002C implementation begins. Prevents drift. | Done Criteria |
| A3  | K.6 wording: "CEO maps each value to target state with rationale." Mapping = domain knowledge, not Codex output.                     | Section K.6   |

### Architect polish

| #   | Change                                                                                                | Location    |
| --- | ----------------------------------------------------------------------------------------------------- | ----------- |
| A4  | K.4: action trigger if concurrency cap differs from 5.                                                | Section K.4 |
| A5  | Section I: add "Admin UI for cap override" as out-of-scope item.                                      | Section I   |
| A6  | D.8 reference clarified: "See Section F.1 + F.3."                                                     | Section D   |
| A7  | Audit log convention: add `pass_id?` field alongside `pass_number?`.                                  | Section H.2 |
| A8  | K.3: restore "Document delta" instruction from v1.2 (regression fix).                                 | Section K.3 |
| A9  | Filename convention applied: `design001.6_state_machine_06_05.md` per CEO/User decision in this chat. | Filename    |

---

## Section A — Claim State Vocabulary

11 states with DB CHECK constraint:

| Value                     | Meaning                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `intake`                  | Claim row exists. Form data only. No documents uploaded.                                                       |
| `documents_open`          | At least one document uploaded. Per-document extraction may be running. New uploads accepted.                  |
| `extraction_complete`     | Pass-1 finalizer fired: all documents terminal, at least one `processed`, claimant submit OR timeout received. |
| `validating`              | Pass 2 running. Validation layers in progress. New uploads rejected.                                           |
| `validation_complete`     | Pass 2 terminal. All 3 layers reached terminal status.                                                         |
| `synthesizing`            | Pass 3 running. New uploads rejected.                                                                          |
| `ready`                   | Synthesis terminal, no gaps flagged. Available for adjuster.                                                   |
| `pending_info`            | Synthesis flagged missing data. Awaiting claimant action.                                                      |
| `cost_capped`             | Total LLM cost ≥ $2/claim. Processing halted.                                                                  |
| `errored` (per **D-026**) | System failure. Recoverable via admin retry.                                                                   |
| `rejected`                | Business decision: claim invalid (admin or system rule). Terminal.                                             |

Migration K.6 (legacy mapping) handled by Codex pre-implementation + CEO approval.

---

## Section B — Transition Rules

### B.1 — Forward path

| #   | Transition                             | Trigger                                       | Preconditions                                                                                                                                                                                                                                                                                                         | Side Effects                                                                                                                                                |
| --- | -------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `intake → documents_open`              | First successful document upload              | Claim row exists with form data. Upload accepted by API.                                                                                                                                                                                                                                                              | Document row inserted. Audit `claim_documents_open`.                                                                                                        |
| 2   | `documents_open → extraction_complete` | Pass-1 finalizer                              | (a) Submit signal — whichever fires first: **(i)** Claimant submitted UI button, OR **(ii)** 1h elapsed since last successful upload AND no document with `processing_status='processing'`, OR **(iii)** 72h elapsed since first upload. AND (b) all documents terminal. AND (c) at least one document = `processed`. | Audit `claim_extraction_completed`. Inngest event `claim/extraction.completed`. UPSERT passes row `(claim_id, pass_number=1)` SET status='completed'.       |
| 3   | `extraction_complete → validating`     | Inngest handler `run-validation-pass`         | Event received.                                                                                                                                                                                                                                                                                                       | UPSERT passes row pass_number=2 SET status='in_progress', started_at=now(), completed_at=NULL. Audit `claim_validation_started`.                            |
| 4   | `validating → validation_complete`     | Validation handler finalizer                  | All 3 layers terminal in `claim_validations`.                                                                                                                                                                                                                                                                         | UPSERT passes row pass_number=2 SET status='completed', completed_at=now(). Audit `claim_validation_completed`. Inngest event `claim/validation.completed`. |
| 5   | `validation_complete → synthesizing`   | Inngest handler `run-synthesis-pass` (future) | Event received.                                                                                                                                                                                                                                                                                                       | UPSERT passes row pass_number=3 SET status='in_progress'. Audit `claim_synthesis_started`.                                                                  |
| 6   | `synthesizing → ready`                 | Synthesis finalizer                           | Synthesis terminal, no gaps flagged.                                                                                                                                                                                                                                                                                  | UPSERT passes row pass_number=3 SET status='completed'. Audit `claim_synthesis_completed`.                                                                  |
| 7   | `synthesizing → pending_info`          | Synthesis finalizer                           | Synthesis terminal, gaps flagged.                                                                                                                                                                                                                                                                                     | UPSERT passes row pass_number=3 SET status='completed'. Audit `claim_pending_info`.                                                                         |

**Per D-024:** all passes mutations are UPSERT with `ON CONFLICT (claim_id, pass_number) DO UPDATE`. Re-cycles via `pending_info → documents_open` reuse the same pass_number row.

### B.2 — Recovery path

| #   | Transition                                        | Trigger                                       | Preconditions                                                                                                         | Side Effects                                                                                       |
| --- | ------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 8   | `pending_info → documents_open`                   | Claimant uploads new document                 | Claim in `pending_info`.                                                                                              | Document row inserted. Existing extracted_data preserved. Audit `claim_recycle_to_documents_open`. |
| 9   | `documents_open → extraction_complete` (re-cycle) | Pass-1 finalizer (B.1 row 2)                  | Same as B.1 row 2. **Re-extraction scope:** only documents with `created_at > previous_pass_completed_at` re-process. | Same as B.1 row 2. Existing pass_number=1 row UPSERTed.                                            |
| 10  | `pending_info → ready`                            | Adjuster manual override OR claimant declines | Adjuster action.                                                                                                      | Audit `claim_pending_info_resolved`.                                                               |

### B.3 — System failure path (per D-026)

| #   | Transition                     | Trigger                 | Preconditions                                                                                        | Side Effects                                                                            |
| --- | ------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 11  | `(any active state) → errored` | System failure detected | Inngest function failure exceeds retry budget, DB constraint violation, LLM API down for >X retries. | Audit `claim_errored` with error class + last successful pass_number. Pause processing. |
| 12  | `errored → (last good state)`  | Admin retry action      | Admin authorization. Error condition resolved.                                                       | Audit `claim_error_recovered`. Resume from last terminal pass.                          |
| 13  | `errored → rejected`           | Admin gives up          | Admin decision.                                                                                      | Audit `claim_rejected_after_error`.                                                     |

**"Last good state" derivation rule (Row 12):**

```sql
SELECT pass_number FROM passes
WHERE claim_id = $1 AND status = 'completed'
ORDER BY pass_number DESC LIMIT 1;
```

Mapping:

- No completed passes → `documents_open`
- pass_number=1 completed → `extraction_complete`
- pass_number=2 completed → `validation_complete`
- pass_number=3 completed → `ready` if no gaps in last `claim_synthesis_completed` audit; else `pending_info`

### B.4 — Terminal failure paths

| #   | Transition                                     | Trigger                                 | Preconditions                                                  | Side Effects                                                           |
| --- | ---------------------------------------------- | --------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 14  | `(any LLM-using active state) → cost_capped`   | Cost guard wrapper around LLM call      | `total_llm_cost_usd ≥ 2.00` evaluated before call.             | Throw CostCapHaltError (NonRetriableError). Audit `claim_cost_capped`. |
| 15  | `cost_capped → ready`                          | Admin override: raise cap               | Admin authorization with new cap value.                        | Audit `claim_cost_cap_raised`. Resume.                                 |
| 16  | `cost_capped → rejected`                       | Admin gives up                          | Admin decision.                                                | Audit `claim_rejected_at_cap`.                                         |
| 17  | `documents_open → rejected`                    | Pass-1 finalizer with failure condition | All documents terminal AND zero documents reached `processed`. | Audit `claim_rejected_all_blocked`.                                    |
| 18  | `(any state except ready/rejected) → rejected` | Admin action                            | Admin authorization.                                           | Audit `claim_rejected_admin`.                                          |

### B.5 — Forbidden transitions

Anything not listed in B.1-B.4 is forbidden. App-level enforcement for MVP. SQL audit script (Section H.4) detects drift.

---

## Section C — Sync Contracts

### C.1 — Extraction → Validation

**Read contract:**

- Validation reads `documents` filtering `extracted_data->>'kind' = 'normalized_extraction'`.
- Field paths: `extracted_data.normalized_data.fields.<field_name>`. Per PR #59.
- Documents with `kind = 'extraction'` (broad fallback) skipped per **D-022**.
- Validation reads passes by `claim_id` AND `pass_number=1` AND `status=completed`.

**Lock contract:** validation runs ONLY when `claim.status = validating`. Section D forbids new uploads/mutations.

**Idempotency (per-action):**

- Insert passes row: UPSERT on `(claim_id, pass_number)`. Safe on Inngest replay.
- Insert claim_validations row: ON CONFLICT (claim_id, pass_id, layer_id) DO UPDATE.
- Update `claim.status`: guarded UPDATE — `WHERE id=$1 AND status='validating'`.
- Audit log inserts: duplicates acceptable.

**Staleness detection:** synthesis reads `WHERE pass_id = max(pass_id) FROM passes WHERE pass_number=2 AND status='completed'`.

### C.2 — Validation → Synthesis (TENTATIVE)

Speculative until SPRINT-003A. Tentative: synthesis reads claim_validations rows scoped to most recent pass_id + documents.extracted_data for citation. **C.2 will likely require substantial rewrite when SPRINT-003A spec is written.** This is acknowledged.

---

## Section D — Race Condition Policies

| #   | Scenario                                                    | Decision                                                                                                                         |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| D.1 | Document upload during `documents_open`                     | **ALLOWED.** Normal upload path.                                                                                                 |
| D.2 | Document upload during `validating`                         | **REJECT** with 409 + `estimated_completion_seconds: 60` (placeholder).                                                          |
| D.3 | Document upload during `synthesizing`                       | **REJECT** with 409 + `estimated_completion_seconds: 90` (placeholder).                                                          |
| D.4 | Document upload during `pending_info`                       | **ALLOWED.** Triggers `pending_info → documents_open`.                                                                           |
| D.5 | Upload during `extraction_complete` / `validation_complete` | **REJECT** with 409.                                                                                                             |
| D.6 | Claim form mutation                                         | **ALLOWED only** in `intake`, `documents_open`, `pending_info`.                                                                  |
| D.7 | Concurrent Inngest retries                                  | **Per-action idempotency.** UPSERT/guarded UPDATE/audit-tolerant/idempotency_key.                                                |
| D.8 | Adjuster opens claim during processing                      | **Snapshot from last terminal state with explicit banner.** See Section F.1 (snapshot model) and F.3 (partial state visibility). |

`estimated_completion_seconds` = MVP placeholders, smoke updates.

---

## Section E — Compensation Policy

**E.1-E.3:** NO auto-recompute. Manual override flag only. Audit on every override. Previous output retained (canonical = most recent).

**E.4** — findings staleness after override: affected findings flagged `stale_after_override = true`, displayed with strikethrough + warning. Synthesis re-run is manual. Implementation deferred to UX sprint.

---

## Section F — Read Consistency

### F.1 — Snapshot model

| Status                | Adjuster sees                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `intake`              | "Claim being created" — minimal claim form data.                                                                                                       |
| `documents_open`      | Claim form + document list. Sub-state UI: if any document `processing_status='processing'` → "מסמכים בעיבוד"; else "ממתין למבוטח להעלות עוד או לסיים". |
| `extraction_complete` | + per-document extraction results. "Awaiting validation" banner.                                                                                       |
| `validating`          | Same as extraction_complete + "Validation in progress" banner.                                                                                         |
| `validation_complete` | + validation layer results. "Awaiting synthesis" banner.                                                                                               |
| `synthesizing`        | Same as validation_complete + "סינתזה בעיבוד. **אל תקבל החלטה על בסיס validation בלבד**" banner.                                                       |
| `ready`               | Full view.                                                                                                                                             |
| `pending_info`        | Synthesis findings + "Awaiting claimant: <list>" banner.                                                                                               |
| `cost_capped`         | Partial results + "Cost limit reached. Manual review." banner.                                                                                         |
| `errored`             | Last completed state results + "System error: <class>. Awaiting admin." banner.                                                                        |
| `rejected`            | Read-only with reason.                                                                                                                                 |

### F.2 — Refresh policy

MVP: manual refresh. Demo: optional refresh button. Pilot: real-time (deferred per **D-023**).

### F.3 — Partial state visibility

Adjuster never sees partial pass results. `synthesizing` banner explicitly warns NOT to act on validation alone.

---

## Section G — Open Questions

**Resolved:** G.1 (timeout combined rule), G.2 (no submit gate needed per D-025), G.3 (cost cap end-of-step per H.1), G.7 (re-extraction scope per B.2 row 9).

**Still open:** G.4 (pending_info UX — UX sprint), G.5 (CHECK backfill — moved to K.6), G.6 (transition validation enforcement — app-level for MVP, SQL audit for drift).

---

## Section H — Implementation Specifications

### H.1 — Cost cap enforcement

**Soft cap with tolerance** ($1.50-$2.50 effective range due to concurrency=5). Hard cap = TECH_DEBT 11q (V2).

```typescript
import { NonRetriableError } from 'inngest';

class CostCapHaltError extends NonRetriableError {
  constructor(claim_id: string, reason: string) {
    super(`Cost cap halt for ${claim_id}: ${reason}`);
  }
}

async function callClaudeWithCostGuard(
  claim_id: string,
  callFn: () => Promise<ClaudeResponse>,
): Promise<ClaudeResponse> {
  const { total_llm_cost_usd, status } = await getClaimCostAndStatus(claim_id);

  if (
    status === 'cost_capped' ||
    status === 'rejected' ||
    status === 'errored'
  ) {
    throw new CostCapHaltError(claim_id, `non-active state: ${status}`);
  }

  if (total_llm_cost_usd >= 2.0) {
    await transitionClaim(claim_id, 'cost_capped', 'cost_threshold_reached');
    throw new CostCapHaltError(claim_id, `reached $2 cap`);
  }

  return callFn();
}
```

**Pattern:** cost-check + LLM call in same `step.run`. Transition write is guarded UPDATE (idempotent on Inngest replay).

**TECH_DEBT 11q to add:**

```markdown
### TECH_DEBT 11q — Hard cost cap via Postgres atomic function

**Current state (MVP):** soft cap with concurrency-induced tolerance ($1.50-$2.50 on $2.00 target).
**Future requirement:** atomic increment-and-check via custom Postgres function.
**Trigger:** production cost spike exceeds business tolerance, OR regulatory hard-cap requirement.
**Owner:** CEO. **Estimated work:** 0.5-1 day.
```

**Deviation rule:** if Codex proposes a different cost-cap pattern, requires Architect approval before implementation.

### H.2 — Audit log convention

Every state transition writes:

```typescript
{
  action: '<transition_name>',
  actor_type: 'system',
  actor_id: 'state-machine',
  details: {
    claim_id: string,
    from_status: string,
    to_status: string,
    trigger: string,
    pass_number?: number,
    pass_id?: string,           // NEW (A7) — when pass row exists. Enables debug/staleness reconstruction from audit log alone.
  },
  cost_usd: 0,
  created_at: timestamptz,
}
```

Admin actions: `actor_type='human'`, `actor_id=<user_id>`.

### H.3 — Claim-level watchdog HR-002

```sql
SELECT id FROM claims
WHERE status IN ('validating', 'synthesizing')
  AND updated_at < now() - interval '30 minutes';
```

For each: if pass*id row in `passes` is `in_progress` with stale `updated_at`, transition to `errored` with reason `claim_stuck_in*<state>`.

**30m threshold = MVP placeholder.** Revisit when smoke shows p95 > 60s OR 3+ false-positives in 7 days.

### H.4 — SQL state audit script

Daily:

```sql
SELECT id, status, updated_at FROM claims
WHERE status NOT IN (
  'intake', 'documents_open', 'extraction_complete', 'validating',
  'validation_complete', 'synthesizing', 'ready', 'pending_info',
  'cost_capped', 'errored', 'rejected'
);
```

Should return 0 rows. Plus drift detection via audit log query.

### H.5 — Concurrency limits per claim

Spec assumes Inngest concurrency cap of 5 per claim_id. Codex measures during SPRINT-002C smoke; if peak > 4, propose raise to 10.

### H.6 — `cost_capped` recovery

Per B.4 row 15: admin override raises cap. UX sprint adds button.

### H.7 — `archived` state (future)

Not in MVP. TECH_DEBT entry.

---

## Section I — What This Document Does NOT Specify

- Implementation of state transitions (subsequent sprints).
- pending_info notification flow (UX sprint).
- Manual override implementation (UX sprint).
- **Admin UI for cap override (UX sprint, A5).** B.4 row 15 specifies the transition; UI for triggering it is separate.
- Real-time UI refresh (deferred per D-023).
- DB trigger for transition validation (app-level for MVP).
- Migration backfilling existing claims (K.6).
- Inngest cron implementation (bundled into SPRINT-002C OR separate spike).

---

## Section J — Cross-Sprint References

**SPRINT-002C v2.2 alignment:** v2.2 already specifies pass_number=2 for validation. Aligned with **D-024**. Codex confirms during pre-flight.

**v2.3 update scope (when needed):** cron handler for combined timeout, references to C.1/D.7/H.2/H.3.

**SPRINT-003A:** uses C.2 (tentative) for synthesis-validation contract. Likely revises C.2.

**SPRINT-UI-001:** uses Section F + D.8 banners.

---

## Section K — Required Pre-Implementation Verifications

### K.1 — `passes.status` column exists

**Owner:** Codex pre-implementation.

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'passes' AND column_name = 'status';
```

**If absent:** SPRINT-002C migration:

```sql
ALTER TABLE passes ADD COLUMN status text NOT NULL DEFAULT 'in_progress';
ALTER TABLE passes ADD CONSTRAINT passes_status_valid
  CHECK (status IN ('in_progress', 'completed', 'failed'));

UPDATE passes SET status = 'completed'
WHERE started_at < now() - interval '30 minutes';
-- Rows started < 30min ago keep DEFAULT 'in_progress' (may still be running).
```

**If present:** verify CHECK allows `{in_progress, completed, failed}`. ALTER if not.

### K.2 — D-019 alignment — RESOLVED via CEO verification

**Status: RESOLVED.**

CEO verified `docs/DECISIONS.md` via project knowledge search (06/05/2026). Per `POST_V30_HISTORY.md`, D-019 = sprint methodology (PR #51), not single-pass. Resolution: renumbered single-pass MVP to D-020. D-020 supersedes D-004 directly.

**A1 follow-up:** User performs direct file inspection of `docs/DECISIONS.md` to confirm. Done Criteria item below.

### K.3 — `documents.processing_status` vocabulary

**Owner:** Codex pre-implementation.

Cite source migration. Spec assumes: `pending`, `processing`, `processed`, `failed_blocking`, `failed_non_blocking`. Verify against current migration files.

**If actual vocabulary differs:** B.1 row 2 condition (b) and B.4 row 17 trigger update accordingly. Document delta in Codex implementation PR. (A8 — restored from v1.2.)

### K.4 — Inngest concurrency cap per claim

**Owner:** Codex.

Spec assumes 5. Source: `ceo_spec_spike_03d_1a_03_05_v1_1.md` Section 13.

**Action if cap differs (A4):** if actual cap ≠ 5, H.1 worst-case cost-cap calculation must be recomputed. Document new effective range in implementation PR. Update H.1 if material.

### K.5 — Inngest SDK NonRetriableError import path

**Owner:** Codex.

```bash
cat package.json | grep inngest
node -e "const { NonRetriableError } = require('inngest'); console.log(typeof NonRetriableError);"
# Expected: 'function'
```

If import path differs: H.1 wrapper adjusted. Codex documents actual path.

### K.6 — `claims.status` backfill audit (revised — A3)

**Owner:** Codex outputs distinct values + counts. **CEO maps each value to target state with rationale.** Migration applies CEO-approved mapping.

```sql
SELECT status, count(*) FROM claims GROUP BY status ORDER BY count(*) DESC;
```

The mapping decision is **domain knowledge** (CEO understands semantics of legacy values like `created`, `processing`, `done`). Codex does not propose mappings — Codex reports state + waits for CEO mapping table. CEO approves before CHECK migration applied.

If mapping table is non-trivial (>1 legacy value), Codex opens a separate small PR for the mapping decision before SPRINT-002C migration.

---

## Done Criteria (revised — A1, A2)

Sign-off requires ALL of:

- [x] All v1.1 / v1.2 / v1.3 / v1.4 corrections incorporated.
- [x] **K.2 (D-019) verified by CEO via project_knowledge_search. RESOLVED via decision renumbering.**
- [ ] **A1: User confirms D-019 content via direct `docs/DECISIONS.md` file inspection.** Removes conditional sign-off.
- [ ] Architect final review and sign-off on v1.5.

Implementation gate (CEO authorizes after ALL of):

- [ ] **A2: D-020 through D-026 committed to `docs/DECISIONS.md` BEFORE SPRINT-002C implementation begins.** Prevents drift. Gate, not parallel item.
- [ ] Codex reports K.1/K.3/K.4/K.5/K.6 verification results.
- [ ] CEO reviews Codex verification report and authorizes implementation start.
- [ ] `docs/PM_REVIEW_CHECKLIST.md` adds section 5.13 — "Per-step idempotency strategy verification".
- [ ] `docs/TECH_DEBT.md` adds entry 11q — "Hard cost cap via Postgres atomic function".
- [ ] SPRINT-002C v2.3 spec written referencing this document (or v2.2 confirmed sufficient).
- [ ] `decisions.1_post_arch_review_06_05.md` superseded by `decisions.2_post_arch_review_06_05.md` with renumbered decisions.

---

## Version

pipeline_state_machine — iteration 6 (semantic version v1.5) — 06/05/2026
**Filename:** `design001.6_state_machine_06_05.md`
**Status:** CEO revision incorporating Architect v1.4 review (3 mandatory + 6 polish).
**Predecessor:** v1.4 (iteration 5) — 99% complete per Architect, all items addressed in v1.5.
**Next step:** User confirms D-019 (A1, 30 sec) → Architect final pass → sign-off → DECISIONS.md commits D-020-D-026 → Codex K verification → SPRINT-002C v2.3 → CEO GPT writes Codex handoff.
