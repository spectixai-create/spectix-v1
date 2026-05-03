# Active Implementation Spec — Spike #03ד-1b Broad Extraction Prompts

Status: in implementation  
Branch: `backend-broad-extraction-prompts`  
PR title: `Spike #03ד-1b: Broad Extraction Prompts (02-05) + extracted_data wiring`

## Context

After PR #16 / Spike #03ד-1a, the document pipeline populates:

- `documents.document_type`
- `documents.document_subtype`

Before this spike, `documents.extracted_data` holds classifier and subtype metadata only. Spike #03ד-1b adds four broad extraction prompts and writes structured extraction output into `extracted_data`.

## Scope

Create:

- `/lib/llm/extract/extract-receipt.ts`
- `/lib/llm/extract/extract-police.ts`
- `/lib/llm/extract/extract-hotel-generic.ts`
- `/lib/llm/extract/extract-medical.ts`
- `/lib/llm/extract/route-by-subtype.ts`

Modify:

- `/inngest/functions/process-document.ts`
- `/lib/types.ts`
- `/docs/CONVENTIONS.md`
- `/docs/CURRENT_STATE.md`
- `/docs/specs/spike-03d-1b.md`
- `/docs/specs/README.md`
- `/lib/version.ts`
- `/docs/TECH_DEBT.md`

## Constraints

- No new DB migration.
- Use option A: extend `process-document` after subtype classification.
- Extraction failure is degraded success: `processing_status` remains `processed`, broad/subtype data stays persisted, `extraction_error` is added to `extracted_data`, `document_extraction_failed` is audited, and `claim/document.extraction_failed` is emitted.
- Skip routes do not call Claude extraction.
- Unit tests must avoid real LLM calls.

## Routing

`routeBySubtype(broad, subtype)` returns:

- `receipt`
- `police`
- `hotel_generic`
- `medical`
- `skip_dedicated`
- `skip_other`

`subtype = null` and `broad = other` return `skip_other`. All 37 `DocumentSubtype` values must be mapped.

## Acceptance Criteria

1. Typecheck, lint, format, build, and unit tests pass.
2. Unit tests increase from 92 to at least 116.
3. Route tests cover all 37 subtypes.
4. Receipt, police, hotel-generic, and medical extractors have success, prompt, dirty JSON, pre-call, LLM failure, and parsed-null coverage.
5. `process-document` covers extraction success, deferred, failed, and discriminated union shape.
6. `lib/types.ts` includes extraction events.
7. No DB migration is added.
8. `lib/version.ts` is bumped to Spike #19.
9. PR is not merged until PM review and CEO final approval.
