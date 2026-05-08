# Tech Debt

- [ ] Rotate Supabase `service_role` key. It was exposed in chat before repository documentation became canonical.
- [x] Gate `/api/health` before public launch. UI-003 Part 1 keeps anonymous
      health minimal and moves table counts to authenticated `/api/health/detailed`.
- [x] Hide/auth-gate `/design-system` before first customer demo. UI-003 Part 1
      keeps the page internal and removes it from navigation.
- [ ] Sample-data refactor: import types from [lib/types.ts](../lib/types.ts) in `sample-claim.ts`, `sample-questions.ts`, `sample-rows.ts`, and `intake-options.ts`.
- [x] Migration #0002: support question `closed` state, urgency, `resolvedBy`, `resolutionNote`, and `closedAt`.
- [x] Migration #0002: add reliable document processing status.
- [ ] `clarification_questions.resolved_by` has no DB FK to `auth.users` due to Supabase schema permissions. Application code must validate user existence before insert/update.
- [ ] `PassEvent` type removed: pipeline events now live in `audit_log`. Frontend pass timeline rendering from #00d needs adjustment in #00a-refactor.
- [ ] `POST /api/claims` has no rate limiting. Acceptable for POC; add before public launch.
- [ ] `POST /api/claims` has no idempotency key. Browser-level double-submit prevention only. Possible duplicate claims in edge cases such as network retry or back-and-resubmit. Manual ops cleanup if duplicates appear.
- [ ] Hebrew error message mapping is currently inlined in form components. Centralize to `lib/i18n/error-messages.ts` when 4 or more form sites use it.
- [ ] `AuditAction` strings are open-ended in DB. No central registry. Acceptable while fewer than 5 actions exist; centralize when audit dashboard or query patterns require it.
- [ ] Virus scanning on uploads: current upload flow has no malware scanning. Required before real customer data.
- [ ] Storage cleanup on claim delete: document rows cascade-delete, but Storage files can become orphans. Add scheduled cleanup once Inngest cron is wired.
- [ ] Expand allowed upload file types beyond current PDF, JPEG, PNG, and
      frontend HEIC/HEIF-to-JPEG conversion. Consider native WebP/TIFF handling
      after real-user feedback.
- [ ] Refine minimum file size validation: current 100-byte minimum is broad. Revisit once OCR rejects trivial files.
- [ ] Resumable uploads: current upload retries from byte 0 after network drops.
- [ ] Signed URL uploads for files larger than 4 MB: bucket supports 32 MB, but Vercel body limits force the API cap.
- [ ] Claim ownership / authenticated upload restrictions: public upload is acceptable for POC because claim IDs are UUIDs, but proper ownership is required later.
- [ ] Document upload abuse without claim_id discovery: attacker with a valid claim ID can upload up to 50 docs. Rate limiting is deferred.
- [ ] HEAD precheck for claim acceptability before client uploads body: avoids wasting bandwidth on terminal claims.
- [ ] Structured logger: replace bracket-prefixed `console.error` tags with structured logs when volume justifies.
- [ ] Rate limit per claim_id: add roughly 10 uploads/hour once public endpoint rate limiting exists.
- [ ] `documents.document_type` DB-level CHECK constraint: DB is plain text; TypeScript union enforces values for now. Add CHECK after classifier values stabilize.
- [ ] 10m. CHECK constraint on `audit_log.actor_type`: current DB is `text not null` with no CHECK. Required before production launch or first out-of-vocabulary row: pre-flight distinct invalid actor types, then add CHECK for `system`, `user`, `rule_engine`, `llm`, `gap_analyzer` with paired rollback.
- [ ] 11a. Recovery job for orphaned pending documents: if `inngest.send` fails from upload endpoint, document stays `pending`. Add scheduled Inngest cron that scans old pending docs and re-fires `claim/document.uploaded`.
- [x] 11b. Stuck-document watchdog (HR-001): #03g adds a scheduled watchdog using `documents.created_at` as the available proxy. If false positives appear, add a dedicated `claimed_at` migration.
- [ ] 11c. Inngest event registry split: split `SpectixInngestEvent` by domain once the union has 10+ members.
- [x] 11d. Pass tracking: #03g records classifier LLM calls and cost through `upsert_pass_increment`.
- [x] 11e. Inngest concurrency limits for Claude API: #03g adds `concurrency: { limit: 5, key: 'event.data.claimId' }`.
- [x] 11f. UI feedback regression after upload: #03g adds polling status UI after upload.
- [ ] 11g. Claude classifier pricing is hardcoded in `lib/llm/client.ts`. Move pricing to env/config when model pricing changes or multiple models are active.
- [x] 11h. Subtype-specific extraction prompts were pending after #03ד-1b and SPRINT-002A. SPRINT-002B adds the seven MVP normalized extractor routes and preserves legacy broad fallback for non-MVP subtypes.
- [ ] 11i. Status polling is client-side every 2 seconds for 30 seconds. Replace with realtime/subscription or server push if processing latency grows.
- [ ] 11j. `upsert_pass_increment` lacks an idempotency key. If the gap between summed classifier audit costs and `claims.total_llm_cost_usd` exceeds 5% or 10 entries, add an idempotency-keyed accounting table/RPC.
- [ ] 11k. Subtype classifier downloads the same storage object as broad classifier. Future optimization: pass bytes between Inngest steps instead of downloading twice. **Owner:** CEO (monthly review of Supabase egress in dashboard). **Trigger:** first Supabase invoice line item showing storage egress > 0.
- [x] 11l. `extracted_data` JSONB does not yet have a typed schema for the subtype block. #03ד-1b persists the discriminated union extraction shape while preserving classifier/subtype metadata.
- [ ] 11m. When Prompt 01b returns an invalid subtype, fallback is null plus audit only; no human alert fires. **Owner:** PM. **Trigger:** third `details.llm_returned_invalid_subtype` audit entry in 30 days.
- [ ] 11n. Watchdog threshold was set when only broad classification ran. Two-tier classification doubles the latency budget. **Owner:** PM (weekly review during Section 7 maintenance pass of PM_REVIEW_CHECKLIST). **Trigger:** 95th percentile of `audit_log.details.processing_time_ms` exceeds 60s over a 7-day window.
      **Pre-merge baseline (SPRINT-002B):** p50=39877ms, p95=49224ms across 9 smoke documents (7 MVP normalized + 1 broad fallback pharmacy_receipt + 1 skip/defer other_misc). Trigger remains: production p95 > 60000 ms over 7-day window.
- [ ] 11o. `public.upsert_pass_increment` accumulates by design (`cost_usd = passes.cost_usd + excluded.cost_usd`). Under Inngest checkpoint corruption, a step may re-run and double-record cost. Mitigation: add an idempotency key parameter such as `p_idem_key uuid` derived from `(documentId, phase)` and a UNIQUE deduplication table. **Owner:** CEO. **Trigger:** when `SUM(audit_log.details.cost_usd)` for a claim differs from `claims.total_llm_cost_usd` by more than 5% across 10+ claims in a 7-day window.
- [ ] 11p. `DocumentSubtype` vocabulary lives in three locations: `lib/types.ts` literal union, `supabase/migrations/0005_document_subtype.sql` CHECK constraint, and `tests/unit/document-subtypes.test.ts` EXPECTED_SUBTYPES. Tests gate (a) <-> (c). No gate covers (a/c) <-> (b); a future PR could add a value to types.ts but forget the migration, allowing runtime CHECK violations in production. Mitigation: add a CI step that parses the most recent subtype migration and asserts equality to the `DocumentSubtype` union, OR generate the CHECK constraint values from the union at build time. **Owner:** CEO. **Trigger:** when the next subtype is added in a future spike, OR when the first runtime CHECK violation is observed in any environment.
- [ ] 11q. If an extractor returns successfully but `extracted_data.kind = 'extraction'` has a route/payload mismatch, the row is inconsistent. #03ד-1b adds a runtime guard before persistence; add a weekly PM query for any bypassed/manual rows. **Owner:** PM weekly Section 7 query. **Trigger:** first occurrence from `select id from documents where extracted_data->>'kind' = 'extraction' and ((extracted_data->>'route' = 'receipt' and extracted_data->'data' ? 'items' = false) or (extracted_data->>'route' = 'police' and extracted_data->'data' ? 'formatAnalysis' = false) or (extracted_data->>'route' = 'hotel_generic' and extracted_data->'data' ? 'redFlags' = false) or (extracted_data->>'route' = 'medical' and extracted_data->'data' ? 'anomalies' = false));`.
- [x] 11r. Pass row remains `in_progress` after document-level broad extraction smoke completes. Resolved by locally validated SPRINT-001 PR #38: pass 1 is the claim-level document-processing pass, remains `in_progress` while any document is non-terminal, completes only when every document is terminal without blocking failure, and fails when terminal documents include a blocking failure. TASK-SPECTIX-001 observed pass 1 `in_progress` after all 8 smoke documents reached `processed`, with `llm_calls_made = 19` and `cost_usd = 0.16041`. **Severity:** medium. **Status:** pending QA review.
- [ ] 11s. SPRINT-002C skips broad fallback `extracted_data.kind = 'extraction'` rows instead of adapting them into validation-layer inputs. Add an explicit broad fallback adapter when validation must include non-MVP broad outputs. **Owner:** CEO. **Trigger:** first validation smoke where skipped broad fallback documents materially affect name/date/currency validation.
- [ ] 11t. SPRINT-002C name matching has no Hebrew-English transliteration utility. It performs conservative Unicode/case/diacritic normalization plus Levenshtein similarity only. Add transliteration when mixed Hebrew/English real documents produce false mismatches. **Owner:** CEO. **Trigger:** two real or smoke cases where the same claimant appears in Hebrew and English and validation reports mismatch.
- [ ] 11u. SPRINT-002C live FX conversion is implemented behind provider selection but disabled by default; the default provider is deterministic fake rates. Live FX enablement requires a separate CEO-approved release/env decision plus monitoring. **Owner:** CEO. **Trigger:** production-like validation requires non-fake exchange rates.

---

### 11v — Hard Cost Cap via Postgres Atomic Function

**Current state (MVP):** soft cap with concurrency-induced tolerance. Target $2.00 per claim, effective range $1.50-$2.50 due to Inngest concurrency cap of 5 (max 5 concurrent LLM calls × ~$0.10 each = $0.50 worst-case overrun).

**Implementation:** `callClaudeWithCostGuard` wrapper checks `total_llm_cost_usd` before each call, throws `CostCapHaltError` (extends `NonRetriableError`) if cap reached. Race condition: concurrent calls can all pass guard at $1.95 -> all settle -> total $2.45. Acceptable for MVP.

**Future requirement (V2):** atomic increment-and-check via custom Postgres function or `SELECT ... FOR UPDATE` on claims row. One DB round-trip per LLM call, no race possible.

**Trigger to implement:**

- Production cost spike where soft-cap tolerance exceeds business tolerance, OR
- Regulatory requirement for hard caps, OR
- Pricing per claim becomes per-cent-sensitive.

**Owner:** CEO.
**Estimated work:** 0.5-1 day Postgres function + Inngest wrapper integration + tests.
**Reference:** design001.6 Section H.1.

### 11w — Upload Conflict 409 Policy / Race Policies D.2-D.5 Deferred

**Current state (MVP):** SPRINT-002D keeps the existing upload and mutation behavior. It does not implement the design001.6 race-condition policy set for upload conflicts, in-flight mutation locks, or `409` responses with `estimated_completion_seconds`.

**Deferred scope:** upload conflict policy, race policies D.2-D.5, and any UI/API behavior that blocks or coordinates user edits while extraction/validation/synthesis is running.

**Trigger to implement:** first pilot workflow where an adjuster or claimant can upload or mutate claim evidence while background processing is active and that creates duplicate work, unclear UI state, or data loss risk.

**Owner:** CEO.
**Reference:** AUDIT-001 and SPRINT-002D v1.1 deferral.

### 11x — Admin RBAC for Retry Endpoint

**Current state (MVP):** SPRINT-002D includes testable errored-claim recovery helpers, but the admin retry endpoint returns `403` by default because the repo has no established admin/internal auth convention and SPRINT-002D explicitly forbids inventing RBAC.

**Deferred scope:** define and implement a repo-wide admin/internal caller pattern for operational endpoints, then enable `POST /api/admin/claims/[id]/retry` behind that pattern.

**Trigger to implement:** first operational need to recover `errored` claims through an HTTP endpoint instead of calling recovery helpers from a trusted maintenance path.

**Owner:** CEO.
**Reference:** SPRINT-002D v1.1 admin auth precondition.

### 11z — Readiness Score Weights Calibration

**Current state:** SPRINT-003A uses placeholder readiness score weights `{ high: 30, medium: 15, low: 5 }`.

**Future requirement:** evidence-based reweighting from pilot data.

**Trigger:** 50+ claims reviewed by adjusters with decision data captured.

**Owner:** CEO + Adjuster lead.

### 11D — Admin Retry Endpoint UI

**Current state:** SPRINT-UI-001 deliberately does not expose the SPRINT-002D
admin retry endpoint in the adjuster UI. The endpoint remains behind the
existing backend auth decision and is not part of adjuster workflow MVP.

**Future requirement:** add an operations-only retry control after repo-wide
admin/internal auth is defined and reviewed.

**Trigger:** first pilot or support workflow requiring non-developer recovery of
`errored` claims.

**Owner:** CEO.

### 11E — Question Text Inline Edit

**Current state:** SPRINT-UI-001 lets adjusters select generated questions for
dispatch intent but defers inline question text editing. The API supports
`edited_texts`, but the MVP UI keeps the generated Hebrew text unchanged.

**Future requirement:** inline edit control with audit-visible edited text and
validation against unsafe/raw content.

**Trigger:** first adjuster review where generated question wording needs manual
editing before claimant follow-up.

**Owner:** CEO + Adjuster lead.

### 11F — UI String i18n Externalization

**Current state:** the repo has no `next-intl`, `i18next`, or `react-intl`
pattern. SPRINT-UI-001 centralizes hardcoded Hebrew strings in
`lib/ui/strings-he.ts` without introducing an i18n dependency.

**Future requirement:** move UI strings into a formal i18n catalog before adding
additional locales or large-scale copy variants.

**Trigger:** second UI language, white-label copy requirement, or more than 100
adjuster-facing strings.

**Owner:** CEO + Product.

### 11J — Document Upload Virus Scanning

**Current state:** UI-002B accepts claimant-uploaded PDF/JPEG/PNG documents with
size/type validation only. No malware scanning is performed.

**Future requirement:** add virus scanning before processing claimant documents
with production customer data.

**Trigger:** first production launch gate or first customer requirement for
malware scanning.

**Owner:** SPRINT-PROD-BLOCK.

### 11K — Multi-Cycle Synthesis Prompt Summarization

**Current state:** re-cycle synthesis can consume current validation and response
state, but does not summarize long multi-cycle histories.

**Future requirement:** add privacy-safe summarization once multiple claimant
response cycles become common.

**Trigger:** pilot claims with more than two claimant response cycles or
adjuster feedback that repeated context is hard to review.

**Owner:** CEO + Product.

### 11L — Short Link Service `s.spectix.com`

**Current state:** UI-002B generates full application magic links for manual
sharing by adjusters.

**Future requirement:** add a short-link domain for SMS and compact manual
sharing.

**Trigger:** SMS multi-segment rate >30%.

**Owner:** UI-002C follow-up.

### 11M — Notification Preference Per Claimant

**Current state:** UI-002B stores contact information status but does not
implement claimant notification preferences.

**Future requirement:** let operations record claimant channel preference before
automated notifications are enabled.

**Trigger:** first pilot workflow where claimant prefers one channel over
another.

**Owner:** UI-002C follow-up.

### 11Q — Storage Cleanup For Orphaned Uploads

**Current state:** claimant uploads remove storage objects on known insert/link
failures, but there is no scheduled cleanup for rare partial failures.

**Future requirement:** periodic storage reconciliation for documents with no
valid DB row or response linkage.

**Trigger:** first detected orphaned claimant response upload or production
storage review.

**Owner:** SPRINT-PROD-BLOCK.

### 11R — `question_responses` History Audit Trail (Privacy-Preserving)

**Current state:** UI-002B upserts `question_responses` by
`(claim_id, question_id)` and preserves response submission timestamps/counts in
`audit_log`, but does not store historical response content.

**Future requirement:** append-only audit table with hashed response values,
timestamps, and cycle number. No response content stored.

**Trigger:** forensic requirement from pilot insurer, such as a
claimant-changed-answer dispute.

**Owner:** SPRINT-PROD-BLOCK.

### 11T — Production Rate Limiter (Redis-Backed)

**Current state:** UI-002B uses an in-memory middleware limiter for claimant
public routes. This is sufficient only for local/non-prod smoke and small pilots.

**Future requirement:** swap in-memory LRU rate limiter for Upstash Redis or
equivalent shared production limiter.

**Trigger:** pre-production scale.

**Owner:** SPRINT-PROD-BLOCK.

### 11U — Real-Time Autosave Indicator

**Current state:** claimant and intake flows save or submit data, but the UI
does not provide a fully consistent real-time autosave state across every form
surface.

**Future requirement:** add a shared autosave indicator pattern for draft,
dirty, saving, saved, and failed states.

**Trigger:** repeated demo or pilot feedback that users cannot tell whether a
draft or form change was saved.

**Owner:** UI follow-up.

### 11V — Dynamic Required-Documents Checklist Per Claim Type

**Current state:** document requirements are shown through generated findings
and questions rather than a dedicated dynamic checklist by claim type.

**Future requirement:** show claim-type-specific required and optional
documents, with state derived from uploaded documents and validation findings.

**Trigger:** first pilot workflow where adjusters need to compare a claim
against a visible required-document checklist.

**Owner:** Product + UI.

### 11W — Step Indicator On Intake Form

**Current state:** `/new` is a single long form without a step/progress
indicator.

**Future requirement:** add an intake step indicator once the form grows beyond
the current MVP fields.

**Trigger:** UI-003 Part 2 or later intake expansion makes the form harder to
scan on mobile.

**Owner:** UI follow-up.

### 11X — Language Consistency In Public-Facing UI

**Current state:** some internal-era English labels and mixed phrasing can still
appear in non-core surfaces or docs-derived UI.

**Future requirement:** run a dedicated Hebrew/English copy pass over public and
insurer-facing screens.

**Trigger:** before first live insurer demo session or when Designer provides a
copy deck.

**Owner:** Product + Designer.

### 11Y — Worktree-Only ESLint Conflict

**Current state:** QA-001 observed a local worktree layout where ESLint found
duplicate `eslint-plugin-tailwindcss` installs from both the worktree and parent
repo.

**Future requirement:** document or script a clean worktree lint invocation if
the nested worktree pattern continues.

**Trigger:** second occurrence of the same local lint conflict.

**Owner:** Dev hygiene.

### 11Z — Live Webhook Signature Rejection Probe

**Current state:** Resend webhook invalid-signature behavior is covered by tests
and previous non-prod validation, but QA-001 did not re-run a live staging POST.

**Future requirement:** add an explicit live non-prod webhook rejection probe to
future smoke checklists when mutation approval is granted.

**Trigger:** next CEO-approved non-prod smoke cycle that includes webhook
security checks.

**Owner:** QA.

### 11AA — "טרם חזרתי" Checkbox For In-Trip Claim Filing

**Current state:** UI-003 Part 2 requires a concrete trip end date and does not
support claimants who are still abroad.

**Future requirement:** add a `טרם חזרתי` checkbox or equivalent in-trip filing
state, with validation rules that allow open-ended trip windows without
weakening incident-date checks.

**Trigger:** first pilot or demo feedback where a claimant reports an incident
before returning to Israel.

**Owner:** Product + UI.

### 11AB — Authenticated `/design-system` Navigation Leak

**Current state:** the route is no longer anonymous-public, but the link can
still appear in authenticated/demo-exposed navigation.

**Future requirement:** remove the link from demo-facing authenticated
navigation while preserving direct internal access for authorized users.

**Owner:** UI-003 Part 3.

### 11AC — Authenticated Footer Internal Build Text

**Current state:** authenticated/demo-exposed surfaces can still show internal
Spike/build wording.

**Future requirement:** remove internal build labels from demo-exposed UI and
keep internal version information in developer-only contexts.

**Owner:** UI-003 Part 3.

### 11AD — Header Identity Initials Avatar Pattern

**Current state:** the authenticated header can expose the full user email.

**Future requirement:** replace visible email text with an initials/avatar
dropdown pattern.

**Owner:** UI-003 Part 3.

### 11AE — Hebrew Day Pluralization

**Current state:** at least one Hebrew day-count label can render `1 ימים`.

**Future requirement:** normalize singular/plural day labels across
authenticated/demo-exposed UI.

**Owner:** UI-003 Part 3.

### 11AF — Dashboard Claim Type Localization

**Current state:** dashboard claim type values can still render in English.

**Future requirement:** render claim type labels in Hebrew on demo-exposed
dashboard surfaces.

**Owner:** UI-003 Part 3.

### 11AG — Dashboard Risk Band Column

**Current state:** the dashboard table does not expose a Risk Band column.

**Future requirement:** add canonical Risk Band display to the dashboard table.

**Owner:** UI-003 Part 3.

### 11AH — Dashboard KPI Cards

**Current state:** dashboard KPI cards are not yet aligned with the
demo-readiness expectations from the Architect UX audit.

**Future requirement:** add or align KPI cards for insurer-demo scanning.

**Owner:** UI-003 Part 3.

### 11AI — Tags Versus Status Badge Separation

**Current state:** tags and status badges can be visually conflated on
demo-exposed claim surfaces.

**Future requirement:** separate status and descriptive tags with distinct
visual treatment.

**Owner:** UI-003 Part 3.

### 11AJ — Question Card Primary Action Copy

**Current state:** question cards need a clearer primary action for opening the
claim.

**Future requirement:** use `פתח תיק` as the primary action where the card
navigates to a claim.

**Owner:** UI-003 Part 3.

### 11AK — Tab Counters

**Current state:** tab labels do not consistently show counters for contained
items.

**Future requirement:** add counters to relevant tabs where they improve
demo-time scanning.

**Owner:** UI-003 Part 3.

### 11AL — Leading Finding Severity Color Coding

**Current state:** leading findings need clearer severity color coding for
demo-time triage.

**Future requirement:** apply canonical severity color treatment to leading
findings.

**Owner:** UI-003 Part 3.

### 11AM — RTL Primary/Secondary Button Order

**Current state:** primary and secondary action order is not fully normalized
for RTL demo surfaces.

**Future requirement:** align RTL button ordering with the approved UI-003 Part
3 pattern.

**Owner:** UI-003 Part 3.

### 16.1 — RESOLVED: HEIC To JPEG Frontend Conversion

**Status:** resolved in UI-003 Part 1.

**Resolution:** HEIC/HEIF files can be selected in upload controls and are
converted client-side to JPEG before the existing upload API receives them.
Server-side storage and Claude processing continue to see supported JPEG files,
preserving D-017's server-side MIME constraints.

### 11G — REMOVED: Notification Multi-Provider Failover

**Original scope:** add a secondary email provider fallback behind Resend.

**Status:** removed from the active MVP list by D-030. UI-002C uses email-only
via Resend.

**Trigger to revisit:** post-pilot provider reliability below 99% or insurer
procurement requires provider redundancy.

### 11H — DEFERRED Beyond UI-002C: WhatsApp Notifications

**Original scope:** automate WhatsApp or other messaging-channel notification
fallbacks.

**Status:** deferred beyond UI-002C by D-030. Manual out-of-system sharing by
the adjuster remains the MVP fallback.

**Trigger to revisit:** pilot adjusters explicitly request WhatsApp/SMS
automation after email-only operation is measured.

### 11N — Resend Tier Upgrade Trigger

**Current state:** UI-002C uses Resend as the single notification provider.

**Trigger:** more than 2,000 claimant email dispatches per month.

**Owner:** SPRINT-PROD-BLOCK.

### 11P — REMOVED: Late Bounce Auto-SMS Retry

**Original scope:** automatically retry by SMS after a late email bounce.

**Status:** removed by D-030. UI-002C has no SMS or Twilio path. Bounce and
complaint metadata tell the adjuster to use the existing manual fallback.

- [ ] Historical archive for older spikes #00, #00b, #00c, #00d, #00e, #02, #02a, #02b. Deferred to Spike #00z-B.
- [ ] Replace sample dashboard/claim/questions data with real Supabase data once API contracts land.
- [ ] OpenClaw real command channel integration remains blocked in the local install because GitHub issue/PR comments are not a supported channel target. Use the local dispatcher as the operational bridge until a safe supported channel or TaskFlow import path exists.

## Migration #0002 Scope

Rationale and detailed SQL snippets are tracked in [SCHEMA_AUDIT.md](SCHEMA_AUDIT.md).

Estimated effort: 1 full day.

Column and table scope:

- `claims`: `claimant_email`, `claimant_phone`, `policy_number`, `current_pass`, `total_llm_cost_usd`, `brief_text`, `brief_pass_number`, `brief_recommendation`, `brief_generated_at`, plus `claims_policy_number_idx` and `claims_status_valid`.
- `passes`: new normalized pass-state table with RLS enabled and unique `(claim_id, pass_number)`.
- `documents`: `processing_status` plus status CHECK.
- `clarification_questions`: `urgency`, `resolved_by`, `resolution_note`, `closed_at`, plus status and urgency CHECKs.
- `findings`: `severity_adjusted_by_context`, `severity_original`, `status`, `resolved_in_pass`, `recommended_action`, plus severity and status CHECKs.
- `gaps`: `fill_method`, `fill_target`, `filled_in_pass`, `filled_value`, `updated_at`, status CHECK, and `gaps_set_updated_at` trigger.
- Trigger: `update_claim_pipeline_state()` keeps `claims.current_pass`, `claims.total_llm_cost_usd`, and `claims.risk_band` synchronized from `passes`.

Blocked or partially blocked spikes:

- #02c-2: `POST /api/claims` with full field support.
- #03: document processing with reliable status tracking.
- #04+: rules that need `policy_number`, pass state, and context-adjusted severity.
- #08: clarification flow with full closed-state support.

Migration #0002 landed in Spike #13. Its schema additions unblock #02c-2, #03, and later rules work.
