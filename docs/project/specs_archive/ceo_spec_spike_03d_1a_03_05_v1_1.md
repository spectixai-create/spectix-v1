# Spike #03ד-1a — Document Subtype Classification Foundation

Status: CEO draft v1.1 (post PM v1 review — 4 blocking, 6 important, 3 cosmetic incorporated)
Owner: Codex
Branch: backend-document-subtype-foundation
Estimated effort: 0.75-1 day
Priority: P1 high
Reference decisions: D-013, D-014, D-015, D-016, D-017, D-018 (new — added in this spike)

## 1. Context

After #03ג + hotfix #15, broad document classification (Prompt 01, 8 categories) runs in production. Real Sonnet 4.5 classifies real PDFs at ~$0.007/document (verified on claim 2026-757, document `0bcafa53`).

This spike installs the foundation for two-tier classification per D-018:
- Broad `DocumentType` (8) — already live (Prompt 01, unchanged)
- Fine `DocumentSubtype` (**37**) — new (Prompt 01b, this spike)

Source of subtype taxonomy: `documents_taxonomy_03_05_v1_1.md` (Project Knowledge), with one CEO-driven refinement post PM review (see Section 3.1 below).

This spike is infrastructure only — DB column, types, classifier, orchestration. Extraction prompts (02-05) are deferred to #03ד-1b. Dedicated extraction prompts (14 subtypes) are deferred to #03ד-2.

## 2. PM v1 review responses (summary)

PM v1 found 4 blocking, 6 important, 3 cosmetic. All resolved in v1.1:

| PM concern | Resolution in v1.1 |
| --- | --- |
| BLOCKER 1: `prescriptions_and_pharmacy` unreachable from broad classifier | Split into `pharmacy_receipt` (under `receipt`) + `prescription` (under `medical_report`). Total subtypes: 37. |
| BLOCKER 2: broad cost lost when subtype fails (regression from #03ג) | Two separate upsert steps: `upsert-pass-broad-cost` before subtype, `upsert-pass-subtype-cost` after subtype (only if non-skip). RPC is idempotent. |
| BLOCKER 3: step.run boundaries unspecified for new audit/emit | Section 9 shows explicit code: 2 audits inside finalize-processed step.run; events as named step.sendEvent. |
| BLOCKER 4: silent fallback to allowedSubtypes[0] inserts misleading data | Invalid LLM response → `documentSubtype = null`. Column already nullable. Subtype event NOT emitted in null case. |
| IMPORTANT 1: SPECTIX_FAKE_CLAUDE_CLASSIFIER undocumented | Section 8.2 cites that the env var is preserved from existing classify-document.ts; no new env var introduced. |
| IMPORTANT 2: action `document_subtype_classified` violates `<verb>_started/_completed/_failed` convention | Renamed to `document_subtype_classification_completed`. Failure path uses existing `document_processing_failed` action with details indicating subtype phase. |
| IMPORTANT 3: watchdog margin not measured in acceptance | Acceptance criterion 17 added (PR includes processing_time_ms data). TECH_DEBT 11n added (revisit threshold at p95 > 60s). |
| IMPORTANT 4: storage egress trigger ($5/month) is dead — no monitoring exists | TECH_DEBT 11k revised to a measurable trigger: "after 100+ documents processed in a 24h window". |
| IMPORTANT 5: U-NEW-3 sentinel masks Claude reachability | Failure path actor_id uses `DEFAULT_MODEL` from client.ts (single source of truth) for llm_call phase failures. Sentinel `subtype-classifier:wrapper-error` reserved for catastrophic wrapper bugs (e.g., result undefined despite no thrown error). |
| IMPORTANT 6: English translation has no defined quality gate | Section 18 adds a CEO ownership clause. Codex does not translate; CEO commits English canonical at `/docs/specs/spike-03d-1a.md` based on the Hebrew CEO draft + PM-approved version. |
| COSMETIC 1: missing `if not exists` on column add | Migration uses `add column if not exists` and `add constraint if not exists` (Postgres 9.6+ supports IF NOT EXISTS on ADD COLUMN; constraint is wrapped in DO $$). |
| COSMETIC 2: "If tests/db infra exists" weakens verifiability | Section 11.4 deterministic: Codex provides EITHER tests/db round-trip OR psql evidence in PR description. Not both, not neither. |
| COSMETIC 3: Q3 (silent fallback) needs 1b design | Removed from open questions. Resolved in BLOCKER 4 above (null over default). |

## 3. New Decision — D-018

### D-018: Two-Tier Document Classification

Date: 2025-05-03  
Status: Active  
Decided by: CEO

Document classification uses two stages: a broad `DocumentType` (8 values, set by Prompt 01) and a fine `DocumentSubtype` (37 values, set by Prompt 01b).

- Broad types continue in `/lib/types.ts` (unchanged).
- Subtypes added to `/lib/types.ts` and persisted in `public.documents.document_subtype` (migration 0005).
- The mapping `broad → list_of_subtypes` lives in `/lib/llm/document-subtypes.ts`.
- When a broad type maps to a single subtype, Prompt 01b is skipped and the subtype is set deterministically. This applies to `police_report`, `hotel_letter`, `witness_letter`, `photo`. Saves ~$0.003 per such document.
- When the LLM returns a subtype id outside the allowed list, the persisted `document_subtype` is `NULL` (data integrity over fabricated default) and the audit log records the LLM's invalid response. The document still finalizes as `processed`.
- Subtype IDs are stable English `snake_case`. Hebrew display labels live in `/lib/llm/document-subtypes.ts` (`SUBTYPE_LABELS_HE`).

Trade-offs accepted:
- A second LLM call when broad is ambiguous (~$0.003 per such document).
- Adding a new subtype requires migration + code change; CHECK constraint enforces vocabulary.
- Documents with invalid LLM subtype responses leave `document_subtype` null. Future reprocessing job (out of scope here) may retry.

Revisit when production data shows a subtype consistently misclassified or a customer requires a new document type.

### 3.1 v1.1 refinement: split of `prescriptions_and_pharmacy`

The taxonomy v1.1 lists doc 24 as "מרשמים + קבלות תרופות" with `dedicated` extraction in #03ד-2. As a single subtype, it is unreachable from the broad classifier in practice:
- A pharmacy receipt is visually a receipt → broad classifier returns `receipt`.
- A prescription paper is medical → broad classifier returns `medical_report` or `other`.

Combining them under one subtype with parent `other` (v1.0 placement) means the subtype is only reachable when the broad classifier returns `other`, which would be rare for either physical document.

Resolution: split.

| Subtype id | Broad parent | Hebrew label | DAG phase | Extraction (1b/2) |
| --- | --- | --- | --- | --- |
| `pharmacy_receipt` | `receipt` | קבלת בית מרקחת | 3 | 02 broad (receipt schema covers it) |
| `prescription` | `medical_report` | מרשם רפואי | 3 | dedicated in #03ד-2 |

This decision is recorded as part of D-018 v1.1 and is appended to `/docs/DECISIONS.md` in this spike's PR.

## 4. Canonical Types

Use canonical types from `/lib/types.ts`. New types added in this spike (Section 6):
- `DocumentSubtype` (union of 37 string literals)
- `DocumentSubtypeClassifiedEvent`
- `Document.documentSubtype` field

Existing types unchanged: `DocumentType`, `DocumentProcessingStatus`, `DocumentUploadedEvent`, `DocumentProcessedEvent`, `DocumentProcessFailedEvent`.

## 5. Migration

### 5.1 Up — `/supabase/migrations/0005_document_subtype.sql`

```sql
begin;

set local lock_timeout = '30s';
set local statement_timeout = '60s';

-- =====================================================================
-- Spike #03ד-1a — document_subtype column (D-018).
-- Two-tier document classification: broad DocumentType (already live in
-- migration 0004) + fine DocumentSubtype (new, 37 values).
-- All existing rows have document_subtype null until reprocessed.
-- =====================================================================

alter table public.documents
  add column if not exists document_subtype text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'documents_document_subtype_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_document_subtype_check
      check (document_subtype is null or document_subtype in (
        'claim_form',
        'policy',
        'policy_terms',
        'insurance_proposal',
        'id_or_passport',
        'bank_account_confirmation',
        'power_of_attorney',
        'medical_confidentiality_waiver',
        'flight_booking',
        'flight_ticket',
        'boarding_pass',
        'border_records',
        'incident_affidavit',
        'police_report',
        'pir_report',
        'hotel_letter',
        'general_receipt',
        'photos',
        'serial_or_imei',
        'witnesses',
        'medical_visit',
        'discharge_summary',
        'medical_receipt',
        'pharmacy_receipt',
        'prescription',
        'medical_record_12mo',
        'medical_evacuation',
        'flight_cancellation_letter',
        'replacement_booking',
        'damage_report',
        'rental_contract',
        'driver_license',
        'repair_estimate_or_invoice',
        'third_party_details',
        'travel_advisory',
        'embassy_contact_proof',
        'employer_letter'
      ));
  end if;
end;
$$;

create index if not exists documents_document_subtype_idx
  on public.documents (document_subtype)
  where document_subtype is not null;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'document_subtype'
  ) then
    raise exception 'Verification failed: document_subtype column not added';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'documents_document_subtype_check'
      and conrelid = 'public.documents'::regclass
  ) then
    raise exception 'Verification failed: documents_document_subtype_check constraint not created';
  end if;
end;
$$;

commit;
```

### 5.2 Down — `/supabase/rollbacks/0005_document_subtype.down.sql`

```sql
begin;

set local lock_timeout = '30s';
set local statement_timeout = '60s';

drop index if exists public.documents_document_subtype_idx;

alter table public.documents
  drop constraint if exists documents_document_subtype_check;

alter table public.documents
  drop column if exists document_subtype;

commit;
```

### 5.3 Migration notes

- Column nullable. No backfill in this spike. Existing 1+ documents in production retain `document_subtype = null`. Future reprocessing job can populate retrospectively.
- `WHERE document_subtype IS NOT NULL` partial index keeps index size small while population is sparse.
- Migration is **idempotent**: re-running on a Supabase that already has the column/constraint/index is a no-op.
- 37 values in CHECK match `SUBTYPES_BY_DOCUMENT_TYPE` flattened (Section 7) and `SUBTYPE_LABELS_HE` keys (Section 7) exactly. Tests verify equality (Section 11).

## 6. Type changes — `/lib/types.ts`

### 6.1 New `DocumentSubtype` union

Add immediately after the existing `DocumentType` definition:

```typescript
/**
 * Document subtypes — fine-grained classification per documents_taxonomy v1.1
 * (with v1.1 CEO refinement: split prescriptions_and_pharmacy into
 * pharmacy_receipt + prescription).
 *
 * 37 values matching public.documents.document_subtype CHECK in migration 0005.
 *
 * D-018 two-tier classification: DocumentType (broad, 8) + DocumentSubtype (fine, 37).
 *
 * IDs are stable snake_case English. Hebrew display labels live in
 * /lib/llm/document-subtypes.ts (SUBTYPE_LABELS_HE).
 *
 * CRITICAL: any change here requires:
 *   1. update migration 0005 CHECK constraint (and new follow-up migration)
 *   2. update SUBTYPES_BY_DOCUMENT_TYPE in /lib/llm/document-subtypes.ts
 *   3. update SUBTYPE_LABELS_HE in /lib/llm/document-subtypes.ts
 *   4. update SUBTYPE_DAG_PHASE in /lib/llm/document-subtypes.ts
 */
export type DocumentSubtype =
  | 'claim_form'
  | 'policy'
  | 'policy_terms'
  | 'insurance_proposal'
  | 'id_or_passport'
  | 'bank_account_confirmation'
  | 'power_of_attorney'
  | 'medical_confidentiality_waiver'
  | 'flight_booking'
  | 'flight_ticket'
  | 'boarding_pass'
  | 'border_records'
  | 'incident_affidavit'
  | 'police_report'
  | 'pir_report'
  | 'hotel_letter'
  | 'general_receipt'
  | 'photos'
  | 'serial_or_imei'
  | 'witnesses'
  | 'medical_visit'
  | 'discharge_summary'
  | 'medical_receipt'
  | 'pharmacy_receipt'
  | 'prescription'
  | 'medical_record_12mo'
  | 'medical_evacuation'
  | 'flight_cancellation_letter'
  | 'replacement_booking'
  | 'damage_report'
  | 'rental_contract'
  | 'driver_license'
  | 'repair_estimate_or_invoice'
  | 'third_party_details'
  | 'travel_advisory'
  | 'embassy_contact_proof'
  | 'employer_letter';
```

### 6.2 `Document` interface — add field

In `Document` interface, immediately after `documentType: DocumentType;`:

```typescript
  /**
   * Added in migration 0005 (D-018). Null until subtype classifier runs
   * (Prompt 01b). Existing documents created before the migration retain
   * null indefinitely unless reprocessed. Also null when the subtype
   * classifier returned an invalid id (data integrity over fabricated default).
   */
  documentSubtype: DocumentSubtype | null;
```

### 6.3 New event type

Add in Section F (Inngest event types), before the `SpectixInngestEvent` union:

```typescript
/**
 * Emitted when subtype classification completes with a valid subtype.
 * NOT emitted when the LLM returned an invalid subtype id and document_subtype
 * was set to null. Future #03ד-1b extraction subscribes to this event.
 */
export interface DocumentSubtypeClassifiedEvent {
  name: 'claim/document.subtype_classified';
  data: {
    claimId: string;
    documentId: string;
    documentType: DocumentType;
    documentSubtype: DocumentSubtype;
  };
}
```

Update `SpectixInngestEvent` union to include it:

```typescript
export type SpectixInngestEvent =
  | DocumentUploadedEvent
  | DocumentProcessedEvent
  | DocumentProcessFailedEvent
  | DocumentSubtypeClassifiedEvent
  | PassStartEvent
  | PassCompletedEvent;
```

### 6.4 Existing `Document` consumers

- Update `lib/types.test.ts` (if it constructs `Document` literals) to include `documentSubtype: null`.
- Update sample data fixtures in `/lib/sample-data/*` to include `documentSubtype: null` (audit then patch).

## 7. New file — `/lib/llm/document-subtypes.ts`

```typescript
import type { DocumentSubtype, DocumentType } from '@/lib/types';

/**
 * Two-tier classification mapping (D-018).
 *
 * Each broad DocumentType maps to a non-empty list of valid DocumentSubtype
 * values. Source: documents_taxonomy_03_05_v1_1.md (Project Knowledge) plus
 * v1.1 CEO refinement (split prescriptions_and_pharmacy → pharmacy_receipt
 * + prescription).
 *
 * INVARIANT: union(values) === all 37 DocumentSubtype values, no duplicates.
 * Verified by tests/unit/document-subtypes.test.ts.
 */
export const SUBTYPES_BY_DOCUMENT_TYPE: Record<
  DocumentType,
  readonly DocumentSubtype[]
> = {
  police_report: ['police_report'],
  hotel_letter: ['hotel_letter'],
  witness_letter: ['witnesses'],
  photo: ['photos'],
  receipt: [
    'general_receipt',
    'medical_receipt',
    'repair_estimate_or_invoice',
    'pharmacy_receipt',
  ],
  medical_report: [
    'medical_visit',
    'discharge_summary',
    'medical_record_12mo',
    'medical_evacuation',
    'prescription',
  ],
  flight_doc: [
    'flight_booking',
    'flight_ticket',
    'boarding_pass',
    'border_records',
    'pir_report',
    'flight_cancellation_letter',
    'replacement_booking',
  ],
  other: [
    'claim_form',
    'policy',
    'policy_terms',
    'insurance_proposal',
    'id_or_passport',
    'bank_account_confirmation',
    'power_of_attorney',
    'medical_confidentiality_waiver',
    'incident_affidavit',
    'serial_or_imei',
    'damage_report',
    'rental_contract',
    'driver_license',
    'third_party_details',
    'travel_advisory',
    'embassy_contact_proof',
    'employer_letter',
  ],
} as const;

/**
 * Hebrew display labels for DocumentSubtype.
 * Used by UI and by Prompt 01b user-facing context.
 */
export const SUBTYPE_LABELS_HE: Record<DocumentSubtype, string> = {
  claim_form: 'טופס תביעה',
  policy: 'פוליסה',
  policy_terms: 'תקנון פוליסה',
  insurance_proposal: 'הצעה לביטוח',
  id_or_passport: 'תעודת זהות או דרכון',
  bank_account_confirmation: 'אישור חשבון בנק',
  power_of_attorney: 'ייפוי כוח',
  medical_confidentiality_waiver: 'ויתור על סודיות רפואית',
  flight_booking: 'הזמנת טיסה',
  flight_ticket: 'כרטיס טיסה',
  boarding_pass: 'כרטיס עלייה למטוס',
  border_records: 'רישום משרד הפנים',
  incident_affidavit: 'תצהיר אירוע',
  police_report: 'דוח משטרה',
  pir_report: 'דוח אי-סדירות כבודה (PIR)',
  hotel_letter: 'מכתב מהמלון או נותן שירות',
  general_receipt: 'קבלה',
  photos: 'תמונות',
  serial_or_imei: 'מספר סידורי או IMEI',
  witnesses: 'עדויות',
  medical_visit: 'אישור רפואי',
  discharge_summary: 'סיכום אשפוז',
  medical_receipt: 'קבלה רפואית',
  pharmacy_receipt: 'קבלת בית מרקחת',
  prescription: 'מרשם רפואי',
  medical_record_12mo: 'תיק רפואי 12 חודשים',
  medical_evacuation: 'אישור פינוי רפואי',
  flight_cancellation_letter: 'אישור חברת תעופה לביטול או איחור',
  replacement_booking: 'אישור הזמנה חלופית או הקדמה',
  damage_report: 'דוח נזק',
  rental_contract: 'חוזה השכרה',
  driver_license: 'רישיון נהיגה',
  repair_estimate_or_invoice: 'הערכת תיקון או חשבונית תיקון',
  third_party_details: "פרטי צד ג'",
  travel_advisory: 'הוראת פינוי או אזהרת מסע',
  embassy_contact_proof: 'אישור התקשרות עם השגרירות',
  employer_letter: 'מכתב מעסיק',
};

/**
 * DAG phase per documents_taxonomy v1.1.
 *   1: foundation, no inter-document dependencies. Processed first.
 *   2: depends on Phase 1.
 *   3: depends on Phase 2.
 *   pass2_plus: not run in Pass 1 (e.g., medical_record_12mo runs only after
 *               Rule 09 trigger).
 */
export type DagPhase = 1 | 2 | 3 | 'pass2_plus';

export const SUBTYPE_DAG_PHASE: Record<DocumentSubtype, DagPhase> = {
  claim_form: 1,
  policy: 1,
  policy_terms: 1,
  id_or_passport: 1,
  bank_account_confirmation: 1,
  incident_affidavit: 1,
  insurance_proposal: 2,
  power_of_attorney: 2,
  medical_confidentiality_waiver: 2,
  flight_booking: 2,
  flight_ticket: 2,
  boarding_pass: 2,
  border_records: 2,
  flight_cancellation_letter: 2,
  police_report: 3,
  pir_report: 3,
  hotel_letter: 3,
  general_receipt: 3,
  photos: 3,
  serial_or_imei: 3,
  witnesses: 3,
  medical_visit: 3,
  discharge_summary: 3,
  medical_receipt: 3,
  pharmacy_receipt: 3,
  prescription: 3,
  medical_evacuation: 3,
  replacement_booking: 3,
  damage_report: 3,
  rental_contract: 3,
  driver_license: 3,
  repair_estimate_or_invoice: 3,
  third_party_details: 3,
  travel_advisory: 3,
  embassy_contact_proof: 3,
  employer_letter: 3,
  medical_record_12mo: 'pass2_plus',
};

/**
 * Returns true if Prompt 01b can be skipped because broad maps to one subtype.
 * Saves ~$0.003 per such document (D-018 cost optimization).
 */
export function canSkipSubtypeClassification(broad: DocumentType): boolean {
  return SUBTYPES_BY_DOCUMENT_TYPE[broad].length === 1;
}

/**
 * For broads with exactly one subtype, returns that subtype.
 * Throws if called on a broad with multiple subtypes; callers must guard
 * with canSkipSubtypeClassification.
 */
export function getOnlySubtype(broad: DocumentType): DocumentSubtype {
  const subtypes = SUBTYPES_BY_DOCUMENT_TYPE[broad];
  if (subtypes.length !== 1) {
    throw new Error(
      `getOnlySubtype called on broad type with ${subtypes.length} subtypes: ${broad}`,
    );
  }
  return subtypes[0]!;
}
```

DAG phase mapping notes against taxonomy v1.1:
- Doc 1 `claim_form` → Phase 1 ✓
- Doc 2 `policy` → Phase 1 ✓
- Doc 3 `policy_terms` → Phase 1 ✓
- Doc 5 `id_or_passport` → Phase 1 ✓
- Doc 6 `bank_account_confirmation` → Phase 1 ✓
- Doc 13 `incident_affidavit` → Phase 1 ✓
- Doc 24 split → `pharmacy_receipt` Phase 3, `prescription` Phase 3 ✓ (taxonomy says doc 24 is Phase 3 depending on doc 21)
- Doc 25 `medical_record_12mo` → `pass2_plus` ✓
- Others → Phase 2 or Phase 3 per taxonomy.

DAG phase is **runtime-only**; no DB column. If query patterns later require it, a column may be added in a follow-up spike.

## 8. New file — `/lib/llm/classify-subtype.ts`

Mirrors structure of existing `/lib/llm/classify-document.ts`. Differences:
- Inputs include the broad `DocumentType` (already classified by Prompt 01).
- Fast path: when `canSkipSubtypeClassification(broad)` is true, returns immediately with no LLM call.
- LLM prompt explicitly enumerates allowed subtypes for the given broad, with Hebrew labels for grounding.
- Invalid LLM response → returns `documentSubtype: null` (not fallback). Orchestrator persists null.

### 8.1 Public surface

```typescript
import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';

import { DEFAULT_MODEL, callClaudeJSON } from './client';
import {
  SUBTYPES_BY_DOCUMENT_TYPE,
  SUBTYPE_LABELS_HE,
  canSkipSubtypeClassification,
  getOnlySubtype,
} from './document-subtypes';
import { createAdminClient } from '@/lib/supabase/admin';
import type { DocumentSubtype, DocumentType } from '@/lib/types';

export class SubtypeClassifierPreCallError extends Error {
  readonly phase = 'pre_call' as const;
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'SubtypeClassifierPreCallError';
  }
}

export class SubtypeClassifierLLMError extends Error {
  readonly phase = 'llm_call' as const;
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'SubtypeClassifierLLMError';
  }
}

export type ClassifySubtypeResult = {
  /**
   * Null when the LLM returned a value outside the allowed list for the
   * broad. Orchestrator persists null and skips emitting the
   * subtype_classified event in that case.
   */
  documentSubtype: DocumentSubtype | null;
  /**
   * The raw value the LLM returned (or null on skip path / pre-validated
   * non-LLM path). Used by the orchestrator to populate
   * audit_log.details.llm_returned_invalid_subtype on null result.
   */
  llmReturnedRaw: string | null;
  confidence: number;
  reasoning: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  /**
   * True when the result was set deterministically (broad → 1 subtype) with
   * no LLM call. modelId === SUBTYPE_DETERMINISTIC_ACTOR_ID in this case.
   */
  skipped: boolean;
};

export const SUBTYPE_DETERMINISTIC_ACTOR_ID = 'system:single-subtype-mapping';
export const SUBTYPE_PRECALL_SENTINEL = 'subtype-classifier:pre-call-failure';
/**
 * Used only for catastrophic wrapper bugs (e.g., callClaudeJSON returns
 * undefined despite no thrown error). When a real LLM call throws, the
 * actor_id is DEFAULT_MODEL from client.ts (single source of truth for
 * the model identifier).
 */
export const SUBTYPE_WRAPPER_SENTINEL = 'subtype-classifier:wrapper-error';

export async function classifySubtypeFromStorage(
  input: {
    documentId: string;
    fileName: string;
    broad: DocumentType;
  },
  deps: {
    supabaseAdmin?: ReturnType<typeof createAdminClient>;
    callClaude?: typeof callClaudeJSON;
  } = {},
): Promise<ClassifySubtypeResult>;
```

### 8.2 Implementation outline

```typescript
type SubtypeJsonOutput = {
  document_subtype: string;
  confidence: number;
  reasoning: string;
};

export async function classifySubtypeFromStorage(input, deps = {}) {
  // Fast path: broad → 1 subtype, no LLM call needed.
  if (canSkipSubtypeClassification(input.broad)) {
    const only = getOnlySubtype(input.broad);
    return {
      documentSubtype: only,
      llmReturnedRaw: null,
      confidence: 1,
      reasoning: `סיווג מהיר: ${SUBTYPE_LABELS_HE[only]} הוא הסוג היחיד עבור ${input.broad}`,
      modelId: SUBTYPE_DETERMINISTIC_ACTOR_ID,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      skipped: true,
    };
  }

  // Test/dev fake path. The env var SPECTIX_FAKE_CLAUDE_CLASSIFIER is
  // PRESERVED from /lib/llm/classify-document.ts (introduced in #03ג).
  // No new env var is added.
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.SPECTIX_FAKE_CLAUDE_CLASSIFIER === 'true'
  ) {
    return fakeSubtypeResult(input.broad);
  }

  // Real LLM path
  const allowedSubtypes = SUBTYPES_BY_DOCUMENT_TYPE[input.broad];
  if (allowedSubtypes.length < 2) {
    // Defensive: this branch should be unreachable due to canSkip guard above.
    throw new SubtypeClassifierPreCallError(
      `internal: subtype classifier reached LLM path with only ${allowedSubtypes.length} valid subtype(s) for broad=${input.broad}`,
    );
  }

  const contentBlocks = await preparePayload(input, deps);
  const callClaude = deps.callClaude ?? callClaudeJSON;

  let result;
  try {
    result = await callClaude<SubtypeJsonOutput>({
      system: buildSystemPrompt(input.broad, allowedSubtypes),
      contentBlocks,
      maxTokens: 500,
    });
  } catch (error) {
    throw new SubtypeClassifierLLMError(
      `Claude API call failed: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  }

  if (result.parseError || !result.parsed) {
    throw new SubtypeClassifierLLMError(
      `Claude returned invalid JSON: ${result.parseError ?? 'parsed null'}. Raw: ${result.rawText.slice(0, 200)}`,
    );
  }

  const candidate = result.parsed.document_subtype;
  const isValid =
    typeof candidate === 'string' &&
    (allowedSubtypes as readonly string[]).includes(candidate);

  return {
    documentSubtype: isValid ? (candidate as DocumentSubtype) : null,
    llmReturnedRaw: typeof candidate === 'string' ? candidate : null,
    confidence:
      typeof result.parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, result.parsed.confidence))
        : 0,
    reasoning:
      typeof result.parsed.reasoning === 'string'
        ? result.parsed.reasoning
        : '',
    modelId: result.modelId,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
    skipped: false,
  };
}
```

### 8.3 System prompt builder

```typescript
function buildSystemPrompt(
  broad: DocumentType,
  allowed: readonly DocumentSubtype[],
): string {
  const labeled = allowed
    .map((s) => `- ${s} (${SUBTYPE_LABELS_HE[s]})`)
    .join('\n');
  return `You are a fine-grained document classifier for an insurance claims system.

The broad document category has already been identified as: ${broad}.

Your job: pick the most precise subtype from the constrained list below.

Allowed subtypes (id followed by Hebrew label in parentheses):
${labeled}

Rules:
- Return ONLY a value from the allowed list. Never invent a new subtype id.
- Use the document content (image/PDF) and filename to decide.
- If multiple subtypes seem possible, pick the closest match and lower confidence.
- Return strictly JSON. No preamble, no code fences.`;
}
```

### 8.4 User prompt block

```typescript
const userPromptBlock: BetaContentBlockParam = {
  type: 'text',
  text: `File name: ${input.fileName}

Return JSON:
{
  "document_subtype": "<one of the allowed subtype ids>",
  "confidence": 0.0-1.0,
  "reasoning": "סיבה קצרה בעברית"
}`,
};
```

### 8.5 Pre-call payload preparation

Identical structure to `classify-document.ts:preparePayload` (fetch document row, fetch storage object, encode base64, build content block per mime type). HEIC remains unsupported.

### 8.6 Fake path (test/dev)

```typescript
function fakeSubtypeResult(broad: DocumentType): ClassifySubtypeResult {
  // Fake returns the first valid subtype for the broad. Tests that need
  // non-trivial subtypes inject deps.callClaude directly.
  const subtypes = SUBTYPES_BY_DOCUMENT_TYPE[broad];
  const subtype = subtypes[0]!;
  return {
    documentSubtype: subtype,
    llmReturnedRaw: subtype,
    confidence: 0.88,
    reasoning: `סיווג בדיקה מקומי: ${SUBTYPE_LABELS_HE[subtype]}`,
    modelId: 'local-fake-claude-subtype-classifier',
    inputTokens: 80,
    outputTokens: 30,
    costUsd: 0.000_69,
    skipped: false,
  };
}
```

## 9. Inngest orchestration — `/inngest/functions/process-document.ts`

### 9.1 New shape

After the existing `claude-classify` step returns `classifierResult`, the function:
1. Calls `upsert-pass-broad-cost` (new step) with broad-only cost. **Always runs when broad succeeded** — independent of subtype outcome.
2. Calls `claude-classify-subtype` (new step) → `subtypeResult`.
3. Calls `upsert-pass-subtype-cost` (new step) only if subtype succeeded with non-skip cost.
4. `finalize-processed` (existing step, modified) — UPDATE row with both broad and subtype, INSERT both audits in same step.run.
5. Emits `claim/document.processed` (existing).
6. Emits `claim/document.subtype_classified` (new) — only if subtype is non-null.

### 9.2 Step ordering

```
claim-pending           (existing, unchanged)
audit-started           (existing, unchanged)
claude-classify         (existing, unchanged) → broad classifierResult
upsert-pass-broad-cost  (NEW) → records broad cost in passes
claude-classify-subtype (NEW) → subtypeResult OR throws
upsert-pass-subtype-cost(NEW, conditional) → records subtype cost if non-skip success
finalize-processed      (MODIFIED) → UPDATE + 2 audits in one step.run
emit-processed          (existing)
emit-subtype-classified (NEW, conditional) → only if documentSubtype != null
```

### 9.3 Failure handling

| Scenario | Outcome | Cost recorded? |
| --- | --- | --- |
| Broad pre-call failure | finalize-failed; document → failed | No (no LLM call made) |
| Broad LLM call failure | finalize-failed; document → failed | No (#03ג precedent — classifierResult null in catch) |
| **Broad success + subtype pre-call failure** | finalize-failed; document → failed | **Yes — broad cost (BLOCKER 2 fix)** |
| **Broad success + subtype LLM call failure** | finalize-failed; document → failed | **Yes — broad cost (BLOCKER 2 fix)** |
| Broad success + subtype LLM returns invalid id | finalize-processed; document → processed; document_subtype=null | Yes — broad cost + subtype cost |
| Broad success + subtype skip path | finalize-processed; document → processed | Yes — broad cost only (skip cost is 0) |
| Broad success + subtype LLM success | finalize-processed; document → processed | Yes — broad cost + subtype cost |

audit_log actor convention:

| Scenario | actor_type | actor_id |
| --- | --- | --- |
| Subtype skip path (deterministic) | `system` | `SUBTYPE_DETERMINISTIC_ACTOR_ID` (`system:single-subtype-mapping`) |
| Subtype pre-call failure | `system` | `SUBTYPE_PRECALL_SENTINEL` (`subtype-classifier:pre-call-failure`) |
| Subtype LLM call failure (SDK threw) | `llm` | `DEFAULT_MODEL` (imported from `/lib/llm/client.ts`) |
| Subtype wrapper bug (catastrophic) | `llm` | `SUBTYPE_WRAPPER_SENTINEL` (`subtype-classifier:wrapper-error`) — reserved for the case where callClaude returns something the wrapper cannot interpret without throwing |
| Subtype LLM success | `llm` | model id from response |

### 9.4 upsert_pass_increment — two calls

The existing RPC `public.upsert_pass_increment` is unchanged (no migration update). It is idempotent: re-running with the same args is safe because Inngest caches step.run results. Re-running with different args during retry of same step.run — Inngest replays the step, and the RPC accumulates. PM v1 noted: this is ALREADY the case for #03ג's single upsert; the two-step pattern preserves the behavior per call.

```typescript
// AFTER claude-classify (success path; classifierResult non-null):
await step.run('upsert-pass-broad-cost', async () => {
  const { error } = await supabaseAdmin.rpc('upsert_pass_increment', {
    p_claim_id: claimId,
    p_pass_number: 1,
    p_calls_increment: 1,
    p_cost_increment: classifierResult.costUsd,
  });
  if (error) {
    throw new Error(`upsert_pass_increment (broad) failed: ${error.message}`);
  }
});

// AFTER claude-classify-subtype (success path; only when LLM was actually called):
if (subtypeResult && !subtypeResult.skipped) {
  await step.run('upsert-pass-subtype-cost', async () => {
    const { error } = await supabaseAdmin.rpc('upsert_pass_increment', {
      p_claim_id: claimId,
      p_pass_number: 1,
      p_calls_increment: 1,
      p_cost_increment: subtypeResult.costUsd,
    });
    if (error) {
      throw new Error(`upsert_pass_increment (subtype) failed: ${error.message}`);
    }
  });
}
```

When broad fails (any reason) — neither upsert runs. Same precedent as #03ג. (No LLM call made = no cost incurred at Anthropic.)

When broad succeeds but subtype fails — `upsert-pass-broad-cost` already ran (broad cost recorded), then subtype throws, the function jumps to finalize-failed branch. Subtype `upsert-pass-subtype-cost` never runs because the throw happens before it. Broad cost is preserved. **This is the BLOCKER 2 fix.**

### 9.5 finalize-processed step.run — explicit code

```typescript
const finalizeOutcome = (await step.run('finalize-processed', async () => {
  const processingTimeMs = Date.now() - startTime;

  // --- 1. UPDATE documents row (idempotent via WHERE clause) ---
  const { data, error } = await supabaseAdmin
    .from('documents')
    .update({
      processing_status: 'processed',
      document_type: classifierResult.documentType,
      document_subtype: subtypeResult.documentSubtype, // null when LLM returned invalid id
      extracted_data: {
        spike: '03d-1a',
        classifier: {
          document_type: classifierResult.documentType,
          confidence: classifierResult.confidence,
          reasoning: classifierResult.reasoning,
        },
        subtype: {
          document_subtype: subtypeResult.documentSubtype,
          confidence: subtypeResult.confidence,
          reasoning: subtypeResult.reasoning,
          skipped: subtypeResult.skipped,
          llm_returned_raw: subtypeResult.llmReturnedRaw,
        },
        processing_time_ms: processingTimeMs,
      },
    })
    .eq('id', documentId)
    .eq('processing_status', 'processing')
    .select('id')
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    logger.warn('[skip-finalize] state changed mid-processing', {
      documentId,
      expected: 'processing',
    });
    return { transitioned: false };
  }

  // --- 2. audit_log: broad classification completed ---
  // Same actor convention as #03ג: actor_type='llm', actor_id=model id.
  const { error: broadAuditError } = await supabaseAdmin.from('audit_log').insert({
    claim_id: claimId,
    actor_type: 'llm',
    actor_id: classifierResult.modelId,
    action: 'document_processing_completed',
    target_table: 'documents',
    target_id: documentId,
    details: {
      document_type: classifierResult.documentType,
      confidence: classifierResult.confidence,
      processing_time_ms: processingTimeMs,
      cost_usd: classifierResult.costUsd,
      input_tokens: classifierResult.inputTokens,
      output_tokens: classifierResult.outputTokens,
    },
  });
  if (broadAuditError) {
    logger.error('[audit-failure-broad]', { documentId, error: broadAuditError });
  }

  // --- 3. audit_log: subtype classification completed ---
  // actor_type='llm' for real LLM call OR 'system' for skip path.
  // action follows <verb>_completed convention (PM v1 important #2).
  const subtypeAuditActorType = subtypeResult.skipped ? 'system' : 'llm';
  const subtypeAuditActorId = subtypeResult.modelId; // either deterministic id or real model id
  const subtypeAuditDetails: Record<string, unknown> = {
    document_type: classifierResult.documentType,
    document_subtype: subtypeResult.documentSubtype, // may be null
    confidence: subtypeResult.confidence,
    skipped: subtypeResult.skipped,
    cost_usd: subtypeResult.costUsd,
    input_tokens: subtypeResult.inputTokens,
    output_tokens: subtypeResult.outputTokens,
  };
  if (subtypeResult.documentSubtype === null && subtypeResult.llmReturnedRaw !== null) {
    subtypeAuditDetails.llm_returned_invalid_subtype = subtypeResult.llmReturnedRaw;
  }
  const { error: subtypeAuditError } = await supabaseAdmin.from('audit_log').insert({
    claim_id: claimId,
    actor_type: subtypeAuditActorType,
    actor_id: subtypeAuditActorId,
    action: 'document_subtype_classification_completed',
    target_table: 'documents',
    target_id: documentId,
    details: subtypeAuditDetails,
  });
  if (subtypeAuditError) {
    logger.error('[audit-failure-subtype]', { documentId, error: subtypeAuditError });
  }

  return { transitioned: true };
})) as { transitioned: boolean };
```

Both audit INSERTs are inside the same `step.run('finalize-processed', ...)`. On Inngest retry, the entire step replays. The UPDATE has a guard (`.eq('processing_status', 'processing')`) — if the row already moved to `processed`, returns no row, transitioned=false, and audits are not re-inserted.

This matches the #03ג audit-on-success convention: best-effort logging. Failure of an audit INSERT does not break the document state transition.

### 9.6 Failure path — finalize-failed

For the BLOCKER 2 case (broad success + subtype failure), the failure path **retains** the broad cost via `upsert-pass-broad-cost` which already ran. Then:

```typescript
// Inside the failure branch (failureCategory !== null):
const auditActor = getFailureAuditActor(failureCategory, classifierResult, subtypeResult);
const finalizeOutcome = (await step.run('finalize-failed', async () => {
  const processingTimeMs = Date.now() - startTime;
  const { data, error } = await supabaseAdmin
    .from('documents')
    .update({
      processing_status: 'failed',
      extracted_data: {
        spike: '03d-1a',
        error: failureReason,
        processing_time_ms: processingTimeMs,
        failure_category: failureCategory,
        // failure phase: 'broad' | 'subtype' — distinguishes blocker-2 case
        failure_phase: failurePhase,
      },
    })
    .eq('id', documentId)
    .eq('processing_status', 'processing')
    .select('id')
    .maybeSingle();
  // ... rest matches #03ג finalize-failed pattern
}));
```

`failurePhase` is a new field in `extracted_data` for failed documents. Values: `'broad'` (broad classifier failed), `'subtype'` (broad succeeded, subtype failed). Helps post-mortem distinguish blocker-2-class incidents.

### 9.7 Emitted events — explicit step.sendEvent

After successful finalization (`transitioned: true`):

```typescript
// Existing — backwards compat
const processedEvent: DocumentProcessedEvent = {
  name: 'claim/document.processed',
  data: {
    claimId,
    documentId,
    documentType: classifierResult.documentType,
  },
};
await step.sendEvent('emit-processed', processedEvent);

// NEW — only when subtype is non-null. Skipped if LLM returned invalid.
if (subtypeResult.documentSubtype !== null) {
  const subtypeEvent: DocumentSubtypeClassifiedEvent = {
    name: 'claim/document.subtype_classified',
    data: {
      claimId,
      documentId,
      documentType: classifierResult.documentType,
      documentSubtype: subtypeResult.documentSubtype,
    },
  };
  await step.sendEvent('emit-subtype-classified', subtypeEvent);
}
```

Both events are emitted via `step.sendEvent(name, payload)`. Inngest handles `sendEvent` with built-in retry safety. Names `emit-processed` and `emit-subtype-classified` make the workflow explicit in the Inngest dashboard.

There is no consumer of `claim/document.subtype_classified` in this spike. The event is dispatched and dropped. Intentional — establishes the contract so #03ד-1b can be built without re-touching `process-document.ts`.

## 10. Documentation updates

Same PR includes:

### 10.1 `/docs/DECISIONS.md`

Append D-018 with full text from Section 3 above (including v1.1 refinement of pharmacy_receipt + prescription split).

### 10.2 `/docs/HARD_REQUIREMENTS.md`

Bug fix in Satisfied table:

```diff
-| HR-001 | #03b        | Stuck-document watchdog | [PR #14](...) | 11b           | satisfied |
+| HR-001 | #03ב        | Stuck-document watchdog | [PR #14](...) | 11b           | satisfied |
```

### 10.3 `/docs/PM_REVIEW_CHECKLIST.md`

Add 5.11 and 5.12 to Section 5:

```markdown
  5.11. **External API identifier verification**

- Specs that name an external API model id, version string, endpoint path,
  or SDK identifier must cite the vendor source (Anthropic docs, AWS docs,
  etc.) used to obtain it.
- Codex verifies the identifier against the cited source before merging.
- Reject specs that use identifiers from memory without a citation.
- Origin: PR #15 hotfix. Model id `claude-sonnet-4-6-20250915` was invented
  from CEO memory; production failed at first run.

  5.12. **Dirty-input tests for parsing/sanitization**

- Specs that include parsing, normalization, or sanitization logic
  (strip code fences, trim whitespace, extract JSON from prose, decode
  base64, etc.) require at least one test where the input contains the
  artifact being stripped.
- Clean-input tests do not satisfy this requirement.
- Origin: PR #15 hotfix. JSON parser added code-fence cleanup but tests
  used clean JSON; Sonnet 4.5 returned fenced JSON in production and
  broke the strict parser.
```

### 10.4 `/docs/DB_SCHEMA.md`

Update `documents` section:

```diff
 - `document_type text not null`
+- `document_subtype text null` (migration #0005)
 - `file_path text not null`
```

```diff
 - `documents_document_type_check`: `police_report`, `hotel_letter`, `receipt`, `medical_report`, `witness_letter`, `flight_doc`, `photo`, `other`.
+- `documents_document_subtype_check`: nullable; if not null, must be one of 37 values matching `DocumentSubtype` in [lib/types.ts](../lib/types.ts).
```

```diff
-Indexes: `documents_claim_id_idx`, `documents_document_type_idx`.
+Indexes: `documents_claim_id_idx`, `documents_document_type_idx`, `documents_document_subtype_idx` (partial: WHERE document_subtype IS NOT NULL).
```

### 10.5 `/docs/MIGRATIONS.md`

Add row for migration 0005 (format matches existing entries).

### 10.6 `/docs/CONVENTIONS.md`

Append new actions to the audit_log action list:
- `document_subtype_classification_completed` — emitted after subtype classifier (Prompt 01b) finishes successfully or returns null. actor_type per Section 9.3.

Also document the env var preserved in this spike:
- `SPECTIX_FAKE_CLAUDE_CLASSIFIER` — controls fake path for both classify-document AND classify-subtype. Non-production only.

### 10.7 `/docs/CURRENT_STATE.md`

Update to reflect post-#03ד-1a state (subtype classification live but no extraction yet).

### 10.8 `/docs/specs/spike-03d-1a.md`

This spec, committed as canonical English. CEO is responsible for the translation accuracy. Codex commits as-is without modification of the English version.

### 10.9 `/docs/specs/README.md`

Add spike-03d-1a entry to the index.

### 10.10 `/lib/version.ts`

Bump to `Spectix Spike #18 • 2025-05-DD` (DD = merge date).

## 11. Tests

### 11.1 New: `tests/unit/document-subtypes.test.ts`

Required cases:

1. `SUBTYPES_BY_DOCUMENT_TYPE` — flattened union equals all 37 `DocumentSubtype` values, no duplicates, no missing.
2. `SUBTYPE_LABELS_HE` — keys equal all 37 `DocumentSubtype` values; every value is a non-empty Hebrew string.
3. `SUBTYPE_DAG_PHASE` — keys equal all 37 `DocumentSubtype` values.
4. `canSkipSubtypeClassification('police_report')` === true. Same for `hotel_letter`, `witness_letter`, `photo`.
5. `canSkipSubtypeClassification('receipt')` === false. Same for `medical_report`, `flight_doc`, `other`.
6. `getOnlySubtype('police_report')` === `'police_report'`. Same for the other three single-subtype broads.
7. `getOnlySubtype('receipt')` throws.
8. Phase 1 subtypes match taxonomy (claim_form, policy, policy_terms, id_or_passport, bank_account_confirmation, incident_affidavit). Spot-check.
9. `medical_record_12mo` is `'pass2_plus'`.
10. **NEW v1.1**: `pharmacy_receipt` is in `SUBTYPES_BY_DOCUMENT_TYPE.receipt`. `prescription` is in `SUBTYPES_BY_DOCUMENT_TYPE.medical_report`. Neither appears in `SUBTYPES_BY_DOCUMENT_TYPE.other`.

### 11.2 New: `tests/unit/classify-subtype.test.ts`

Required cases:

1. **Skip path — police_report**: returns `{ documentSubtype: 'police_report', skipped: true, costUsd: 0, modelId: SUBTYPE_DETERMINISTIC_ACTOR_ID, llmReturnedRaw: null }`. No call to deps.callClaude.
2. **Skip path — photo**: same shape with `documentSubtype: 'photos'`.
3. **LLM path — receipt success**: deps.callClaude mock returns `{ document_subtype: 'medical_receipt', confidence: 0.85, reasoning: '...' }`. Result: `{ documentSubtype: 'medical_receipt', skipped: false, costUsd: > 0, llmReturnedRaw: 'medical_receipt' }`.
4. **LLM path — system prompt enumerates allowed subtypes**: assert that the system string passed to callClaude contains all 4 receipt subtypes by id (general_receipt, medical_receipt, repair_estimate_or_invoice, pharmacy_receipt) and includes Hebrew labels.
5. **LLM path — invalid subtype returns null (BLOCKER 4 fix)**: deps.callClaude returns `{ document_subtype: 'made_up_subtype', confidence: 0.5, reasoning: '...' }`. Result: `{ documentSubtype: null, llmReturnedRaw: 'made_up_subtype', skipped: false, costUsd: > 0 }`. Function does NOT throw.
6. **LLM path — dirty input (PM checklist 5.12)**: deps.callClaude is NOT mocked; instead, set up to receive a raw response with code fences (`'```json\n{...}\n```'`). The real `callClaudeJSON` (or its mock that exercises `parseClaudeJSON`) handles fence stripping; the test asserts the function returns success with the parsed value. Verifies the dirty-input pathway end-to-end.
7. **LLM path — pre-call failure (no file_path)**: throws `SubtypeClassifierPreCallError`.
8. **LLM path — pre-call failure (unsupported mime)**: throws `SubtypeClassifierPreCallError`.
9. **LLM path — wrapper failure (callClaude throws)**: throws `SubtypeClassifierLLMError`.
10. **LLM path — wrapper failure (parsed null + parseError)**: throws `SubtypeClassifierLLMError`.
11. **NEW v1.1**: receipt broad → pharmacy_receipt subtype reachable. Mock callClaude returns `{ document_subtype: 'pharmacy_receipt', ... }`. Result: `documentSubtype: 'pharmacy_receipt'`.

### 11.3 Update: `tests/unit/process-document-claude.test.ts`

Existing cases stay. Add:

- **U-NEW-1: happy path with skip-subtype broad**. Mock classifier returns `documentType: 'police_report'`. Verify: writes `document_subtype = 'police_report'`, both audits inserted, broad upsert called once with broad cost, subtype upsert NOT called (skip path), both events emitted.
- **U-NEW-2: happy path with LLM-subtype broad**. Mock classifier returns `documentType: 'receipt'`. Mock subtype classifier returns `documentSubtype: 'medical_receipt'`. Verify: both upserts called separately (broad + subtype), finalize UPDATE includes `document_subtype: 'medical_receipt'`, both audits with correct actors, both events emitted.
- **U-NEW-3: subtype LLM error AFTER broad success (BLOCKER 2)**. Broad classifier succeeds. Subtype classifier throws `SubtypeClassifierLLMError`. Assert: `upsert-pass-broad-cost` was called. `upsert-pass-subtype-cost` was NOT called. Document → failed. failure_phase='subtype' in extracted_data. Audit failure entry has actor_type='llm', actor_id=DEFAULT_MODEL.
- **U-NEW-4: subtype pre-call error AFTER broad success**. Broad classifier succeeds. Subtype classifier throws `SubtypeClassifierPreCallError`. Assert: `upsert-pass-broad-cost` was called. Document → failed. Audit failure entry has actor_type='system', actor_id=SUBTYPE_PRECALL_SENTINEL.
- **U-NEW-5: invalid LLM subtype → null persisted, document succeeds (BLOCKER 4)**. Subtype classifier returns `{ documentSubtype: null, llmReturnedRaw: 'invalid_value' }`. Assert: finalize UPDATE writes `document_subtype: null`. Audit `details.llm_returned_invalid_subtype = 'invalid_value'`. `claim/document.subtype_classified` event NOT emitted. `claim/document.processed` event IS emitted.

### 11.4 Migration tests

Codex provides EITHER `tests/db/0005-document-subtype.test.ts` round-trip test OR psql evidence in PR description. Not both, not neither. The PR review fails if neither is present.

Round-trip evidence shows: column added, CHECK constraint present (with all 37 values), partial index present, rollback removes all three.

### 11.5 E2E

No new Playwright e2e in 1a — UI surface unchanged. Existing `document-classification.spec.ts` continues to pass: it tests up to broad classification; subtype path is internal.

### 11.6 Pass thresholds

After this spike: target ≥ 76 unit (66 + ~10 new total: ~10 in document-subtypes + ~11 in classify-subtype + 5 in process-document-claude — minus overlap). Playwright unchanged at 61.

Concrete floor: 76 unit, 61 e2e.

## 12. Boundaries — files Codex MUST NOT touch

- Migrations 0001-0004 (immutable).
- `/lib/llm/client.ts` (no change required; client is stable; DEFAULT_MODEL is imported as-is).
- `/lib/llm/classify-document.ts` (Prompt 01 unchanged per D-018).
- `/inngest/functions/watchdog-stuck-documents.ts` (separate concern).
- `/lib/auth/*`, `/middleware.ts`, `/app/api/*` route handlers (out of scope).
- `/lib/sample-data/*` may be patched ONLY to satisfy `documentSubtype: null` field on Document literals; no other change.

## 13. Edge cases

- **No `ANTHROPIC_API_KEY`**: subtype classifier behaves like classify-document — local real-Claude tests skip; production must have the env.
- **Storage download repeats**: subtype classifier downloads the same file as broad classifier. Acceptable for #03ד-1a; future optimization could cache the bytes between steps but adds complexity. Tracked as TECH_DEBT 11k.
- **Mid-processing state mutation**: handled the same way as broad classifier — finalize returns `{ transitioned: false }` if row no longer in `processing` state. No event emitted.
- **Race with watchdog**: subtype classifier can run concurrently with watchdog. Watchdog only handles documents stuck past timeout; broad+subtype together (with retries) must fit comfortably under existing watchdog timeout — verify with Section 14 #17.
- **HEIC**: rejected at upload (D-017). Not reachable here.
- **LLM returns subtype outside allowed list**: documentSubtype = null. Document succeeds. Audit logged with raw LLM value. subtype event NOT emitted.
- **LLM returns valid id but with extra fields**: parsed via `JSON.parse`; extra fields ignored.
- **Concurrent retries (5 × 3 = 15 LLM concurrent per claim, now × 2 for two-tier = up to 30)**: documented in #03ג; acceptable for POC. No change here.

## 14. Acceptance criteria

Every item must be verifiable.

1. `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` pass.
2. `pnpm test` passes; ≥ 76 unit tests.
3. `pnpm test:e2e` passes; ≥ 61 e2e tests.
4. Migration 0005 applies against local Supabase via `pnpm supabase db reset` (or Supabase CLI equivalent). Column, CHECK (37 values), and partial index all present.
5. Rollback `0005_document_subtype.down.sql` reverses cleanly (verified per D-015 — Codex captures evidence in PR).
6. New file `/lib/llm/document-subtypes.ts` exists with declared exports.
7. New file `/lib/llm/classify-subtype.ts` exists with declared exports.
8. `/lib/types.ts` includes `DocumentSubtype` (37 values), `Document.documentSubtype`, `DocumentSubtypeClassifiedEvent`, updated `SpectixInngestEvent`.
9. `/inngest/functions/process-document.ts` includes `claude-classify-subtype`, `upsert-pass-broad-cost`, `upsert-pass-subtype-cost` steps. finalize-processed UPDATE writes both broad and subtype. Both audits inside same step.run. Both events conditionally emitted via step.sendEvent.
10. `/docs/DECISIONS.md` has D-018 entry (with v1.1 refinement).
11. `/docs/HARD_REQUIREMENTS.md` HR-001 source spec reads `#03ב` not `#03b`.
12. `/docs/PM_REVIEW_CHECKLIST.md` Section 5 has new 5.11 and 5.12.
13. `/docs/DB_SCHEMA.md` updated for documents.
14. `/docs/CONVENTIONS.md` includes new audit action `document_subtype_classification_completed` and SPECTIX_FAKE_CLAUDE_CLASSIFIER env var documented.
15. `/docs/specs/spike-03d-1a.md` exists; `/docs/specs/README.md` updated.
16. `/lib/version.ts` bumped to Spike #18 with merge date.
17. **Production smoke**:
    - A new claim is created via /new (or existing claim 2026-XXX). One PDF uploaded. Document reaches `processing_status = 'processed'` with both `document_type` and `document_subtype` populated (or `document_subtype = null` if LLM returned invalid).
    - For a `police_report` upload: `document_subtype = 'police_report'`, audit_log has `document_processing_completed` (actor=llm, real model id) and `document_subtype_classification_completed` (actor=system, actor_id=`system:single-subtype-mapping`).
    - For a `receipt` upload: subtype is one of the 4 valid values (general_receipt, medical_receipt, repair_estimate_or_invoice, pharmacy_receipt) OR null with `details.llm_returned_invalid_subtype` populated. The subtype audit entry has actor=llm with real model id.
    - **PR description records measured `processing_time_ms` from the smoke run** (Important #3 — watchdog margin baseline).
18. `claims.total_llm_cost_usd` after a fresh processed document equals broad cost + subtype cost (non-skip cases) or broad cost only (skip cases). For broad-success-then-subtype-failure cases, `claims.total_llm_cost_usd` retains the broad cost (BLOCKER 2 verification).
19. PR description includes evidence that `upsert-pass-broad-cost` ran in a deliberately-failed-subtype test (e.g., `SPECTIX_FORCE_SUBTYPE_FAILURE=true` env or a unit test snapshot showing the call sequence).

## 15. Verification commands and evidence in PR

Codex includes:

- Output of `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`.
- Output of `pnpm supabase db reset` (or migration apply log).
- Output of `psql -c "select column_name, data_type from information_schema.columns where table_name='documents' order by ordinal_position;"` showing `document_subtype` present.
- Output of `psql -c "select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.documents'::regclass;"` showing the 37-value CHECK.
- Production smoke evidence (claim id, document id, processing_status, document_type, document_subtype, audit_log rows, processing_time_ms).
- BLOCKER 2 verification: unit test snapshot OR production force-failure showing broad cost in `claims.total_llm_cost_usd` after a subtype-stage failure.

## 16. TECH_DEBT entries to add

Append to `/docs/TECH_DEBT.md`:

- **11k**: subtype classifier downloads the same storage object as broad classifier. Future optimization: pass bytes between steps via Inngest step output. **Trigger: after 100+ documents processed in a 24h window** (revised from "$5/month egress" per PM v1 Important #4 — original trigger was unmeasurable without monitoring infrastructure).
- **11l**: `extracted_data` JSONB does not yet have a typed schema for the subtype block. After #03ד-1b extraction lands, harden via discriminated union. Trigger: simultaneous with #03ד-1b PR.
- **11m**: when Prompt 01b returns an invalid subtype, fallback is null + audit only — no human alert. Add monitoring after the third occurrence in production. Trigger: 3rd `details.llm_returned_invalid_subtype` audit entry in 30 days.
- **11n**: watchdog threshold (currently 5 minutes per HR-001) was set when only broad classification ran. Two-tier classification doubles the latency budget. **Trigger: revisit watchdog threshold when 95th percentile of `processing_time_ms` exceeds 60s in production over a 7-day window.**

## 17. Open questions

None. PM v1 questions Q1 (prescriptions placement) resolved via D-018 v1.1 refinement; Q2 (medical_record_12mo) confirmed in `other` broad with `pass2_plus` phase; Q3 (silent fallback) resolved by BLOCKER 4 fix.

## 18. Translation and CEO ownership

CEO writes specs in Hebrew during draft cycles (CEO chat, PM review). The canonical version committed to `/docs/specs/spike-XX.md` is **English** and matches the existing pattern (spike-03c.md and earlier). 

For this spike: CEO produces the English `/docs/specs/spike-03d-1a.md` from the PM-approved Hebrew/mixed v1.1 draft. Codex commits the English file as-is without modification of spec semantics. PM has reviewed the v1.1 content; translation is a CEO-owned step.

Future process change (defining a quality gate for translation, optional bilingual policy) is out of scope for this spike; tracked separately if a customer or contributor surfaces the need.

## 19. Revision history

### v1.1 (2025-05-03)
Post PM v1 review.

Blocking resolutions:
- Split `prescriptions_and_pharmacy` into `pharmacy_receipt` (under receipt) + `prescription` (under medical_report). Total subtypes: 37.
- Two upsert-pass steps (broad + subtype) so broad cost is preserved on subtype failure.
- Explicit step.run wrapping for finalize-processed (UPDATE + 2 audits) and step.sendEvent for events.
- Invalid LLM subtype → `documentSubtype = null` (data integrity over fabricated default).

Important resolutions:
- SPECTIX_FAKE_CLAUDE_CLASSIFIER cited as preserved from #03ג.
- Action renamed `document_subtype_classification_completed` per `<verb>_completed` convention.
- Watchdog measurement added to acceptance + TECH_DEBT 11n.
- TECH_DEBT 11k trigger revised to measurable.
- Failure path actor_id uses DEFAULT_MODEL imported from client.ts; sentinel reserved for catastrophic wrapper bugs.
- Translation ownership clause added (Section 18).

Cosmetic resolutions:
- Migration uses `if not exists` and DO $$ for constraint idempotency.
- Section 11.4 deterministic (round-trip OR psql evidence, not both/neither).
- Open question Q3 deferred — resolved via BLOCKER 4.

### v1.0 (2025-05-03)
Initial CEO draft.

---

**Footer:** Spike #03ד-1a • CEO draft v1.1 • 2025-05-03
