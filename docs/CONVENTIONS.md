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
