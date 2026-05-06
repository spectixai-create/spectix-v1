# SUPERSEDED — see ../sprints/sprint003a.3_synthesis_implementation_06_05.md

First iteration of synthesis MVP spec. Superseded by 003a.2 (Form A commitment) which was superseded by 003a.3 (Form B alignment per main schema).

Kept for planning history reference.

---

# SPRINT-003A — Synthesis MVP (Implementation Spec)

**Date:** 06/05/2026
**Identifier:** SPRINT-003A
**Iteration:** 1
**Type:** Implementation. Code + migration + tests.
**Predecessor design:** `design002.3_synthesis_decomposition_06_05.md`
**Predecessor sprints:** SPRINT-002C (PR #60), SPRINT-002D (errored + cost cap, pending dispatch).

**Estimated:** ~1 week Codex.

---

## Preconditions

**HARD GATE:** Codex must NOT begin implementation until ALL of:

1. SPRINT-002D PR merged to main. Cost cap wrapper available at `lib/cost-cap/`.
2. design002.3 sign-off complete (Architect approved).
3. CEO authorization to start.
4. Codex verifies existing schema state:
   ```sql
   -- Confirm claim_validations table form: pass_id (Form A) or pass_number (Form B)
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'claim_validations' AND column_name IN ('pass_id', 'pass_number');
   ```
   Synthesis_results migration uses the same form. Document in PR.
5. Codex verifies Inngest event payload shape:
   ```bash
   grep -n "claim/validation.completed" inngest/events/*.ts
   # Confirm payload field is claimId (or whatever convention exists)
   ```
6. Codex verifies the `EvidenceRef` type exists at `lib/validation/types.ts` (per SPRINT-002C). Synthesis imports from there.

If any precondition fails — Codex returns precondition status, no code, no PR.

---

## Architecture

### Inngest Handler Flow

```
Event: claim/validation.completed { claimId }
   ↓
[Step 1] check-cap-and-create-pass
   ├── callClaudeWithCostGuard(claimId, () => null)  ← defensive cap check (no LLM call yet, but pattern stays consistent)
   ├── UPSERT passes row (claim_id, pass_number=3) SET status='in_progress', started_at=now(), completed_at=NULL
   └── Audit: claim_synthesis_started
   ↓
[Step 2] read-validations
   └── SELECT * FROM claim_validations
       WHERE claim_id=$1
         AND pass_id = (
           SELECT id FROM passes
           WHERE claim_id=$1 AND pass_number=2 AND status='completed'
           ORDER BY completed_at DESC LIMIT 1
         )
   (Form B equivalent: WHERE claim_id=$1 AND pass_number=2)
   ↓
[Step 3] derive-findings
   └── For each validation row, apply derivation table (see "Finding Derivation" below)
       Output: Finding[]
   ↓
[Step 4] generate-questions
   └── For each finding, apply question template table (see "Question Generation" below)
       Output: ClarificationQuestion[] (may be shorter than findings — fix #4 from design002.3)
   ↓
[Step 5] compute-readiness-score
   └── computeReadinessScore(findings) → ReadinessScore
   ↓
[Step 6] persist-synthesis-results
   ├── UPSERT each finding to synthesis_results (kind='finding')
   ├── UPSERT each question to synthesis_results (kind='question')
   ├── UPSERT readiness_score to synthesis_results (kind='readiness_score')
   └── ON CONFLICT (claim_id, pass_id, kind, payload->>'id') DO UPDATE
   ↓
[Step 7] finalize-synthesis-pass
   ├── UPSERT passes pass_number=3 SET status='completed', completed_at=now()
   ├── Determine claim status:
   │   - pending_info IF: any high-severity finding OR any clarification question (per design002.3 fix #2)
   │   - ready: otherwise
   ├── Guarded UPDATE claims.status WHERE id=$1 AND status NOT IN ('rejected', 'errored', 'cost_capped')
   ├── Audit: claim_synthesis_completed with details { findings_count, questions_count, score, final_status }
   └── Inngest event: claim/synthesis.completed { claimId }
```

### Idempotency

- Step 1 UPSERT pass row → safe on replay.
- Step 6 UPSERT synthesis_results with deterministic IDs → safe on replay (idempotent).
- Step 7 guarded UPDATE → safe on replay.
- Audit log inserts → duplicates acceptable per existing convention.

### Cost Cap Wrapper

SPRINT-003A has zero LLM calls but uses `callClaudeWithCostGuard` defensively. Reasoning: future R04/R09 (LLM rules) inherit guard pattern automatically when added.

The defensive call passes `() => null` which is a no-op. Wrapper still:

- Reads claim cost + status.
- Halts if claim in `cost_capped` / `rejected` / `errored` state.
- Does NOT halt for cap (cost is 0 from prior steps; cap not triggered).

This ensures synthesis doesn't run on a halted claim.

---

## Data Model

### Migration `0007_synthesis_results.sql`

```sql
-- Form A (if claim_validations uses pass_id)
BEGIN;

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
CREATE INDEX idx_synthesis_results_claim ON synthesis_results(claim_id);
CREATE INDEX idx_synthesis_results_pass ON synthesis_results(pass_id);

-- Add 'claim_synthesis_started' and 'claim_synthesis_completed' to audit_log.action CHECK if constrained
-- Codex inspects audit_log CHECK first, ALTER if needed.

COMMIT;

-- down:
BEGIN;
DROP INDEX IF EXISTS idx_synthesis_results_pass;
DROP INDEX IF EXISTS idx_synthesis_results_claim;
DROP TABLE IF EXISTS synthesis_results;
-- Restore audit_log.action CHECK if changed.
COMMIT;
```

**Form B** (pass_number instead of pass_id) — Codex selects per Precondition #4.

---

## Type Contracts

```typescript
// lib/synthesis/types.ts

import type { EvidenceRef } from '@/lib/validation/types';

export type FindingCategory = 'gap' | 'anomaly' | 'inconsistency';
export type FindingSeverity = 'low' | 'medium' | 'high';
export type QuestionAnswerType =
  | 'text'
  | 'document'
  | 'confirmation'
  | 'correction';

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string; // hebrew, ≤80 chars
  description: string; // hebrew, full
  evidence: EvidenceRef[];
  source_layer_id?: '11.1' | '11.2' | '11.3';
}

export interface ClarificationQuestion {
  id: string;
  text: string; // hebrew
  related_finding_id: string;
  expected_answer_type: QuestionAnswerType;
  context?: {
    document_type?: string;
    field_path?: string;
    expected_value?: string;
  };
}

export interface ReadinessScore {
  score: number; // 0-100
  computation_basis: 'finding_severity_v1';
  weights_used: { high: number; medium: number; low: number };
}

// SynthesisResult is the union of payloads per kind. Codex picks discriminator approach.
export type SynthesisPayload = Finding | ClarificationQuestion | ReadinessScore;
```

---

## Finding Derivation Table

Codex implements as a switch over `(layer_id, payload)`.

### From Layer 11.1 (name_match)

| Validation row                                                     | Finding emitted                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| status='completed' AND payload.summary.mismatch > 0                | category=`inconsistency`, severity=`high`, title="אי-התאמה בשם בין מסמכים", description includes the mismatched names + documents, evidence = each mismatch's document_id+field_path, source_layer_id='11.1' |
| status='completed' AND payload.summary.fuzzy > 0 AND mismatch == 0 | category=`inconsistency`, severity=`medium`, title="התאמה חלקית בשם", description lists fuzzy matches with similarity scores, source_layer_id='11.1'                                                         |
| status='skipped' AND payload.reason='no_name_fields'               | category=`gap`, severity=`medium`, title="לא נמצאו שדות שם לבדיקה", description suggests uploading id_document, source_layer_id='11.1'                                                                       |
| status='failed'                                                    | category=`gap`, severity=`high`, title="בדיקת השם כשלה", description includes failure reason, source_layer_id='11.1'                                                                                         |

### From Layer 11.2 (date_validation)

| Validation row                                          | Finding emitted                                                                                                   |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Any rule with status='fail' AND id='policy_coverage'    | category=`gap`, severity=`high`, title="אירוע מחוץ לתקופת כיסוי", description with dates, source_layer_id='11.2'  |
| Any rule with status='fail' AND id='submission_timing'  | category=`inconsistency`, severity=`medium`, title="תאריך הגשה לפני אירוע", source_layer_id='11.2'                |
| Any rule with status='fail' AND id='travel_containment' | category=`inconsistency`, severity=`medium`, title="תאריך אירוע לא בתוך תאריכי טיסה/מלון", source_layer_id='11.2' |
| Any rule with status='fail' AND id='document_age'       | category=`inconsistency`, severity=`low`, title="תאריך מסמך לפני אירוע", source_layer_id='11.2'                   |
| status='skipped' AND missing dates                      | category=`gap`, severity=`medium`, title="חסרים תאריכים לבדיקת תקופת כיסוי", source_layer_id='11.2'               |
| status='failed'                                         | category=`gap`, severity=`high`, title="בדיקת תאריכים כשלה", source_layer_id='11.2'                               |

### From Layer 11.3 (currency_validation)

| Validation row                               | Finding emitted                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Any payload entry with outlier=true          | category=`anomaly`, severity=`medium`, title="סכום חריג בקבלה", description with amount + median for context, source_layer_id='11.3' |
| status='completed' AND any rate_failure=true | category=`gap`, severity=`low`, title="לא ניתן לאמת שער חליפין", source_layer_id='11.3'                                              |
| status='failed'                              | category=`gap`, severity=`high`, title="בדיקת מטבעות כשלה", source_layer_id='11.3'                                                   |

### Synthesis-internal findings (no source_layer_id)

| Condition                                                          | Finding emitted                                                                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Expected layer (11.1/11.2/11.3) absent from claim_validations rows | category=`gap`, severity=`high`, title="שכבה {layer_id} לא רצה", description suggests system error or missing data |

### Finding ID generation

Deterministic hash:

```typescript
import { createHash } from 'crypto';

function generateFindingId(
  layer_id: string | null,
  category: FindingCategory,
  evidence_signature: string, // sorted concat of "doc_id:field_path"
): string {
  const input = `${layer_id ?? 'internal'}:${category}:${evidence_signature}`;
  return 'f_' + createHash('sha256').update(input).digest('hex').slice(0, 16);
}
```

Same inputs → same ID → idempotent UPSERT.

---

## Question Generation Table

Per finding, possibly emit a question.

| Finding signature                               | Question emitted (or skip)                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `gap` + missing document type X                 | type=`document`, text="נא העלה {X} כדי להמשיך", context={document_type: X}                                                |
| `gap` + missing field in document Y             | type=`correction`, text="השדה {field} חסר במסמך {doc}. נא לתקן או להעלות מסמך מחודש", context={field_path, document_type} |
| `gap` + layer didn't run                        | NO question — system error, not claimant action                                                                           |
| `gap` + layer failed                            | NO question (in MVP) — adjuster intervention, not claimant                                                                |
| `inconsistency` + name mismatch (severity=high) | type=`confirmation`, text="השם {a} מופיע במסמך X והשם {b} במסמך Y. האם מדובר באותו אדם?", context={expected_value: a}     |
| `inconsistency` + name fuzzy (severity=medium)  | NO question (informational; adjuster decides)                                                                             |
| `inconsistency` + date mismatch                 | type=`text`, text="תאריך {a} במסמך X לא תואם תאריך {b} במסמך Y. נא להבהיר"                                                |
| `anomaly` + currency outlier                    | type=`text`, text="סכום {amount} {currency} חריג ביחס לסכומים אחרים בתביעה. נא להסביר"                                    |

### Question ID generation

```typescript
function generateQuestionId(finding_id: string, template_key: string): string {
  return (
    'q_' +
    createHash('sha256')
      .update(`${finding_id}:${template_key}`)
      .digest('hex')
      .slice(0, 16)
  );
}
```

---

## Readiness Score Computation

```typescript
// lib/synthesis/readiness-score.ts

const WEIGHTS = { high: 30, medium: 15, low: 5 };

export function computeReadinessScore(findings: Finding[]): ReadinessScore {
  let score = 100;
  for (const f of findings) {
    score -= WEIGHTS[f.severity];
  }
  return {
    score: Math.max(0, score),
    computation_basis: 'finding_severity_v1',
    weights_used: WEIGHTS,
  };
}
```

ID for readiness_score row: fixed `'rs_v1'` (one per pass).

---

## File Layout

```
/lib/synthesis/
  types.ts                          ← Finding, ClarificationQuestion, ReadinessScore
  index.ts                          ← exports
  finding-derivation/
    index.ts
    layer-11-1-name.ts              ← derivation rules from name_match
    layer-11-2-dates.ts             ← derivation rules from date_validation
    layer-11-3-currency.ts          ← derivation rules from currency_validation
    missing-layer.ts                ← synthesis-internal findings (gap when layer absent)
  question-generation.ts            ← per-finding question template logic
  readiness-score.ts                ← computeReadinessScore
  id-generation.ts                  ← deterministic hash helpers
  handler-orchestration.ts          ← orchestrates 7 steps

/inngest/synthesis/
  run-synthesis-pass.ts             ← Inngest function definition with 7 step.run blocks

/supabase/migrations/
  0007_synthesis_results.sql

/tests/unit/synthesis/
  finding-derivation/
    layer-11-1.test.ts              ← 4 test cases per derivation row above
    layer-11-2.test.ts              ← 6 test cases
    layer-11-3.test.ts              ← 3 test cases
    missing-layer.test.ts           ← gap-when-absent test
  question-generation.test.ts       ← 8 test cases per question template row
  readiness-score.test.ts           ← edge cases (no findings, all high, mixed, floor at 0)
  id-generation.test.ts             ← determinism test (same input → same ID)
  handler-orchestration.test.ts     ← orchestration unit (mocked DB)

/tests/integration/synthesis/
  end-to-end-synthesis.test.ts      ← claim_validations rows in → synthesis_results out
  re-cycle.test.ts                  ← UPSERT behavior on second synthesis run for same claim
  cost-cap-halt.test.ts             ← claim in cost_capped state → handler halts via guard
```

---

## Tests

**Unit:** ~25 tests covering derivation, generation, scoring, IDs, orchestration.

**Integration:** 3 tests:

1. End-to-end: fixture with claim + validations → handler runs → synthesis_results contain expected rows.
2. Re-cycle: run handler twice on same claim with new validation data → second run UPSERTs without duplicates.
3. Cost-cap halt: handler halts if claim in cost_capped state.

**Smoke:** SEPARATE gate — CEO authorizes non-prod smoke after merge. Codex does NOT run smoke in implementation PR.

---

## Audit Log Entries

| Action                      | When   | actor_type | details                                                                       |
| --------------------------- | ------ | ---------- | ----------------------------------------------------------------------------- |
| `claim_synthesis_started`   | Step 1 | `system`   | `{ claim_id, pass_id, pass_number: 3 }`                                       |
| `claim_synthesis_completed` | Step 7 | `system`   | `{ claim_id, pass_id, findings_count, questions_count, score, final_status }` |

If audit_log.action CHECK exists: Codex ALTERs to add the two new actions.

---

## Hard Rules

- No LLM calls in this sprint.
- All new code under `/lib/synthesis/`, `/inngest/synthesis/`.
- No new npm deps.
- Migration follows D-015 (up + down + reversible).
- Smoke not in implementation PR.
- All findings/questions text in Hebrew (UI is Hebrew/RTL).
- Use repo's existing event payload field convention (per Precondition #5).
- IDs deterministic (per Precondition #6).
- Cost cap wrapper used defensively (no LLM in sprint, but inherits pattern).

---

## Done Criteria

- [ ] All 6 preconditions verified by Codex with documented findings.
- [ ] Migration `0007_synthesis_results.sql` applied + reversible.
- [ ] `lib/synthesis/` module implemented per file layout.
- [ ] Inngest handler `run-synthesis-pass` subscribed to `claim/validation.completed`.
- [ ] All 7 handler steps implemented with proper UPSERT/guards.
- [ ] All ~25 unit tests passing.
- [ ] All 3 integration tests passing.
- [ ] PR description documents:
  - Schema form chosen (A or B per Precondition #4).
  - Event payload field convention (per Precondition #5).
  - audit_log.action CHECK before/after (if applicable).
  - Sample synthesis output for one fixture claim (full JSON).
- [ ] CEO approves merge.
- [ ] Smoke gate (separate, CEO authorizes).
- [ ] Post-smoke: SPRINT-UI-001 unblocked.

---

## Out of Scope (SPRINT-003A)

- Rules engine framework (SPRINT-003B).
- R01-R09 rules (SPRINT-003B+ conditional).
- LLM-shaped rules (SPRINT-003C+ conditional).
- Adjuster UI (SPRINT-UI-001 separate).
- Question answering flow (UX sprint).
- Re-extraction triggered by `document` answers (UX sprint).
- Stale finding cleanup on re-cycle (TECH_DEBT 11y).
- Multi-question per finding.
- Score refinement based on rule inputs.
- Real-time UI refresh during synthesis.

---

## Version

sprint003a — iteration 1 — 06/05/2026
**Filename:** `sprint003a.1_synthesis_mvp_06_05.md`
**Status:** Implementation-ready after preconditions met (SPRINT-002D shipped + design002.3 sign-off).
**Next step:** Architect review on design002.3 → CEO authorization → Codex preconditions check → implementation.
