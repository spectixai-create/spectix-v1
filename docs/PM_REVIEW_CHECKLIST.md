# PM Review Checklist

Version: 1.0 | Created: 2025-05-03 | Maintained by: PM (Chat 2-B onward)

## Purpose

This checklist captures recurring patterns from the first 17 spike reviews.
Use it when reviewing CEO-drafted specs to catch issues that have appeared
repeatedly across spikes. Items are grouped by spec type. A spec touching
multiple areas should pass all relevant sections.

This is a tool, not a constraint. Skip sections that don't apply. Add new
items when new patterns emerge.

## How to use

1. Identify spec type: migration / schema-write / Inngest / RLS / UI / mixed.
2. Run the relevant section(s) below.
3. For each item, mark: [ok] / [issue: <description>] / [n/a].
4. In the review reply: list only [issue] items as corrections, prefixed
   with checklist section number for traceability.
5. After review, if a new pattern appears 3+ times across spikes, add it
   here.

---

## 1. Migration validation

Spec touches /supabase/migrations/ or /supabase/rollbacks/.

1.1. **Down.sql presence (D-015)**

- New migration #NNNN ships with paired NNNN_name.down.sql in same PR.
- Down.sql lives in /supabase/rollbacks/ if that's the convention; verify
  current convention in /docs/MIGRATIONS.md.
- Migration #0001 and #0002 predate D-015 — no retroactive down.sql.

  1.2. **Reversibility verified manually**

- Spec includes acceptance criterion: down tested in dev/local.
- Pattern: run up → confirm state → run down → confirm reversal → run up
  again → confirm idempotent re-run.
- Down.sql restores PRE-migration state, not factory-default. If migration
  modified an existing object, down.sql restores its prior value, not its
  type-default (e.g., allowed_mime_types restored to what it was before,
  which may be NULL or another value — verify).

  1.3. **ON CONFLICT semantics**

- INSERT statements use explicit conflict handling.
- DO NOTHING: when re-run must NOT change existing values (rare for
  authoritative migrations).
- DO UPDATE SET ...: when re-run should restore authoritative values
  even if manually edited (default for migrations defining canonical
  state). The choice must be in the spec with rationale.

  1.4. **CHECK constraint pre-flight**

- Before adding CHECK on existing column, spec includes pre-flight
  query: SELECT 1 FROM table WHERE column NOT IN (allowed_values).
- If matches found, raise EXCEPTION with actionable message.
- Without pre-flight, transaction failure message is generic and wastes
  debugging time.

  1.5. **Existing object detection**

- Spec verifies whether bucket / table / column / index already exists
  before "creating" it.
- For Supabase Storage: bucket may exist from prior migration; use INSERT
  ... ON CONFLICT instead of CREATE.
- For columns: ALTER TABLE ADD COLUMN IF NOT EXISTS where supported, or
  pre-flight check.

  1.6. **Transaction wrapping**

- Migration wraps all changes in BEGIN ... COMMIT.
- Includes SET LOCAL lock_timeout (recommend 30s) and statement_timeout.
- All-or-nothing semantics on failure.

  1.7. **Trigger semantics**

- AFTER vs BEFORE chosen with rationale.
- WHEN clause used to skip trigger when fields-of-interest unchanged.
- Trigger function NULL handling: doesn't nullify columns that should
  retain prior value when source is empty (use EXISTS guard).
- Trigger DROP IF EXISTS before CREATE for idempotency.

  1.8. **CHECK constraint enum vocabulary**

- All status fields have CHECK constraints listing allowed values.
- Status values match types.ts literal unions exactly.
- New status added to types.ts is mirrored in CHECK constraint update
  (separate migration if applied later).

  1.9. **FK to auth.users feasibility**

- Supabase auth schema may reject FK creation. Spec includes feasibility
  check OR drops FK and documents application-level enforcement.
- ON DELETE behavior specified (CASCADE vs SET NULL vs RESTRICT).

  1.10. **Storage bucket file_size_limit reality**

- Bucket setting is partial enforcement (defense in depth).
- Primary enforcement is API-code-level.
- Vercel platform body cap (~4.5MB) overrides bucket setting for API
  uploads.
- Spec documents all enforcement layers.

---

## 2. Schema-write specs (INSERT/UPDATE)

Spec writes to a DB table (API endpoint, Inngest function, server action).

2.1. **Source-of-truth column verification**

- Spec verifies columns against actual /supabase/migrations/\*.sql files
  in repo, not against README descriptions or SCHEMA_AUDIT documentation.
- Columns invented from product specs (file_hash, notes, urgency before
  migration) flagged as schema gaps requiring migration.
- This is the #1 source of regressions in CEO drafts.

  2.2. **NOT NULL constraints**

- Every NOT NULL column has a value in the INSERT payload.
- If domain has no value yet (e.g., document_type before classifier),
  spec specifies a placeholder value AND the placeholder is in the
  CHECK constraint enum (or constraint absent — verify).

  2.3. **Column type alignment**

- uuid column: TS string, Supabase JS handles conversion.
- text column: plain string. Don't pass numbers as strings if column is
  numeric.
- jsonb: object literal acceptable; verify Supabase serialization.
- timestamptz: ISO string from JS Date (.toISOString()), not Date object.
- actor_id specifically: schema may be text (free-form) or uuid (FK).
  Verify in migration source. Mismatch produces silent NULL inserts.

  2.4. **CHECK enum value alignment**

- Status field values in INSERT match the CHECK constraint exactly.
- TypeScript literal union enforces at compile time only; DB enforces
  at write time. Both must agree.

  2.5. **FK reference correctness**

- claim_id, document_id, etc. point to existing rows.
- ON DELETE behavior known (CASCADE means parent delete wipes children).
- target_id (audit_log) and target_table together identify the audit
  subject.

  2.6. **Audit log shape consistency**

- Schema columns: claim_id, actor_type, actor_id, action, target_table,
  target_id, details (per #0001).
- Some specs may invent entity_type, entity_id, metadata — these don't
  exist. Verify against actual migration.
- actor_type vocabulary: 'system' / 'user' / 'rule_engine' / 'llm'.
- action: open string, but should follow convention (snake_case verb_phrase).
- details: jsonb object with relevant context (file_name, file_size,
  rule_id, etc.).

  2.7. **Cleanup on partial failure**

- If INSERT can fail after Storage upload, cleanup pattern in spec.
- Cleanup retry-or-log pattern: if cleanup itself fails, log to
  '[orphan-storage]' for periodic cleanup.
- Spec documents acceptable orphan rate for POC.

  2.8. **Idempotency for retries**

- INSERT statements safe to retry if upstream queueing requires it.
- Use UNIQUE constraints + ON CONFLICT, OR atomic UPDATE WHERE pattern.
- Document the chosen approach.

  2.9. **Race-window handling**

- Read-then-write patterns (count check + insert) have a race window.
- Spec documents the window AND mitigations (post-write logging,
  trigger-based enforcement, application-level lock).
- Acceptable race for POC if logged.

  2.10. **noUncheckedIndexedAccess**

- Project compiles with strict flags. Array/object indexing returns
  T | undefined.
- Spec uses .find(), .at(0), .single() patterns over bracket indexing.
- Insert results: .single() throws on 0 or >1 rows; .maybeSingle()
  returns null on 0; choice depends on whether 0 rows is success or
  error.

---

## 3. Inngest specs

Spec adds or modifies Inngest functions, events, or related infrastructure.

3.1. **Event naming convention**

- Pattern: 'noun/verb.qualifier' lowercase.
- Examples: 'document/uploaded', 'claim/processing.started'.
- Single source of naming in /docs/CONVENTIONS.md or events.ts.

  3.2. **EventSchemas pattern verification**

- fromRecord<T>: T is { 'event/name': { data: ... } } shape; Inngest
  infers name from key.
- fromUnion<T>: T is union of { name: 'event/name'; data: ... } types
  with explicit name fields.
- Verify pattern against installed Inngest SDK version (3.54+ at time
  of writing).
- Codex must verify before implementation; spec acknowledges flexibility.

  3.3. **State machine atomicity**

- Transitions use atomic UPDATE WHERE current_status=expected_status.
- Pattern: .update({ status: 'next' }).eq('id', X).eq('status', 'prev').
- maybeSingle() if 0 rows is acceptable (lost race, already processed).
- single() if 0 rows is an error (state should exist).

  3.4. **Retry semantics and checkpoint failures**

- Inngest step.run results memoize across retries.
- If function crashes between steps, retry resumes from next unmemoized
  step.
- Risk: claim-pending step succeeded with null on retry → function exits
  early → document stuck in intermediate state.
- Mitigation: claim-pending step accepts both 'pending' and intermediate
  states (e.g., 'processing') if no other run is active.
- Stuck-state watchdog (TECH_DEBT) for cases where mitigation insufficient.
- This was a near-miss in #03ב v1; treat as default-suspect pattern.

  3.5. **finalize no-rows-affected handling**

- After atomic UPDATE in finalize, verify rows affected.
- Pattern: const { data, error } = await ...update(...).select().single();
  if (!data) throw / log / skip per intent.
- Without check, silent state drift during manual ops interventions.

  3.6. **Idempotency via DB guards**

- Same event delivered twice (at-least-once delivery) handled by atomic
  WHERE in claim step.
- Same event sent twice via separate inngest.send calls produces two
  function runs; second run no-ops via WHERE guard.
- Document which scenario the test covers.

  3.7. **Failure simulation safety**

- Failure trigger via env var must include production guard.
- Pattern: throw if process.env.NODE_ENV === 'production' &&
  process.env.X === 'true' at app startup or function entry.
- File-name-pattern triggers ([FAIL] in name) acceptable for tests.
- Document in CONVENTIONS.md which triggers exist.

  3.8. **Concurrency limits**

- Inngest defaults to unlimited per-event parallelism.
- For functions calling external APIs (Claude, Supabase Storage),
  add concurrency: { limit: N, key: 'event.data.claimId' } when
  rate-limit risk emerges.
- POC stub functions don't need limits; document defer for #03ג.

  3.9. **Audit log entries on transitions**

- Each meaningful state transition emits an audit_log row.
- Pattern: <action>\_started, <action>\_completed, <action>\_failed.
- actor_type='system' for Inngest-driven actions; actor_id null or
  function identifier.
- details: include trigger info, error reason, processing time.

  3.10. **Inngest registration verification**

- /app/api/inngest/route.ts must serve all functions from the registry.
- New function added to /inngest/functions/index.ts.
- After deploy, verify registration in Inngest dashboard.
- Without registration, events queued but never processed.

  3.11. **Event payload sufficiency**

- Payload contains identifiers (documentId, claimId), not full objects.
- Function fetches current state from DB at runtime.
- Avoids stale data when event is processed late or re-run.

  3.12. **Cost tracking (forward pointer)**

- Functions calling LLM APIs must record costs to passes.cost_usd
  (per migration #0002).
- Stub functions skip; document defer to LLM-integration spike.

---

## 4. RLS and Storage specs

Spec touches storage.buckets, storage.objects, or RLS policies.

4.1. **Default deny + service_role bypass**

- Supabase enables RLS on storage.objects by default.
- No policies = anon/authenticated denied; service_role bypasses.
- API endpoints using service_role client work without explicit policies.
- Adding redundant policies risks naming conflicts with Supabase defaults.

  4.2. **Policy idempotency**

- DROP POLICY IF EXISTS before CREATE POLICY.
- Re-running migration must not fail on existing policy.

  4.3. **storage.buckets manipulation**

- Buckets created via INSERT INTO storage.buckets, NOT via CREATE BUCKET.
- ON CONFLICT (id) DO UPDATE for re-run safety AND drift prevention.
- Pre-existing bucket detection: query before INSERT.

  4.4. **Defense-in-depth file size**

- Layer 1: Frontend pre-validation (UX feedback).
- Layer 2: API endpoint server-side check (PRIMARY enforcement).
- Layer 3: Bucket file_size_limit (may not enforce on service_role
  uploads).
- Layer 4: Vercel platform body cap (~4.5MB).
- Spec documents all four layers.
- Primary enforcement at Layer 2 — never rely solely on Layer 3.

  4.5. **mime_types allowlist**

- Bucket allowed_mime_types is partial enforcement.
- API code re-validates mime_type as primary.
- Allowlist must match what downstream processing supports (e.g.,
  HEIC accepted at upload but unsupported by Claude API → reject at
  upload OR convert before processing).

  4.6. **File path conventions**

- Pattern: claims/{claim_id}/{document_id}.{ext}.
- ext derived from mime_type (canonical map), always lowercase.
- Filename original NOT in path (sanitization needed; risk of injection).
- Original filename stored in documents.file_name for display.

  4.7. **Filename sanitization**

- Strip: ../, \, NUL bytes (\u0000), control chars (\u0001-\u001F).
- Strip: RTL/LTR override chars (\u200E, \u200F, \u202A-\u202E).
- Truncate to 255 chars.
- Block scams like "doc\u202Egpj.pdf" displaying as "docfdp.jpg".

  4.8. **Cleanup orphans**

- Storage uploads without DB rows are orphans.
- Cleanup retry on INSERT failure: try delete, log on failure.
- Periodic cleanup job in TECH_DEBT until built.

---

## 5. Cross-cutting items

Apply to all spec types.

5.1. **VersionFooter (D-013)**

- New UI page renders VersionFooter at bottom.
- /lib/version.ts bumped at end of spike (Spike #N).
- Pages without VersionFooter: API routes, /api/health, internal scripts.

  5.2. **actor_type vocabulary in audit_log**

- Canonical values: 'system' / 'user' / 'rule_engine' / 'llm'.
- 'system' for automated actions without authenticated user.
- 'user' for adjuster-authenticated actions.
- 'rule_engine' for R01-R09 rule executions.
- 'llm' for Claude API calls.
- Distinguish via 'action' field and target_table when actor_type same.

  5.3. **Public route pattern**

- /api/\* excluded from auth middleware (per #01).
- Public routes follow /api/claims pattern from #02c-2.
- No session check; uploaded_by null for anonymous uploads.
- Authenticated session optional, used when present.
- Document in /docs/ROUTING.md.

  5.4. **Error code conventions**

- API returns English code + English internal message.
- Frontend maps code → Hebrew user message.
- Code list in /docs/CONVENTIONS.md → API error codes section.
- Pattern: snake_case (validation_failed, invalid_file_type,
  document_limit_reached).
- New codes appended to CONVENTIONS.md as part of spike's PR.

  5.5. **TECH_DEBT entry quality**

- Each entry includes:
  - Current state (what works now).
  - Required state (what's missing for production).
  - Trigger condition (when to add: "before public launch", "when 4+
    sites use the same map", "first observed orphan").
- Vague entries ("improve later") fail the bar.
- Reference spike numbers when relevant.

  5.6. **D-014 docs canonical**

- /docs/\* in repo is canonical.
- Project Knowledge files are reference only.
- New decisions appended to /docs/DECISIONS.md in same PR as their first
  enforcement.
- New conventions appended to /docs/CONVENTIONS.md.

  5.7. **D-012 runtime evidence**

- Acceptance criteria include actual runtime checks, not just typecheck.
- Playwright pass output, Lighthouse score, manual verification screenshot.
- "Codex self-verifies on Vercel preview" is a real step, not boilerplate.

  5.8. **Hebrew RTL preserved**

- All user-facing copy in Hebrew.
- Logical CSS properties (ms-/me-, never ml-/mr-).
- Heebo font for letters, Inter for digits in mixed lines.
- New components inherit existing patterns from #00b/#00c.

  5.9. **Boundary check**

- Spec lists files Codex MUST NOT touch.
- Migrations marked immutable.
- /lib/types.ts changes flagged with [TYPES] tag.
- No accidental writes to backend territory if spec is frontend-owned.

  5.10. **Spike numbering and naming**

- Branch name follows pattern: <area>-<feature> (backend-claims-api,
  frontend-dashboard).
- PR title: "Spike #NN: <description>".
- /docs/CURRENT_STATE.md updated in same PR.
- Spike numbers documented in /docs/specs/README.md index.

---

## 6. Review reply format

Output to CEO:

```
[Section X.Y] <correction>
[Section X.Y] <correction>

(repeat per issue)

Summary: <count> blocking, <count> important, <count> cosmetic.
Recommendation: <fix all blocking, ship | iterate>.
```

Group by severity, not by section, for CEO readability. Include section
reference for traceability — when CEO asks "where did this rule come
from", the answer is in /docs/PM_REVIEW_CHECKLIST.md section X.Y.

---

## 7. Maintenance

- Add new sections when a new spec type appears (e.g., LLM prompts,
  KB curation, cron jobs).
- Add new items when a pattern surfaces 3+ times across spikes.
- Remove items that become enforced by tooling (e.g., type-level rule
  → eslint plugin).
- Bump version at top when content changes meaningfully.
- Don't fork by spec type — keep one canonical file. PMs working
  different spike streams reference the same checklist.

---

## 8. Anti-patterns observed (informational)

These are CEO-draft mistakes that recurred. Awareness reduces their
frequency.

- Schema invented from memory of product spec, not read from migration
  file. Source of #1 blocking issues. Always verify against migration.
- Inngest function structure copied from documentation example without
  adapting to project's strict mode (noUncheckedIndexedAccess) or
  Supabase client conventions.
- Trigger logic that nullifies fields when source has no value (e.g.,
  trigger sets risk_band = null when no completed pass exists, wiping
  pre-existing value).
- Body parsing config missing for Next.js route handlers expecting
  large uploads. Defaults silently truncate.
- Documentation deferred to "later spike" with no defined trigger.
  Becomes permanent debt.
- ON CONFLICT DO NOTHING used reflexively when DO UPDATE is the
  authoritative-state-restoration intent.
- Cross-spike inconsistency in audit_log.actor_type values without
  central registry.

End of file.
