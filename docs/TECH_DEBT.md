# Tech Debt

- [ ] Rotate Supabase `service_role` key. It was exposed in chat before repository documentation became canonical.
- [ ] Remove or gate `/api/health` before public launch.
- [ ] Remove `/design-system` before first customer demo.
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
- [ ] Expand allowed upload file types: currently PDF, JPEG, PNG. Consider HEIC/HEIF conversion, WebP, and TIFF after real-user feedback.
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
- [ ] 11h. Real OCR/extraction prompts are still pending. #03g classifies document type only; downstream extraction remains for later #03 spikes.
- [ ] 11i. Status polling is client-side every 2 seconds for 30 seconds. Replace with realtime/subscription or server push if processing latency grows.
- [ ] 11j. `upsert_pass_increment` lacks an idempotency key. If the gap between summed classifier audit costs and `claims.total_llm_cost_usd` exceeds 5% or 10 entries, add an idempotency-keyed accounting table/RPC.
- [ ] Historical archive for older spikes #00, #00b, #00c, #00d, #00e, #02, #02a, #02b. Deferred to Spike #00z-B.
- [ ] Replace sample dashboard/claim/questions data with real Supabase data once API contracts land.

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
