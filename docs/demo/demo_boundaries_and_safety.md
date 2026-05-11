# Demo Boundaries And Safety

## Approved Demo Frame

- Staging/non-production only.
- Synthetic claimant data only.
- Synthetic demo policy only, including policy number `16165132165`.
- No production Supabase.
- No real claimant data.
- No automatic approval or rejection.
- No outreach, insurer contact, or demo execution unless separately approved.
- No secrets, raw tokens, token hashes, cookies, auth headers, JWTs, or full
  magic links.
- No commercial commitment before separate approval.

## Product Positioning Boundaries

Spectix may be described as:

- travel-insurance claims triage
- evidence preparation
- missing-information and inconsistency detection
- preliminary coverage status support
- workflow support for human claims experts

Spectix must not be described as:

- autonomous fraud detection
- an automatic claim-decision engine
- automatic approval or rejection
- a replacement for claims experts

## Operational Stop Conditions

Stop the demo or outreach preparation if any of the following appears:

- production environment or production Supabase target
- real claimant or insurer customer data
- full magic link, token, cookie, auth header, JWT, or secret
- automatic decisioning language
- unexpected email send, outreach action, or contact action
- request to use production data without separate written approval

## Explicitly Out Of Scope For This Materials PR

- code changes
- runtime behavior changes
- Supabase changes or mutations
- migrations
- deploys
- smoke tests
- OpenClaw usage
- PR #47 changes
- outreach execution or contact

## Pre-Outreach Gate

These materials prepare a controlled demo conversation only. Actual outreach,
contact, or demo execution requires a separate explicit approval after review.
