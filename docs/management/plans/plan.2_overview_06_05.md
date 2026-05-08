# Spectix - Plan Overview (iteration 2.1)

**Date:** 06/05/2026

**Updated:** 08/05/2026 after PR #82 (insurer discovery execution pack merged)

**Version:** plan.2.1

**Canonical file:** `docs/management/plans/plan.2_overview_06_05.md`

---

## Completed

| #         | Layer / sprint                                              | Repo verification |
| --------- | ----------------------------------------------------------- | ----------------- |
| 1         | Foundation: Auth, UI skeletons, schema, intake form         | PRs #1-#10        |
| 2         | Document upload + private Storage                           | PR #11            |
| 3         | Pipeline: Inngest + processing status lifecycle             | PR #13            |
| 4         | Broad classification - 8 broad types                        | PRs #14, #15      |
| 5         | Subtype classification - 37 subtypes                        | PR #16            |
| 6         | Broad extraction prompts                                    | PR #18            |
| 7         | Pass lifecycle completion fix                               | PR #38            |
| 8         | Normalized extraction contracts                             | PR #50            |
| 9         | 7 priority normalized extraction routes                     | PR #52            |
| 10        | Documentation post-merge retro                              | PR #56            |
| 11.1-11.3 | Validation layers: name_match, dates, currency              | PR #60            |
| 12        | Documentation sync                                          | PR #63            |
| 13        | Audit findings                                              | PR #62            |
| 14        | Management folder structure                                 | PR #61            |
| 15        | SPRINT-002D - errored recovery and soft cost cap            | PR #65            |
| 16        | SPRINT-003A - deterministic synthesis MVP                   | PR #66            |
| 17        | SPRINT-UI-001 - adjuster brief view MVP                     | PR #68            |
| 18        | SPRINT-UI-002A - claimant response pre-flight               | PR #70            |
| 19        | SPRINT-UI-002B - claimant response core                     | PR #72            |
| 20        | DEMO-POLISH-001 - manual link copy fallback and demo script | PR #76            |
| 21        | SYNC-010 + DEMO-PACK-001 - demo/discovery package           | PR #77            |
| 22        | SPRINT-UI-002C - email-only claimant notifications          | PR #78            |
| 23        | SYNC-011 - post-PR78 UI-002C state synchronization          | PR #79            |
| 24        | Real-case tuning round 1 / pilot-readiness validation       | PR #81            |
| 25        | DEMO - Insurer discovery execution pack                     | PR #82            |

Current main HEAD:
`094688ec62a5bb2b1331786125c3c15e65c6822b`

---

## UI-002 Cluster Complete

The UI-002 cluster is complete on `main`.

- UI-002A pre-flight: done.
- UI-002B claimant response core: done.
- UI-002C email-only claimant notifications via Resend: done.

Current claimant communication flow:

- Dispatch returns a `magic_link_url`.
- If claimant email exists, the system attempts an email notification via
  Resend.
- Manual link sharing remains preserved and visible for adjusters.
- No Twilio, SMS fallback, WhatsApp automation, or multi-provider failover is
  part of the approved current scope.

Post-PR78 staging validation passed:

- Staging health: PASS.
- Email path: PASS.
- No-email path: PASS.
- Invalid Resend webhook signature: PASS.
- Manual fallback and copy-denied fallback: PASS.
- Generated claimant link origin matched staging.
- Audit leakage scan: PASS.

---

## Next Phase

### Insurer discovery / demo execution

**Status:** next operational gate after PR #81 READY validation.

Execution package:
`docs/demo/insurer_discovery_execution_pack_07_05.md`

Real-case tuning round 1 returned READY and is recorded in
`docs/management/reports/real_case_tuning_round_1_report_07_05.md`.

The next phase is manual/operator-led insurer discovery and demo execution. It
targets 5 Israeli travel-insurance conversations and should use synthetic,
privacy-safe demo material only.

This docs PR does not contact insurers, send outreach, mutate Supabase, run
smoke, deploy, or approve production work.

---

## Deferred / Conditional Scope

### Production hardening

Production remains blocked until an explicit production-readiness gate is
approved.

Production-readiness remains expected to include:

- data residency plan;
- DPIA/security review;
- monitoring and alerting;
- backup/DR procedures;
- virus scanning;
- service_role rotation;
- operational runbooks;
- remaining production items in `docs/TECH_DEBT.md`.

### Multi-channel automation

SMS, WhatsApp, Twilio, and multi-provider notification fallback are not approved
current scope.

Trigger to revisit: post-pilot evidence that email response rates are below
target and adjusters explicitly request automated WhatsApp/SMS.

### OpenClaw/native orchestration

OpenClaw/native orchestration is not approved current scope and remains blocked
while PR #47 is open.

---

## Customer Discovery Track

- Target: 5 conversations with Israeli travel insurers.
- Validate claim volume, missing-information workflow, adjuster workload,
  procurement/security blockers, budget, and LOI criteria.
- Trigger to SPRINT-PROD-BLOCK: first signed LOI.

---

## Open Questions

### Closed

- Q17.1: 7 additional routes from #03ד-2 - closed via D-022.
- Q17.2: demo readiness criterion - closed via D-023.
- Q17.3: UI adjuster in MVP - closed via D-023.
- UI-002C notification channel - closed via D-030 and PR #78.

### Active / Deferred

- Fine-grained state vocabulary: deferred to V2.
- Rules engine in MVP: no; conditional future scope.
- Additional validation layers 11.4/11.5: deferred until pilot evidence.
- Production hardening: blocked until explicit production-readiness gate.

---

## Decisions

- D-020: Single-pass MVP supersedes D-004.
- D-021: 3-chat operating structure supersedes D-005.
- D-022: Skip 7 additional routes.
- D-023: Production hardening conditional on LOI.
- D-024: pass_number semantics.
- D-025: extracting state removed.
- D-026: errored state distinct from rejected.
- D-027: Backend lifecycle canonical = event/pass-driven.
- D-028: SPRINT-002D scope minimal.
- D-029: Claimant response flow decision.
- D-030: UI-002C notification scope is email-only via Resend.

---

## Version

plan_overview - iteration 2.1 - 07/05/2026

**Filename:** `plan.2_overview_06_05.md`

**Predecessor:** plan.2 (iteration 2), outdated after UI-002 completion.

**Next iteration trigger:** insurer discovery produces a repeated product
objection, or SPRINT-PROD-BLOCK is approved after LOI / written pilot intent.
