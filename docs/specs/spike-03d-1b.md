# Spike #03ד-1b — Broad Extraction Prompts (02-05) + extracted_data wiring

Status: in implementation  
Owner: Codex  
Branch: `backend-broad-extraction-prompts`  
Priority: P1

This spec is the canonical in-repo copy for the Broad Extraction spike. The operational handoff is also captured in [codex_03d_1b_broad_extraction_prompts.md](codex_03d_1b_broad_extraction_prompts.md).

## Goal

Add the four broad extraction prompts after broad + subtype classification:

- Prompt 02: receipt extraction
- Prompt 03: police report extraction
- Prompt 04: hotel/service-provider generic extraction
- Prompt 05: medical report extraction

The pipeline writes structured extraction output into `documents.extracted_data`.

## Architecture

Use option A: extend the existing `process-document` Inngest function. Do not create a second extraction function in this spike.

No DB migration is allowed or required.

## Degraded Success

If extraction fails after classification succeeds:

- Keep `documents.processing_status = 'processed'`.
- Preserve broad and subtype data.
- Add `extraction_error` inside `extracted_data`.
- Insert `audit_log.action = 'document_extraction_failed'`.
- Emit `claim/document.extraction_failed`.

## Events

- `claim/document.extracted`
- `claim/document.extraction_failed`
- `claim/document.extraction_deferred`

## Validation

Run:

```powershell
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test
```

Run Playwright if time and environment allow:

```powershell
pnpm test:e2e --workers=1
```
