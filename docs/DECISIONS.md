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
