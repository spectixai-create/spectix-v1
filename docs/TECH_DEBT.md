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
