# TASK-SPECTIX-001 PM Prompt

Task ID: `TASK-SPECTIX-001`

Title: Post-merge production smoke plan for broad extraction

Role: PM

## Context

PR #18 completed Spike #03ד-1b: broad extraction prompts (02-05) plus
`documents.extracted_data` wiring. The next work is planning only: prepare a
safe post-merge production smoke plan for the broad extraction flow.

Do not execute the smoke test in this task.

## PM Output Required

Create a post-merge production smoke plan that defines:

1. Smoke objective.
2. Test documents needed.
3. Exact broad, subtype, and extraction routes to cover.
4. Expected audit/events.
5. Expected `extracted_data` shape.
6. Safety constraints.
7. Supabase queries to verify results.
8. What must not be touched.
9. Pass/fail criteria.
10. Codex execution prompt for running the smoke later.

## Safety Constraints

- No app code changes.
- No DB migration.
- No secrets or env changes.
- No deployment changes.
- No production data mutation beyond explicitly approved controlled smoke test
  records in a later task.
- No real smoke execution now.
- No merge or deploy.
- No OpenClaw cron or 24/7 activation.

## Required PM Response Shape

Return:

- `smoke_objective`
- `required_test_documents`
- `routes_to_cover`
- `expected_audit_events`
- `expected_extracted_data_shape`
- `safety_constraints`
- `supabase_verification_queries`
- `must_not_touch`
- `pass_fail_criteria`
- `codex_execution_prompt_for_later`
