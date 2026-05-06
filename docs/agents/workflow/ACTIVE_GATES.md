# Active Gates

## Open PRs

- #54 - Workflow files sync with smoke retry attempt 4 result (open/stale after PR #52 merge; do not close without CEO approval).
- #47 - OpenClaw Slack routing blocker

## Recently Merged

- #52 - SPRINT-002B Priority Subtype Extraction Routes, merge commit `754c87fbba2d7dec11364e4ca54d2cf54bc6f86a`

## Current Approved / Not Approved

Approved:

- MERGE-PR52-001 post-merge documentation and read-only non-production audit review.

Not approved:

- SPRINT-003A implementation start.
- Production smoke.
- Production Supabase.
- Deploy.
- Cron.
- 24/7.
- Auto-merge.
- Auto-deploy.
- Native OpenClaw Slack.
- Branch deletion for `sprint/subtype-extraction-routes` within 24h after PR #52 merge.

## Next Likely Gate

Complete and merge MERGE-PR52-001 post-merge queue. Only then can CEO decide whether to authorize SPRINT-003A planning/implementation.

## Supabase Gate

Allowed read-only audit target for this queue:

`aozbgunwhafabfmuwjol`

Forbidden production project:

`fcqporzsihuqtfohqtxs`

## Merge Rule

Post-merge docs PR can be merged after:

1. Docs-only diff is verified.
2. Read-only non-prod audit evidence is recorded without secrets.
3. No runtime, migration, smoke, claim creation, upload, deploy, or production action occurred.
4. CEO explicitly approves merge.
