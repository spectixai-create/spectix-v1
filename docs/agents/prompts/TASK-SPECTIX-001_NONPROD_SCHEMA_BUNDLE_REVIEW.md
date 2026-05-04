# TASK-SPECTIX-001 Nonproduction Schema Bundle Review

Review target:

```text
aozbgunwhafabfmuwjol
```

Forbidden target:

```text
fcqporzsihuqtfohqtxs
```

Do not apply this schema bundle to production. Do not include, paste, or commit
secret keys.

## 1. Ordered Migration List

1. `0001_initial_schema.sql`
   - Creates the base tables, indexes, `set_updated_at` trigger function,
     `claims_set_updated_at` trigger, RLS enablement, and private
     `claim-documents` bucket.
2. `0002_schema_audit_implementation.sql`
   - Adds intake/contact/pipeline columns, `passes`, additional checks,
     processing status, lifecycle fields, triggers, and verification blocks.
3. `0003_storage_mime_types.sql`
   - Restricts `claim-documents` to image/PDF MIME types.
4. `0004_classifier_prep.sql`
   - Adds `documents.document_type` CHECK, removes HEIC from the bucket
     allowlist, and adds `upsert_pass_increment`.
5. `0005_document_subtype.sql`
   - Adds nullable `documents.document_subtype`, 37-value CHECK, and partial
     subtype index.

## 2. Combined SQL Summary

The generated local bundle concatenates all five migrations into:

```text
.openclaw-local/supabase-nonprod/TASK-SPECTIX-001/nonprod_schema_bundle.sql
```

It includes:

- `pgcrypto` extension enablement.
- Eight public tables after all migrations.
- All current indexes and CHECK constraints.
- RLS enablement.
- One private Storage bucket.
- The `upsert_pass_increment` RPC used by document processing.
- Trigger functions/triggers for `claims.updated_at`, `gaps.updated_at`, and
  claim pass accounting.
- Verification `DO` blocks embedded in migrations `0002`, `0004`, and `0005`.

The bundle was generated for review/manual apply only. Codex did not apply it
to Supabase.

## 3. Tables To Be Created

- `claims`
- `documents`
- `findings`
- `gaps`
- `clarification_questions`
- `enrichment_cache`
- `audit_log`
- `passes`

## 4. Key Indexes And Constraints

Indexes include:

- `claims_status_idx`
- `claims_risk_band_idx`
- `claims_created_at_idx`
- `claims_policy_number_idx`
- `documents_claim_id_idx`
- `documents_document_type_idx`
- `documents_document_subtype_idx`
- `findings_claim_id_idx`
- `findings_rule_id_idx`
- `findings_pass_number_idx`
- `gaps_claim_id_idx`
- `gaps_status_idx`
- `clarification_questions_claim_id_idx`
- `clarification_questions_status_idx`
- `enrichment_cache_expires_at_idx`
- `audit_log_claim_id_idx`
- `audit_log_created_at_idx`
- `passes_claim_id_idx`
- `passes_status_idx`

Constraints/checks include:

- `claims_status_valid`
- `claims_brief_recommendation_valid`
- `passes_status_valid`
- `passes_risk_band_valid`
- `documents_processing_status_valid`
- `documents_document_type_check`
- `documents_document_subtype_check`
- `cq_urgency_valid`
- `cq_status_valid`
- `findings_severity_valid`
- `findings_severity_original_valid`
- `findings_status_valid`
- `gaps_status_valid`
- `gaps_fill_method_valid`
- Unique `claims.claim_number`
- Unique `(passes.claim_id, passes.pass_number)`
- Unique `enrichment_cache.cache_key`

## 5. RLS Policies

RLS is enabled on all public app tables after the migrations:

- `claims`
- `documents`
- `findings`
- `gaps`
- `clarification_questions`
- `enrichment_cache`
- `audit_log`
- `passes`

No table policies are added. This keeps anon/authenticated users denied by
default. The current POC server routes use the service role client.

## 6. Storage Buckets And Policies

Required bucket:

```text
claim-documents
```

Final expected bucket state:

- Private.
- 32 MB bucket file-size limit.
- Allowed MIME types:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`

Storage object policies:

- No `storage.objects` policies are added.
- API uploads use the service role admin client.
- Direct browser/client Storage writes are not part of the current flow.

## 7. Current Schema Fit

The migrations cover:

- Document subtype foundation from PR #16 via migration `0005`.
- Broad extraction persistence from PR #18 through the existing
  `documents.extracted_data jsonb` column and app/runtime types.
- Claim creation route assumptions in `app/api/claims/route.ts`.
- Document upload route assumptions in `app/api/claims/[id]/documents/route.ts`.
- Inngest processing assumptions in `inngest/functions/process-document.ts`.
- Pass accounting through `public.upsert_pass_increment`.

No extra migration is required for PR #18.

## 8. Manual Apply Procedure

Approved manual apply procedure, when CEO authorizes it:

1. Open Supabase project `aozbgunwhafabfmuwjol`.
2. Confirm URL:

   ```text
   https://aozbgunwhafabfmuwjol.supabase.co
   ```

3. Confirm this is not project `fcqporzsihuqtfohqtxs`.
4. Apply migrations in order from `supabase/migrations/`.
5. If using the generated bundle, verify its header names
   `aozbgunwhafabfmuwjol` and forbids `fcqporzsihuqtfohqtxs`.
6. Run read-only post-apply checks against `aozbgunwhafabfmuwjol` only:
   - table list
   - bucket list
   - RLS enabled checks
   - index/constraint spot checks
7. Stop before creating any smoke claim until CEO separately approves smoke
   execution.

## 9. Risks

- Wrong project selection is the main risk. Applying to
  `fcqporzsihuqtfohqtxs` is forbidden.
- Migration `0002` is not safe to rerun blindly on an already migrated project.
- Empty target assumption must be verified before apply.
- Storage bucket policy posture relies on server-side service role usage.
- Applying schema is a database mutation even in nonproduction and requires CEO
  approval.

## 10. Review Verdict

Prepared for review only:

```text
apply_ready_after_ceo_manual_approval: yes
applied_by_codex: no
production_touched: no
secrets_included: no
```
