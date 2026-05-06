# SUPERSEDED — see ../sync/sync001.1_post_pr60_06_05.md Section 2 for correct D-020-D-026 numbering. This file used D-019 incorrectly (collision with existing D-019 = sprint methodology, PR #51). Kept for planning history reference only.

---

# CEO Decisions Package — Post Architecture Review

**Date:** 06/05/2026
**Authority:** CEO chat decisions, executed without per-item confirmation
**Predecessor:** Architecture Review v1.0 (06/05/2026)

---

# Part 1 — 4 Formal Decisions

## D-019 — Single-Pass MVP, Iterative Deferred

**Decision:** MVP is single-pass. Pass 1 = extraction. Pass 2 = validation (SPRINT-002C). Pass 3 = synthesis (SPRINT-003A). No Pass 2/3 iteration. No gap-fill loop. No stop-conditions.

**Rationale:** Architecture Review identified that D-004 (3-pass iterative) is documented but not implemented. 6 months of work, single-pass throughout. Continuing to pretend iterative is the architecture creates drift between docs and reality.

**Implications:**

- `passes` table stays. Used for accounting (cost per pass) + lifecycle tracking. Not used for iteration.
- README.md "Iterative Pipeline" section moves to "Future / V2" appendix.
- No "Pass 2 retry" / "Pass 3 retry" logic anywhere.
- `claim.status = pending_info` exists for one purpose only: synthesis identifies missing docs → claimant uploads → re-trigger extraction. Not iteration.

**Supersedes:** D-004 (iterative pipeline 3-pass).

---

## D-020 — 3-Chat Operating Structure

**Decision:** Active chats are CEO (Chat 1), PM (Chat 2-B), Codex (Chat 4). Designer / KB / QA / Researcher chats not opened. Documentation referring to "7 chats" updated to reflect actual operating structure.

**Rationale:** D-005 specified 7 chats. In practice 3 work. Pretending 4 more exist creates planning ambiguity ("who reviews UI? who builds KB?").

**Implications:**

- Designer work folded into Codex (Codex is de-facto Design System per D-011).
- KB content built by CEO ad-hoc when needed, not as separate role.
- QA work folded into Codex test-writing + CEO smoke approval.
- If ever needed: roles can be added later with new D-XXX. Default is 3.

**Supersedes:** D-005 (7-chat structure).

---

## D-021 — Skip 7 Additional Routes from #03ד-2 (MVP)

**Decision:** The 7 normalized extraction routes shipped in SPRINT-002B (PR #52) are sufficient for MVP. The remaining 7 routes originally planned in #03ד-2 are NOT built. All other subtypes route through `broad_fallback`. If product evidence shows broad_fallback inadequate for specific subtypes, individual routes can be added later as targeted sprints.

**Rationale:** Plan-overview Q17.1 left this open. Smoke results show broad_fallback works (pharmacy_receipt → fallback → receipt extraction = OK). Building 7 more routes = 1-2 weeks. Validation/synthesis layers blocked behind. Routes can be added on demand; layers cannot.

**Implications:**

- Closes Q17.1 from plan-overview.
- TECH_DEBT entry added: "broad_fallback adapter for validation layer enrichment" (already noted in SPRINT-002C).
- No new sprints labeled #03ד-2.

---

## D-022 — Production Hardening Conditional on First Pilot LOI

**Decision:** Production-hardening sprints (data residency migration, DPIA, RBAC, monitoring/alerting, backup/DR procedures, virus scanning, service_role rotation) do NOT execute until a Letter of Intent from a real insurer is signed. Until then, the system runs as POC: Frankfurt-region Supabase, no RBAC, manual cost tracking, no alerting beyond Inngest defaults.

**Rationale:** Each item is real but expensive. Building production-hardening for a system without a paying customer is premature optimization. Closes Q17.2 (demo readiness criterion = "first insurer LOI", not arbitrary date).

**Implications:**

- Architecture Review's "Top Gap #4" (monitoring/alerting) deferred.
- Architecture Review's "Production Readiness" section deferred entirely.
- Customer Discovery (Track 2, manual, owner = human user) is the gating activity.
- Q17.2 closed: "demo ready" = synthesis MVP + adjuster UI MVP. "Pilot ready" = +production hardening + LOI.
- Q17.3 (UI adjuster in MVP) closed YES — required for demo. Spec'd in SPRINT-UI-001 below.

---

# Part 2 — Revised Sprint Sequence

```
[NOW]
  ↓
SPRINT-DESIGN-001  Pipeline State Machine + Sync Contracts        [2-3 days, design only]
  ↓
SPRINT-DESIGN-002  Synthesis Layer Decomposition                   [2 days, design only]
  ↓
SPRINT-002C        Validation Layers 11.1-11.3                     [implementation, ~1 week]
  ↓
SPRINT-003A...N    Synthesis (decomposed per DESIGN-002)           [multi-sprint, est. 4-8 weeks]
  ↓
SPRINT-UI-001      Adjuster Brief View MVP                         [4-5 days]
  ↓
[DEMO READY]
  ↓
[Customer Discovery in parallel — owner: human user, 5 conversations]
  ↓
[FIRST LOI SIGNED]
  ↓
SPRINT-PROD-BLOCK  Production Hardening                            [4-6 weeks]
SPRINT-RESIDENCY   AWS Israel migration                            [4-6 weeks, may run parallel]
  ↓
[PILOT READY]
```

**Track 2 (parallel to Track 1, owner = human user, not blocked by code):**

- Customer Discovery: 5 conversations with travel-insurance claims handlers in Israeli insurers. Output: validation report. Updates D-001 / D-002 / D-006. Should run during DESIGN sprints and 002C.

**Out of scope until LOI:** insurer_pull integration, multi-tenant infrastructure, SOC 2 prep, all enterprise features.

---

# Part 3 — SPRINT-DESIGN-001 Specification

**Identifier:** SPRINT-DESIGN-001
**Type:** Design only. No code, no migrations, no tests, no PRs against runtime.
**Output:** ONE document — `docs/specs/pipeline_state_machine_06_05_v1_0.md`
**Owner:** CEO writes draft → PM reviews → Codex implements references in subsequent sprints.

## 3.1 Goal

Define explicitly:

1. The set of claim states.
2. The set of allowed transitions, who triggers each, and what data must be true for the transition to fire.
3. The synchronization contract between extraction → validation → synthesis layers.
4. The compensation policy when an upstream value changes after a downstream layer ran.
5. The read-consistency model for the adjuster UI.

## 3.2 Required Sections in Output Document

### Section A — Claim State Vocabulary

Closed list of `claim.status` values. Proposed (subject to refinement during write):

- `intake` — claim row created, no documents yet.
- `documents_open` — uploads accepted.
- `extracting` — pass 1 in progress.
- `extraction_complete` — all documents terminal, pass 1 closed.
- `validating` — pass 2 in progress.
- `validation_complete` — 3 layers terminal, pass 2 closed.
- `synthesizing` — pass 3 in progress.
- `ready` — synthesis terminal, available for adjuster.
- `pending_info` — synthesis flagged missing data, awaiting claimant.
- `cost_capped` — exceeded $2 LLM budget, halted.
- `rejected` — admin/system rejected (out of scope, abuse, etc.).

DB CHECK constraint added in migration tracking this enum.

### Section B — Transition Rules

For each transition: `from → to | trigger | preconditions | side effects`.

Required transitions to specify:

- intake → documents_open
- documents_open → extracting (claimant submits OR system timeout — define which)
- extracting → extraction_complete (pass-1 finalizer per SPRINT-001)
- extraction_complete → validating (event `claim/extraction.completed`)
- validating → validation_complete (validation handler finalizer)
- validation_complete → synthesizing (event `claim/validation.completed`)
- synthesizing → ready (synthesis finalizer)
- ready → pending_info (adjuster requests more info OR synthesis flagged at output)
- pending_info → extracting (claimant uploads new doc — restart pass 1 ONLY for new docs)
- any → cost_capped (cost trigger crosses $2)
- any → rejected (admin action)

### Section C — Sync Contracts

For each layer pair (extraction↔validation, validation↔synthesis):

- **Read contract:** which fields the downstream layer reads, exact JSON paths, how staleness is detected.
- **Lock contract:** does the downstream layer block upstream changes? If yes, how. If no, how staleness is handled.
- **Idempotency:** if the downstream layer runs twice on the same upstream snapshot, does it produce the same output? If not, why.

### Section D — Race Condition Policies

Specific scenarios with explicit answers:

1. **Document uploaded during `extracting`:** options are (a) reject upload, (b) queue and process after current pass terminates, (c) join current pass. CEO selects ONE; document the other two and why rejected.
2. **Document uploaded during `validating`:** options are (a) reject, (b) queue for next cycle, (c) abort validation and restart. Select ONE.
3. **Document uploaded during `synthesizing`:** same options. Select ONE.
4. **Claim_form mutated during processing:** is it allowed? If yes, what triggers re-processing?
5. **Concurrent retries on same document (Inngest replay):** how is duplicate processing prevented?
6. **Adjuster opens claim during processing:** what does adjuster see? Snapshot from which point?

### Section E — Compensation Policy

If a layer's output is later determined incorrect (manual override, bug fix, late-arriving data):

- Does the system auto-recompute downstream layers? (CEO recommendation: NO for MVP. Manual flag only.)
- Is the previous output retained or overwritten?
- What audit log entries are written?

### Section F — Read Consistency for Adjuster UI

When adjuster views a claim:

- Live data or snapshot? (CEO recommendation: snapshot at most-recent terminal state. If processing, show "still processing" placeholder.)
- If claim is in `pending_info`, what is shown?
- Are partial results visible (e.g., 3 of 9 docs extracted)?

### Section G — Open Questions for PM Review

The CEO draft will mark items where the right answer is unclear. PM resolves or escalates back.

## 3.3 What This Spec Does NOT Do

- Does not write code. Does not modify migrations. Does not change Inngest handlers.
- Does not specify implementation of state transitions (that comes in subsequent sprints).
- Does not address cost-capping logic in detail (out of scope, separate spike).
- Does not address `pending_info` UX flow (separate, in SPRINT-UI-001).

## 3.4 Done Criteria

- All 7 sections present in output document.
- All transitions in Section B have non-ambiguous triggers and preconditions.
- All 6 race scenarios in Section D have explicit decisions, not "TBD".
- PM has reviewed and signed off.
- Subsequent sprints (002C, 003A) reference this document for sync semantics.

## 3.5 Estimated Time

Writing: 1-2 days. PM review + revision: 1 day. Total: 2-3 days.

---

# Part 4 — Immediate Next Actions

1. **CEO writes SPRINT-DESIGN-001 output** (`pipeline_state_machine_06_05_v1_0.md`) starting next turn. Estimate: 1 long output, possibly split across 2 turns.
2. **PM reviews** when draft complete.
3. **In parallel — human user (Track 2):** schedule first 1-2 customer discovery conversations. Owner: vov directly. Not blocking Track 1.
4. **SPRINT-002C handoff PAUSED** until DESIGN-001 complete. v2.2 spec stays in repo as `docs/specs/sprint-002c-layers-11-1-to-11-3-06-05-v2-2.md`. Will be updated to reference DESIGN-001 sync contracts before Codex implementation.
5. **DECISIONS.md updated** with D-019 through D-022 in next dedicated docs PR.

---

# Part 5 — What Was Considered And Rejected

The Architecture Review identified 14 items. Decisions on what's NOT being acted on now:

- **Insurer Pull Integration** — deferred to post-LOI (D-022).
- **Brief Generation as separate sprint** — folded into SPRINT-DESIGN-002 decomposition.
- **Process Institutionalization (CI checks for anti-patterns)** — backlogged. Manual PM discipline acceptable while team is 3 chats.
- **Test Fixtures completion (22 missing)** — backlogged. Add as SPRINT-DATA-001 after synthesis MVP. Synthetic data not blocking development.
- **D-007 (Claude API for OCR) revisit** — keep as is. Re-examine when monthly LLM cost > $1000.
- **D-003 (Layer 7 deferred)** — keep deferred. Not relevant until insurer interest.
- **Standalone vs CMS Integration revisit** — defer to post-LOI. Insurer's preference will dictate.

These are tracked in TECH_DEBT but do not get sprint allocation in current planning horizon.

---

## Version

CEO_DECISIONS_PACKAGE v1.0 — 06/05/2026
**Status:** Decisions effective immediately. CEO begins SPRINT-DESIGN-001 next turn.
