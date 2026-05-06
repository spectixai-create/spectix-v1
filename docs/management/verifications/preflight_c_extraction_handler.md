# UI-002A Pre-Flight Check C - Extraction Handler Subset Capability

Date: 2026-05-06

Mode: read-only local code inspection

Production project touched: no

## Grep Command

```bash
git grep -n -e "extraction.completed" -e "process-document" -e "claim/extraction" -- inngest
```

## Raw Output

```text
inngest/functions/index.ts:10:import { processDocument } from './process-document';
inngest/functions/process-document.ts:67:export const SYSTEM_ACTOR_ID = 'inngest:process-document';
inngest/functions/process-document.ts:71:  id: 'process-document',
inngest/functions/process-document.ts:175:      details: { trigger: 'inngest', function_id: 'process-document' },
inngest/functions/process-document.ts:616:                phase: 'extraction_completed',
inngest/functions/process-document.ts:644:              action: 'document_normalized_extraction_completed',
inngest/functions/process-document.ts:1032:            phase: 'extraction_completed',
inngest/functions/process-document.ts:1060:          action: 'document_extraction_completed',
inngest/functions/process-document.ts:1199:      name: 'claim/extraction.completed',
inngest/functions/process-document.ts:1203:    await step.sendEvent('emit-extraction-completed', extractionCompletedEvent);
inngest/functions/run-validation-pass.ts:349:  { event: 'claim/extraction.completed' },
```

## Handler Behavior

Inspected file:

- `inngest/functions/process-document.ts`

Observed event shape:

- `runProcessDocument` receives `DocumentUploadedEvent`.
- The handler reads `event.data.documentId` and `event.data.claimId`.
- It claims a single document by ID with `processing_status = 'pending'`.

Observed document claim pattern:

```ts
.from('documents')
.update({ processing_status: 'processing' })
.eq('id', documentId)
.eq('processing_status', 'pending')
```

## Answers

1. Does handler accept `document_ids: uuid[]` and process only those?

   No. The current handler accepts one `documentId`, not an array.

2. Or does it process all documents in claim with `status='pending'`?

   No. It does not scan the claim for all pending documents. It processes the single document addressed by the event.

3. If not subset-capable, what is the minimal patch?

   Minimal patch option:
   - Add a small re-cycle entrypoint that accepts selected document IDs.
   - For each selected document, reset/reopen the relevant document state according to the existing upload/retry convention.
   - Emit the existing `claim/document.uploaded` event once per selected `documentId`, preserving the current single-document `process-document` handler.
   - Reuse `reopen_pass_for_document_processing` for pass lifecycle reopening.

   This avoids rewriting `process-document` into a batch processor and keeps existing Inngest behavior intact.

4. Estimated effort:

   1-2 engineering days, including tests and non-prod smoke, if implemented as event fan-out around the existing single-document handler.

## Verdict

needs-patch

## Impact for UI-002B

If UI-002B requires claimant-uploaded documents to re-enter extraction selectively, it should include the event fan-out patch. If UI-002B only stores responses without re-extraction, this can be deferred to a later re-cycle sprint.
