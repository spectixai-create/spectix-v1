# DIAG-INNGEST-001 — Diagnostic Spec, Status Sync PR, CEO Review Checklist

**Date:** 05/05/2026
**Context:** PR #52 (SPRINT-002B) smoke retry attempt 4 failed at local Inngest function registration. `PUT /api/inngest 500`, `POST /fn/register 404`, `process-document` never ran, all 9 documents stayed `pending`.
**This document contains everything needed to unblock PR #52:**

1. Codex diagnostic spec (Part 1)
2. Documentation sync PR content (Part 2)
3. CEO GPT review checklist for both (Part 3)

---

# Part 1 — Codex Diagnostic Spec

**Status:** Diagnostic only. No product code changes. No smoke run.
**Identifier:** DIAG-INNGEST-001
**Target branch:** PR #52 head `86bec00`
**Output:** structured report appended to `docs/agents/workflow/CODEX_REPORT_LOG.md` and evidence bundle in `./.diag/inngest-001/` (project-relative, gitignored).
**Out of scope:** any change to product code, prompts, contracts, fixtures, package versions, env files, or PR #52 branch. Do not run a new smoke. Do not push commits unless explicitly requested.

## 1.1 Hypothesis

Primary failure: the Next.js `/api/inngest` route handler crashes at request time, most likely due to a module-level error in one of the SPRINT-002B subtype extraction routes loaded by `serve()`. The `POST /fn/register 404` is a secondary symptom (SDK fallback or misrouted dev-server probe), not the root cause. **Fix the 500. Do not chase the 404 first.**

## 1.2 Operating Constraints

1. **No code changes.** Not in product files, not in env files, not in package files. If a hypothesis requires a change, document it as a proposed change in the report and stop.
2. **No smoke run.** This task does not touch Supabase, does not create claims, does not upload documents.
3. **No commits to PR #52 branch.** Diagnostic commits, if any, go to a new branch `diag/inngest-001`.
4. **Capture before concluding.** Phase 3 must capture full stderr from the Next.js dev server process. The 500 response body alone is insufficient — the actual stack trace usually appears in the Next.js process stderr, not in the HTTP response.
5. **Detect package manager once, use throughout.** See Phase 0.

## 1.3 Phase 0 — Toolchain Detection

```bash
# Detect package manager
if [ -f pnpm-lock.yaml ]; then PM=pnpm
elif [ -f yarn.lock ]; then PM=yarn
elif [ -f package-lock.json ]; then PM=npm
else echo "FATAL: no lockfile detected"; exit 1; fi
echo "Package manager: $PM"

# Detect Node version
node --version
cat package.json | grep -A 2 '"engines"' || echo "No engines field in package.json"
cat .nvmrc 2>/dev/null || echo "No .nvmrc"

# Create evidence dir
mkdir -p ./.diag/inngest-001
```

Record: `$PM`, Node version actual, Node version declared (if any).

## 1.4 Phase 1 — Environment Audit

### 1.4.1 Branch and head verification

```bash
git fetch origin
git checkout 86bec00
git log -1 --format="%H %s" > ./.diag/inngest-001/head.txt
git status --porcelain > ./.diag/inngest-001/status.txt
cat ./.diag/inngest-001/head.txt
```

Expected: HEAD is `86bec00...`, working tree clean. **If working tree dirty, stop and report.**

### 1.4.2 Package versions (no jq dependency)

```bash
node -e "const p=require('./package.json'); const all={...p.dependencies,...p.devDependencies}; const filtered=Object.fromEntries(Object.entries(all).filter(([k])=>/inngest|next/.test(k))); console.log(JSON.stringify(filtered,null,2))" > ./.diag/inngest-001/versions.json

case $PM in
  pnpm) pnpm why inngest 2>&1 | tee ./.diag/inngest-001/inngest_why.txt ;;
  yarn) yarn why inngest 2>&1 | tee ./.diag/inngest-001/inngest_why.txt ;;
  npm)  npm ls inngest --all 2>&1 | tee ./.diag/inngest-001/inngest_why.txt ;;
esac
```

### 1.4.3 Compare lockfile vs main

```bash
LOCKFILE=$(case $PM in pnpm) echo pnpm-lock.yaml;; yarn) echo yarn.lock;; npm) echo package-lock.json;; esac)
git diff main...HEAD -- package.json $LOCKFILE > ./.diag/inngest-001/lockfile_diff.txt
wc -l ./.diag/inngest-001/lockfile_diff.txt
```

### 1.4.4 Environment variable audit (no secret values printed)

```bash
{
  for v in INNGEST_DEV INNGEST_BASE_URL INNGEST_EVENT_KEY INNGEST_SIGNING_KEY NEXT_PUBLIC_INNGEST_BASE_URL NODE_ENV; do
    if [ -n "${!v}" ]; then
      echo "$v: SET (len=${#v})"
    else
      echo "$v: UNSET"
    fi
  done
  echo "---"
  if [ -f .env.local ]; then
    grep -E '^(INNGEST_|NEXT_PUBLIC_INNGEST_|NODE_ENV)' .env.local | sed -E 's/=.*/=<redacted>/' || echo "no INNGEST keys in .env.local"
  else
    echo ".env.local: MISSING"
  fi
} > ./.diag/inngest-001/env_audit.txt
cat ./.diag/inngest-001/env_audit.txt
```

## 1.5 Phase 2 — Static Analysis Of `/api/inngest` Route

### 1.5.1 Locate serve handler (App Router OR Pages Router)

```bash
{
  echo "App Router candidates:"
  find . -path ./node_modules -prune -o -path ./.next -prune -o -type f \( -name "route.ts" -o -name "route.js" \) -print 2>/dev/null | xargs grep -l "inngest/next" 2>/dev/null
  echo "---"
  echo "Pages Router candidates:"
  find . -path ./node_modules -prune -o -path ./.next -prune -o -type f \( -name "*.ts" -o -name "*.js" \) -print 2>/dev/null | grep -E "pages/api/inngest" | head -5
} > ./.diag/inngest-001/serve_handler_paths.txt
cat ./.diag/inngest-001/serve_handler_paths.txt
```

Open every located file. Save copy of file content to `./.diag/inngest-001/serve_handler.txt`. Record imports, exports (`GET, POST, PUT` for App Router), and any `runtime`/`dynamic` config.

### 1.5.2 TypeScript build check

```bash
$PM tsc --noEmit 2>&1 | tee ./.diag/inngest-001/tsc.txt
echo "tsc exit code: $?"
```

TypeScript errors in Inngest function modules typically manifest as runtime 500 on `/api/inngest`.

### 1.5.3 Function ID uniqueness

```bash
grep -rn "createFunction" --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next \
  -A 5 2>/dev/null \
  | grep -E "id:\s*['\"]" \
  | sed -E "s/.*id:\s*['\"]([^'\"]+)['\"].*/\1/" \
  | sort | uniq -c | sort -rn \
  > ./.diag/inngest-001/function_ids.txt
head -30 ./.diag/inngest-001/function_ids.txt
```

Any function ID with count > 1 crashes sync.

### 1.5.4 Inngest client uniqueness

```bash
grep -rn "new Inngest(" --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next 2>/dev/null \
  > ./.diag/inngest-001/inngest_clients.txt
cat ./.diag/inngest-001/inngest_clients.txt
```

Multiple clients with the same `id` in the same process can cause registration conflicts.

## 1.6 Phase 3 — Live Reproduction With Full Logging

### 1.6.1 Start dev server with stderr capture

Terminal A:

```bash
INNGEST_LOG_LEVEL=debug INNGEST_DEV=1 NODE_ENV=development \
  $PM dev > ./.diag/inngest-001/app_stdout.log 2> ./.diag/inngest-001/app_stderr.log &
APP_PID=$!
echo "App PID: $APP_PID"

for i in $(seq 1 60); do
  if grep -q "Ready" ./.diag/inngest-001/app_stdout.log 2>/dev/null; then
    echo "App ready after ${i}s"
    break
  fi
  sleep 1
done
```

If no "Ready" in 60s, capture `app_stderr.log` immediately and abort to Phase 4 with Branch A as primary hypothesis.

### 1.6.2 Probe the Inngest endpoint

Terminal B:

```bash
{
  echo "=== GET /api/inngest ==="
  curl -i -s http://localhost:3000/api/inngest
  echo ""
  echo "=== PUT /api/inngest (no headers — naive probe) ==="
  curl -i -s -X PUT http://localhost:3000/api/inngest
  echo ""
  echo "=== PUT /api/inngest (with Inngest sync headers) ==="
  curl -i -s -X PUT http://localhost:3000/api/inngest \
    -H "Content-Type: application/json" \
    -H "x-inngest-server-kind: dev" \
    -H "x-inngest-sdk: js"
} > ./.diag/inngest-001/curl_probes.txt 2>&1
cat ./.diag/inngest-001/curl_probes.txt
```

The 500 response body may be a generic Next.js error page. The actual stack trace will be in `app_stderr.log` from terminal A. **Read both.**

### 1.6.3 Start Inngest dev server, capture its view

Terminal C:

```bash
INNGEST_CLI_VER=$(node -e "const p=require('./package.json');const all={...p.dependencies,...p.devDependencies};console.log(all['inngest-cli']||'latest')" 2>/dev/null || echo "latest")
echo "Using inngest-cli@$INNGEST_CLI_VER"

npx -y inngest-cli@$INNGEST_CLI_VER dev \
  -u http://localhost:3000/api/inngest \
  --no-discovery \
  > ./.diag/inngest-001/devserver_stdout.log \
  2> ./.diag/inngest-001/devserver_stderr.log &
DEVSERVER_PID=$!

sleep 30
```

### 1.6.4 Stop and consolidate

```bash
kill $APP_PID $DEVSERVER_PID 2>/dev/null
sleep 2
echo "=== app_stderr tail ==="
tail -100 ./.diag/inngest-001/app_stderr.log
echo "=== devserver_stderr tail ==="
tail -100 ./.diag/inngest-001/devserver_stderr.log
ls -la ./.diag/inngest-001/
```

## 1.7 Phase 4 — Root Cause Determination

| Branch                                                | Trigger                                                                                                                              | Action                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| A — Function module load failure                      | Phase 1.5.2 reports compile error in Inngest function file, OR Phase 1.6.4 `app_stderr.log` shows module load exception during PUT   | Report exact failing module, exact error, proposed fix. **Do NOT apply.**                                 |
| B — Duplicate function ID or duplicate Inngest client | Phase 1.5.3 shows function ID with count > 1, OR Phase 1.5.4 shows multiple `new Inngest()` with same id                             | Report the duplicate. **Do NOT apply fix.**                                                               |
| C — SDK version mismatch                              | Phase 1.4.3 shows inngest version bump in PR #52, AND Phase 1.6.4 `app_stderr.log` shows SDK API error referencing inngest internals | Report old vs new version, breaking change, recommendation. **Do NOT change versions.**                   |
| D — Environment misconfiguration                      | Phase 1.4.4 shows `INNGEST_DEV` UNSET or wrong base URL, AND Phase 1.6.2 PUT returns 200 with empty registration                     | Report missing/wrong env var. Recommend `INNGEST_DEV=1` in `.env.local`. **Report only — do NOT modify.** |
| E — Node version incompatibility                      | Phase 0 Node major below SDK minimum, AND Phase 1.6.4 `app_stderr.log` shows SyntaxError/ReferenceError on built-ins                 | Report mismatch. Recommend version. **Do NOT change Node.**                                               |
| F — None of the above                                 | All phases pass with no anomaly                                                                                                      | Report inconclusive with full evidence bundle. Do not invent a hypothesis.                                |

## 1.8 Reporting Format (append to `docs/agents/workflow/CODEX_REPORT_LOG.md`)

```
## DIAG-INNGEST-001 — <YYYY-MM-DD HH:MM> UTC

**Branch determined:** <A | B | C | D | E | F>
**HEAD verified:** <SHA>
**Package manager:** <pnpm | yarn | npm>
**Node version actual:** <vX.Y.Z>
**Node version declared:** <vX.Y.Z | none>
**Inngest SDK version:** <semver>
**Next version:** <semver>
**INNGEST_DEV env:** <SET | UNSET>
**INNGEST_BASE_URL env:** <SET=<host> | UNSET>

**Phase 1 findings:** <one paragraph>
**Phase 2 findings:** <one paragraph; list any failing imports, duplicate IDs, multiple clients>
**Phase 3 findings:** <one paragraph; include exact stderr excerpt of root error, max 10 lines>

**Root cause:** <one paragraph>
**Proposed fix:** <bullet list — code, env, version. NO code applied.>
**Evidence bundle:** ./.diag/inngest-001/ (X files, Y bytes total)

**CEO action requested:** <approve fix | request more info | escalate>
```

## 1.9 What Codex Must NOT Do

- Do not edit any file under `lib/`, `app/`, `pages/`, `supabase/`, or `inngest/`.
- Do not edit `.env.local`, `.env`, or any environment file.
- Do not run any smoke against the non-production Supabase project.
- Do not push to `feat/sprint-002b-priority-routes` or any PR branch.
- Do not change `package.json`, `pnpm-lock.yaml`, `yarn.lock`, or `package-lock.json`.
- Do not run `pnpm update`, `npm update`, `yarn upgrade`, or `--no-frozen-lockfile` install.
- Do not change Node version via nvm.
- If any phase uncovers data that suggests a quick fix, stop and report. The CEO decides whether to apply it.

---

# Part 2 — Documentation Sync PR Content

**Target file:** `docs/agents/workflow/SPRINT-002B_STATUS.md`
**PR title:** `docs: sync SPRINT-002B status with smoke attempts 2-4 and current Inngest blocker`
**Reason:** Status file currently describes only smoke retry attempt 1. Attempts 2, 3, 4 are documented only in `docs/project/POST_V30_HISTORY.md` and `docs/agents/workflow/CHAT_TRANSITION_LOG.md`. New chats reading the bootstrap order land on stale primary status.
**Scope:** documentation sync only. No code, no contract, no fixture, no smoke change.

## 2.1 Section to add (after existing Attempt 1 block, before "Next Steps" or equivalent footer)

```markdown
## Smoke Retry Attempts (Updated 2026-05-05)

| Attempt | Head       | Outcome                                                                                                                                                                                                                                                                            | Failure layer                                  |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1       | `18cabf1a` | Reached product code. `police_report` fell back to broad `police` (missing `report_or_filing_date`). `boarding_pass` failed (missing `flight_date`). Pass 1 stayed `in_progress`.                                                                                                  | Product (extraction contract gaps in fixtures) |
| 2       | n/a        | Stopped at preflight. `supabase/.temp/project-ref` pointed to forbidden production project.                                                                                                                                                                                        | Environment (CLI ref)                          |
| 3       | n/a        | Stopped at Phase A. `claim_form.synthetic.pdf` (intended B2 skip/defer fixture) was missing locally. `other_misc.synthetic.pdf` was authorized as TASK-SPECTIX-001 broad=`other` control fixture.                                                                                  | Environment (missing fixture)                  |
| 4       | `86bec00`  | Created claim `SMOKE-002B-RETRY-20260505200822`. Uploaded 9 documents. Fired 9 `claim/document.uploaded` events. **Local Inngest function registration failed** (`PUT /api/inngest 500`, `POST /fn/register 404`). `process-document` never ran. All 9 documents stayed `pending`. | Environment (local Inngest registration)       |

## Current Blocker

Local Inngest function registration failure on PR #52 head `86bec00`. This is **not** a known SPRINT-002B product-code failure. The extraction contracts in `lib/extraction-contracts.ts` were not weakened during attempt 4 (per PR body, file unchanged after smoke-regression fix).

**Diagnostic spec issued:** `DIAG-INNGEST-001`.

## Active Gates

- No PR #52 merge approved until: (a) fresh non-production smoke succeeds on current head, AND (b) CEO separately approves merge.
- No SPRINT-003A work begins until PR #52 is merged.
- No new product PR opened until DIAG-INNGEST-001 root cause is determined and the local Inngest blocker is resolved.

## Anti-Patterns Triggered By Attempts 2-4

- ANTI-PATTERN #6 (run smoke without CLI ref verification) — triggered in attempt 2. Mitigation: mandatory CLI project-ref check before any smoke mutation.
- ANTI-PATTERN #7 (run smoke without dev server health check) — triggered in attempt 4. Mitigation: smoke prompt must verify local app and Inngest dev server reachable, `/api/inngest` registration succeeds, and Inngest function registration returns successful response before any document upload.
```

## 2.2 Footer update (replace existing version footer)

```markdown
---

**Version:** SPRINT-002B_STATUS v1.1 — 05/05/2026
**Previous:** v1.0 — 04/05/2026 (covered attempt 1 only)
**Change in v1.1:** added smoke attempts 2-4, current blocker, anti-patterns triggered, active gates restatement
```

## 2.3 What this PR does NOT touch

- No change to any code under `lib/`, `app/`, `supabase/`, or `inngest/`.
- No change to extraction contracts, prompts, or fixtures.
- No change to PR #52 itself.
- No change to `docs/DECISIONS.md` (D-019 remains canonical and unchanged).
- No change to `docs/project/POST_V30_HISTORY.md` (already accurate).

---

# Part 3 — CEO GPT Review Checklist

## 3.1 Diagnostic spec review (Part 1 above)

- [ ] Spec explicitly forbids product-code, env-file, package-version changes, smoke runs, and pushes to PR #52 branch (sections 1.2 + 1.9).
- [ ] Spec does not pre-commit to a fix. Every Phase 4 branch ends with "Do NOT apply."
- [ ] Six branches covered (A load fail, B dup ID/client, C SDK mismatch, D env, E Node, F inconclusive).
- [ ] Package manager detected at runtime (Phase 0), not hardcoded.
- [ ] No dependency on `jq` (replaced with `node -e`).
- [ ] inngest-cli version pinned to whatever is in `package.json`, with `latest` fallback.
- [ ] Stack trace location correctly identified (Next.js dev server stderr, not HTTP response body).
- [ ] Evidence path is project-relative and gitignored, not `/tmp`.
- [ ] Both naive `curl PUT` and Inngest-headers `curl PUT` captured for comparison.
- [ ] Report template includes branch determination, version data, env data, phase findings, root cause, proposed fix, evidence bundle path, and explicit "CEO action requested" field.

### Risks to flag

- **Risk:** Phase 1.6.1 starts dev server in background and waits up to 60s for "Ready". If the app crashes before Ready, the spec correctly handles this by aborting to Phase 4 Branch A.
- **Risk:** bash `&` background pattern assumes Unix-like shell. If Codex runs on Windows without WSL, spec breaks. **Mitigation:** if shell is not bash/zsh, report environment and stop before Phase 3.
- **Risk:** Phase 1.4.1 forces checkout to `86bec00`. If working tree dirty, spec stops and reports — handled.

## 3.2 Documentation sync PR review (Part 2 above)

- [ ] Pure documentation sync. No code, no contract, no fixture, no smoke change.
- [ ] Does not modify PR #52 itself.
- [ ] Does not modify `docs/DECISIONS.md` or `docs/project/POST_V30_HISTORY.md`.
- [ ] Smoke attempt 1-4 outcomes match `POST_V30_HISTORY.md`.
- [ ] Anti-pattern numbering matches `docs/project/ANTI_PATTERNS.md` (#6 CLI ref, #7 dev server health).

### Assumptions to verify before merge

- **Assumption A:** `SPRINT-002B_STATUS.md` has a version footer with `v1.0`. If no version footer exists, the PR description must say "added version footer for the first time" rather than "bumped from v1.0 to v1.1."
- **Assumption B:** the section heading "Smoke Retry Attempts" does not already exist. If it exists with only attempt 1, the PR replaces it rather than appends.

**Verification needed:** open `SPRINT-002B_STATUS.md` on main and confirm both before merging.

## 3.3 Authorization decisions required from CEO

1. **DIAG-INNGEST-001 execution:** authorize Codex to run all four phases on a clean working tree. **Required: yes/no.**
2. **Status sync PR:** authorize Codex or human author to open the documentation sync PR. **Required: yes/no.**
3. **Branch D pre-authorization:** if diagnosis lands on Branch D (env var missing), authorize Codex to apply the `INNGEST_DEV=1` fix to `.env.local` without a follow-up turn. **Recommended: defer.** Even Branch D should produce a report before any change, because the "fix" might mask a deeper issue (e.g., why was `INNGEST_DEV` ever unset on a working tree).

## 3.4 Open questions to user before Codex starts

1. Is the local Next.js app running on `localhost:3000`, or has the project changed the port?
2. App Router (`app/api/inngest/route.ts`) or Pages Router (`pages/api/inngest.ts`)? (Spec searches both — informational only.)
3. Existing `.diag/` or `.diagnostic/` directory convention in the repo? (Spec uses `./.diag/inngest-001/` — adjust if conflicts.)
4. Is `inngest-cli` listed in `package.json`? If not, spec falls back to `latest`.

Codex can auto-detect 1, 2, 4 in Phase 0/2. Only question 3 (directory collision) requires human answer upfront.

---

## Version

DIAG-INNGEST-001-PACKAGE v1.0 — 05/05/2026
**Consolidates:** previously separate files `codex_diag_inngest_05_05_v1_1.md`, `pr_sprint002b_status_sync_05_05_v1_0.md`, `ceo_review_checklist_diag_inngest_05_05_v1_0.md`. Those are superseded by this single file.
