# SPRINT-DESIGN-002 — Synthesis Layer Decomposition (Skeleton)

**Date:** 06/05/2026
**Identifier:** SPRINT-DESIGN-002
**Iteration:** 1
**Type:** Design only. No code, no migrations, no PRs against runtime.
**Predecessor:** SPRINT-DESIGN-001 (state machine, design001.6).

**Status:** Skeleton — open questions, not decisions. Iteration 1 captures scope, dependencies, and what needs deciding. Iteration 2+ produces actual decisions after AUDIT-001 outputs (some questions depend on what's already in main).

---

## Purpose

The synthesis layer is the most complex remaining piece. Plan_overview Section 12 lists 5 sub-items:

- 12.1 Data model (was SPRINT-003A in original plan)
- 12.2 Rules engine — 9 rules planned (R01-R09 in original README)
- 12.3 Findings generation (anomalies, gaps)
- 12.4 Clarification questions generation
- 12.5 Readiness score (Rule 07)

Shipping all 5 in one sprint = 4-8 weeks of work in a single PR. That's wrong. SPRINT-DESIGN-002 decomposes synthesis into 3-5 implementation sprints (SPRINT-003A, 003B, 003C, …) with clear scope per sprint and shared TS contracts.

This document is the **decomposition design**, not the synthesis design itself.

---

## Inputs From Other Documents

- **design001.6** Section C.2 — Validation → Synthesis sync contract (TENTATIVE). DESIGN-002 confirms or revises C.2.
- **design001.6** Section A — claim states `synthesizing`, `ready`, `pending_info`. DESIGN-002 specifies what each entry/exit condition looks like for synthesis.
- **AUDIT-001 findings** — what's actually in `claim_validations` per PR #60 (table structure, payload formats, evidence refs). Synthesis reads from this; design must align with reality.
- **Original README R01-R09 spec** — 9 rules' intended logic. DESIGN-002 decides which rules ship in MVP synthesis vs deferred.
- **plan_overview Q17.2** — "demo readiness criterion". RESOLVED per D-023 (demo ready = synthesis MVP + adjuster UI MVP). DESIGN-002 defines synthesis MVP scope.

---

## Decomposition Goals

Each implementation sprint after DESIGN-002 must satisfy:

1. **Single PR scope.** Each implementation sprint = ~1 week, single mergeable PR.
2. **Independently smokable.** A sprint output can be smoke-tested without later sprints existing.
3. **Reads stable contract.** Reads from `claim_validations` (PR #60) + `documents.extracted_data` (PR #59) without depending on later sprints' tables.
4. **Builds incremental data.** Each sprint adds one logical table or column, never restructures earlier sprint output.
5. **Validates against fixtures.** 9/31 fixtures exist; each sprint validated against subset.

---

## Open Decisions (Iteration 1 captures, Iteration 2+ resolves)

### Decision 1: Synthesis trigger and pass linkage

**Question:** Is synthesis triggered by Inngest event `claim/validation.completed` (per PR #60), or by separate UI button, or by cron?

**Inputs needed:** AUDIT-001 confirms event payload structure. design001.6 says event-triggered.

**Options:**

- A: Event-driven (current spec).
- B: Manual button (deferred to UI sprint).
- C: Hybrid — event triggers automatic synthesis, UI button can re-trigger.

**Default for iteration 2:** A. Aligns with shipped event flow.

### Decision 2: Synthesis output table structure

**Question:** Single `synthesis_results` table with jsonb payload, or split into `findings`, `questions`, `readiness_scores` separate tables?

**Inputs needed:** AUDIT-001 confirms PR #60's `claim_validations` pattern (one table, jsonb payload per layer). Consistency with that pattern argues for single table.

**Options:**

- A: Single `synthesis_results` table, jsonb payload, `kind` column distinguishes findings/questions/score.
- B: Three separate tables, normalized columns.
- C: Single table, rigid columns (e.g., `severity`, `category`, `recommendation`), no jsonb.

**Default for iteration 2:** A. Matches established pattern. Low schema risk.

### Decision 3: Rules engine structure

**Question:** How are the 9 rules (R01-R09) implemented? Code-as-rules, config-driven rules engine, or LLM-as-judge?

**Inputs needed:** Original R01-R09 spec from README. Some rules are deterministic (R05 currency check), some LLM-shaped (R09 misrepresentation).

**Options:**

- A: All rules as TypeScript functions with shared contract.
- B: Mix — deterministic rules in TS, LLM-shaped rules via prompts.
- C: Defer rules entirely, MVP synthesis is just gap identification + clarification questions.

**Default for iteration 2:** B. Most rules are deterministic; LLM only where needed for narrative judgment.

### Decision 4: MVP synthesis scope (which of R01-R09 ship)

**Question:** All 9 rules in MVP, or subset?

**Per D-020** (single-pass MVP), no iteration. Synthesis output is one-shot. Rules that work well one-shot (deterministic, anchored to validation data) ship MVP. Rules that need iteration to be useful (e.g., readiness score that improves with re-extraction) defer.

**Options to decide:**

- R01 (Coverage Check) — deterministic, MVP.
- R02 (IMEI active post-theft) — Pass 2 OSINT V2, defer.
- R03 (Police format match) — needs KB, partial MVP if 3 countries done.
- R04 (Authentication letter check) — needs LLM, MVP optional.
- R05 (Receipt cross-check) — deterministic, MVP.
- R06 (Receipt authenticity) — needs benchmarks, partial MVP.
- R07 (Readiness score) — meta-rule, MVP optional.
- R08 (Underwriting consistency) — deterministic, MVP.
- R09 (Misrepresentation) — LLM-shaped, MVP optional.

**Default for iteration 2:** R01, R05, R08 in MVP (3 deterministic, high-value). Others deferred to SPRINT-003B+ on demand.

### Decision 5: Findings vocabulary and severity

**Question:** What categories does synthesis emit? `gap`, `anomaly`, `inconsistency`, others?

**Inputs needed:** Adjuster UI requirements (SPRINT-UI-001 not designed yet). Adjuster needs categorized list to triage.

**Options:**

- A: 3 categories: `gap` (missing data), `anomaly` (unexpected pattern), `inconsistency` (contradiction across docs).
- B: Severity levels independent of category: `low`, `medium`, `high`.
- C: Both — category + severity.

**Default for iteration 2:** C. Adjuster filters by both.

### Decision 6: Clarification questions structure

**Question:** Synthesis emits questions for claimant. Structure?

**Options:**

- A: Free-text questions with optional links to specific docs.
- B: Structured: `{ question_id, text, doc_refs, expected_answer_type }`.
- C: Templates filled by rule output (e.g., "Document X is missing date Y. Please clarify.").

**Default for iteration 2:** B. Structured enables tracking + auto-validation when claimant responds.

### Decision 7: Readiness score computation

**Question:** Score = single number? Score per category? Score per rule?

**Per R07 in original spec:** single readiness percentage 0-100, with breakdown by rule. MVP can defer breakdown.

**Default for iteration 2:** single number 0-100 in MVP. Breakdown deferred.

---

## Proposed Sprint Sequence (TENTATIVE — depends on decisions above)

```
DESIGN-002 finalized
  ↓
SPRINT-003A: Synthesis data model
  ├── Migration: synthesis_results table (per Decision 2 = A)
  ├── TS contracts in lib/synthesis/types.ts
  ├── Inngest handler skeleton subscribed to claim/validation.completed
  ├── Empty handler that writes "synthesis: not implemented" placeholder result
  └── Smoke: validates pipeline end-to-end with placeholder synthesis
  ↓
SPRINT-003B: Rules engine framework + R01, R05, R08 (per Decision 4)
  ├── lib/synthesis/rules/ — rule contract + 3 implementations
  ├── Handler runs rules, writes findings to synthesis_results
  ├── Unit tests per rule + integration test
  └── Smoke
  ↓
SPRINT-003C: Findings + clarification questions generation
  ├── Findings categorization per Decision 5
  ├── Question structure per Decision 6
  ├── Output to synthesis_results.payload
  └── Smoke
  ↓
SPRINT-003D: Readiness score
  ├── Score computation per Decision 7
  ├── Output to synthesis_results.payload
  └── Smoke
  ↓
[synthesis MVP complete]
  ↓
SPRINT-UI-001: Adjuster Brief View MVP (separate track)
```

Each sprint is ~1 week. Total: 4-5 weeks.

---

## Out of Scope for DESIGN-002

- Implementation of synthesis (deferred to SPRINT-003A+).
- Rule logic for R02, R03, R04, R06, R07, R09 unless flagged into MVP scope.
- LLM prompts for synthesis (designed per-rule in respective implementation sprint).
- Adjuster UI for synthesis output (SPRINT-UI-001).
- Synthesis re-trigger UX (deferred per D-020 single-pass).

---

## Iteration 2 Plan

After AUDIT-001 outputs:

1. Confirm validation_completed event payload structure (Decision 1 input).
2. Confirm claim_validations row format (Decision 2 input).
3. Resolve Decisions 1-7 with rationale per each.
4. Produce iteration 2: full design with sprint specs (high-level) for SPRINT-003A through 003D.

Iteration 3+: refine specific sprint specs as each is approached.

---

## Done Criteria for DESIGN-002 (across iterations)

- All 7 decisions resolved with rationale.
- 4-5 sprint specs (high-level) drafted for SPRINT-003A through 003D.
- Synthesis read contract aligned with PR #60 reality (per AUDIT-001).
- Architect review and sign-off.
- DECISIONS.md gets entries for any cross-cutting decisions made (e.g., "synthesis output is single-table jsonb, mirrors validation").

---

## Version

design002 — iteration 1 (skeleton) — 06/05/2026
**Filename:** `design002.1_synthesis_decomposition_06_05.md`
**Status:** skeleton with 7 open decisions and tentative sprint sequence. Iteration 2 after AUDIT-001 findings.
**Next step:** AUDIT-001 runs in parallel. CEO uses audit findings + this skeleton to produce design002 iteration 2 with resolved decisions and sprint specs.
