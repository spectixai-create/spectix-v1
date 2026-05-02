# Conventions

## Code

- TypeScript strict mode; `noUncheckedIndexedAccess` is on.
- Use camelCase in TypeScript and snake_case in the database.
- Server Components by default; add `"use client"` only for interactivity.
- Use `react-hook-form` for form structure. Validation schemas wait for the zod contract spike unless explicitly assigned.
- Local types in sample-data files may remain until the #00a-refactor spike.
- All user-facing UI text is Hebrew and RTL.
- Use logical CSS properties and Tailwind logical classes: `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`.
- Do not use `ml-`, `mr-`, `pl-`, `pr-`, `left-`, or `right-` in UI code unless a third-party primitive requires it and the exception is documented.
- Heebo is the default Hebrew font; Inter is used for Latin text and digits.
- Use shadcn/ui primitives and local design-system components.
- Add `VersionFooter` to every UI page per D-013.

## Git

- Branch naming: `<area>-<feature>`, for example `backend-types`, `frontend-login-404`, `docs-infrastructure`.
- PR title: `Spike #XX: <description>`.
- Commit message: concise title plus bullets for important changes.
- Keep PRs single-purpose and reviewable.

## Documentation

- Documentation is English.
- Hebrew appears only in UI copy snippets.
- Update [CURRENT_STATE.md](CURRENT_STATE.md) with each spike.
- On schema changes, update [DB_SCHEMA.md](DB_SCHEMA.md) and [lib/types.ts](../lib/types.ts).

## Schema Invariants

- DB schema is canonical for relational structure.
- TypeScript types are canonical for JSONB content shape.
- When a field is only in [lib/types.ts](../lib/types.ts) and not a DB column, it lives inside a JSONB column such as `claims.metadata`, `documents.extracted_data`, `findings.evidence`, or `audit_log.details`.
- When a migration promotes JSONB content to a column, update the migration first, then [DB_SCHEMA.md](DB_SCHEMA.md), then [lib/types.ts](../lib/types.ts) in the same PR.
- `incidentLocation` is canonical for free-text location. `country` and `city` metadata values are computed-and-stored helpers and must not be updated independently.
- Denormalized pipeline fields on `claims` must be maintained from normalized pipeline tables by DB trigger, not manually by UI code.

## Hebrew to English Form Translation

- Form Selects use `{ value, label }` options: Hebrew `label` for display, English `value` for API contracts.
- API routes and Server Actions receive English values only.
- [lib/sample-data/intake-options.ts](../lib/sample-data/intake-options.ts) is the current UI mapping source.
- See [SCHEMA_AUDIT.md](SCHEMA_AUDIT.md) for the full mapping table and the known corrections needed before real intake submission.

## API Error Codes

- All API errors return `ApiResult.error` with `{ code, message, details? }`.
- `code` is an English snake_case identifier for programmatic handling.
- `message` is English and is not shown directly to users.
- Frontend components map `code` to Hebrew UI copy locally. Centralize this mapping when 4 or more form sites need it.
- `details` is for developer debugging only and must not be displayed to users.

Currently registered codes:

- `invalid_credentials`
- `unauthorized`
- `invalid_json`
- `validation_failed`
- `claim_number_collision`
- `claim_number_generation_failed`
- `db_error`
- `invalid_id`
- `claim_not_found`
- `claim_not_acceptable`
- `file_too_large`
- `invalid_file_type`
- `empty_file`
- `document_limit_reached`
- `storage_error`
- `upload_partial_failure`
- `network_error`

## Verification

Run:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Run `pnpm test:e2e` for UI, routing, auth, or interaction changes.
