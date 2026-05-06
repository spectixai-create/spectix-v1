# SPRINT-UI-002A — Claimant Responses Pre-Flight (Gate Sprint)

**Date:** 06/05/2026
**Identifier:** sprint_ui002a.1
**Type:** Pre-flight verification + design artifact ingestion. **No runtime code, no DB mutations, no smoke, no deploy.**
**Branch:** `sprint/ui-002a-claimant-responses-preflight`
**Base:** `main` HEAD `004ff933e34d1d00e893f7952ccd0e2d664d9b40` (post PR #69 / SYNC-006).
**Source spec:** `sprint_ui002.1_claimant_responses_implementation_06_05.md` (full 19-day spec — gated until this pre-flight returns clean).

**Status:** Ready for Codex dispatch.
**Estimated effort:** ~3-4 hours (read-only checks + 5 markdown artifacts + 1 PR).

---

## 1. Why this gate sprint exists

`sprint_ui002.1` is a 19-day implementation spec. Sending it as one block to Codex carries 3 risks:

1. **Schema assumptions unverified** — `claim_form` jsonb was assumed in design004.2 and turned out not to exist. Other assumptions (extraction handler subset capability, RPC semantics, env/infra) remain unverified.
2. **Scope creep mid-sprint** — if extraction handler doesn't support `document_ids` subset OR Resend/Twilio infra not configured, partial work would block merge for days while infra is procured.
3. **No reversible decision point** — once the 19-day spec is in flight, splitting it post-hoc into UI-002B/002C is messy.

UI-002A returns **a single decision document** that says: implementation is viable as-is / needs scope split / needs infra blockers resolved first. CEO Claude + CEO GPT use that decision to authorize UI-002B (the implementation sprint) — possibly with reduced scope, possibly after infra procurement.

---

## 2. In scope

### 2.1 — Add design artifacts to repo (docs-only commit)

Codex commits to branch `sprint/ui-002a-claimant-responses-preflight`:

```
docs/management/designs/design001.11_state_machine_06_05.md
docs/management/designs/design002.8_synthesis_decomposition_06_05.md
docs/management/designs/design004.2_claimant_responses_06_05.md
docs/management/designs/design004.3_claimant_responses_06_05.md
docs/management/sprints/sprint_ui002.1_claimant_responses_implementation_06_05.md
docs/management/sprints/sprint_ui002a.1_preflight_06_05.md          # this file
docs/management/verifications/verification_06_05_pre_signoff.md     # the prior Codex artifact
```

**Archive markers (header insertion, files stay in place):**

- `design001.10_state_machine_06_05.md` — add header `**SUPERSEDED by design001.11_state_machine_06_05.md (06/05/2026).**`
- `design002.7_synthesis_decomposition_06_05.md` — add header `**SUPERSEDED by design002.8_synthesis_decomposition_06_05.md (06/05/2026).**`
- `design004.1_claimant_responses_06_05.md` — add header `**SUPERSEDED by design004.2 + design004.3.**`
- `design004.2_claimant_responses_06_05.md` — add header `**Sections §3.1, §7, §14.2 SUPERSEDED by design004.3. Other sections current.**`

If the design files are not provided to Codex's local environment, Codex requests them from CEO Claude before proceeding (do NOT fabricate or reconstruct).

### 2.2 — Pre-flight checks

The 4 checks from `sprint_ui002.1` §2, **executed read-only**:

#### Check A — Direct contact column existence (Supabase non-prod `aozbgunwhafabfmuwjol`)

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='claims'
  AND column_name IN ('claimant_email', 'claimant_phone', 'claimant_name', 'claim_number')
ORDER BY column_name;

SELECT
  count(*) FILTER (WHERE COALESCE(claimant_email, '') = '') AS missing_email,
  count(*) FILTER (WHERE COALESCE(claimant_phone, '') = '') AS missing_phone,
  count(*) FILTER (WHERE COALESCE(claimant_email, '') = '' AND COALESCE(claimant_phone, '') = '') AS missing_both,
  count(*) AS total
FROM claims;
```

**Output:** `docs/management/verifications/preflight_a_contact_columns.md`

#### Check B — Empty-string handling sweep (extends Task 3 from prior verification)

```bash
grep -rn "claimant_email\|claimant_phone" app/ lib/ inngest/ supabase/
```

For every hit, classify:

- Schema/type definition — N/A.
- Write path (intake/edit) — note whether `''` → `null` normalization happens.
- Read path used by dispatch logic — must normalize with `?? ''` + `.trim()`.
- Read path used for display only — normalization optional, flag for polish.

**Output:** `docs/management/verifications/preflight_b_empty_string_sweep.md` — table per hit with classification.

#### Check C — Extraction handler subset capability

```bash
grep -rn "extraction.completed\|process-document\|claim/extraction" inngest/
```

Read `inngest/functions/process-document.ts`. Answer 2 questions:

1. Does the handler accept `document_ids: uuid[]` payload field and process only those, OR does it process "all documents in claim with status='pending'"?
2. If the latter — what would a minimal patch look like (lines of code estimate)?

**Output:** `docs/management/verifications/preflight_c_extraction_handler.md` — verdict (`subset_capable: true|false`) + patch description if needed.

#### Check D — `reopen_pass_for_document_processing` RPC semantics

```bash
grep -rn "reopen_pass_for_document_processing" supabase/ inngest/ app/ lib/
```

Read the RPC body (existing in `supabase/migrations/20260504111946_pass_lifecycle_completion.sql`). Document:

- What columns it modifies on `passes`.
- What state transitions it triggers.
- When it's called and from where.
- Whether it's idempotent.

**Output:** `docs/architecture/passes_lifecycle.md` (~30-50 lines, NEW file). This is the artifact that closes TECH_DEBT 11S — keep it concise; full lifecycle doc out of scope.

#### Check E — Resend / Twilio env-var presence (does NOT test connectivity)

```bash
grep -rn "RESEND_API_KEY\|TWILIO_ACCOUNT_SID\|TWILIO_AUTH_TOKEN\|TWILIO_FROM_NUMBER\|RESEND_WEBHOOK_SECRET" .env.example .env*.template README.md
```

Plus check Vercel project settings if accessible (if not — flag as "manual check needed by vov").

**Output:** `docs/management/verifications/preflight_e_notification_infra.md` — table per env var: declared / configured / value masked.

### 2.3 — Decision report

Final artifact: `docs/management/verifications/preflight_decision_06_05.md`.

Template:

```markdown
# UI-002A Pre-Flight Decision — 06/05/2026

## Executive verdict

One of:

- **GO** — implementation per sprint_ui002.1 viable as-is.
- **GO-WITH-PATCH** — viable with extraction handler patch (~N additional days, scope adjusted).
- **GO-AFTER-INFRA** — viable but blocked on Resend/Twilio env setup (vov action, ~2h).
- **SPLIT** — recommend splitting into UI-002B (core, no notifications) + UI-002C (notifications) due to infra/scope.
- **NO-GO** — blocking finding requires design004.4 or other rework.

## Findings

### Check A — contact columns

- Verdict: PASS / FAIL
- Details: <link to artifact>

### Check B — empty-string sweep

- Verdict: PASS / FAIL / POLISH-ONLY
- Hits requiring patch in this sprint: <count>
- Hits flagged for future polish: <count>

### Check C — extraction handler

- Verdict: subset-capable / needs-patch
- Patch effort estimate: <days, if needed>

### Check D — `reopen_pass` RPC

- Documentation produced: docs/architecture/passes_lifecycle.md
- TECH_DEBT 11S: RESOLVED in this PR

### Check E — notification env vars

- RESEND_API_KEY: declared / configured / missing
- RESEND_WEBHOOK_SECRET: ...
- TWILIO_ACCOUNT_SID: ...
- TWILIO_AUTH_TOKEN: ...
- TWILIO_FROM_NUMBER: ...
- Verdict: ready / vov-action-required

## Recommended next step

One of:

- Authorize UI-002B as full sprint_ui002.1 (GO).
- Authorize UI-002B with adjusted scope: <description> (GO-WITH-PATCH or SPLIT).
- vov procures: <list> before UI-002B can dispatch.

## Estimate impact

- Original sprint_ui002.1: 19 days.
- After this pre-flight: <updated estimate, with delta justification>.
```

---

## 3. Out of scope (explicit non-list)

Codex must NOT do any of the following in this sprint:

- ❌ Migration 0009 (creation, application, or rollback).
- ❌ Any new tables, RPCs, or ALTER statements in Supabase (read-only checks only).
- ❌ Any code in `app/` (no API routes, no components, no pages).
- ❌ Any code in `inngest/` (no new functions, no patches).
- ❌ Webhook routes for Resend/Twilio.
- ❌ Frontend claimant page or any UI components.
- ❌ UI-001 brief view patches.
- ❌ Tests (E2E, unit, smoke).
- ❌ Deploy or production touch.
- ❌ Production Supabase touch (`fcqporzsihuqtfohqtxs` is off-limits).
- ❌ Any change to Vercel env vars (read-only inspection only).
- ❌ NPM dependency additions.

If during pre-flight a non-scope action seems necessary to answer a check → STOP, document as a finding in the decision report, and recommend it for UI-002B.

---

## 4. PR

- Branch: `sprint/ui-002a-claimant-responses-preflight`
- Base: `main` at `004ff933e34d1d00e893f7952ccd0e2d664d9b40`
- Title: `UI-002A: claimant responses pre-flight (docs + checks only)`
- Body must include:
  - Reference to this spec.
  - Scope boundary statement: "Docs-only + read-only checks. No runtime, no Supabase mutation, no deploy."
  - All 5 verification artifacts inline-referenced.
  - The decision report inlined into the PR description (for fast triage).
  - Statement: "UI-002B implementation gated on this PR's decision report being approved by CEO Claude."

---

## 5. Acceptance for this sprint

- [ ] Branch created from main HEAD `004ff933e34d1d00e893f7952ccd0e2d664d9b40`.
- [ ] 7 design/sprint/verification docs added under `docs/management/`.
- [ ] 4 archive headers added to superseded designs.
- [ ] 5 pre-flight artifacts produced under `docs/management/verifications/` and `docs/architecture/`.
- [ ] 1 decision report finalized.
- [ ] PR opened, body includes decision report inline.
- [ ] CI green (docs-only changes — should pass).
- [ ] Zero changes outside `docs/`.

---

## 6. Hand-back to CEO Claude

After PR opens, CEO Claude reviews the decision report:

- **GO** → drafts UI-002B dispatch using `sprint_ui002.1` as-is.
- **GO-WITH-PATCH** → drafts UI-002B with extraction handler patch added to scope.
- **GO-AFTER-INFRA** → asks vov to procure env vars / accounts; pauses until done.
- **SPLIT** → drafts UI-002B (core) and UI-002C (notifications) as separate sprint specs.
- **NO-GO** → opens design004.4 with the blocking finding.

---

## 7. Cross-references

- `sprint_ui002.1_claimant_responses_implementation_06_05.md` — full implementation spec (gated).
- `verification_06_05_pre_signoff.md` — earlier Codex artifact (Tasks 1-3, performed before main HEAD update).
- `design004.2` + `design004.3` — joint design.
- `design001.11` + `design002.8` — concurrent revisions.

---

## Version

sprint_ui002a.1 — 06/05/2026
**Filename:** `sprint_ui002a.1_preflight_06_05.md`
**Status:** Ready for CEO GPT verification → Codex dispatch.
**Next:** Codex returns PR with decision report → CEO Claude authorizes UI-002B with appropriate scope.
