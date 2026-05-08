# SPRINT-UI-004.1 — Claimant Flow Polish

Date: 08/05/2026
Identifier: sprint_ui004_1
Status: Spec revision only. Not approved for Codex implementation dispatch.
Base requirement: branch from actual `main` HEAD
`a10e4666daccc0aa961ddb21be52cfd8c930afa3`.

## Status

Do not dispatch UI-004.1 to Codex yet.

The current official gate remains:

**insurer outreach/demo execution decision**

UI-004.1 is optional pre-outreach polish for the claimant-facing flow. It is
not an automatic new required gate, does not replace the current gate, and
does not approve outreach/demo/contact.

## Safety

Not approved by this spec:

- Codex implementation dispatch.
- Supabase mutation.
- Production Supabase.
- Manual deploy.
- New smoke.
- OpenClaw/native orchestration.
- PR #47 touch or merge.
- Outreach/demo/contact.
- Secrets, raw tokens, token hashes, or full magic-link output.

Any future implementation branch must be created from actual `main` HEAD
`a10e4666daccc0aa961ddb21be52cfd8c930afa3`, not from any earlier runtime SHA.

## Source Verification

Before implementation dispatch, Codex must verify these source paths exist:

- Taxonomy source: `docs/project/documents_taxonomy_03_05_v1_1.md`.
- Claimant page: `app/c/[claim_id]/page.tsx`.
- Claimant form: `app/c/[claim_id]/_components/claimant-response-form.tsx`.
- Existing claimant draft endpoint:
  `app/api/c/[claim_id]/draft/route.ts`.
- Existing claimant response migration:
  `supabase/migrations/20260506210000_claimant_responses.sql`.

If any required source path is absent on the dispatch branch, stop and report
the missing path. Do not infer a replacement path without explicit approval.

## Scope Summary

UI-004.1 may polish the existing claimant flow only:

- S1 — claimant stepper/progress and clearer completion state.
- S2 — required-document checklist derived from verified taxonomy/source logic.
- S3 — in-trip status support for claimant trip context.
- S4 — autosave indicator polish using existing draft infrastructure only.

Out of scope for UI-004.1, intentionally deferred to a separate future sprint
(working name: `UI-004B — Intake upload guidance`):

- Initial intake upload guidance (telling the claimant which documents to
  upload BEFORE submitting the initial claim, on the public intake form).
- This is intentional scope separation, not an oversight. UI-004.1 targets
  the magic-link claimant response portal only. The initial-intake guidance
  problem is real and acknowledged but lives in a different surface and
  carries different safety considerations; it will receive its own spec.

## S1 — Claimant Stepper And Completion State

Goal:

- Make the claimant response flow easier to scan during demos and on mobile.
- Show progress through requested questions/documents without changing the
  claimant response lifecycle.

Constraints:

- Use existing claimant portal data and question state.
- Do not add a new workflow status.
- Do not change token semantics.
- Do not change finalization rules except for UI affordances.
- Use existing UI components only. Minimal MVP visual treatment.
- No Designer dependency is approved for UI-004.1. Any deeper visual or
  stepper design work (custom step indicator components, design-token changes,
  motion/animation polish) is deferred to a future sprint.

Expected behavior:

- The claimant sees a compact RTL progress/stepper area.
- Each requested item has a clear state: pending, answered/uploaded, or
  blocked by upload/save error.
- The final submit button remains disabled until existing completion rules
  pass.

## S2 — Required-Document Checklist

Goal:

- Show the claimant a clear checklist for documents requested by the adjuster
  or generated missing-information flow.

Required discovery before dispatch:

1. Read `docs/project/documents_taxonomy_03_05_v1_1.md`.
2. Inspect current question/document data structures exposed to the claimant
   portal.
3. Inspect existing synthesis/question generation outputs for document request
   metadata.
4. Confirm whether the current repo already has a canonical required-document
   source for claimant-facing checklist rows.

Stop condition:

- If the taxonomy file or canonical source data is absent, stop and report. Do
  not invent a new taxonomy, table, or long-lived checklist model in UI-004.1.

Checklist v1 persistence:

- UI-004.1 v1 must not introduce required-document waiver persistence.
- Required-document waiver with reason is out of scope for UI-004.1 v1.
- If waiver is later required, define a successor sprint storage and adjuster
  visibility separately before implementation. Candidate areas to evaluate
  later: `question_response_drafts.response_value`, finalized
  `question_responses`, or an explicit future waiver table. No option is
  approved by this spec.

Expected behavior:

- Checklist rows should be derived from existing dispatched questions and
  document request metadata when present.
- Upload completion should reflect the existing linked document state.
- If a required document cannot be confidently mapped, show the existing
  question card behavior rather than creating a false checklist row.

## S3 — Trip Status

Goal:

- Support claimant indication that the trip is currently in progress so the
  flow does not force a return date that does not exist yet.

Approved logical values:

- `pre_trip`
- `in_trip`
- `post_trip`

Database representation:

- Column lives on the `claims` table.
- Preferred schema (use unless Codex discovery proves the repo has a
  consistent PostgreSQL enum convention in active use):

  ```sql
  ALTER TABLE claims
    ADD COLUMN trip_status text NOT NULL DEFAULT 'post_trip'
      CHECK (trip_status IN ('pre_trip', 'in_trip', 'post_trip'));
  ```

- If repo enum convention is proven in active use, Codex follows the repo
  convention and documents the deviation in the implementation PR.
- Default/backfill value: `post_trip`.
- No Supabase mutation is approved by this spec. Any future migration requires
  explicit dispatch approval.

Risk/validation wording:

- Do not disable all policy-period validation for `in_trip`.
- Only skip validation checks that depend specifically on a missing return
  date.
- Keep checks for treatment before trip start, incident before trip start,
  policy start, and any known coverage-period boundary.
- If return date is missing because `trip_status = 'in_trip'`, resulting
  validation output should distinguish "not checkable yet" from "valid".

Expected UI behavior:

- Claimant can mark the trip as in progress.
- Return-date input becomes optional only for `in_trip`.
- The UI copy should avoid implying claim approval or coverage certainty.

## S4 — Autosave Indicator Polish

Goal:

- Improve claimant confidence by making autosave state clear, especially on
  mobile.

Required discovery before implementation:

1. Inspect the existing claimant draft mechanism.
2. Verify the current endpoint/RPC/table contract before editing:
   - `app/api/c/[claim_id]/draft/route.ts`
   - `public.save_draft`
   - `public.question_response_drafts`

3. Verify current UI autosave behavior in
   `app/c/[claim_id]/_components/claimant-response-form.tsx`.

Current repo evidence as of `a10e4666`:

- `question_response_drafts` exists.
- `save_draft` exists.
- `/api/c/[claim_id]/draft` exists.
- Claimant form already debounces autosave and renders `saving`, `saved`,
  `error`, and idle states.

Scope control:

- UI-004.1 may polish the existing autosave indicator only.
- If the existing mechanism is missing or materially changed on the dispatch
  branch, stop and report.
- Do not create a `claim_drafts` table in UI-004.1.
- Do not create a new generic draft endpoint in UI-004.1.
- Move any new draft infrastructure to a successor sprint or require separate
  approval.

Expected behavior:

- Autosave status is visible, compact, RTL, and mobile-friendly.
- Error state gives the claimant a clear retry path without exposing technical
  internals.
- No raw token, token hash, or full magic link is logged or displayed.

## Mobile Audit

Architect mobile audit should wait until after UI-004.1 implementation, if
UI-004.1 is approved and implemented.

Reason:

- The audit should evaluate the final claimant flow including stepper,
  checklist, in-trip checkbox/status, and autosave indicator.

Do not dispatch a separate mobile audit before UI-004.1 unless CEO GPT
explicitly changes this sequence.

## Verification For Future Dispatch

When CEO GPT later approves implementation dispatch, Codex must verify:

- Branch base is actual current `main`, with expected base HEAD recorded.
- Source paths listed in this spec exist.
- S2 taxonomy path exists or Codex stops.
- Existing autosave mechanism exists or Codex stops.
- No new draft infrastructure is added.
- `trip_status` column is added on the `claims` table.
- `trip_status` storage follows `text + CHECK` unless repo enum convention is
  proven in active use.
- Risk validation only skips return-date-dependent checks for `in_trip`.
- No waiver persistence is added in UI-004.1 v1.
- S1 uses existing components only; no new design tokens, no new component
  scaffolds, no Designer-dependent visual work.
- Tests cover claimant stepper/checklist, `in_trip` return-date behavior, and
  autosave indicator states.

## Done Criteria For This Spec Revision

- CEO GPT verifies this revised UI-004.1 spec.
- CEO GPT confirms whether to dispatch UI-004.1, defer it, or proceed directly
  to insurer outreach/demo execution decision.
- Until that separate decision, no implementation work is approved.

## Version

sprint_ui004_1_claimant_flow_polish — 08/05/2026 v1.0
**Filename:** `sprint_ui004_1_claimant_flow_polish_08_05_v1_0.md`
**Predecessor (in-chat draft, not committed):**
`sprint_ui004_polish_08_05_v1_0.md` (CEO Claude initial draft, superseded).
**Authorship trail:**

- CEO Claude initial draft (in-chat, intake-form scope, build-first)
- CEO GPT revision (claimant-portal scope, discovery-first methodology, safety
  guards, dispatch authorization explicit)
- CEO Claude review + integration of CEO GPT clarifications: filename rename,
  internal identifier alignment, S3 explicit `claims` table location and
  schema, S1 minimal-MVP/no-Designer constraint, S2 intake-guidance deferral
  note as `UI-004B` working name.
