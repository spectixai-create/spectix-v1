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

## Inngest Dev Server

E2E tests for document processing require the Inngest dev server alongside
Next.js.

### Local (two terminals)

Terminal 1:

```bash
pnpm dev
```

Terminal 2:

```bash
pnpm inngest:dev
```

View runs at [http://localhost:8288](http://localhost:8288).

Playwright starts Next with `INNGEST_DEV=1` and
`INNGEST_BASE_URL=http://localhost:8288` so route handlers send events to the
local dev server.

### CI

Suggested future script:

```bash
concurrently --kill-others --success first "pnpm dev" "pnpm inngest:dev" "sleep 5 && pnpm test:e2e"
```

### Vercel

Inngest Cloud routes through `/api/inngest`. Verify function registration in
the Inngest dashboard after deployment.

Seed an adjuster:

```bash
pnpm seed:adjuster test-adjuster@spectix.test <password>
```

## Common Issues

- CJK workspace path: move repo to an ASCII path and reinstall dependencies.
- Prettier class order changes: run `pnpm exec prettier --write "**/*.{ts,tsx,js,jsx,json,md,css}"`.
- Auth E2E requires seeded user: run `pnpm seed:adjuster`.
- Next generated type issues: run `pnpm build` or `pnpm dev` once, then retry typecheck.
