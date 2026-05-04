# TASK-SPECTIX-001 Nonproduction App Runbook

This runbook describes the later local app smoke flow against the approved
empty Supabase nonproduction project. It is not execution approval.

Approved nonproduction project:

```text
aozbgunwhafabfmuwjol
```

Forbidden production project:

```text
fcqporzsihuqtfohqtxs
```

## 1. Apply Schema To Nonproduction Only

Prerequisites:

- CEO approval to mutate `aozbgunwhafabfmuwjol`.
- Human/operator confirms selected Supabase project is
  `aozbgunwhafabfmuwjol`.
- Human/operator confirms project is empty or safe to initialize.

Apply the ordered migrations from:

```text
supabase/migrations/
```

or the reviewed local bundle:

```text
.openclaw-local/supabase-nonprod/TASK-SPECTIX-001/nonprod_schema_bundle.sql
```

Never apply to:

```text
fcqporzsihuqtfohqtxs
```

## 2. Fill Local Env With Nonproduction Keys Only

Create or update local `.env.local` outside git. Do not print values.

Required checks:

```text
NEXT_PUBLIC_SUPABASE_URL=https://aozbgunwhafabfmuwjol.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY present: yes/no
SUPABASE_SERVICE_ROLE_KEY present: yes/no
ANTHROPIC_API_KEY present or fake mode approved: yes/no
INNGEST_DEV=1
```

Stop if any env value points to `fcqporzsihuqtfohqtxs`.

## 3. Start App Locally

After env is confirmed nonproduction:

```text
pnpm dev
```

Expected app URL:

```text
http://localhost:3000
```

Optional read-only health check after approval:

```text
GET http://localhost:3000/api/health
```

## 4. Start Inngest Dev

After the app is running:

```text
pnpm inngest:dev
```

Expected registration URL:

```text
http://localhost:3000/api/inngest
```

Expected dashboard:

```text
http://localhost:8288
```

## 5. Create Local Smoke Claim Later

Do not run until CEO gives explicit smoke execution approval.

Endpoint:

```text
POST http://localhost:3000/api/claims
```

Use the approved payload from:

```text
docs/agents/prompts/TASK-SPECTIX-001_FINAL_EXECUTION_GATE.md
```

Record:

```text
SMOKE_CLAIM_ID = response.data.claim.id
```

## 6. Upload Synthetic Documents Later

Do not run until CEO gives explicit upload approval.

Endpoint:

```text
POST http://localhost:3000/api/claims/<SMOKE_CLAIM_ID>/documents
```

Multipart field:

```text
file
```

Approved local files:

```text
.openclaw-local/smoke-inputs/TASK-SPECTIX-001/files/
```

Upload exactly the 8 synthetic PDFs from the manifest.

## 7. Verify Rows In Nonproduction Only

Run verification queries only against:

```text
aozbgunwhafabfmuwjol
```

Use the SQL from:

```text
docs/agents/prompts/TASK-SPECTIX-001_SMOKE_READINESS_PACKET.md
```

Replace only:

```text
<SMOKE_CLAIM_ID>
```

Expected evidence:

- One smoke `claims` row.
- Eight `documents` rows.
- Storage objects in `claim-documents`.
- `audit_log` rows for claim creation, document upload, processing,
  subtype classification, extraction/defer/failure as applicable.
- Inngest event/run evidence for document processing.

## 8. Hard Stop Conditions

Stop immediately if:

- The target project is not `aozbgunwhafabfmuwjol`.
- The target URL contains `fcqporzsihuqtfohqtxs`.
- Any production key is used.
- Any secret would be printed or committed.
- Schema has not been applied to `aozbgunwhafabfmuwjol`.
- App is not pointing at `aozbgunwhafabfmuwjol`.
- Inngest is not local/dev.
- Any synthetic PDF is missing.
- CEO has not approved claim creation/upload/smoke execution.

## 9. Current Status

```text
schema applied: no
app started: no
Inngest started: no
claim created: no
documents uploaded: no
smoke executed: no
production touched: no
```
