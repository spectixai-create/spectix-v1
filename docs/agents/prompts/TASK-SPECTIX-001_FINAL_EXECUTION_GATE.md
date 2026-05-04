# TASK-SPECTIX-001 Final Execution Gate

This gate prepares the final CEO decision for the broad extraction smoke test.
It does not approve execution, create a claim, upload documents, mutate data, or
change app code, DB schema, secrets, env, deployment settings, auth, billing,
pricing, or OpenClaw automation.

## 1. Current Readiness Status

| Item                           | Status                                                                     |
| ------------------------------ | -------------------------------------------------------------------------- |
| Smoke task                     | `TASK-SPECTIX-001`                                                         |
| Dispatcher task status         | `pm_spec_ready`                                                            |
| Smoke plan                     | Approved and merged                                                        |
| Smoke readiness packet         | Merged                                                                     |
| Execution approval template    | Merged                                                                     |
| Synthetic PDFs                 | Ready locally under `.openclaw-local/smoke-inputs/TASK-SPECTIX-001/files/` |
| Claim                          | Not created                                                                |
| `SMOKE_CLAIM_ID`               | Missing                                                                    |
| Documents                      | Not uploaded                                                               |
| Smoke execution                | Not run                                                                    |
| Production data                | Not mutated                                                                |
| Proposed nonproduction project | `aozbgunwhafabfmuwjol`                                                     |

Safe, non-secret route inspection confirmed:

- Claim creation path: `POST <APPROVED_HOST>/api/claims`.
- Claim ID response path: `response.data.claim.id`.
- Document upload path:
  `POST <APPROVED_HOST>/api/claims/<SMOKE_CLAIM_ID>/documents`.
- Upload format: `multipart/form-data` with required `file` field.
- Accepted upload MIME types: `application/pdf`, `image/jpeg`, `image/png`.
- Inngest event sent by upload path: `claim/document.uploaded`.
- Health route: `GET /api/health` is read-only but uses the Supabase admin
  client to count expected tables, so it can reveal target health but does not
  confirm whether the target is production without human environment
  confirmation.

## 2. Environment Candidates

| Host                            | Environment type | Supabase target known | Risk                                                                                                                                      | Recommendation                                                                                      |
| ------------------------------- | ---------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `https://spectix-v1.vercel.app` | production       | no                    | High: claim creation and uploads mutate production-backed data if this host points at production Supabase                                 | `unsafe_production` unless CEO explicitly approves production mutation and confirms Supabase target |
| Vercel preview URL              | preview          | no                    | Unknown: no concrete preview URL was found in repo docs, and preview Supabase target cannot be confirmed without environment metadata     | `blocked_missing_env_confirmation`                                                                  |
| `http://localhost:3000`         | local            | no                    | Unknown: local `.env.local` was not inspected because it may contain secrets; local Inngest can run with `pnpm inngest:dev` if configured | `blocked_missing_env_confirmation`                                                                  |
| Staging host                    | staging          | no                    | Unknown: no staging host was documented in the repo                                                                                       | `unknown`                                                                                           |

No candidate currently qualifies as `safe_for_smoke_candidate` because the
Supabase target is not confirmed non-production without exposing secrets, and
CEO has not filled the execution approval fields.

Proposed nonproduction path after TASK-043:

| Field                          | Proposed value          |
| ------------------------------ | ----------------------- |
| `APPROVED_HOST`                | `http://localhost:3000` |
| `ENVIRONMENT_TYPE`             | `local`                 |
| `SUPABASE_PROJECT_ID`          | `aozbgunwhafabfmuwjol`  |
| `SUPABASE_PROJECT_CONFIRMED`   | `pending`               |
| `DATA_MUTATION_APPROVED`       | `pending`               |
| `PRODUCTION_MUTATION_APPROVED` | `no`                    |

Execution remains blocked until the schema is applied to
`aozbgunwhafabfmuwjol` and local env is confirmed to use
`aozbgunwhafabfmuwjol`. Production/active project
`fcqporzsihuqtfohqtxs` remains forbidden.

## 3. CEO-Required Fields

CEO must fill every field before any execution task can start:

```text
APPROVED_HOST:
ENVIRONMENT_TYPE: production / preview / staging / local
SUPABASE_PROJECT_CONFIRMED: yes/no
DATA_MUTATION_APPROVED: yes/no
PRODUCTION_MUTATION_APPROVED: yes/no
SUPABASE_PROJECT_ID:
CREATE_CLAIM_APPROVED: yes/no
UPLOAD_DOCUMENTS_APPROVED: yes/no
RUN_SMOKE_APPROVED: yes/no
```

If `ENVIRONMENT_TYPE=production`, or if the Supabase target behind
`APPROVED_HOST` is production, `PRODUCTION_MUTATION_APPROVED` must be `yes`.

## 4. Claim Creation Payload

Use only after CEO fills all required fields and explicitly approves claim
creation:

```text
POST <APPROVED_HOST>/api/claims
```

```json
{
  "claimantName": "TASK-SPECTIX-001 Smoke Tester",
  "insuredName": "TASK-SPECTIX-001 Smoke Tester",
  "claimantEmail": "task-spectix-001-smoke@example.test",
  "claimantPhone": "0500000000",
  "policyNumber": "SMOKE-TASK-SPECTIX-001",
  "claimType": "theft",
  "incidentDate": "2026-05-01",
  "incidentLocation": "Synthetic Smoke Test Location",
  "amountClaimed": 5000,
  "currency": "ILS",
  "summary": "Synthetic broad extraction smoke claim for TASK-SPECTIX-001. No real customer data.",
  "metadata": {
    "tripPurpose": "tourism",
    "country": "Synthetic Country",
    "city": "Synthetic City"
  }
}
```

Expected successful record:

```text
SMOKE_CLAIM_ID = response.data.claim.id
```

Expected created records:

- One `claims` row.
- One `audit_log` row with `action = 'claim_created'`.

Important: `POST /api/claims` currently has no idempotency key and no rate
limiting. Re-running claim creation can create duplicate smoke claims.

## 5. Execution Sequence

Stage A: create claim only.

- Verify all CEO fields are filled.
- Verify host and Supabase target are approved.
- Create the smoke claim with the approved payload.
- Stop immediately after claim creation if `SMOKE_CLAIM_ID` is missing,
  malformed, or from the wrong target.

Stage B: record `SMOKE_CLAIM_ID`.

- Record the UUID from `response.data.claim.id`.
- Do not continue if the ID cannot be verified as the approved smoke claim.

Stage C: upload 8 synthetic documents only.

- Upload only the approved files under
  `.openclaw-local/smoke-inputs/TASK-SPECTIX-001/files/`.
- Use only
  `POST <APPROVED_HOST>/api/claims/<SMOKE_CLAIM_ID>/documents`.
- Stop on any missing file, upload rejection, claim permission issue, or
  unexpected target.

Stage D: wait for processing.

- Wait for the existing Inngest/document pipeline.
- Do not alter Inngest config, OpenClaw cron/24-7, channels, deployment, env,
  or secrets.

Stage E: run verification SQL only against `SMOKE_CLAIM_ID`.

- Use the approved SQL from
  `docs/agents/prompts/TASK-SPECTIX-001_SMOKE_READINESS_PACKET.md`.
- Replace only `<SMOKE_CLAIM_ID>`.
- Do not mutate or clean up records during verification.

Stage F: report pass/fail.

- Report route-by-route pass/fail.
- Include claim ID, document IDs, `extracted_data`, audit/event findings,
  stuck/failed documents, and any safety deviations.

## 6. Hard Stop Conditions

Stop before execution if any condition is true:

- `APPROVED_HOST` is missing.
- `ENVIRONMENT_TYPE` is missing.
- Supabase target is unknown.
- Host is production and `PRODUCTION_MUTATION_APPROVED` is not explicitly
  `yes`.
- `DATA_MUTATION_APPROVED` is not explicitly `yes`.
- `CREATE_CLAIM_APPROVED` is not explicitly `yes`.
- `UPLOAD_DOCUMENTS_APPROVED` is not explicitly `yes`.
- `RUN_SMOKE_APPROVED` is not explicitly `yes`.
- `SUPABASE_PROJECT_ID` is missing or not `aozbgunwhafabfmuwjol` for the
  proposed nonproduction path.
- Any env/config value points at production project `fcqporzsihuqtfohqtxs`.
- Any real customer data is involved.
- Any schema, secret, env, deploy, auth, billing, or pricing change is required.
- Any endpoint requires unsupported auth changes.
- Any synthetic file is missing.
- Upload/document endpoint is unclear.
- The task would touch unrelated production records.
- OpenClaw cron/24-7, auto-merge, or auto-deploy would need to be enabled.

## 7. Recommended CEO Decision

Recommended decision:

```text
blocked_missing_environment_confirmation
```

Reason:

- Production host is documented, but production mutation has not been approved.
- No concrete preview or staging host is documented.
- Local host can be used only after a human confirms the local Supabase target
  without exposing secrets and confirms Inngest/document processing is
  configured.
- The required CEO approval fields are still empty.

## 8. Next CEO Decision Needed

CEO must choose and fill one path:

1. Non-production execution path:
   - Fill `APPROVED_HOST`.
   - Set `ENVIRONMENT_TYPE` to `preview`, `staging`, or `local`.
   - Confirm `SUPABASE_PROJECT_CONFIRMED=yes` for a non-production target.
   - Confirm `DATA_MUTATION_APPROVED=yes`.
   - Confirm claim creation, document upload, and smoke execution approvals.

2. Production execution path:
   - Fill `APPROVED_HOST=https://spectix-v1.vercel.app` or another production
     host.
   - Set `ENVIRONMENT_TYPE=production`.
   - Confirm `SUPABASE_PROJECT_CONFIRMED=yes`.
   - Confirm `DATA_MUTATION_APPROVED=yes`.
   - Confirm `PRODUCTION_MUTATION_APPROVED=yes`.
   - Confirm claim creation, document upload, and smoke execution approvals.

Until one path is fully filled and approved, Codex must not create the claim,
upload documents, run the smoke, or mutate any data.
