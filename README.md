# Spectix v1 — POC

Claim investigation and risk analysis. Hebrew/RTL UI. Next.js 14 App Router on Vercel,
Supabase (DB + Auth + Storage), Inngest for background jobs, Anthropic Claude for the
investigation pipeline.

This is **Spike #00** — infrastructure scaffolding only. No business logic.

## Prerequisites

- Node 20+
- pnpm 9+
- A Supabase project (Frankfurt region recommended)
- An Inngest account (free tier is fine)
- A Vercel account connected to this repo
- An Anthropic API key

## Local setup

```bash
pnpm install
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY.
pnpm dev
```

Open http://localhost:3000 — you should see the Hebrew RTL placeholder.

### Inngest (local)

In a second terminal:

```bash
pnpm inngest:dev
```

The Inngest dev server connects to `http://localhost:3000/api/inngest`. Open
http://localhost:8288 to see the Inngest dashboard.

## Database setup

The schema lives in [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql).
It is idempotent.
Cross-cutting types are defined in `lib/types.ts`. On schema change, update the migration first, then `types.ts`.

### Option A — Supabase Dashboard (one-time, simplest)

1. Open your project in the Supabase Dashboard.
2. Go to **SQL Editor → New query**.
3. Paste the contents of `supabase/migrations/0001_initial_schema.sql` and run.
4. Verify the **Database → Tables** view shows all 7 tables: `claims`, `documents`,
   `findings`, `gaps`, `clarification_questions`, `enrichment_cache`, `audit_log`.
5. Verify **Storage → Buckets** shows `claim-documents` (Private, 32 MB limit).

### Option B — Supabase CLI

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### Verifying

After deploy, hit `/api/health`. You should get:

```json
{ "ok": true, "tables": [...] }
```

> **Important:** the `/api/health` route is a temporary diagnostic for Spike #00. It
> must be deleted (or gated behind a secret) before Spike #01 lands.

## Vercel deployment

1. Connect this GitHub repo to Vercel.
2. Project → Settings → Environment Variables: add the same vars as `.env.local`,
   plus `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` from the Inngest dashboard.
3. Deploy. The build runs `tsx scripts/check-env.ts` first and fails fast with a
   named error if any required var is missing.

## Project layout

```
app/
  api/
    health/      temporary — remove before Spike #01
    inngest/     Inngest webhook (registers all functions)
  layout.tsx     RTL Hebrew root layout
  page.tsx       placeholder home
  globals.css
inngest/
  client.ts      Inngest client (id: spectix-poc)
  functions/     function registry
lib/
  supabase/
    client.ts    browser client
    server.ts    server client (cookies, RLS-aware)
    admin.ts     service role client (server-only)
scripts/
  check-env.ts   build-time env var validation
supabase/
  migrations/
    0001_initial_schema.sql
  seed.sql
```

## Conventions

- TypeScript strict mode. No `any` without justification.
- Server code that bypasses RLS uses `lib/supabase/admin.ts`. The `server-only` import
  prevents it from being bundled into client code.
- All UI text is Hebrew/RTL. Numeric values render LTR via `dir="ltr"` on the element
  or by using `font-mono` (set up in `globals.css`).
- Migrations are append-only and idempotent.

## Out of scope for Spike #00

- Auth flow (Spike #01)
- TypeScript types for DB rows (Spike #00a — generate from Supabase)
- Any prompts, rules, or business logic
- shadcn/ui beyond what's needed for the placeholder
- Husky / lint-staged
- CI beyond Vercel's default
