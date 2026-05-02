# Development

## Workspace Setup

Use an ASCII-only workspace path on Windows, for example:

```powershell
C:\Users\smart\spectix
```

Avoid paths such as `OneDrive\文档`; they have previously broken Node, pnpm, and git behavior on Windows.

## Required Environment Variables

Local `.env.local` and Vercel environments need:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`

Never commit `.env.local`.

## Commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm test:e2e
```

Seed an adjuster:

```bash
pnpm seed:adjuster test-adjuster@spectix.test <password>
```

## Common Issues

- CJK workspace path: move repo to an ASCII path and reinstall dependencies.
- Prettier class order changes: run `pnpm exec prettier --write "**/*.{ts,tsx,js,jsx,json,md,css}"`.
- Auth E2E requires seeded user: run `pnpm seed:adjuster`.
- Next generated type issues: run `pnpm build` or `pnpm dev` once, then retry typecheck.
