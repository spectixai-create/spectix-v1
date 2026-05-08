# Decisions

Append-only. New decisions are added at the end. Do not edit past decisions; supersede them with a new entry referencing the old one.

## D-001 - Build a POC Around Travel Insurance Claim Investigation

Spectix starts as a focused POC for travel insurance claims rather than a generic insurance automation platform.

## D-002 - Three-Source Value Proposition

The product value is measured through fraud detection, inflation detection, and process optimization for clean claims.

## D-003 - Client-Side Evidence Deferred

Client-side evidence collection is deferred to V1.5. V1 focuses on intake, documents, investigation, and adjuster review.

## D-004 - Three-Pass Iterative Pipeline

The investigation engine uses up to three passes with a Gap Identifier between passes and cost/quality stop conditions.

## D-005 - Human Adjuster Remains Final Decision-Maker

Spectix recommends actions and highlights evidence. It does not autonomously deny claims in V1.

## D-006 - Initial Market Is Small Israeli Insurers

V1 targets Israeli travel insurance teams, especially smaller insurers where manual investigation is economically constrained.

## D-007 - Direct Claude API Integration

V1 uses direct Claude API calls for OCR, extraction, and LLM reasoning. Provider abstraction may be added later.

## D-008 - Design System Skill Deferred

The formal design system skill is deferred. Tailwind/shadcn tokens from Spike #00b act as the de-facto design system until design ownership expands.

## D-009 - Placeholder Screens Are Acceptable Before Backend Wiring

Frontend skeletons may use local sample data while backend contracts are incomplete, provided future refactor notes are documented.

## D-010 - Pass Timeline Is the Fourth Claim View Tab

The claim view has 4 tabs: Brief, Pass Timeline, Documents, and Audit Log.

## D-011 - Design System v1.0

Reusable UI components and layout primitives are part of Design System v1.0. Future UI should extend these rather than create ad hoc patterns.

## D-012 - Runtime Evidence Required

Every UI spike requires runtime evidence: Playwright where applicable, screenshots, Lighthouse accessibility score, and command outputs.

## D-013 - Version Footer Standard

Every UI page includes `VersionFooter`. The canonical version string is in [lib/version.ts](../lib/version.ts) with format `Spectix Spike #N • YYYY-MM-DD`.

## D-014 - Repository Docs Are Canonical

After Spike #00z-A, [docs](.) becomes canonical project documentation. Chat/project knowledge becomes archival context, not the primary source for implementation.

## D-015 - Supabase Migrations Require Paired down.sql

Date: 2025-05-03
Status: Active
Decided by: CEO

Starting with Spike #03a, every Supabase migration pushed to the repo must be
paired with a matching `down.sql` rollback file in the same PR.

Convention:

- Up file: `supabase/migrations/{NNNN}_{name}.sql`
- Down file: `supabase/rollbacks/{NNNN}_{name}.down.sql`

Implementation note: Supabase CLI treats every `*.sql` file in
`supabase/migrations` as an up migration. Rollbacks are kept under
`supabase/rollbacks` until Supabase offers first-class rollback-file support.

Requirements:

- Future migration specs must include both up and down SQL.
- Codex verifies the down migration in dev/local Supabase before PR.
- The PR cannot be merged until the rollback file is reviewed.
- Migrations #0001 and #0002 remain immutable and do not receive retroactive
  down files.

Trade-offs accepted:

- Migration spikes take longer.
- Some data transformations may only support schema rollback; irreversible data
  loss must be explicitly documented in the down file.

Revisit when automated migration rollback testing exists in CI.

## D-016 - Pass Accounting Is Claim-Level and Cumulative

Date: 2025-05-03
Status: Active
Decided by: CEO

The `passes` table is keyed by claim and pass number. LLM accounting increments
the claim-level pass row through `public.upsert_pass_increment`, accumulating
`llm_calls_made` and `cost_usd`. The migration #0002 trigger updates
`claims.total_llm_cost_usd` when pass cost changes.

## D-017 - HEIC Removed From New Uploads

Date: 2025-05-03
Status: Active
Decided by: CEO

New uploads accept PDF, JPEG, and PNG only. HEIC is removed from the
`claim-documents` bucket allowlist because Claude classification does not
support it in the current pipeline. Existing HEIC objects remain accessible;
only new uploads are rejected.

## D-018 - Two-Tier Document Classification

Date: 2025-05-03
Status: Active
Decided by: CEO

Document classification uses two stages: a broad `DocumentType` and a fine
`DocumentSubtype`.

- Broad `DocumentType` remains the existing 8-value union and is set by Prompt 01.
- Fine `DocumentSubtype` is a 37-value union persisted in
  `public.documents.document_subtype` by migration #0005.
- The mapping from broad type to allowed subtype values lives in
  [lib/llm/document-subtypes.ts](../lib/llm/document-subtypes.ts).
- When a broad type maps to exactly one subtype, Prompt 01b is skipped and the
  subtype is set deterministically. This applies to `police_report`,
  `hotel_letter`, `witness_letter`, and `photo`.
- When the LLM returns a subtype outside the allowed list, the persisted
  `document_subtype` is `NULL` and the audit log records the raw invalid value.
  Data integrity is preferred over fabricating a default subtype.
- Subtype IDs are stable English `snake_case`. Hebrew labels live in
  `SUBTYPE_LABELS_HE`.

Refinement: the taxonomy item "prescriptions and pharmacy" is split into
`pharmacy_receipt` under `receipt` and `prescription` under `medical_report`.
This keeps both physical document shapes reachable from the broad classifier.

Trade-offs accepted:

- Ambiguous broad types require a second LLM call.
- Adding a new subtype requires a migration plus code changes.
- Invalid subtype responses leave `document_subtype` null until a future
  reprocessing flow retries.

Revisit when production data shows a subtype consistently misclassified or a
customer requires a new document subtype.

## D-019 - Split Extraction Work Into Contract-First And Route-Implementation Spikes

Date: 2026-05-05
Status: Active
Decided by: CEO

SPRINT-002 work is split into a contract-first methodology:

- SPRINT-002A defines normalized extraction contracts, runtime guards,
  TypeScript surface, documentation, and tests.
- SPRINT-002B implements dedicated subtype extraction prompts/routes against
  those contracts.
- SPRINT-003A follows with the Synthesis Data Model after subtype route outputs
  are normalized enough to support claim-level synthesis.

This keeps schema and data-shape decisions reviewable before prompt/route
implementation changes. It also prevents subtype prompt work from changing the
storage model, migrations, or synthesis assumptions in the same spike.

---

## D-020 — Single-Pass MVP, Iterative Deferred

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
Architecture Review (06/05/2026) identified that D-004 (3-pass iterative pipeline with Gap Identifier) was documented but never implemented. Six months of work shipped a single-pass architecture: extraction -> validation -> synthesis. Continuing to claim "iterative" creates drift between docs and reality.

**Decision:**
MVP is single-pass. Pass 1 = extraction (per-document). Pass 2 = validation (claim-level, SPRINT-002C). Pass 3 = synthesis (claim-level, SPRINT-003A). No Pass 2/3 iteration. No gap-fill loop. No stop-conditions on iteration count.

**Reasoning:**

- The architecture as built is single-pass. Acknowledging it removes drift.
- Iterative pipeline solved a problem (uncertainty under sparse data) that hasn't materialized in our usage. Validation + synthesis cover the use cases without iteration.
- Re-cycle through `pending_info -> documents_open` exists for one purpose: claimant uploads new docs after gap identified, system re-extracts. NOT iteration over the same document set.

**Trade-offs accepted:**

- Lose theoretical advantage of multi-pass refinement.
- README "Iterative Pipeline" section becomes V2 appendix.

**Revisit when:**

- Pilot shows synthesis produces unstable findings on borderline cases that an additional pass would stabilize.
- Customer feedback explicitly demands re-extraction with synthesis context.

**Supersedes:** D-004.

---

## D-021 — 3-Chat Operating Structure

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
D-005 specified 7 chats (CEO, PM, Designer, 2 Builders, KB, QA). In practice the project has run with 3 active chats: CEO Claude (planner), CEO GPT (gatekeeper / handoff writer), Codex (executor). Documentation referencing 7 chats creates planning ambiguity ("who reviews UI?", "who builds KB?").

**Decision:**
Active chats are CEO Claude, CEO GPT, Codex. Designer / KB / QA / PM / Researcher chats not opened. A separate Systems Architect chat may engage cross-chat for design review on demand. User performs human approval at gates.

**Reasoning:**

- 6 months of operation show 3 chats sufficient.
- Design System (D-011) folded into Codex.
- KB content is built ad-hoc by CEO when needed.
- QA is Codex test-writing + CEO smoke approval.

**Trade-offs accepted:**

- Less specialization per role.
- Roles can be added later as new D-XXX if pattern shifts.

**Revisit when:**

- Project grows beyond solo + 3 chats.
- Specialized expertise (e.g., security audit) becomes recurring need.

**Supersedes:** D-005.

---

## D-022 — Skip 7 Additional Routes from #03ד-2 for MVP

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
Original plan #03ד-2 specified 14 normalized extraction routes. SPRINT-002B (PR #52) shipped 7 priority routes. Remaining 7 routes are open question Q17.1 in plan_overview.

**Decision:**
The 7 routes from SPRINT-002B are sufficient for MVP. Remaining 7 routes NOT built. All other subtypes route through `broad_fallback`. If product evidence shows broad_fallback inadequate for specific subtypes, individual routes added later as targeted sprints.

**Reasoning:**

- SMOKE-002B-RETRY-005 confirmed broad_fallback works (e.g., pharmacy_receipt -> fallback -> receipt extraction OK).
- Building 7 more routes = 1-2 weeks blocking validation/synthesis.
- Routes are additive on demand; layers are foundational and gate everything downstream.

**Trade-offs accepted:**

- broad_fallback may produce coarser extraction for non-priority subtypes.
- TECH_DEBT entry: "broad_fallback adapter for validation layer enrichment" (already noted).

**Revisit when:**

- Smoke or pilot evidence shows broad_fallback insufficient for specific subtype.
- Customer requests specific document type with normalized output.

**Supersedes:** none.

---

## D-023 — Production Hardening Conditional on First Pilot LOI

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
Architecture Review identified production-hardening gaps: data residency (Israel), DPIA, RBAC, monitoring/alerting, backup/DR, virus scanning, service_role rotation. Each is real work. Prioritization question: build before LOI or after?

**Decision:**
Production-hardening sprints DO NOT execute until a Letter of Intent from a real insurer is signed. Until then, system runs as POC: Frankfurt-region Supabase, no RBAC, manual cost tracking, no alerting beyond Inngest defaults.

**Reasoning:**

- Building production-hardening for a system without a paying customer is premature optimization.
- Customer Discovery (Track 2, owner = User) is the gating activity.
- "Demo ready" = synthesis MVP + adjuster UI MVP. "Pilot ready" = +production hardening + LOI.

**Trade-offs accepted:**

- If LOI comes urgently, hardening adds 4-6 weeks before pilot start.
- Demo without hardening shows "shape of product", not "pilot-ready system".

**Revisit when:**

- First LOI signed.
- Insurer prospect requires hardening evidence as precondition for evaluation.

**Supersedes:** none.

---

## D-024 — pass_number Semantics

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
The `passes` table tracks LLM cost and lifecycle per pass. D-016 used `pass_number` ambiguously across documents and claims. SPRINT-002C v2.2 needed clear semantics.

**Decision:**
`pass_number` is fixed per stage:

- 1 = extraction (per-document, claim-level rollup row exists)
- 2 = validation (claim-level)
- 3 = synthesis (claim-level)

UNIQUE constraint on `(claim_id, pass_number)`. UPSERT on conflict. Re-cycles via `pending_info -> documents_open` reuse the same pass_number row (status flips to in_progress, started_at updated, completed_at nulled).

**Reasoning:**

- Single-meaning per number simplifies SQL queries (e.g., synthesis reads `WHERE pass_number=2`).
- Re-cycles preserve cost history per stage instead of inflating row count.

**Trade-offs accepted:**

- Lose ability to track multiple passes of same stage as separate rows.
- Cost accumulates within row; recovery requires reading audit log.

**Revisit when:**

- Iterative pipeline returns (V2 per D-020 revisit clause).

**Supersedes:** D-016 (pass numbering scheme).

---

## D-025 — `extracting` State Removed from Claim Vocabulary

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
Earlier design assumed claim moved through `documents_open -> extracting -> extraction_complete`. Implementation diverged: extraction runs per-document while claim stays in `documents_open`. The claim-level `extracting` state was never used.

**Decision:**
Claim status vocabulary does NOT include `extracting`. Per-document extraction status is in `documents.processing_status`. Claim-level transition is `documents_open -> extraction_complete` (Pass-1 finalizer triggered on submit/timeout/all-terminal).

**Reasoning:**

- Aligns vocabulary with shipped reality.
- No SPRINT-MIGRATE needed (state never existed in production data).

**Trade-offs accepted:**

- Adjuster UI cannot distinguish "documents being processed" vs "awaiting upload" via claim state. Resolved via document-level UI sub-states (per design001.6 F.1).

**Revisit when:**

- Claim-level extraction batching becomes a thing.

**Supersedes:** any earlier doc that listed `extracting` as a claim state.

---

## D-026 — `errored` State Distinct from `rejected`

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
System failures (Inngest function exceeds retry budget, DB constraint violation, LLM API down) are different from business decisions to reject a claim. Conflating them as `rejected` loses recoverability - recoverable errors get treated as terminal.

**Decision:**
Claim vocabulary includes both:

- `errored`: system failure. Recoverable via admin retry. Last good state derived from `passes` table.
- `rejected`: business decision (admin or system rule). Terminal.

**Reasoning:**

- Distinguishes recoverable from terminal failures.
- Admin can retry `errored` claims after fixing underlying issue.
- Audit log preserves error class for post-mortem.

**Trade-offs accepted:**

- One more state to enforce in CHECK constraint and UI banners.

**Revisit when:**

- Production data shows `errored` rarely used (suggests over-engineering).

**Supersedes:** none (new addition).

Trade-offs accepted:

- Delivery is staged across more PRs.
- Route implementation waits for a merged contract surface.
- Any schema expansion beyond JSONB normalized extraction remains deferred until
  SPRINT-003A or a later CEO-approved migration spike.

---

## D-027 — Backend Lifecycle Canonical = Event/Pass-Driven

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
AUDIT-001 identified that design001.6 specified a fine-grained 11-state claim vocabulary with guarded transitions, while shipped main uses an event/pass-driven lifecycle: Inngest events such as `claim/extraction.completed` and `claim/validation.completed`, plus the `passes` table for stage tracking.

**Decision:**
Backend lifecycle is canonical as the event/pass-driven model. `claim.status` carries only coarse UI-hint values. Current DB values after SPRINT-002D are `intake`, `processing`, `pending_info`, `ready`, `reviewed`, `cost_capped`, `errored`, and the existing `rejected_no_coverage` rejected variant. Stage tracking is derived from `passes`, `claim_validations`, and future synthesis result tables.

Fine-grained states such as `documents_open`, `extraction_complete`, `validating`, `validation_complete`, and `synthesizing` are deferred to V2 hardening or removed if the UI proves it does not need them.

**Reasoning:**

- Aligns canonical state with implementation that has already shipped and smoked.
- Avoids a broad claim-state migration before SPRINT-003A.
- Keeps stage semantics in pass/event tables where current workers already write them.

**Trade-offs accepted:**

- UI must compose stage state from `passes` and related tables instead of relying on a single claim status.
- design001.6 remains historical and superseded by design001.7.

**Revisit when:**

- UI implementation proves that coarse claim status plus pass/event state is insufficient.

**Supersedes:** conflicting fine-grained state vocabulary in design001.6.

---

## D-028 — SPRINT-002D Scope = Minimal Pre-Synthesis Prerequisites

**Date:** 2026-05-06
**Status:** Active
**Decided by:** CEO

**Context:**
AUDIT-001 identified several gaps and partial matches versus design001.6. Starting synthesis with no recoverable system-error state and no cost guard creates real production risk, while the remaining race-policy and fine-grained-state items are deferrable.

**Decision:**
SPRINT-002D scope is limited to:

1. `errored` state plus admin recovery helpers.
2. Soft LLM cost cap enforcement before claim-scoped LLM calls.

Upload conflict `409` policy and race policies D.2-D.5 are deferred to TECH_DEBT 11w. Fine-grained claim-state vocabulary and guarded transitions per state are not implemented in SPRINT-002D per D-027.

**Reasoning:**

- `errored` prevents stuck claims from requiring manual DB intervention.
- Cost cap prevents unbounded spend before synthesis adds more LLM calls.
- Other audit findings are UX polish, operational hardening, or V2 scope.

**Trade-offs accepted:**

- Soft cost cap has concurrency tolerance until TECH_DEBT 11v is implemented.
- Admin retry endpoint may remain inaccessible if no admin auth pattern exists.

**Revisit when:**

- Soft cost tolerance exceeds business tolerance.
- Pilot operations require upload conflict policy or HTTP admin retry.

**Supersedes:** none.

---

## D-029 — pass_number stable across cycles (no pass_kind column)

**Date:** 06/05/2026
**Status:** Active
**Decided by:** CEO
**Source:** design004.2 + design002.8 + Architect joint sign-off.

**Decision:**
Re-cycles use UPSERT on existing pass_numbers per D-016 (`pass_number=1`
extraction, `=2` validation, `=3` synthesis). DELETE+INSERT on
`synthesis_results` with `pass_number=3` literal stays stable across cycles.
`question_responses` uses `ON CONFLICT (claim_id, question_id) DO UPDATE`,
accepting per-question response history loss as a PII trade-off (`audit_log`
preserves timestamps + counts only).

**Reasoning:**

- Avoids a `pass_kind` column, backfill, and broader pass-model migration during
  UI-002B.
- Keeps re-cycle behavior compatible with the already shipped Form B
  `pass_number` model.
- Minimizes storage of claimant response history while preserving operational
  timestamps and counts.

**Trade-offs accepted:**

- Prior response content is overwritten when a claimant resubmits the same
  question.
- Detailed response history is deferred to TECH_DEBT 11R.

**Supersedes:** Architect's `pass_kind` proposal.

**Trigger to revisit:** any future cycle requiring `pass_number > 3` (not
anticipated for MVP). On revisit, `pass_kind` column becomes mandatory.

---

## D-030 — UI-002C notification scope: email-only via Resend

Date: 06/05/2026
Status: Active
Decided by: CEO
Source: vov decision after UI-002B demo-readiness.

Decision:
UI-002C notification scope is email-only via Resend. Twilio, SMS fallback,
WhatsApp automation, and multi-provider fallback are out of scope for MVP.

Rationale:
Email-only minimizes infrastructure dependencies for the first pilot.
SMS/Twilio adds account provisioning, Israel number rental, signature
verification, fallback logic, and additional QA without proportional value
before a real pilot. Manual fallback remains available: adjuster copies the
magic link from the UI-002B dispatch response and shares it manually by email,
WhatsApp, SMS, or phone outside the system.

Supersedes:

- design004.2 §7.1-§7.3 email + SMS fallback design.
- sprint_ui002.1 Twilio/SMS fallback scope.

Trigger to revisit:
After pilot, revisit multi-channel automation if claimant email response rate is
below 50 percent and adjusters request automation for WhatsApp/SMS.

---

## D-031 — UI-003 sprint scope and methodology

Date: 07/05/2026
Status: Active
Decided by: CEO
Source: Pre-pilot review package and QA-001 triage.

Decision:
UI-003 is the pre-pilot readiness sprint for technical and UX blockers that
could embarrass or materially weaken the first insurer demo. UI-003 is split
into:

1. Part 1 technical blockers that do not require Designer decisions.
2. Part 2 design-dependent intake changes after Designer decisions land.

Part 1 includes public/internal surface cleanup, `/design-system` route
disposition, HEIC upload handling, `/api/health` information-disclosure
mitigation, and conditional CAPTCHA only when Turnstile keys are available.

Rationale:
Splitting the sprint lets Codex close technical blockers while Architect Track A
and Designer decisions run in parallel. It prevents design-dependent fields
from being implemented prematurely.

Guardrails:

- Part 1 must not implement ToS/Privacy consent, currency selection, trip
  dates, or pre-trip insurance.
- Public pages use a clean `Spectix • 2026` footer. Internal authenticated
  pages may keep the full build/version footer; this supersedes D-013 for
  public surfaces.
- Production Supabase, production deploys, production smoke, OpenClaw,
  Twilio/SMS/WhatsApp, and insurer outreach remain out of scope.
- CAPTCHA is skipped rather than partially implemented if Turnstile keys are
  not available by variable name.

Trigger to revisit:
After UI-003 Part 1 and Part 2 merge, consolidate Architect Track A findings
and update the plan overview.

---

## D-032 — `/design-system` route disposition

Date: 07/05/2026
Status: Active
Decided by: CEO
Source: Architect UX/UI live preview review and QA-001 duplicate finding F-005.

Decision:
Keep `/design-system` in the repository as an authenticated internal QA page,
but remove public access and remove it from the main adjuster navigation.

Rationale:
The page remains useful for internal component checks, but public exposure
signals prototype status and can confuse insurer viewers. Hiding and auth-gating
the route is lower-risk than deleting the page before the first pilot.

Trigger to revisit:
Delete or replace the route if a formal internal design review tool supersedes
it.

---

## D-033 — Demo URL canonical

Date: 07/05/2026
Status: Active
Decided by: CEO
Source: CEO GPT operational review and pre-pilot review package.

Decision:
The canonical demo URL for insurer-facing manual demos is
`https://staging.spectix.co.il`.

Rationale:
PR preview URLs are commit-specific, expire or drift operationally, and can
generate claimant links with the wrong origin if environment variables are not
aligned. A single staging URL reduces demo risk and keeps generated claimant
links predictable.

Guardrails:

- Do not use production for demos unless a separate production-readiness gate
  explicitly approves it.
- Do not show raw tokens, full magic links, secrets, or real claimant data in
  screenshots or recordings.
- If the first signed LOI or written pilot intent arrives, switch to
  SPRINT-PROD-BLOCK planning by default.

---

## D-034 — Currency code stored on claims, ILS default

Date: 07/05/2026
Status: Active
Decided by: CEO
Source: UI-003 Part 2 Designer decisions and dispatch gate.

Decision:
The intake form stores the selected ISO currency code on `claims.currency_code`
and keeps `ILS` as the default. The legacy `claims.currency` field remains
populated for compatibility with existing validation and adjuster UI paths.

Rationale:
Pilot claims may involve foreign-currency expenses. Capturing the claim currency
at intake avoids silent ILS assumptions while keeping existing validation layers
stable.

Guardrails:

- `/new` does not show ILS conversion.
- Server validation accepts only uppercase three-letter currency codes.
- Currency conversion/rate sourcing remains outside UI-003 Part 2.

---

## D-035 — Minimal consent_log table for ToS/Privacy audit trail

Date: 07/05/2026
Status: Active
Decided by: CEO
Source: UI-003 Part 2 Designer decisions and CEO GPT correction.

Decision:
Create a minimal `consent_log` table that records only `claim_id`,
`tos_version`, `privacy_version`, `accepted_at`, and creation metadata.

Rationale:
The pilot intake needs proof that the claimant accepted draft ToS/Privacy text,
but the audit trail must avoid unnecessary tracking data before legal and
privacy review.

Guardrails:

- Do not store IP address, user-agent, headers, cookies, auth headers, session
  metadata, or fingerprinting data in `consent_log`.
- Legal pages remain visibly marked as draft placeholders until post-LOI legal
  review.

---

## D-036 — "לא בטוח" pre-trip insurance triggers pending question

Date: 07/05/2026
Status: Active
Decided by: CEO
Source: UI-003 Part 2 Designer decisions.

Decision:
If the intake answer for pre-trip insurance is `לא בטוח`, create a pending
clarification question asking when the travel insurance was purchased.

Rationale:
The uncertain answer should not dead-end the claimant. It should enter the
existing missing-information loop so the adjuster can resolve Rule 08 context
without a new rules engine.

Guardrails:

- Use existing `clarification_questions` and `audit_log` patterns only.
- Do not add a new rule engine or extra migration beyond the approved
  trip/currency/consent migration.

---

## D-037 — Homepage primary audience: B2B insurer demo viewer

Date: 07/05/2026
Status: Active
Decided by: CEO
Source: UI-003 Part 2 Designer decisions.

Decision:
The homepage should speak first to insurer demo viewers, not consumers. The hero
positions Spectix as claim-file triage and missing-information workflow support,
with the claim decision staying with the representative.

Rationale:
The immediate go-to-market motion is insurer discovery and pilot qualification.
A concise B2B hero lowers demo friction and avoids implying automatic claim
decisions.

Guardrails:

- Keep the homepage to the approved static hero for UI-003 Part 2.
- Do not add extra marketing sections before the insurer discovery package is
  exercised.
