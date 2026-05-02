# Spike #00a - /lib/types.ts Source-of-Truth Contract

Status: COMPLETED. PR #6. Merged 2025-05-02. Final main SHA: `c2087b7`.

This is a historical archive. Do not modify except to correct archival metadata.

## Context

Spike #00a created the canonical TypeScript contract in [lib/types.ts](../../lib/types.ts). It mirrors [supabase/migrations/0001_initial_schema.sql](../../supabase/migrations/0001_initial_schema.sql) and defines shared API, JSONB, and Inngest event types.

## Files Created

- `lib/types.ts`: source-of-truth TypeScript types.
- `lib/types.test.ts`: vitest compile-time and runtime shape checks.
- `vitest.config.ts`: minimal vitest config if missing.
- `README.md`: one-line schema/type update.

## Core Requirements

- Read the canonical migration first.
- Mirror all 7 database tables column-by-column.
- Use camelCase in TypeScript for snake_case DB columns.
- Use `T | null` for nullable DB fields, not `undefined`.
- Use literal unions for known status fields.
- Keep JSONB shapes explicit where known and flexible where intentionally open.
- Add Inngest event types for document and pass workflows.

## Status Unions

- `ClaimStatus`: `intake`, `processing`, `pending_info`, `ready`, `reviewed`, `rejected_no_coverage`, `cost_capped`.
- `DocumentDerivedStatus`: `pending`, `processing`, `processed`, `failed`.
- `FindingSeverity`: `low`, `medium`, `high`.
- `GapStatus`: `open`, `resolved`, `ignored`.
- `QuestionStatus`: `pending`, `sent`, `answered`.
- `RiskBand`: `green`, `yellow`, `orange`, `red`.
- `ClaimType`: `baggage`, `theft`, `loss`, `medical`, `flight_cancellation`, `flight_delay`, `liability`, `emergency`, `misrepresentation`, `other`.
- `DocumentType`: `police_report`, `hotel_letter`, `receipt`, `medical_report`, `witness_letter`, `flight_doc`, `photo`, `other`.
- `AuditActorType`: `system`, `rule_engine`, `llm`, `gap_analyzer`, `user`.

## Entity Interfaces

The spike created interfaces for:

- `Claim`
- `Document`
- `Finding`
- `Gap`
- `ClarificationQuestion`
- `EnrichmentCache`
- `AuditLog`

Every field maps to a column in the migration.

## JSONB Shapes

- `ClaimMetadata`
- `ExtractedData`
- `PoliceReportExtraction`
- `PoliceFormatAnalysis`
- `HotelLetterExtraction`
- `ReceiptExtraction`
- `ReceiptItem`
- `MedicalReportExtraction`
- `GenericDocumentExtraction`
- `PhotoExtraction`
- `FindingEvidence`

`ExtractedData` is a discriminated union keyed by `kind`.

## API Contracts

The spike added:

- `ApiError`
- `ApiResult<T>`
- `CreateClaimRequest`
- `CreateClaimResponse`
- `GetClaimResponse`
- `ProcessDocumentRequest`
- `ProcessDocumentResponse`
- `UpdateClaimStatusRequest`

## Inngest Events

- `DocumentUploadedEvent`
- `DocumentProcessedEvent`
- `DocumentProcessFailedEvent`
- `PassStartEvent`
- `PassCompletedEvent`
- `SpectixInngestEvent`

## Acceptance Criteria

- `pnpm typecheck` passes.
- `pnpm lint` passes.
- `pnpm format:check` passes.
- `pnpm build` succeeds.
- `pnpm test` passes.
- All 7 DB tables have corresponding interfaces.
- `ExtractedData` has 8 variants.
- `PoliceReportExtraction` includes nested `PoliceFormatAnalysis`.
- No migrations, components, app pages, or sample data files were refactored.

## Follow-Up

The sample-data refactor is deferred to #00a-refactor. Migration #0002 is needed for question closed-state metadata and document processing status.
