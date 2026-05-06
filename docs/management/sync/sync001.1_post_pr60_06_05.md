# Sync Package — Post PR #60

**Date:** 06/05/2026
**Identifier:** SYNC-001
**Iteration:** 1
**Purpose:** Bring repo state documentation into alignment with reality after PR #60 merged. Codex handoff ready package for CEO GPT to dispatch.

---

## Context

PR #60 merged: SPRINT-002C (validation layers 11.1-11.3) shipped. main HEAD = `828e16ef3e04a66fff85a67611fc4fa40ab6ef6d`.

Outdated documentation:

- `docs/CURRENT_STATE.md` — still shows SPRINT-002C as active.
- `docs/DECISIONS.md` — ends at D-019 (sprint methodology, PR #51). 7 new decisions (D-020-D-026) made during planning are not committed.
- `docs/TECH_DEBT.md` — entry 11q (hard cost cap V2) not added.

This sync PR fixes documentation drift. **No runtime code changes.** No migrations. No spec changes.

---

## Section 1 — `docs/CURRENT_STATE.md` Replacement Text

Replace the entire SPRINT status section with:

```markdown
## Current Sprint Status

**SPRINT-002C — Cross-Document Validation Layers (11.1-11.3)** — DONE

- Merged: PR #60 → main
- Merge commit: `828e16ef3e04a66fff85a67611fc4fa40ab6ef6d`
- Scope shipped: layer 11.1 (name_match), 11.2 (date validation), 11.3 (currency validation)
- Migration: `claim_validations` table created
- Inngest events: `claim/extraction.completed`, `claim/validation.completed`
- Handler: `run-validation-pass`
- FX provider: FakeExchangeRateProvider default; FetchExchangeRateProvider implemented but disabled
- Out of scope (deferred): 11.4 authenticity, 11.5 anomaly

**SPRINT-DESIGN-001 — Pipeline State Machine + Sync Contracts** — DESIGN COMPLETE

- Document: `docs/specs/design001.6_state_machine.md` (current iteration)
- Status: target spec. Partially aligned with PR #60. Audit pending (AUDIT-001).
- Audit will identify gaps between spec and main; gaps become SPRINT-002D items or TECH_DEBT.

**SPRINT-DESIGN-002 — Synthesis Layer Decomposition** — IN PLANNING

- Status: skeleton spec drafted (`design002.1_synthesis_decomposition_06_05.md`).
- Iteration 1 to expand after AUDIT-001 outputs.

**SPRINT-003A — Synthesis Data Model** — READY FOR PLANNING (blocked behind DESIGN-002)

---

## Recent Merges

| PR  | Title                                       | Merge SHA   | Date       | Notes                    |
| --- | ------------------------------------------- | ----------- | ---------- | ------------------------ |
| #60 | SPRINT-002C: validation layers 11.1-11.3    | `828e16ef…` | TBD        | Smoked + merged          |
| #59 | SPRINT-002C verification report             | TBD         | TBD        | Pre-implementation audit |
| #58 | PLAN-OVERVIEW verification                  | `df5de0c7…` | 04/05/2026 | Documentation            |
| #57 | .gitignore for .claude/, .diag/             | TBD         | 04/05/2026 | Tooling                  |
| #56 | Post-merge retro for SPRINT-002B            | TBD         | 04/05/2026 | ANTI-PATTERNS #8, #9     |
| #52 | SPRINT-002B: 7 normalized extraction routes | `f2a7fc08…` | 04/05/2026 | 9/9 docs smoke pass      |

(Codex fills exact SHAs and dates from git log when applying this update.)

---

## Open PRs

- #47 — Record OpenClaw Slack routing blocker (informational, no code).
```

(Replace existing fields in `docs/CURRENT_STATE.md` with the above. Codex preserves any sections in CURRENT_STATE.md not listed here — e.g., contact info, env config — unchanged.)

---

## Section 2 — `docs/DECISIONS.md` Additions

Append the following 7 decisions to the end of `docs/DECISIONS.md`. **Do NOT modify existing D-001 through D-019.**

```markdown
---

## D-020 — Single-Pass MVP, Iterative Deferred

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
Architecture Review (06/05/2026) identified that D-004 (3-pass iterative pipeline with Gap Identifier) was documented but never implemented. Six months of work shipped a single-pass architecture: extraction → validation → synthesis. Continuing to claim "iterative" creates drift between docs and reality.

**Decision:**
MVP is single-pass. Pass 1 = extraction (per-document). Pass 2 = validation (claim-level, SPRINT-002C). Pass 3 = synthesis (claim-level, SPRINT-003A). No Pass 2/3 iteration. No gap-fill loop. No stop-conditions on iteration count.

**Reasoning:**
- The architecture as built is single-pass. Acknowledging it removes drift.
- Iterative pipeline solved a problem (uncertainty under sparse data) that hasn't materialized in our usage. Validation + synthesis cover the use cases without iteration.
- Re-cycle through `pending_info → documents_open` exists for one purpose: claimant uploads new docs after gap identified, system re-extracts. NOT iteration over the same document set.

**Trade-offs accepted:**
- Lose theoretical advantage of multi-pass refinement.
- README "Iterative Pipeline" section becomes V2 appendix.

**Revisit when:**
- Pilot shows synthesis produces unstable findings on borderline cases that an additional pass would stabilize.
- Customer feedback explicitly demands re-extraction with synthesis context.

**Supersedes:** D-004.

---

## D-021 — 3-Chat Operating Structure

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
D-005 specified 7 chats (CEO, PM, Designer, 2 Builders, KB, QA). In practice the project has run with 3 active chats: CEO Claude (planner), CEO GPT (gatekeeper / handoff writer), Codex (executor). Documentation referencing 7 chats creates planning ambiguity ("who reviews UI?", "who builds KB?").

**Decision:**
Active chats are CEO Claude, CEO GPT, Codex. Designer / KB / QA / PM / Researcher chats not opened. A separate Systems Architect chat may engage cross-chat for design review on demand. User performs human approval at gates.

**Reasoning:**

- 6 months of operation show 3 chats sufficient.
- Design System (D-011) folded into Codex.
- KB content is built ad-hoc by CEO when needed.
- QA is Codex test-writing + CEO smoke approval.

**Trade-offs accepted:**

- Less specialization per role.
- Roles can be added later as new D-XXX if pattern shifts.

**Revisit when:**

- Project grows beyond solo + 3 chats.
- Specialized expertise (e.g., security audit) becomes recurring need.

**Supersedes:** D-005.

---

## D-022 — Skip 7 Additional Routes from #03ד-2 for MVP

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
Original plan #03ד-2 specified 14 normalized extraction routes. SPRINT-002B (PR #52) shipped 7 priority routes. Remaining 7 routes are open question Q17.1 in plan_overview.

**Decision:**
The 7 routes from SPRINT-002B are sufficient for MVP. Remaining 7 routes NOT built. All other subtypes route through `broad_fallback`. If product evidence shows broad_fallback inadequate for specific subtypes, individual routes added later as targeted sprints.

**Reasoning:**

- SMOKE-002B-RETRY-005 confirmed broad_fallback works (e.g., pharmacy_receipt → fallback → receipt extraction OK).
- Building 7 more routes = 1-2 weeks blocking validation/synthesis.
- Routes are additive on demand; layers are foundational and gate everything downstream.

**Trade-offs accepted:**

- broad_fallback may produce coarser extraction for non-priority subtypes.
- TECH_DEBT entry: "broad_fallback adapter for validation layer enrichment" (already noted).

**Revisit when:**

- Smoke or pilot evidence shows broad_fallback insufficient for specific subtype.
- Customer requests specific document type with normalized output.

**Supersedes:** none.

---

## D-023 — Production Hardening Conditional on First Pilot LOI

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
Architecture Review identified production-hardening gaps: data residency (Israel), DPIA, RBAC, monitoring/alerting, backup/DR, virus scanning, service_role rotation. Each is real work. Prioritization question: build before LOI or after?

**Decision:**
Production-hardening sprints DO NOT execute until a Letter of Intent from a real insurer is signed. Until then, system runs as POC: Frankfurt-region Supabase, no RBAC, manual cost tracking, no alerting beyond Inngest defaults.

**Reasoning:**

- Building production-hardening for a system without a paying customer is premature optimization.
- Customer Discovery (Track 2, owner = User) is the gating activity.
- "Demo ready" = synthesis MVP + adjuster UI MVP. "Pilot ready" = +production hardening + LOI.

**Trade-offs accepted:**

- If LOI comes urgently, hardening adds 4-6 weeks before pilot start.
- Demo without hardening shows "shape of product", not "pilot-ready system".

**Revisit when:**

- First LOI signed.
- Insurer prospect requires hardening evidence as precondition for evaluation.

**Supersedes:** none.

---

## D-024 — pass_number Semantics

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
The `passes` table tracks LLM cost and lifecycle per pass. D-016 used `pass_number` ambiguously across documents and claims. SPRINT-002C v2.2 needed clear semantics.

**Decision:**
`pass_number` is fixed per stage:

- 1 = extraction (per-document, claim-level rollup row exists)
- 2 = validation (claim-level)
- 3 = synthesis (claim-level)

UNIQUE constraint on `(claim_id, pass_number)`. UPSERT on conflict. Re-cycles via `pending_info → documents_open` reuse the same pass_number row (status flips to in_progress, started_at updated, completed_at nulled).

**Reasoning:**

- Single-meaning per number simplifies SQL queries (e.g., synthesis reads `WHERE pass_number=2`).
- Re-cycles preserve cost history per stage instead of inflating row count.

**Trade-offs accepted:**

- Lose ability to track multiple passes of same stage as separate rows.
- Cost accumulates within row; recovery requires reading audit log.

**Revisit when:**

- Iterative pipeline returns (V2 per D-020 revisit clause).

**Supersedes:** D-016 (pass numbering scheme).

---

## D-025 — `extracting` State Removed from Claim Vocabulary

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
Earlier design assumed claim moved through `documents_open → extracting → extraction_complete`. Implementation diverged: extraction runs per-document while claim stays in `documents_open`. The claim-level `extracting` state was never used.

**Decision:**
Claim status vocabulary does NOT include `extracting`. Per-document extraction status is in `documents.processing_status`. Claim-level transition is `documents_open → extraction_complete` (Pass-1 finalizer triggered on submit/timeout/all-terminal).

**Reasoning:**

- Aligns vocabulary with shipped reality.
- No SPRINT-MIGRATE needed (state never existed in production data).

**Trade-offs accepted:**

- Adjuster UI cannot distinguish "documents being processed" vs "awaiting upload" via claim state. Resolved via document-level UI sub-states (per design001.6 F.1).

**Revisit when:**

- Claim-level extraction batching becomes a thing.

**Supersedes:** any earlier doc that listed `extracting` as a claim state.

---

## D-026 — `errored` State Distinct from `rejected`

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
System failures (Inngest function exceeds retry budget, DB constraint violation, LLM API down) are different from business decisions to reject a claim. Conflating them as `rejected` loses recoverability — recoverable errors get treated as terminal.

**Decision:**
Claim vocabulary includes both:

- `errored`: system failure. Recoverable via admin retry. Last good state derived from `passes` table.
- `rejected`: business decision (admin or system rule). Terminal.

**Reasoning:**

- Distinguishes recoverable from terminal failures.
- Admin can retry `errored` claims after fixing underlying issue.
- Audit log preserves error class for post-mortem.

**Trade-offs accepted:**

- One more state to enforce in CHECK constraint and UI banners.

**Revisit when:**

- Production data shows `errored` rarely used (suggests over-engineering).

**Supersedes:** none (new addition).
```

---

## Section 3 — `docs/TECH_DEBT.md` Addition

Append the following entry:

```markdown
---

### 11q — Hard Cost Cap via Postgres Atomic Function

**Current state (MVP):** soft cap with concurrency-induced tolerance. Target $2.00 per claim, effective range $1.50-$2.50 due to Inngest concurrency cap of 5 (max 5 concurrent LLM calls × ~$0.10 each = $0.50 worst-case overrun).

**Implementation:** `callClaudeWithCostGuard` wrapper checks `total_llm_cost_usd` before each call, throws `CostCapHaltError` (extends `NonRetriableError`) if cap reached. Race condition: concurrent calls can all pass guard at $1.95 → all settle → total $2.45. Acceptable for MVP.

**Future requirement (V2):** atomic increment-and-check via custom Postgres function or `SELECT ... FOR UPDATE` on claims row. One DB round-trip per LLM call, no race possible.

**Trigger to implement:**

- Production cost spike where soft-cap tolerance exceeds business tolerance, OR
- Regulatory requirement for hard caps, OR
- Pricing per claim becomes per-cent-sensitive.

**Owner:** CEO.
**Estimated work:** 0.5-1 day Postgres function + Inngest wrapper integration + tests.
**Reference:** design001.6 Section H.1.
```

---

## Section 4 — Codex Handoff Instructions (for CEO GPT)

**Sprint:** SYNC-001
**Branch:** `sync/post-pr60-docs`
**Type:** documentation only
**Risk:** zero (no runtime code)

**Tasks:**

1. Create branch from main HEAD (`828e16ef…`).
2. Apply Section 1: replace SPRINT status section in `docs/CURRENT_STATE.md`. Preserve unrelated sections.
3. Apply Section 2: append D-020 through D-026 to `docs/DECISIONS.md`. Verify D-019 unchanged.
4. Apply Section 3: append 11q entry to `docs/TECH_DEBT.md`.
5. Verify D-019 in DECISIONS.md still reads as "Split Extraction Work Into Contract-First And Route-Implementation Spikes" (unchanged).
6. Open PR with title: `[SYNC-001] Documentation sync post PR #60`.
7. PR description: this package's "Context" section + list of modified files.
8. Smoke not required (documentation only).
9. Merge after CEO approval.

**Done Criteria:**

- 3 files modified, no other.
- D-001 through D-019 byte-identical to pre-PR.
- D-020 through D-026 added in repo format above.
- CURRENT_STATE.md SPRINT section reflects post-PR-#60 reality.
- TECH_DEBT.md gets 11q entry.

---

## Version

sync001 — iteration 1 — 06/05/2026
**Filename:** `sync001.1_post_pr60_06_05.md`
**Next step:** CEO GPT consumes this package, writes formal Codex handoff prompt, dispatches to Codex.
