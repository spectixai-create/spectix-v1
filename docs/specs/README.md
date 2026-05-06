# Spike Specs

Specs in this directory are the implementation source for future spikes. Older spikes #00b-#02b will be archived in Spike #00z-B.

| Spike           | Title                                  | Status | Branch                              | PR              |
| --------------- | -------------------------------------- | ------ | ----------------------------------- | --------------- |
| #00             | Initial schema and backend foundation  | DONE   | main                                | -               |
| #00a            | Types contract                         | DONE   | backend-types                       | #6              |
| #00b            | Frontend foundation                    | DONE   | frontend-foundation                 | -               |
| #00c            | UI component library expansion         | DONE   | frontend-components                 | -               |
| #00d            | Investigation Brief View skeleton      | DONE   | frontend-brief-view                 | -               |
| #00e            | Adjuster Dashboard skeleton            | DONE   | frontend-brief-view                 | -               |
| #02             | Claim Intake Form skeleton             | DONE   | frontend-intake-form                | -               |
| #02a            | Login UI, 404, VersionFooter           | DONE   | frontend-login-404                  | -               |
| #02b            | Clarification Questions Queue skeleton | DONE   | frontend-questions-queue            | -               |
| #01             | Supabase Auth wiring                   | DONE   | backend-auth                        | merged directly |
| #00z-A          | Documentation Infrastructure           | DONE   | docs-infrastructure                 | this PR         |
| #02c-1          | Schema Gap Audit                       | DONE   | backend-schema-audit                | this PR         |
| #migration-0002 | Schema additions from audit            | DONE   | backend-migration-0002              | this PR         |
| #02c-2          | Claim intake API                       | DONE   | backend-claims-api                  | this PR         |
| #03a            | File upload + Storage                  | DONE   | backend-document-upload             | this PR         |
| #03b            | Inngest document processing pipeline   | DONE   | backend-document-pipeline           | this PR         |
| #03g            | Claude document classification         | DONE   | backend-document-classifier         | this PR         |
| #03ד-1a         | Document subtype classification        | DONE   | backend-document-subtype-foundation | this PR         |
| #03ד-1b         | Broad extraction prompts (02-05)       | DONE   | backend-broad-extraction-prompts    | #18             |
| SPRINT-001      | Pass lifecycle completion              | DONE   | sprint/pass-lifecycle-completion    | #38             |
| SPRINT-002A     | Extraction schema contracts            | DONE   | sprint/extraction-schema-contracts  | #50             |
| SPRINT-002B     | Subtype extraction routes              | ACTIVE | sprint/subtype-extraction-routes    | pending         |
| SPRINT-003A     | Synthesis Data Model                   | NEXT   | pending                             | pending         |

Use [spike-template.md](spike-template.md) for new specs.

## Smoke Verification

TASK-SPECTIX-001 verified #03ד-1b in non-production. The final smoke report is tracked in [TASK-SPECTIX-001_SMOKE_FINAL_REPORT.md](../agents/prompts/TASK-SPECTIX-001_SMOKE_FINAL_REPORT.md).

## Pass Lifecycle

Sprint #001 chose Option A for pass lifecycle: pass 1 is the claim-level document-processing pass. After every document for a claim is terminal, pass 1 becomes `completed` when none has a blocking failure or `failed` when at least one document has a blocking failure. The lifecycle helper is documented in [sprint-001-pass-lifecycle.md](sprint-001-pass-lifecycle.md).

## Subtype Extraction

SPRINT-002A defined versioned normalized extraction contracts only and merged in PR #50. SPRINT-002B is active on `sprint/subtype-extraction-routes` and implements the seven MVP normalized routes while preserving broad fallback behavior for non-MVP subtypes. See [sprint-002-subtype-extraction.md](sprint-002-subtype-extraction.md).

## Next Spike

SPRINT-003A is Synthesis Data Model.
