# SPRINT-DESIGN-002 — Synthesis Layer Decomposition (v1.2, iteration 3)

**Date:** 06/05/2026
**Identifier:** SPRINT-DESIGN-002
**Iteration:** 3 (v1.2)
**Type:** Design only.
**Predecessor:** v1.1 / iteration 2. Superseded after CEO self-audit identified 8 issues that would surface as Architect feedback or implementation friction.

**Status:** Self-audited. Ready for Architect review.

---

## Changes From v1.1 (iteration 2)

| #   | Issue                                                                                 | Fix                                                                                                                                                                                                                                    | Section                               |
| --- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1   | pass_id vs pass_number ambiguity in synthesis_results schema                          | Resolve from AUDIT-001 finding (PR #60 chose Form A or B); design002.3 commits to whichever validation_results uses for consistency. **Codex confirms in implementation pre-flight.**                                                  | Decision 2                            |
| 2   | pending_info trigger ambiguity (severity? questions? both?)                           | Trigger = ANY high-severity finding OR ANY clarification question. Either implies claimant action needed.                                                                                                                              | Decision 5 + SPRINT-003A architecture |
| 3   | Synthesis re-run semantics unclear (D-020 says no iteration but re-cycle path exists) | Clarified: synthesis runs ONCE per pass_number=3 row. Re-cycles via `pending_info → documents_open → ... → validation_complete` reuse the same pass_number=3 row (UPSERT). NOT same data twice — re-cycle implies new validation data. | Section "Re-cycle behavior"           |
| 4   | Question 1:1 mapping forces question even for informational anomalies                 | Made question optional per finding. Some findings (low-severity informational) emit no question.                                                                                                                                       | Decision 6                            |
| 5   | Cross-document finding evidence format unclear                                        | Added explicit format: `EvidenceRef[]` allows multiple refs per finding. Same type as validation.                                                                                                                                      | Decision 5                            |
| 6   | Idempotency on Inngest replay not addressed                                           | Added: finding/question IDs must be deterministic from inputs (hash of source_layer_id + payload signature). UPSERT on synthesis_results UNIQUE.                                                                                       | SPRINT-003A architecture              |
| 7   | Multi-pass validation row selection not specified                                     | Added explicit: synthesis reads validations `WHERE pass_id = max(pass_id) FROM passes WHERE pass_number=2 AND status=completed AND claim_id=$1`.                                                                                       | SPRINT-003A architecture              |
| 8   | Severity weight values (30/15/5) presented as final                                   | Marked as MVP placeholder; subject to pilot tuning. computation_basis field versioned for forward compat.                                                                                                                              | Decision 7                            |

---

## Inputs Confirmed (unchanged from v1.1)

- **D-027:** Event/pass-driven canonical.
- **AUDIT-001:** claim_validations is single jsonb table with layer_id discriminator.
- **D-020:** Single-pass MVP. Synthesis is one-shot per pass_number=3 row.
- **D-022:** broad_fallback skipped at validation; synthesis inherits skip.
- **D-023:** Production hardening conditional on LOI.

---

## Resolved Decisions (full text with iteration 3 fixes)

### Decision 1 — Synthesis Trigger and Pass Linkage

**Resolved: A (event-driven on `claim/validation.completed`)**

Inngest handler `run-synthesis-pass` subscribes. Payload: `{ claimId }` (per repo convention).

Per D-027: claim status = `processing` while synthesis runs; final status = `ready` or `pending_info` per Decision 2 trigger rules below.

Per D-024: pass row pass_number=3, UPSERT on `(claim_id, pass_number)`.

### Decision 2 — Synthesis Output Table Structure

**Resolved: A (single `synthesis_results` table, jsonb payload, `kind` discriminator)**

Schema (Form aligned with PR #60 — Codex confirms in pre-flight whether claim_validations used Form A `pass_id` or Form B `pass_number`):

```sql
-- Form A (if claim_validations uses pass_id):
CREATE TABLE synthesis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  pass_id uuid NOT NULL REFERENCES passes(id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kind_valid CHECK (kind IN ('finding', 'question', 'readiness_score')),
  CONSTRAINT uq_claim_pass_kind_payload_id UNIQUE (claim_id, pass_id, kind, (payload->>'id'))
);

-- Form B (if claim_validations uses pass_number):
CREATE TABLE synthesis_results (
  ...,
  pass_number int NOT NULL,
  ...,
  CONSTRAINT uq_claim_passnum_kind_payload_id UNIQUE (claim_id, pass_number, kind, (payload->>'id'))
);
```

UNIQUE includes `payload->>'id'` so multiple findings/questions allowed per claim (each with distinct deterministic id), readiness_score limited to one per pass.

### Decision 3 — Rules Engine Structure

**Resolved: C for SPRINT-003A; B for SPRINT-003B+**

SPRINT-003A: no rules engine. Findings derived deterministically from `claim_validations` row payloads using inline switch.

SPRINT-003B+: rules engine framework + R01, R05, R08 deterministic.

LLM rules (R04, R09): SPRINT-003C+ conditional on pilot evidence. Cost cap from SPRINT-002D protects against runaway cost.

### Decision 4 — MVP Synthesis Scope

**Resolved: SPRINT-003A ships findings + questions + readiness score from validation data only.** No R01-R09 rules in MVP.

### Decision 5 — Findings Vocabulary and Severity (UPDATED — fix #5)

**Resolved: C (category + severity)**

```typescript
type FindingCategory = 'gap' | 'anomaly' | 'inconsistency';
type FindingSeverity = 'low' | 'medium' | 'high';

interface Finding {
  id: string; // deterministic hash of source + payload signature (fix #6)
  category: FindingCategory;
  severity: FindingSeverity;
  title: string; // hebrew, short
  description: string; // hebrew, full
  evidence: EvidenceRef[]; // reuses validation EvidenceRef. Cross-document = multiple refs.
  source_layer_id?: string; // '11.1' | '11.2' | '11.3' if from validation; absent if synthesis-internal
}
```

EvidenceRef from `lib/validation/types.ts`:

```typescript
interface EvidenceRef {
  document_id: string;
  field_path: string;
  raw_value?: string;
  normalized_value?: string;
}
```

A finding with multiple `evidence[]` entries indicates cross-document evidence (e.g., name mismatch finding cites name field from each document).

### Decision 6 — Clarification Questions Structure (UPDATED — fix #4)

**Resolved: B (structured), question per finding is OPTIONAL**

```typescript
type QuestionAnswerType = 'text' | 'document' | 'confirmation' | 'correction';

interface ClarificationQuestion {
  id: string; // deterministic hash (fix #6)
  text: string; // hebrew
  related_finding_id: string;
  expected_answer_type: QuestionAnswerType;
  context?: {
    document_type?: string;
    field_path?: string;
    expected_value?: string;
  };
}
```

**Rule (fix #4):** Not every finding gets a question. Question generation logic (per template table in SPRINT-003A) decides per-finding. Some informational anomalies (low severity) may emit no question.

`pending_info` trigger requires AT LEAST ONE question OR AT LEAST ONE high-severity finding (fix #2).

### Decision 7 — Readiness Score Computation (UPDATED — fix #8)

**Resolved: single number 0-100, severity-weighted deduction. MVP weights are placeholders.**

```typescript
function computeReadinessScore(findings: Finding[]): number {
  const WEIGHTS = { high: 30, medium: 15, low: 5 }; // MVP placeholder
  let score = 100;
  for (const f of findings) {
    score -= WEIGHTS[f.severity];
  }
  return Math.max(0, score);
}
```

Returns: `{ kind: 'readiness_score', payload: { score, computation_basis: 'finding_severity_v1', weights_used: WEIGHTS } }`.

`computation_basis` enables forward-compat. SPRINT-003B+ may switch to `composite_v2` with different inputs. Adjuster UI reads basis to render appropriate breakdown.

**Pilot evidence drives reweighting.** Track which finding categories correlate with adjuster decisions; adjust weights based on data.

---

## Re-cycle Behavior (NEW — fix #3)

Synthesis runs ONCE per pass_number=3 row. Re-cycles do NOT iterate over the same data.

**Re-cycle path:**

1. Claim in `pending_info` (post-synthesis).
2. Claimant uploads new document → claim returns to `processing` (or equivalent per current main vocabulary).
3. Pass-1 finalizer fires → re-extraction of new docs only (per design001.6/.7 B.2 row 9).
4. `claim/extraction.completed` fires → validation pass-2 re-runs.
5. `claim/validation.completed` fires → synthesis-pass-3 re-runs.
6. Synthesis processes the NEW validation data (latest pass_id per fix #7).
7. Pass row pass_number=3 UPSERT (status flips to in_progress, started_at updated, completed_at nulled, then completed at end).
8. synthesis_results rows: deterministic IDs (fix #6) mean unchanged findings get UPSERTed in place; new findings inserted; resolved findings remain in DB but won't be regenerated. **Stale row cleanup deferred to TECH_DEBT 11y** ("synthesis result staleness — old findings persist after re-cycle").

This is consistent with D-020: "no iteration over the same data, but re-extraction is allowed."

---

## Sprint Sequence (Confirmed)

```
SPRINT-002D (in flight)        ← prerequisites (errored + cost cap)
   ↓
SPRINT-003A                    ← Synthesis MVP
   ↓ (~1 week)
DEMO READY (per D-023)
   ├── SPRINT-UI-001 (parallel)
   └── Customer discovery (User track, parallel)
   ↓
[Conditional based on pilot evidence]
   SPRINT-003B / 003C / 003D
   ↓
[FIRST LOI]
   ↓
SPRINT-PROD-BLOCK
```

---

## Done Criteria for DESIGN-002

- [x] Iteration 1: 7 open decisions captured.
- [x] Iteration 2: all 7 decisions resolved.
- [x] **Iteration 3 (this): self-audit fixes applied. pending_info trigger, re-cycle behavior, idempotency, multi-pass selection clarified.**
- [ ] Architect review on iteration 3.
- [ ] Iteration 4 if Architect feedback warrants.
- [ ] CEO approves final iteration.
- [ ] sprint003a.1 implementation spec produced.

---

## Cross-References

- `design001.6` (superseded post SPRINT-002D) → `design001.7` (revised, see new file).
- `s11.1-11.3.4` — claim_validations pattern reference.
- `audit001.2_pr60_findings_06_05.md` — confirms event-driven canonical.
- `sprint002d.2` — prerequisite (errored + cost cap).
- `sprint003a.1` — implementation spec (separate doc).

---

## Version

design002 — iteration 3 (v1.2) — 06/05/2026
**Filename:** `design002.3_synthesis_decomposition_06_05.md`
**Status:** Self-audited. Architect review pending.
**Predecessor:** v1.1 / iteration 2.
**Next step:** Architect review → iteration 4 if needed → SPRINT-003A spec ready.
