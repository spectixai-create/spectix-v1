# Active Gates

## Open PRs

- #52 - SPRINT-002B Priority Subtype Extraction Routes
- #47 - OpenClaw Slack routing blocker

## Current Approved / Not Approved

Approved:

- PR #52 code fix already done.
- Preparing workflow handoff docs.
- Future fresh non-prod smoke can be approved by CEO, but is not automatic.

Not approved:

- PR #52 merge.
- Production smoke.
- Production Supabase.
- Deploy.
- Cron.
- 24/7.
- Auto-merge.
- Auto-deploy.
- Native OpenClaw Slack.
- Retry smoke without explicit CEO approval.

## Next Likely Gate

CEO approval for fresh non-prod smoke retry on updated PR #52 head.

## Smoke Target

Allowed:

`aozbgunwhafabfmuwjol`

Forbidden:

`fcqporzsihuqtfohqtxs`

## Merge Rule

PR #52 can be considered for merge only after:

1. Fresh non-prod smoke passes on current head.
2. Smoke evidence is recorded.
3. TECH_DEBT 11n baseline updated if smoke passes.
4. CEO explicitly approves merge.
5. Final pre-merge PR/head verification passes.
