# Spike #01 - Supabase Auth Wiring

Status: COMPLETED. Branch: `backend-auth`. Owner: Codex. Merged 2025-05-02. Final main SHA: `277716d30cd4e3456e0ed79e4ef61ba6e5d55c71`.

This spec was originally prepared as the next post-documentation spike, but implementation completed before Spike #00z-A was merged. This file is now the canonical archive for Spike #01 behavior and security requirements.

## Context

Spike #01 replaced the mock login skeleton with real Supabase Auth. It protects adjuster routes, keeps public intake routes available, validates redirect targets, adds logout, and provides an idempotent adjuster seed script.

## Files Created

- `lib/auth/safe-redirect.ts`: validates safe internal `next` redirect targets.
- `lib/auth/server.ts`: server helpers for `getSession`, validated `getUser`, and `requireUser`.
- `lib/auth/actions.ts`: Server Actions for `signIn` and `signOut`.
- `lib/supabase/middleware.ts`: Edge-runtime Supabase SSR client for middleware.
- `middleware.ts`: route protection for adjuster paths.
- `components/ui/dropdown-menu.tsx`: shadcn DropdownMenu primitive.
- `components/layout/adjuster-shell-client.tsx`: client shell with navigation and logout dropdown.
- `scripts/seed/create-adjuster.ts`: idempotent adjuster seed CLI.
- `tests/e2e/auth.setup.ts`: Playwright storageState setup.
- `tests/e2e/auth-flow.spec.ts`: auth, route boundary, logout, persistence, and open-redirect tests.

## Files Modified

- `app/(auth)/login/page.tsx`: dynamic auth-aware login page.
- `components/auth/login-form.tsx`: real sign-in Server Action.
- `components/layout/adjuster-shell.tsx`: server wrapper requiring user unless public access is requested.
- Adjuster pages: `dynamic = 'force-dynamic'`.
- `app/design-system/page.tsx`: public POC exemption.
- `playwright.config.ts`: unauthenticated, setup, and authenticated projects.
- `package.json`: `seed:adjuster` script and DropdownMenu dependency.
- `.gitignore`: `.auth`.

## Security Requirements

- Middleware excludes `/api/*`; Inngest and future webhooks use signing keys, not cookies.
- Protected paths: `/dashboard`, `/claim`, `/questions`.
- Public paths: `/`, `/new`, `/login`, `/design-system`, `/api/*`, 404.
- `next` must be a single-slash internal page path.
- Block `https://evil.com`, `//evil.com`, `/api/*`, and `/login` as redirect targets.
- Login must use Server Actions, not client-side credential fetch.
- Server Components must validate with `getUser()` / `requireUser()`.
- `signOut()` must call `revalidatePath('/', 'layout')` before redirect.
- `next.config.js` has no custom `experimental.serverActions.allowedOrigins`; default same-origin behavior applies.

## Seed Script

Usage:

```bash
pnpm seed:adjuster test-adjuster@spectix.test <password>
```

The script is idempotent. If the user exists, it updates the password. It uses `email_confirm: true` for POC operations.

## Acceptance Criteria

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build` pass.
- `pnpm test:e2e` passes.
- Seeded user logs in and reaches `/dashboard`.
- Invalid credentials show a Hebrew error.
- Anonymous `/dashboard`, `/claim/2024-001`, and `/questions` redirect to `/login?next=<safe path>`.
- `/`, `/new`, `/login`, and `/design-system` remain public.
- `/api/inngest` is not redirected by middleware.
- Open redirect tests pass.
- Logout clears session and returns to `/login`.
- Session persists across reloads.
- AdjusterShell shows logged-in email.
- Lighthouse a11y on `/login` remains >= 90.

## Verification Result

Final local verification:

- `pnpm install`: passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm format:check`: passed.
- `pnpm test`: 9/9 passed.
- `pnpm build`: passed.
- `pnpm test:e2e`: 29/29 passed.
- Lighthouse `/login`: 100.

Production verification passed on [https://spectix-v1.vercel.app](https://spectix-v1.vercel.app).
