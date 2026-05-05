=== START ===

HOTFIX: production blocker on PR #14 (Spike #03ג).

Issue: Anthropic API returns 404 for model `claude-sonnet-4-6-20250915`.
This model ID does not exist. The correct ID for Claude Sonnet 4.5 is
`claude-sonnet-4-5-20250929` (released 29 Sep 2025).

Verification source: https://www.anthropic.com/news/claude-sonnet-4-5
Pricing unchanged at $3/$15 per million input/output tokens.

Steps:
1. Branch: hotfix-classifier-model-id from main (post #14 merge SHA 858f446b).
2. Update model ID in 2 files:

   File: /lib/llm/client.ts
   - Change DEFAULT_MODEL constant: 'claude-sonnet-4-6-20250915'
     → 'claude-sonnet-4-5-20250929'
   - Update PRICING object key: 'claude-sonnet-4-6-20250915'
     → 'claude-sonnet-4-5-20250929' (values $3/$15 stay)
   - Update source comment: cite https://www.anthropic.com/news/claude-sonnet-4-5
     and pricing source https://www.anthropic.com/pricing

   File: /lib/llm/classify-document.ts (if model ID hardcoded there too)
   - Search for 'claude-sonnet-4-6' and replace with 'claude-sonnet-4-5-20250929'

   File: /llm_prompts.md (project-knowledge doc, not in repo — DO NOT edit)
   - Skip this; it's reference only and lives in Project Knowledge

3. Update tests that reference the old model ID (if any):
   - /tests/unit/classify-document.test.ts
   - /tests/unit/process-document-claude.test.ts
   - Search for 'claude-sonnet-4-6' string and replace

4. Local verification:
   - pnpm typecheck / lint / format:check / build pass
   - pnpm test passes (60/60)
   - pnpm test:e2e passes if ANTHROPIC_API_KEY set (61/61)
     - If not set, e2e skip should still be clean

5. Open PR with title:
   "Hotfix: correct Claude model ID to claude-sonnet-4-5-20250929"
   Description should reference the production failure on claim 2026-646
   and cite https://www.anthropic.com/news/claude-sonnet-4-5 as source.

6. After PR opens and Vercel preview is Ready:
   - Run a real classification test on the preview environment with a
     small PDF
   - Confirm in preview's Inngest dashboard that processDocument completes
     with status='processed' (not failed)
   - Include the success log in PR description

7. Squash-merge to main with title:
   "Hotfix: correct Claude model ID (#NN)"

8. Post-merge production verification:
   - Create new claim on production /new
   - Upload small PDF
   - Verify in Supabase Studio:
     - documents.processing_status = 'processed'
     - documents.document_type = real classification (not 'other' unless
       genuinely unclassifiable)
     - audit_log row with actor_type='llm', actor_id='claude-sonnet-4-5-20250929'
     - passes row with cost_usd > 0

9. Report back:
   - PR URL + merge SHA
   - Real classification result (document_type, confidence)
   - Confirmation production end-to-end works

If any step fails, halt and report.

Note: this is a small docs-and-config hotfix, no migrations, no schema
changes. Should take well under 1 hour.

=== END ===
