# TASK-SPECTIX-001 Smoke Final Report

## Summary

TASK-SPECTIX-001 passed the non-production broad extraction smoke test after
retrying the eight previously failed synthetic smoke documents.

- Final status: `smoke_passed`
- Smoke claim ID: `443bdef7-1377-4628-9105-c0bed8a55614`
- Claim number: `2026-001`
- Non-production Supabase project: `aozbgunwhafabfmuwjol`
- Production Supabase project: `fcqporzsihuqtfohqtxs`
- Production touched: no
- App code changed: no
- DB schema changed: no
- Secrets printed: no
- New documents uploaded after retry: no

## Execution Result

- Retry executed: yes
- Documents reset: 8
- Events resent: 8
- All 8 documents processed: yes
- Current failed documents: none
- Current stuck documents: none
- Extraction routes passed: 6
- Deferred routes passed: 2
- `extraction_error` found: no

## Route Results

| Synthetic file                           | Expected route                                 | Result |
| ---------------------------------------- | ---------------------------------------------- | ------ |
| `receipt_general.synthetic.pdf`          | `receipt + general_receipt -> receipt`         | pass   |
| `police_report.synthetic.pdf`            | `police_report + police_report -> police`      | pass   |
| `hotel_letter.synthetic.pdf`             | `hotel_letter + hotel_letter -> hotel_generic` | pass   |
| `medical_visit.synthetic.pdf`            | `medical_report + medical_visit -> medical`    | pass   |
| `witness_letter.synthetic.pdf`           | `witness_letter + witnesses -> hotel_generic`  | pass   |
| `flight_booking_or_ticket.synthetic.pdf` | `flight_doc + flight_booking -> hotel_generic` | pass   |
| `boarding_pass.synthetic.pdf`            | `flight_doc + boarding_pass -> skip_dedicated` | pass   |
| `other_misc.synthetic.pdf`               | `other + claim_form -> skip_other`             | pass   |

## Extracted Data Findings

- Six extraction routes have `kind = extraction` and the expected `route`.
- Two deferred routes have `kind = classification` and no extraction route.
- No `extraction_error` was found.
- Classifier and subtype metadata were preserved in the persisted
  `extracted_data` payloads.

## Audit Findings

| Audit action                                | Count |
| ------------------------------------------- | ----: |
| `claim_created`                             |     1 |
| `document_uploaded`                         |     8 |
| `document_processing_started`               |    16 |
| `document_processing_failed`                |     8 |
| `document_processing_completed`             |     8 |
| `document_subtype_classification_completed` |     8 |
| `document_extraction_completed`             |     6 |
| `document_extraction_deferred`              |     2 |

The eight `document_processing_failed` rows are from the preserved first
attempt, which failed at broad classification due to an invalid local
Anthropic key. The retry succeeded after key verification.

## Pass And Cost Findings

- Pass rows: 1
- Pass 1 status: `in_progress`
- LLM calls made: 19
- Cost USD: `0.1604099999999999960`
- Findings count: 0
- Gaps count: 0

The `passes.status = in_progress` observation does not block the broad
extraction smoke result. It is tracked as follow-up tech debt because the
expected lifecycle boundary is unclear: document-level processing completed,
but claim-level pass completion may belong to a later pipeline stage.

## Safety Confirmations

- Production touched: no
- Secrets printed: no
- App code changed: no
- DB schema changed: no
- New claim created during retry: no
- New documents uploaded during retry: no
- OpenClaw cron/24-7 enabled: no
- Auto-merge/deploy enabled: no

## Follow-Up

Track and decide the pass lifecycle behavior:

- Should `passes.status` become `completed` when all claim documents finish
  document-level processing?
- Or does `passes.status` represent a later claim-level pass pipeline that is
  not completed by document processing alone?

This follow-up is medium severity and is not blocking PR #18 validation.
