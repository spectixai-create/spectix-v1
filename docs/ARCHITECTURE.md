# Architecture

## System Overview

Spectix is a Next.js 14 App Router application deployed on Vercel. Supabase provides PostgreSQL, Auth, and private document storage in Frankfurt. Inngest coordinates async workflows. Claude API is called directly for OCR, extraction, and investigation reasoning.

## 3-Pass Investigation Pipeline

The core investigation pipeline is iterative. Each pass reads the current claim, documents, findings, gaps, and enrichment cache, then attempts to reduce uncertainty.

1. Pass 1: initial extraction, coverage, and obvious rule checks.
2. Pass 2: targeted enrichment for gaps from Pass 1.
3. Pass 3: only runs if meaningful gaps remain and cost/stop limits allow it.

The average target is about 1.7 passes per claim and about $0.50 LLM cost per claim.

## Gap Identifier

Between passes, the Gap Identifier decides whether the system has enough evidence to produce a brief or must ask for more context. Gaps can become clarification questions for the claimant or internal adjuster review items.

## Stop Conditions

- No open gaps remain.
- Findings and risk band are stable across passes.
- Cost cap reaches $2 per claim.
- Maximum pass count reached.
- Manual-only gaps remain.

## Layers

- Layer -1: Policy issuance check.
- Layer 0: Coverage check.
- Layer 0.5: Trip context. This is mandatory for V1.
- Layers 1-4: Rules R01-R09.
- Layer 5: Context multiplier.
- Layer 6: Brief generation.
- Layer 7: Client-side evidence. Deferred to V1.5 per D-003.

## Tech Stack

- Next.js 14 App Router with TypeScript strict mode.
- Tailwind CSS + shadcn/ui RTL design system per D-011.
- Supabase in Frankfurt for GDPR-sensitive storage.
- Supabase Auth for adjuster authentication.
- Claude API direct for OCR/extraction/LLM per D-007.
- Inngest for async workflows.
- Vercel for hosting and deployment.

Related docs: [DB_SCHEMA.md](DB_SCHEMA.md), [API_CONTRACTS.md](API_CONTRACTS.md), [ROUTING.md](ROUTING.md).
