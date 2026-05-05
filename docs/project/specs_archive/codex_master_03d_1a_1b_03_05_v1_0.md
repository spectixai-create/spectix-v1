# Codex Master Prompt — Spikes #03ד-1a + #03ד-1b

**Last updated:** 2025-05-03  
**CEO drafting context:** PM v2 review on `ceo_spec_spike_03d_1a_03_05_v1_1.md` returned 3 blocking + 5 important + 1 cosmetic. All resolved here as v1.2 patches. Spike #03ד-1b spec follows.

You will execute **two consecutive PRs** in this order. Do not start PR #2 until PR #1 has merged. Each PR follows standard PM review → CEO approval → merge.

---

## Protocol

### PR #1 — Spike #03ד-1a — Document Subtype Classification Foundation

**Branch:** `backend-document-subtype-foundation`  
**PR title:** `Spike #03ד-1a: Document Subtype Classification Foundation`

**Base spec:** `ceo_spec_spike_03d_1a_03_05_v1_1.md` (Project Knowledge).

**Apply ALL v1.2 patches in Section A below before implementation.** The v1.1 spec is correct in shape; the patches below resolve 9 specific items raised in PM v2 review.

After you implement, test, and verify against acceptance criteria (Section 14 of v1.1, with patch P-9 and P-10 below): open PR. PM (Chat 2-B) reviews. CEO approves merge. Do NOT proceed to PR #2 until merge confirmed.

### PR #2 — Spike #03ד-1b — Broad Extraction Prompts

**Branch:** `backend-broad-extraction-prompts`  
**PR title:** `Spike #03ד-1b: Broad Extraction Prompts (02-05) + extracted_data wiring`

**Spec:** Section B below. Self-contained. Builds on infrastructure from PR #1.

Same protocol: implement → test → PR → PM → CEO.

---

## Section A — v1.2 patches to v1.1 spec (apply to PR #1)

### Patch P-1 (BLOCKER): remove `SPECTIX_FORCE_SUBTYPE_FAILURE` option

Section 14 acceptance criterion #19 in v1.1 says:
> "PR description includes evidence that `upsert-pass-broad-cost` ran in a deliberately-failed-subtype test (e.g., `SPECTIX_FORCE_SUBTYPE_FAILURE=true` env or a unit test snapshot showing the call sequence)."

Replace with:
> "PR description includes a unit test snapshot or test run output proving that, in U-NEW-3 (broad success + subtype LLM failure), `upsert-pass-broad-cost` was called and `upsert-pass-subtype-cost` was NOT called. Unit-test evidence is the SOLE accepted form. Do not introduce any production-runtime force-failure env var for the subtype path."

Do NOT add `SPECTIX_FORCE_SUBTYPE_FAILURE` to the codebase, to `/inngest/client.ts`, or to `/docs/CONVENTIONS.md`. The pre-existing `SPECTIX_FORCE_DOCUMENT_FAILURE` (forces broad-stage failure via env or filename) is unchanged and remains the only force-failure mechanism.

### Patch P-2 (BLOCKER): explicit `getFailureAuditActor` helper

Section 9.6 of v1.1 references `getFailureAuditActor(failureCategory, classifierResult, subtypeResult)` without defining it. Replace the v1.1 placeholder with this explicit definition in `/inngest/functions/process-document.ts`:

```typescript
import { DEFAULT_MODEL } from '@/lib/llm/client';
import {
  SUBTYPE_DETERMINISTIC_ACTOR_ID,
  SUBTYPE_PRECALL_SENTINEL,
} from '@/lib/llm/classify-subtype';

type FailurePhase = 'broad' | 'subtype';

type FailureAuditActor = {
  actorType: 'system' | 'llm';
  actorId: string;
};

function getFailureAuditActor(
  failureCategory: FailureCategory,
  failurePhase: FailurePhase,
  classifierResult: ClassifyDocumentResult | null,
): FailureAuditActor {
  // forced via env or filename — system actor regardless of phase
  if (failureCategory === 'forced') {
    return { actorType: 'system', actorId: SYSTEM_ACTOR_ID };
  }

  // pre-call failures: distinguish phase via sentinel
  if (failureCategory === 'pre_call') {
    if (failurePhase === 'subtype') {
      return { actorType: 'system', actorId: SUBTYPE_PRECALL_SENTINEL };
    }
    return { actorType: 'system', actorId: CLASSIFIER_PRECALL_SENTINEL };
  }

  // llm_call failures: actor is 'llm', actor_id is real model id
  if (failurePhase === 'broad') {
    return {
      actorType: 'llm',
      actorId: classifierResult?.modelId ?? DEFAULT_MODEL,
    };
  }
  // subtype phase llm_call failure: classifierResult is non-null (broad
  // succeeded), but subtypeResult is null (threw before return). Use
  // DEFAULT_MODEL — single source of truth per Important #5 v1.
  return { actorType: 'llm', actorId: DEFAULT_MODEL };
}
```

`failurePhase` is set in the orchestrator: `'broad'` when broad classifier threw (`failureCategory` set in the existing try/catch around `claude-classify`), `'subtype'` when subtype classifier threw (new try/catch around `claude-classify-subtype`). When `failureCategory === 'forced'`, `failurePhase` is `'broad'` by convention (forced failure happens before broad classification runs).

### Patch P-3 (BLOCKER): remove dead `SUBTYPE_WRAPPER_SENTINEL`

Section 8.1 of v1.1 exports `SUBTYPE_WRAPPER_SENTINEL`. Section 9.3 includes a row for it. There is no code path that produces it (every error in 8.2 throws). Remove:

1. In `/lib/llm/classify-subtype.ts`: delete the `SUBTYPE_WRAPPER_SENTINEL` export. Keep `SUBTYPE_DETERMINISTIC_ACTOR_ID` and `SUBTYPE_PRECALL_SENTINEL`.

2. In Section 9.3 audit-actor table: delete the "Subtype wrapper bug (catastrophic)" row. The four remaining rows cover all reachable cases.

3. In `getFailureAuditActor` (Patch P-2): no reference to wrapper sentinel needed.

If a future code path requires distinguishing "wrapper returned undefined without throwing" from a normal LLM failure, reintroduce the sentinel WITH the code path that exercises it — not before.

### Patch P-4 (IMPORTANT): document RPC throw vs log trade-off

In v1.1 Section 9.4, both upsert calls do `if (error) throw new Error(...)`. In #03ג, the equivalent path used `logger.error(...)` and continued. PM v2 noted this as an undocumented behavioral change (visibility traded for retry-induced flakiness on transient Postgres glitches).

Decision: keep `throw` (the v1.1 design). Cost-tracking integrity is more valuable than tolerating silent RPC failures. Inngest retries × 3 with exponential backoff handle transient glitches; if a glitch survives 3 retries, finalize-failed is the correct outcome.

Add to `/docs/specs/spike-03d-1a.md` Section 19 "Revision history" the following line under v1.2:

> RPC error handling tightened from `logger.error+continue` (#03ג precedent) to `throw`. Trade-off: surface transient Postgres glitches as document failures (correctness over availability). Acceptable because (a) Inngest's 3-retry policy absorbs single-second glitches, (b) silent passes-table corruption was unacceptable for monetary tracking. Re-evaluate after 30 days of production data if `claims.total_llm_cost_usd` discrepancies appear.

### Patch P-5 (IMPORTANT): add TECH_DEBT 11o for RPC dedup key

PM v2 correctly notes that `upsert_pass_increment` is NOT idempotent at the RPC level (it accumulates). Inngest step memoization provides safety under normal operation; checkpoint corruption could cause double-increment.

Add to `/docs/TECH_DEBT.md`:

> **11o:** `public.upsert_pass_increment` accumulates by design (`cost_usd = passes.cost_usd + excluded.cost_usd`). Under Inngest checkpoint corruption (rare edge case), a step may re-run and double-record cost. Mitigation: add an idempotency key parameter (e.g., `p_idem_key uuid` derived from `(documentId, phase)`) and a UNIQUE deduplication table. **Owner:** CEO. **Trigger:** when `SUM(audit_log.details.cost_usd)` for a claim differs from `claims.total_llm_cost_usd` by more than 5% across 10+ claims in a 7-day window. Until trigger fires, accept the risk.

### Patch P-6 (IMPORTANT): add owners to TECH_DEBT 11k and 11n

In v1.1 Section 16:

- **11k**: change to `**Owner:** CEO (monthly review of Supabase egress in dashboard). **Trigger:** first Supabase invoice line item showing storage egress > 0.` (Replaces the periodic-query trigger with a single-event measurable.)

- **11n**: change to `**Owner:** PM (weekly review during Section 7 maintenance pass of PM_REVIEW_CHECKLIST). **Trigger:** when 95th percentile of audit_log.details.processing_time_ms exceeds 60s over a 7-day window.` PM checklist Section 7 is amended in PR #1 (see Patch P-7 below) to include this query as a weekly task.

- **11l, 11m**: existing wording stands.

### Patch P-7 (IMPORTANT): amend PM_REVIEW_CHECKLIST.md Section 7

Section 7 of `/docs/PM_REVIEW_CHECKLIST.md` ("Maintenance") currently lists ad-hoc maintenance items. Append:

```markdown
7.X. **Weekly tech-debt watch queries**

PM runs these queries weekly and files an issue if any trigger fires:

- TECH_DEBT 11n (watchdog threshold): query
  `select percentile_cont(0.95) within group (order by (details->>'processing_time_ms')::numeric)
   from audit_log
   where action = 'document_processing_completed'
     and created_at > now() - interval '7 days';`
  If result > 60000 (ms), file issue tagged `tech-debt-11n`.
- TECH_DEBT 11o (RPC dedup key): query
  `select claim_id,
          (select sum((details->>'cost_usd')::numeric) from audit_log
            where claim_id = c.id and action like 'document_%_completed')
            as audit_total,
          c.total_llm_cost_usd
     from claims c
    where created_at > now() - interval '7 days';`
  Compute relative diff per row. If 10+ rows show >5% diff, file issue tagged `tech-debt-11o`.
```

### Patch P-8 (IMPORTANT): correct concurrency-math text

In v1.1 Section 13 ("Edge cases"), the line:

> Concurrent retries (5 × 3 = 15 LLM concurrent per claim, now × 2 for two-tier = up to 30): documented in #03ג; acceptable for POC. No change here.

Replace with:

> Concurrency: max 5 functions in-flight per claim (`event.data.claimId`-keyed). Within each function, broad and subtype LLM calls run sequentially; at any moment a single function holds at most 1 active LLM call. Therefore: max 5 LLM calls in-flight per claim, regardless of two-tier expansion. Inngest retry replaces a failed call (does not multiply concurrent calls).

### Patch P-9 (IMPORTANT): add `DEFAULT_MODEL` import to process-document.ts

In v1.1 Section 12, the boundary list mentions `/lib/llm/client.ts` is unchanged. This refers to the file's content. `process-document.ts` is a new consumer of `DEFAULT_MODEL` (via the `getFailureAuditActor` helper in Patch P-2). Add to `/inngest/functions/process-document.ts` imports:

```typescript
import { DEFAULT_MODEL } from '@/lib/llm/client';
```

This import is required for the `getFailureAuditActor` helper to use the canonical model id on subtype-stage llm_call failures.

### Patch P-10 (COSMETIC): make migration constraint update explicit

In v1.1 Section 5.1 migration, the constraint addition is wrapped in `DO $$ ... if not exists ...` which silently skips when a stale constraint (e.g., 36-value version from a draft re-run) already exists.

Replace the constraint DO block with explicit drop-then-add:

```sql
-- Remove any prior version of the constraint before adding the canonical one.
-- This is safe in dev re-runs and zero-effect on first apply (DROP IF EXISTS).
alter table public.documents
  drop constraint if exists documents_document_subtype_check;

alter table public.documents
  add constraint documents_document_subtype_check
  check (document_subtype is null or document_subtype in (
    -- 37 values, see v1.1 Section 5.1 list (with pharmacy_receipt + prescription)
    ...
  ));
```

The column add (`add column if not exists`) and the partial index (`create index if not exists`) remain idempotent as before.

### Patches summary

| Patch | Scope | Risk |
| --- | --- | --- |
| P-1 | acceptance criterion + boundary discipline | low — deletion of optional path |
| P-2 | new helper function (~25 LoC) in process-document.ts | low — explicit code, not memory |
| P-3 | remove 1 export + 1 audit row | low — dead code |
| P-4 | docs only (revision history) | none |
| P-5 | docs only (TECH_DEBT 11o) | none |
| P-6 | docs only (TECH_DEBT 11k/11n owner + trigger) | none |
| P-7 | PM_REVIEW_CHECKLIST.md Section 7 append | none — operational |
| P-8 | docs text correction | none |
| P-9 | 1 import line | none |
| P-10 | migration drop-then-add | low — idempotent in both states |

All patches are local. None require strategic re-decision. Apply, then proceed with v1.1 spec as the authoritative implementation guide.

### Verification — PR #1 specific

Before opening PR #1, confirm:

1. All 10 v1.2 patches applied. Each patch's text appears in the diff.
2. v1.1 acceptance criteria #1-#19 all pass — except #19 which is replaced by P-1.
3. `SUBTYPE_WRAPPER_SENTINEL` does not appear anywhere in the diff (P-3).
4. `SPECTIX_FORCE_SUBTYPE_FAILURE` does not appear anywhere in the diff (P-1).
5. `getFailureAuditActor` is defined in process-document.ts (not just referenced).
6. `import { DEFAULT_MODEL } from '@/lib/llm/client'` is present in process-document.ts.
7. PM_REVIEW_CHECKLIST.md Section 7 has the new weekly-query subsection.
8. TECH_DEBT.md has 11k (revised), 11l, 11m, 11n (revised), 11o (new) all present with explicit owner + trigger fields.
9. /docs/specs/spike-03d-1a.md Section 19 has v1.2 entry with RPC throw-vs-log trade-off documented.

PR description includes the 9-item checklist with each item ticked.

---

## Section B — Spike #03ד-1b spec (PR #2)

Title: **Broad Extraction Prompts (02-05) + extracted_data wiring**

### B.1 Context

After PR #1 merges, broad classification (Prompt 01) and subtype classification (Prompt 01b) populate `documents.document_type` and `documents.document_subtype` for every processed document. `documents.extracted_data` currently holds only metadata (classifier output + processing_time_ms), no extracted fields.

PR #2 adds the **4 broad extraction prompts** from llm_prompts.md (02 receipt, 03 police, 04 hotel-generic, 05 medical) and writes the structured output into `extracted_data` per the discriminated union already defined in `/lib/types.ts` (`ExtractedData`, `ReceiptExtraction`, `PoliceReportExtraction`, `HotelLetterExtraction`, `MedicalReportExtraction`).

### B.2 Scope

Files to create:

- `/lib/llm/extract/extract-receipt.ts` — Prompt 02. Output schema: `ReceiptExtraction` from types.ts.
- `/lib/llm/extract/extract-police.ts` — Prompt 03. Output schema: `PoliceReportExtraction` from types.ts. Includes the two-tier `extracted` + `formatAnalysis` structure already typed.
- `/lib/llm/extract/extract-hotel-generic.ts` — Prompt 04. Output schema: `HotelLetterExtraction` from types.ts. This is the broad fallback for many doc types (taxonomy docs 3, 4, 7, 8, 9, 10, 16, 20, 27, 28, 29, 30, 34, 35, 36 = 15 doc types).
- `/lib/llm/extract/extract-medical.ts` — Prompt 05. Output schema: `MedicalReportExtraction` from types.ts.
- `/lib/llm/extract/route-by-subtype.ts` — pure function. Input: `(broad, subtype)`. Output: `'receipt' | 'police' | 'hotel_generic' | 'medical' | 'skip_dedicated' | 'skip_other'`.

Files to modify:

- `/inngest/functions/process-document.ts` — extend the success path to call the routed extractor after subtype classification. Write extracted_data with discriminated union shape. Add audit entry `document_extraction_completed`. Emit `claim/document.extracted` event.
- `/inngest/functions/index.ts` — register the new function (or reuse the existing process-document — see B.4).
- `/lib/types.ts` — add `DocumentExtractedEvent` + `DocumentExtractionFailedEvent`. Update `SpectixInngestEvent` union.
- `/docs/CONVENTIONS.md` — document `document_extraction_completed` action.
- `/docs/CURRENT_STATE.md`, `/docs/specs/spike-03d-1b.md`, `/docs/specs/README.md`, `/lib/version.ts` (bump to Spike #19).

### B.3 Routing logic

```typescript
import { SUBTYPES_BY_DOCUMENT_TYPE } from '@/lib/llm/document-subtypes';
import type { DocumentSubtype, DocumentType } from '@/lib/types';

export type ExtractionRoute =
  | 'receipt'         // → extract-receipt.ts (Prompt 02)
  | 'police'          // → extract-police.ts (Prompt 03)
  | 'hotel_generic'   // → extract-hotel-generic.ts (Prompt 04)
  | 'medical'         // → extract-medical.ts (Prompt 05)
  | 'skip_dedicated'  // subtype requires dedicated extraction (#03ד-2)
  | 'skip_other';     // broad='other' (no broad extraction defined)

const SUBTYPE_TO_PROMPT_ROUTE: Partial<Record<DocumentSubtype, ExtractionRoute>> = {
  // Prompt 02 — receipts
  general_receipt: 'receipt',
  medical_receipt: 'receipt',
  pharmacy_receipt: 'receipt',
  repair_estimate_or_invoice: 'receipt',
  // Prompt 03 — police
  police_report: 'police',
  // Prompt 04 — hotel-generic (broad letter parser)
  policy_terms: 'hotel_generic',
  insurance_proposal: 'hotel_generic',
  power_of_attorney: 'hotel_generic',
  medical_confidentiality_waiver: 'hotel_generic',
  flight_booking: 'hotel_generic',
  flight_ticket: 'hotel_generic',
  hotel_letter: 'hotel_generic',
  witnesses: 'hotel_generic',
  flight_cancellation_letter: 'hotel_generic',
  replacement_booking: 'hotel_generic',
  damage_report: 'hotel_generic',
  rental_contract: 'hotel_generic',
  travel_advisory: 'hotel_generic',
  embassy_contact_proof: 'hotel_generic',
  employer_letter: 'hotel_generic',
  // Prompt 05 — medical
  medical_visit: 'medical',
  // Dedicated (#03ד-2):
  claim_form: 'skip_dedicated',
  policy: 'skip_dedicated',
  id_or_passport: 'skip_dedicated',
  bank_account_confirmation: 'skip_dedicated',
  boarding_pass: 'skip_dedicated',
  border_records: 'skip_dedicated',
  incident_affidavit: 'skip_dedicated',
  pir_report: 'skip_dedicated',
  serial_or_imei: 'skip_dedicated',
  discharge_summary: 'skip_dedicated',
  prescription: 'skip_dedicated',
  medical_record_12mo: 'skip_dedicated',
  medical_evacuation: 'skip_dedicated',
  driver_license: 'skip_dedicated',
  third_party_details: 'skip_dedicated',
  // Photos: no LLM extraction (EXIF only, deferred)
  photos: 'skip_dedicated',
};

export function routeBySubtype(
  broad: DocumentType,
  subtype: DocumentSubtype | null,
): ExtractionRoute {
  if (subtype === null) {
    return 'skip_other'; // invalid LLM subtype response from PR #1; cannot route
  }
  if (broad === 'other') {
    return 'skip_other'; // broad classifier returned other; defer to dedicated
  }
  const route = SUBTYPE_TO_PROMPT_ROUTE[subtype];
  if (!route) {
    throw new Error(`Unmapped subtype: ${subtype}. Update SUBTYPE_TO_PROMPT_ROUTE.`);
  }
  return route;
}
```

Test: routing covers all 37 subtypes (test verifies no subtype is unmapped); routing for null subtype returns `'skip_other'`; routing for broad='other' returns `'skip_other'` regardless of subtype.

### B.4 Inngest orchestration choice

Two options:
- **(A) Extend process-document**: add extraction steps after subtype classification, in the same function.
- **(B) New function** subscribing to `claim/document.subtype_classified` event.

Choose **(A)**. Rationale: (1) keeps single audit trail per document, (2) simpler concurrency reasoning, (3) avoids race between event emission and second function start. The function name `process-document` is now slightly misleading (it does broad + subtype + extraction), but renaming is out of scope.

If (A) imposes operational issues (e.g., total step count too large for Inngest dashboard), switch to (B) in a follow-up.

### B.5 Extraction step shape

After `finalize-processed` step runs successfully (subtype written, audits emitted):

```typescript
const route = routeBySubtype(classifierResult.documentType, subtypeResult.documentSubtype);

if (route === 'skip_dedicated' || route === 'skip_other') {
  // Emit deferred event and exit. Document remains processed; extracted_data
  // has classifier+subtype metadata only.
  await step.sendEvent('emit-extraction-deferred', {
    name: 'claim/document.extraction_deferred',
    data: { claimId, documentId, reason: route },
  });
  return { status: 'processed', extraction: 'deferred', reason: route };
}

let extractionResult: ExtractionResult | null = null;
let extractionFailureReason: string | null = null;

try {
  extractionResult = await step.run('claude-extract', async () => {
    return runExtractionByRoute(route, { documentId, fileName });
  });
} catch (error) {
  extractionFailureReason = error instanceof Error ? error.message : String(error);
}

if (extractionFailureReason !== null) {
  // Cost preserved via upsert-pass-extraction-cost-fail (if cost was incurred
  // before throw — same precedent as PR #1 broad/subtype)
  await step.run('finalize-extraction-failed', async () => {
    // UPDATE extracted_data adds extraction_error subfield; processing_status
    // STAYS 'processed' (subtype phase succeeded; only extraction failed)
    // because we don't want to invalidate broad+subtype work.
  });
  await step.sendEvent('emit-extraction-failed', { ... });
  return { status: 'processed', extraction: 'failed' };
}

// Success: write extracted_data discriminated union, audit, emit
await step.run('upsert-pass-extraction-cost', async () => {
  // RPC call with extractionResult.costUsd, calls=1
});
await step.run('finalize-extraction-success', async () => {
  // UPDATE documents.extracted_data with discriminated union shape
  // INSERT audit_log: action='document_extraction_completed'
});
await step.sendEvent('emit-extracted', { ... });
```

Note the **degraded success** philosophy: extraction failure does NOT revert the document to `failed`. Broad and subtype were correctly determined and persisted; extraction is the next layer and can fail independently. The document is still useful (downstream rules can run on broad+subtype). Future reprocessing can fill in extracted_data.

### B.6 Each extractor file

Pattern mirrors `/lib/llm/classify-document.ts`. Public surface for `extract-receipt.ts`:

```typescript
export class ReceiptExtractorPreCallError extends Error { /* phase: 'pre_call' */ }
export class ReceiptExtractorLLMError extends Error { /* phase: 'llm_call' */ }

export type ExtractReceiptResult = {
  data: ReceiptExtraction; // from types.ts
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export async function extractReceiptFromStorage(
  input: { documentId: string; fileName: string },
  deps: {
    supabaseAdmin?: ReturnType<typeof createAdminClient>;
    callClaude?: typeof callClaudeJSON;
  } = {},
): Promise<ExtractReceiptResult>;
```

System prompts derive from llm_prompts.md (verified: Prompts 02, 03 have full schemas; 04, 05 have placeholders — Codex must define the schemas based on the typed interfaces in types.ts).

For Prompt 04 (hotel_generic): the `HotelLetterExtraction` interface in types.ts has 12 fields (hotelName, hotelAddress, letterDate, guestName, stayStartDate, stayEndDate, incidentReportedToHotel, hotelActions, signedBy, onLetterhead, languageQuality, redFlags). The extractor populates these fields from any "letter from a service provider" (broad acceptance — many doc subtypes route here).

For Prompt 05 (medical): the `MedicalReportExtraction` interface has 10 fields. Privacy: `diagnosisBrief` is brief (no full PHI); enforced by system prompt.

### B.7 Tests

Per extractor (4 files): minimum 6 unit tests each:
1. Success path with mock callClaude
2. System prompt content assertion (right field names enumerated)
3. **Dirty input test** (per PM_REVIEW_CHECKLIST 5.12 from PR #1): rawText with code fences
4. Pre-call failure (no file_path)
5. Pre-call failure (unsupported mime)
6. LLM failure (callClaude throws → wraps)
7. JSON parse failure (parsed null)

`route-by-subtype.test.ts`:
1. All 37 subtypes mapped
2. null subtype → 'skip_other'
3. broad='other' regardless of subtype → 'skip_other'
4. Each route → returns the expected extractor name

`process-document-claude.test.ts` extensions (add 4 new):
1. Broad+subtype success → routes to extractor → success → extracted_data has discriminated union shape, audit entry present, event emitted
2. Broad+subtype success → 'skip_dedicated' route → emits extraction_deferred, no extraction call, extracted_data unchanged from PR #1 shape
3. Broad+subtype success → extractor throws → document stays processed, extraction_error in extracted_data, extraction_failed event emitted
4. extracted_data discriminated union: kind matches DocumentType (e.g., kind: 'receipt' when broad === 'receipt')

Pass thresholds: target ≥ 100 unit (76 from PR #1 + ~24 new). Playwright unchanged.

### B.8 TECH_DEBT resolutions and additions

Resolved in PR #2:
- **11l** (typed extracted_data schema): the discriminated union is now the persisted shape. Mark resolved with PR #2 link.

New TECH_DEBT 11p:
> **11p:** when extractor returns successfully but extracted_data.kind does not match `documents.document_type`, the row is in an inconsistent state (currently allowed by JSONB schema). Add runtime check post-extraction. **Owner:** PM (weekly Section 7 query). **Trigger:** first occurrence of mismatch detected by query: `select id from documents where (extracted_data->>'kind') is not null and (extracted_data->>'kind') != document_type;`.

### B.9 Acceptance criteria

1. Typecheck, lint, format, build pass.
2. Tests pass: ≥ 100 unit, ≥ 61 e2e.
3. Production smoke: upload one receipt PDF + one police report PDF + one hotel letter PDF + one medical report PDF (4 distinct claims or 1 claim with 4 documents). For each:
   - `processing_status = 'processed'`
   - `document_type` and `document_subtype` populated (from PR #1)
   - `extracted_data.kind` matches `document_type`
   - `extracted_data.data` populates the typed schema fields (verified manually: at least 5 of the schema's fields are non-null per real document)
   - audit_log has `document_extraction_completed` entry with cost_usd > 0
4. PR description includes: cost-per-document for each of the 4 extractor types (receipt, police, hotel_generic, medical), measured from the smoke run.
5. /lib/types.ts has `DocumentExtractedEvent` and `DocumentExtractionFailedEvent`; `SpectixInngestEvent` union updated.
6. /docs/CONVENTIONS.md, CURRENT_STATE.md, MIGRATIONS.md (no migration in 1b — note the absence), specs/spike-03d-1b.md, specs/README.md updated.
7. /lib/version.ts → Spike #19.

### B.10 Boundaries

Files NOT to touch in PR #2:
- Anything from PR #1 except `process-document.ts` (extension), `lib/types.ts` (add events), and the listed docs files.
- Migrations 0001-0005.
- `/lib/llm/classify-document.ts`, `/lib/llm/classify-subtype.ts` (stable).
- `/lib/llm/document-subtypes.ts` (the mapping is final; routing is a separate file).

### B.11 Open questions

None. If a subtype-to-extractor mapping decision arises during implementation (e.g., a subtype that visually fits two prompts), default to `hotel_generic` (broadest).

---

## Section C — Operational notes

### C.1 PM-review loop expectation

Each PR goes through PM (Chat 2-B). Expected pattern:
- PR #1: PM v3 review on Codex's diff. CEO has already iterated v1.0 → v1.1 → v1.2; remaining PM findings should be implementation-quality-level (e.g., function naming, test coverage) rather than design-level.
- PR #2: PM v1 review on the 1b spec (this Section B is the first time PM sees it). Expect 2-3 rounds of design feedback, similar to PR #1's history.

If PM raises a BLOCKING design issue on PR #2 that requires CEO decision, surface it back to CEO chat (not Codex chat).

### C.2 Force-failure env var policy

Only `SPECTIX_FORCE_DOCUMENT_FAILURE` exists. It forces broad-stage failure (the document never reaches subtype or extraction). No new force-failure env vars are introduced. Test coverage of subtype-stage and extraction-stage failures is via dependency-injected mocks (deps.classifier, deps.callClaude).

### C.3 Cost ceiling per document

After both PRs:
- Broad classification: ~$0.007 (verified production)
- Subtype classification: ~$0.003 when LLM ran, $0 on skip
- Extraction: ~$0.008-$0.020 per llm_prompts.md cost table
- **Total per processed document: ~$0.018-$0.030** (vs $0.007 today)

This is well within the $0.50/claim KPI ceiling at 10-20 documents per claim.

### C.4 Tracking document

CEO updates `project_status_03_05_v3_X.md` after each PR merge. Codex does NOT update Project Knowledge files; only CEO does.

---

**End of Codex Master Prompt — Spikes #03ד-1a + #03ד-1b**
