# Schema Gap Audit

Canonical DB structure is [supabase/migrations/0001_initial_schema.sql](../supabase/migrations/0001_initial_schema.sql). Canonical TypeScript contracts are in [lib/types.ts](../lib/types.ts). This audit compares those sources to frontend skeleton data from intake, dashboard, claim view, and clarification questions.

This document is documentation-only. Migration #0002 will implement the storage changes identified here.

## Decision Rubric

- `METADATA`: store in `claims.metadata` JSONB. Promote to a dedicated column only when query patterns require it.
- `COLUMN`: add a real DB column because the field has high query frequency, operational need, or is required by an upcoming backend spike.
- `DROP`: remove from UI/sample shape as not needed.
- `DERIVED`: compute from other records at runtime, no storage.

## Claim Entity Audit

| Field (UI/desired)     | In DB col? | In TS type?          | Decision | Rationale                                                                                                          |
| ---------------------- | ---------- | -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `claimantName`         | yes        | yes                  | KEEP     | Existing column and type.                                                                                          |
| `claimantEmail`        | no         | no                   | COLUMN   | Ops outreach, duplicate-claim checks, and customer-service workflows need direct query access.                     |
| `claimantPhone`        | no         | no                   | COLUMN   | Same as email; future SMS delivery depends on direct access.                                                       |
| `policyNumber`         | no         | no                   | COLUMN   | Needed by R01 ownership checks and R08 issuance checks; should be indexed for fast rule lookup.                    |
| `profession`           | metadata   | yes, `ClaimMetadata` | KEEP     | Row-level context for R07 and LLM relevance evaluation; not a query target yet.                                    |
| `tripPurpose`          | metadata   | yes, `ClaimMetadata` | KEEP     | Row-level context for Layer 5 multiplier.                                                                          |
| `localConnections`     | metadata   | yes, `ClaimMetadata` | KEEP     | Row-level context only.                                                                                            |
| `prevTrips24m`         | metadata   | yes, `ClaimMetadata` | KEEP     | Row-level context only.                                                                                            |
| `prevTripsWithClaims`  | metadata   | yes, `ClaimMetadata` | KEEP     | Row-level context only.                                                                                            |
| `country`              | no         | no                   | METADATA | Intake collects it separately; store computed/display helper in metadata while `incidentLocation` stays canonical. |
| `city`                 | no         | no                   | METADATA | Intake collects it separately; store computed/display helper in metadata.                                          |
| `incidentLocation`     | yes        | yes                  | KEEP     | Canonical free-text incident location.                                                                             |
| `currency`             | yes        | yes                  | KEEP     | DB defaults to `ILS`; future foreign-currency selector remains tech debt.                                          |
| `summary`              | yes        | yes                  | KEEP     | Existing column and type.                                                                                          |
| `amountClaimed`        | yes        | yes                  | KEEP     | Existing column and type.                                                                                          |
| `claimType`            | yes        | yes                  | KEEP     | Hebrew UI labels map to English values before API submission.                                                      |
| `current_pass`         | no         | metadata only        | COLUMN   | Pipeline state needs fast reads and is updated from normalized `passes`.                                           |
| `total_llm_cost_usd`   | no         | metadata only        | COLUMN   | Required for the $2/claim cost cap and ops monitoring.                                                             |
| `brief_text`           | no         | no                   | COLUMN   | Canonical raw Prompt 09 plain-text output.                                                                         |
| `brief_pass_number`    | no         | no                   | COLUMN   | Identifies which pass generated the current brief.                                                                 |
| `brief_recommendation` | no         | no                   | COLUMN   | Queryable extracted recommendation: `approve`, `request_info`, `deep_investigation`, `reject_no_coverage`.         |
| `brief_generated_at`   | no         | no                   | COLUMN   | Timestamp for brief freshness and audit review.                                                                    |

## Pipeline State: New `passes` Table

`passes_history` was an early README JSONB idea. Migration #0001 correctly omitted it. The production shape should be normalized as a dedicated `passes` table with FK to `claims`.

Required columns:

- `id uuid primary key`
- `claim_id uuid not null references claims(id) on delete cascade`
- `pass_number int not null`
- `status text not null default 'pending'`
- `started_at timestamptz`
- `completed_at timestamptz`
- `risk_band text`
- `findings_count int default 0`
- `gaps_count int default 0`
- `llm_calls_made int default 0`
- `cost_usd numeric default 0`
- `created_at timestamptz not null default now()`
- `UNIQUE (claim_id, pass_number)`

Pass retry semantics: failed passes are updated in place, not re-inserted. The unique constraint remains stable. `status = 'failed'` marks abandoned attempts. UI shows latest pass state; retry history, if needed, belongs in `audit_log`.

## Document Entity Audit

| Field (UI/desired)  | In DB col? | In TS type?                  | Decision | Rationale                                                                          |
| ------------------- | ---------- | ---------------------------- | -------- | ---------------------------------------------------------------------------------- |
| `documentType`      | yes        | yes                          | KEEP     | Existing column and type.                                                          |
| `filePath`          | yes        | yes                          | KEEP     | Existing column and type.                                                          |
| `fileName`          | yes        | yes                          | KEEP     | Existing column and type.                                                          |
| `fileSize`          | yes        | yes                          | KEEP     | Existing column and type.                                                          |
| `mimeType`          | yes        | yes                          | KEEP     | Existing column and type.                                                          |
| `ocrText`           | yes        | yes                          | KEEP     | Existing column and type.                                                          |
| `extractedData`     | yes, JSONB | yes                          | KEEP     | `ExtractedData` union is canonical for JSONB shape.                                |
| `processing_status` | no         | `DocumentDerivedStatus` only | COLUMN   | Inngest workflow tracking is required by Spike #03 and cannot be derived reliably. |
| `uploadedBy`        | yes        | yes                          | KEEP     | Existing column and type.                                                          |

## Finding Entity Audit

| Field (UI/desired)             | In DB col? | In TS type? | Decision | Rationale                                                                           |
| ------------------------------ | ---------- | ----------- | -------- | ----------------------------------------------------------------------------------- |
| `ruleId`                       | yes        | yes         | KEEP     | Existing column and type.                                                           |
| `passNumber`                   | yes        | yes         | KEEP     | Existing column and type.                                                           |
| `severity`                     | yes        | yes         | KEEP     | Add CHECK constraint for `low`, `medium`, `high`.                                   |
| `title`                        | yes        | yes         | KEEP     | Existing column and type.                                                           |
| `description`                  | yes        | yes         | KEEP     | Existing column and type.                                                           |
| `evidence`                     | yes, JSONB | yes         | KEEP     | Existing column and type.                                                           |
| `confidence`                   | yes        | yes         | KEEP     | Existing column and type.                                                           |
| `severity_adjusted_by_context` | no         | no          | COLUMN   | Layer 5 multiplier audit flag; indicates severity changed after context evaluation. |
| `severity_original`            | no         | no          | COLUMN   | Pre-Layer-5 severity for audit trail.                                               |
| `status`                       | no         | no          | COLUMN   | Tracks finding lifecycle across passes: `open`, `resolved`, `persisted`.            |
| `resolved_in_pass`             | no         | no          | COLUMN   | Records the pass number that resolved the finding.                                  |
| `recommended_action`           | no         | no          | COLUMN   | Captures rule output action text for brief generation and adjuster review.          |

## Gap Entity Audit

| Field (UI/desired) | In DB col? | In TS type? | Decision | Rationale                                                               |
| ------------------ | ---------- | ----------- | -------- | ----------------------------------------------------------------------- |
| `gapType`          | yes        | yes         | KEEP     | Existing column and type.                                               |
| `description`      | yes        | yes         | KEEP     | Existing column and type.                                               |
| `status`           | yes        | yes         | KEEP     | Add CHECK constraint for `open`, `resolved`, `ignored`.                 |
| `resolution`       | yes        | yes         | KEEP     | Existing column and type.                                               |
| `resolvedAt`       | yes        | yes         | KEEP     | Existing column and type.                                               |
| `fill_method`      | no         | no          | COLUMN   | Documents how a gap is being filled: API, OSINT, claimant, or adjuster. |
| `fill_target`      | no         | no          | COLUMN   | Stores what specific missing value is targeted.                         |
| `filled_in_pass`   | no         | no          | COLUMN   | Records the pass that filled the gap.                                   |
| `filled_value`     | no         | no          | COLUMN   | JSONB payload containing the value that filled the gap.                 |
| `updated_at`       | no         | no          | COLUMN   | Required for gap lifecycle tracking; maintained by trigger.             |

## ClarificationQuestion Entity Audit

| Field (UI/desired) | In DB col? | In TS type? | Decision | Rationale                                                                |
| ------------------ | ---------- | ----------- | -------- | ------------------------------------------------------------------------ |
| `question`         | yes        | yes         | KEEP     | Existing column and type.                                                |
| `context`          | yes        | yes         | KEEP     | Existing column and type.                                                |
| `status`           | yes        | yes         | EXTEND   | Add `closed` and CHECK constraint.                                       |
| `answer`           | yes        | yes         | KEEP     | Existing column and type.                                                |
| `answeredAt`       | yes        | yes         | KEEP     | Existing column and type.                                                |
| `urgency`          | no         | no          | COLUMN   | Used by #02b queue and operational triage; values `urgent` and `normal`. |
| `resolved_by`      | no         | no          | COLUMN   | FK to `auth.users(id)` for adjuster who closed the question.             |
| `resolution_note`  | no         | no          | COLUMN   | Adjuster's closure note.                                                 |
| `closed_at`        | no         | no          | COLUMN   | Timestamp of closure.                                                    |

## EnrichmentCache and AuditLog

No schema gaps identified. Current schema is sufficient for current planned use.

## Sample Data Derived Display Fields

Dashboard `SampleClaimRow.passStatus` is a derived display string. It should be computed from `claims.current_pass` plus the latest `passes.status`.

`SamplePass.events` from the Brief Timeline sample should be dropped from long-term sample shape and derived from `audit_log`:

```sql
SELECT *
FROM audit_log
WHERE claim_id = $1
  AND action LIKE 'pass_%'
ORDER BY created_at;
```

## Hebrew to English Value Mapping

Form Select controls display Hebrew labels but submit English values. API contracts receive English values only.

### ClaimType

| Hebrew label | English value         |
| ------------ | --------------------- |
| `גניבה`      | `theft`               |
| `אובדן`      | `loss`                |
| `רפואי`      | `medical`             |
| `ביטול טיסה` | `flight_cancellation` |
| `עיכוב טיסה` | `flight_delay`        |
| `חבות`       | `liability`           |
| `חירום`      | `emergency`           |
| `מצג שווא`   | `misrepresentation`   |
| `אחר`        | `other`               |

Current `intake-options.ts` also has `flight`, which must be split before real API submission.

### TripPurpose

| Hebrew label  | English value  |
| ------------- | -------------- |
| `תיירות`      | `tourism`      |
| `עסקים`       | `business`     |
| `ביקור משפחה` | `family_visit` |
| `רפואי`       | `medical`      |
| `לימודים`     | `study`        |
| `אחר`         | `other`        |

Current `intake-options.ts` uses `family`; it must become `family_visit` before real API submission.

Implementation source today: [lib/sample-data/intake-options.ts](../lib/sample-data/intake-options.ts). That file should become the canonical UI mapping after #migration-0002 updates types and the intake API contract.

## Migration #0002 Scope

### `claims` Table

```sql
ALTER TABLE claims ADD COLUMN claimant_email text;
ALTER TABLE claims ADD COLUMN claimant_phone text;
ALTER TABLE claims ADD COLUMN policy_number text;
CREATE INDEX claims_policy_number_idx ON claims (policy_number);
ALTER TABLE claims ADD COLUMN current_pass int DEFAULT 0;
ALTER TABLE claims ADD COLUMN total_llm_cost_usd numeric DEFAULT 0;
ALTER TABLE claims ADD COLUMN brief_text text;
ALTER TABLE claims ADD COLUMN brief_pass_number int;
ALTER TABLE claims ADD COLUMN brief_recommendation text;
ALTER TABLE claims ADD COLUMN brief_generated_at timestamptz;
```

### `passes` Table

```sql
CREATE TABLE passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  pass_number int NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  risk_band text,
  findings_count int DEFAULT 0,
  gaps_count int DEFAULT 0,
  llm_calls_made int DEFAULT 0,
  cost_usd numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (claim_id, pass_number),
  CONSTRAINT passes_status_valid CHECK (status IN ('pending','in_progress','completed','skipped','failed'))
);
CREATE INDEX passes_claim_id_idx ON passes (claim_id);
ALTER TABLE passes ENABLE ROW LEVEL SECURITY;
```

### `documents` Table

```sql
ALTER TABLE documents ADD COLUMN processing_status text DEFAULT 'pending';
ALTER TABLE documents ADD CONSTRAINT documents_processing_status_valid
  CHECK (processing_status IN ('pending','processing','processed','failed'));
```

### `clarification_questions` Table

```sql
ALTER TABLE clarification_questions ADD COLUMN urgency text DEFAULT 'normal';
ALTER TABLE clarification_questions ADD COLUMN resolved_by uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE clarification_questions ADD COLUMN resolution_note text;
ALTER TABLE clarification_questions ADD COLUMN closed_at timestamptz;
ALTER TABLE clarification_questions ADD CONSTRAINT cq_urgency_valid
  CHECK (urgency IN ('urgent','normal'));
ALTER TABLE clarification_questions ADD CONSTRAINT cq_status_valid
  CHECK (status IN ('pending','sent','answered','closed'));
```

### `findings` Table

```sql
ALTER TABLE findings ADD COLUMN severity_adjusted_by_context boolean DEFAULT false;
ALTER TABLE findings ADD COLUMN severity_original text;
ALTER TABLE findings ADD COLUMN status text DEFAULT 'open';
ALTER TABLE findings ADD COLUMN resolved_in_pass int;
ALTER TABLE findings ADD COLUMN recommended_action text;
ALTER TABLE findings ADD CONSTRAINT findings_severity_valid
  CHECK (severity IN ('low','medium','high'));
ALTER TABLE findings ADD CONSTRAINT findings_status_valid
  CHECK (status IN ('open','resolved','persisted'));
```

### `gaps` Table

```sql
ALTER TABLE gaps ADD COLUMN fill_method text;
ALTER TABLE gaps ADD COLUMN fill_target text;
ALTER TABLE gaps ADD COLUMN filled_in_pass int;
ALTER TABLE gaps ADD COLUMN filled_value jsonb;
ALTER TABLE gaps ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE gaps ADD CONSTRAINT gaps_status_valid
  CHECK (status IN ('open','resolved','ignored'));

DROP TRIGGER IF EXISTS gaps_set_updated_at ON gaps;
CREATE TRIGGER gaps_set_updated_at
  BEFORE UPDATE ON gaps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### `claims` Status CHECK

```sql
ALTER TABLE claims ADD CONSTRAINT claims_status_valid
  CHECK (status IN ('intake','processing','pending_info','ready','reviewed','rejected_no_coverage','cost_capped'));
```

### Denormalized Pipeline Triggers

`claims.current_pass`, `claims.total_llm_cost_usd`, and `claims.risk_band` are denormalized for fast reads and maintained from `passes`.

```sql
CREATE OR REPLACE FUNCTION update_claim_pipeline_state()
RETURNS trigger AS $$
BEGIN
  UPDATE claims SET current_pass = (
    SELECT COALESCE(MAX(pass_number), 0)
    FROM passes
    WHERE claim_id = NEW.claim_id
      AND status IN ('in_progress','completed','skipped','failed')
  ) WHERE id = NEW.claim_id;

  UPDATE claims SET total_llm_cost_usd = (
    SELECT COALESCE(SUM(cost_usd), 0)
    FROM passes
    WHERE claim_id = NEW.claim_id
  ) WHERE id = NEW.claim_id;

  UPDATE claims SET risk_band = (
    SELECT risk_band
    FROM passes
    WHERE claim_id = NEW.claim_id
      AND status = 'completed'
    ORDER BY pass_number DESC
    LIMIT 1
  ) WHERE id = NEW.claim_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS passes_update_claim_state ON passes;
CREATE TRIGGER passes_update_claim_state
  AFTER INSERT OR UPDATE ON passes
  FOR EACH ROW EXECUTE FUNCTION update_claim_pipeline_state();
```

### RLS for `passes`

```sql
ALTER TABLE passes ENABLE ROW LEVEL SECURITY;
-- No policies: service_role bypasses, anon/authenticated denied.
```

## Migration #0002 Dependencies

Migration #0002 unblocks:

- Spike #02c-2: `POST /api/claims` with full field support.
- Spike #03: document processing with status tracking.
- Spike #04+: rules using `policy_number`, context-adjusted severity, and pass state.
- Spike #08: clarification flow with full state.

Migration #0002 is not required for Spike #00z-B historical archive.

Critical: if #migration-0002 is delayed beyond 3 days from #02c-1 merge, re-prioritize against active spikes. Audit findings are not actionable until #migration-0002 lands.

## Source-of-Truth Invariants

When a field is only in `lib/types.ts` and not a DB column, it lives in a JSONB column. TS types can describe JSONB shape; DB schema enforces mandatory columns and relational structure.

DB schema is canonical for structure. Types are canonical for JSONB content shape.

When migration adds a column, update migration first, then `docs/DB_SCHEMA.md`, then `lib/types.ts` in the same PR.

## Update Semantics for Redundant Fields

`incidentLocation` is canonical for free-text address. `country` and `city` in metadata are computed-and-stored at intake time and never updated independently. If `incidentLocation` changes, update all three values together.

`claims.current_pass`, `claims.total_llm_cost_usd`, and `claims.risk_band` are denormalized from `passes` and maintained by `update_claim_pipeline_state`.

## Naming Convention Verification

All proposed new column names use snake_case, matching existing schema names such as `claim_id`, `claim_type`, `uploaded_by`, and `created_at`. TypeScript mirrors storage fields as camelCase.
