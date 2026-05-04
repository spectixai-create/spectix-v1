DO NOT RUN unless CEO provides:

1. approved SMOKE_CLAIM_ID
2. approved synthetic document file paths
3. explicit execution approval

# TASK-SPECTIX-001 Codex Execution Prompt

You are Codex working on Spectix.

Goal: execute the approved post-merge production smoke for PR #18 broad
extraction only after CEO supplies the required approvals above.

Read first:

- `docs/agents/prompts/TASK-SPECTIX-001_APPROVED_SMOKE_PLAN.md`
- `docs/CURRENT_STATE.md`
- `docs/specs/spike-03d-1b.md`
- `docs/agents/LOCAL_DISPATCHER.md`

Required CEO-provided inputs:

- `SMOKE_CLAIM_ID`: `<CEO_APPROVED_SMOKE_CLAIM_ID>`
- Synthetic document files:
  - receipt: `<CEO_APPROVED_RECEIPT_FILE>`
  - police report: `<CEO_APPROVED_POLICE_FILE>`
  - hotel/service-provider letter: `<CEO_APPROVED_HOTEL_GENERIC_FILE>`
  - medical visit/report: `<CEO_APPROVED_MEDICAL_FILE>`
  - optional deferred-route control: `<CEO_APPROVED_DEFERRED_FILE>`

Hard rules:

- Do not run without explicit CEO execution approval in the current task.
- Do not use real customer documents or PII.
- Do not mutate any claim except the approved `SMOKE_CLAIM_ID`.
- Do not modify app code, DB schema, migrations, auth, billing, pricing,
  secrets, env vars, deployment settings, OpenClaw channels, cron, 24/7 mode,
  auto-merge, or auto-deploy.
- Do not merge or deploy.
- Stop immediately if any required input is missing.

Execution outline after approval:

1. Confirm current branch and working tree.
2. Confirm the approved claim exists and is acceptable for controlled smoke.
3. Upload only the approved synthetic documents to the approved claim through
   the existing supported upload path.
4. Wait only as long as needed for the existing document-processing pipeline to
   process the uploaded documents.
5. Verify `documents.processing_status`, `document_type`,
   `document_subtype`, and `extracted_data`.
6. Run the Supabase verification queries from the approved plan with
   `<SMOKE_CLAIM_ID>` replaced by the approved claim ID.
7. Verify expected audit events and available Inngest events.
8. Report pass/fail with evidence.

Required final report after execution:

- Approved claim ID used.
- Synthetic files uploaded.
- Document IDs created.
- Observed broad types, subtypes, extraction routes, and processing statuses.
- `extracted_data` verification summary.
- Audit/event verification summary.
- Pass/fail result.
- Any blockers.
- Confirmation that no app code, DB schema, secrets/env/deploy settings,
  production configuration, OpenClaw cron/24/7, auto-merge, or auto-deploy were
  touched.
