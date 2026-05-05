# Anti-Patterns

This document lists project anti-patterns that were observed and tied to repo or PR evidence. Entries without enough evidence are intentionally omitted rather than reconstructed from memory.

## 1. Schema Or Value Invented From Memory

**Observed:** CEO/PM review history repeatedly caught specs that used schema, INSERT payloads, event names, or API values from memory rather than from the current repo.

**Evidence:** `docs/PM_REVIEW_CHECKLIST.md` section 2.1 identifies source-of-truth column verification as the top recurring issue. The historical `project_status_03_05_v3_0.md` also records schema/value invention as a repeated anti-pattern.

**Mitigation:** Verify against canonical repo sources before writing specs or prompts: migrations, `lib/types.ts`, `docs/DB_SCHEMA.md`, `docs/API_CONTRACTS.md`, and current implementation files.

## 2. External API Identifier Invented From Memory

**Observed:** PR #14 used the Anthropic model id `claude-sonnet-4-6-20250915`, which did not exist. Production failed until PR #15 corrected the model id.

**Evidence:** PR #15 merged as `d02c0dc013003a5e568858558f711515b6957862`. The archived hotfix prompt `docs/project/specs_archive/codex_prompt_hotfix_model_id_REISSUE.md` identifies the failure and correct model id `claude-sonnet-4-5-20250929`. `docs/PM_REVIEW_CHECKLIST.md` section 5.11 codifies the mitigation.

**Mitigation:** Specs naming external model ids, SDK ids, endpoint paths, or version strings must cite the vendor source and Codex must verify the identifier before implementation or merge.

## 3. Tests With Clean Mocks When Spec Includes Parsing Or Sanitization

**Observed:** PR #14/#15 added parser cleanup, but the original tests did not exercise dirty model output. Sonnet 4.5 returned fenced JSON and strict parsing broke.

**Evidence:** PR #15 commit `d02c0dc013003a5e568858558f711515b6957862` added `tests/unit/client.test.ts` and JSON parse robustness. `docs/PM_REVIEW_CHECKLIST.md` section 5.12 records the origin and mitigation.

**Mitigation:** Parsing, normalization, or sanitization specs require dirty-input tests containing the artifact being stripped, such as fenced JSON, prose preambles, invalid subtype values, or malformed payloads.

## 4. Stale Instrumentation From Inngest Replay

**Observed:** PR #16 smoke instrumentation initially reported impossible 3-5ms processing baselines. The timing value was stale because `Date.now()` lived outside the replay-safe `step.run` boundary.

**Evidence:** Commit `8d8cee9d` (`Fix PR16 baseline instrumentation`) changed `inngest/functions/process-document.ts` and `tests/unit/process-document-claude.test.ts`. The current `process-document.ts` captures `processingStartedAtMs` inside `step.run('audit-started', ...)`.

**Mitigation:** Capture runtime timestamps and other replay-sensitive values as return values of `step.run`, then compute downstream metrics from those memoized values.

## 5. Loosen Contracts To Pass Smoke

**Observed:** During SPRINT-002B failure analysis, there was explicit risk of weakening normalized extraction contracts to make smoke pass. The chosen fix path avoided that: extractor prompts/date alias normalization and fixtures were corrected instead.

**Evidence:** `docs/agents/workflow/CLAUDE_REVIEW_LOG.md` entries 4-5 say not to loosen contracts and require fixing PR #52 code before another smoke. PR #52 body records that `lib/extraction-contracts.ts` remained unchanged after the smoke-regression fix.

**Mitigation:** Do not mark required fields optional, do not fabricate values, and do not allow `status = completed` when required fields are missing. Fix extractors, prompts, normalization, or fixtures.

## 6. Run Smoke Without CLI Ref Verification

**Observed:** SPRINT-002B smoke retry planning added a mandatory `supabase/.temp/project-ref` check after a retry preflight found the local Supabase CLI target could point at the forbidden production project.

**Evidence:** PR #52 smoke retry instructions and follow-up reports required checking `supabase/.temp/project-ref` before any non-production mutation. The active smoke target was `aozbgunwhafabfmuwjol`; the forbidden production project was `fcqporzsihuqtfohqtxs`.

**Mitigation:** Every smoke prompt must verify `supabase/.temp/project-ref`, environment target booleans, and absence of the production project ref before claim creation, uploads, migrations, or queries.

## 7. Run Smoke Without Dev Server Health Check

**Observed:** SPRINT-002B smoke retry attempt 4 created a non-production claim, uploaded nine documents, and fired events, but local Inngest function registration failed (`PUT /api/inngest 500`, `POST /fn/register 404`). `process-document` never ran.

**Evidence:** PR #54 body records the attempt 4 failure and identifies the local runtime blocker. PR #54 is open at the time of this consolidation.

**Mitigation:** Before upload, verify the local app and Inngest dev server are both reachable, `/api/inngest` registration succeeds, and Inngest function registration returns a successful response.

## Omitted Entries

No required entries were omitted. Entries 6 and 7 rely on active PR evidence rather than a merged historical doc because the failures happened after PR #53.
