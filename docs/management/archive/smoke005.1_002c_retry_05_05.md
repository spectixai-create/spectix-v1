# SMOKE-002B-RETRY-005 — Env Fix + Preflight + Smoke Retry Attempt 5

**Date:** 05/05/2026
**Identifier:** SMOKE-002B-RETRY-005
**Predecessor:** DIAG-INNGEST-001 (Branch D confirmed — `INNGEST_BASE_URL` in `.env.local` misconfigured to app port 3000)
**Target branch:** PR #52 head `86bec00`
**Goal:** unblock PR #52 by removing the env misconfiguration, enforcing a hard preflight gate, then running smoke retry attempt 5 against the non-production Supabase project.

---

## 1. Authorization

This spec covers three discrete actions, each requiring explicit CEO approval:

| Action                                                       | Risk                                                                     | Reversible                                     | Approval                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------- |
| 1. Remove `INNGEST_BASE_URL` line from `.env.local`          | Low — local-only file, gitignored, change affects only Codex's local dev | Yes (re-add line)                              | **Required**                                    |
| 2. Run preflight checks (no mutations)                       | None — read-only                                                         | N/A                                            | Inherited from DIAG-INNGEST-001                 |
| 3. Run smoke retry attempt 5 against non-production Supabase | Medium — creates claim, uploads documents, fires events                  | Partially (claim row stays, can be cleaned up) | **Required separately, after preflight passes** |

Codex must stop after action 1 + 2, report preflight result, and **wait for explicit approval before action 3**.

---

## 2. Action 1 — Env Fix

### 2.1 Pre-fix capture

```bash
mkdir -p ./.diag/smoke-005
# Capture the current Inngest-related lines from .env.local (redacted values)
grep -E '^(INNGEST_|NEXT_PUBLIC_INNGEST_)' .env.local | sed -E 's/=.*/=<redacted>/' > ./.diag/smoke-005/env_before.txt
cat ./.diag/smoke-005/env_before.txt
```

### 2.2 Apply fix

Remove the line starting with `INNGEST_BASE_URL=` from `.env.local`. Do not modify any other line.

```bash
# Cross-platform safe in-place delete
node -e "const fs=require('fs');const f='.env.local';const lines=fs.readFileSync(f,'utf8').split(/\r?\n/);const out=lines.filter(l=>!/^INNGEST_BASE_URL=/.test(l)).join('\n');fs.writeFileSync(f,out);"
```

### 2.3 Post-fix verification

```bash
grep -E '^(INNGEST_|NEXT_PUBLIC_INNGEST_)' .env.local | sed -E 's/=.*/=<redacted>/' > ./.diag/smoke-005/env_after.txt
diff ./.diag/smoke-005/env_before.txt ./.diag/smoke-005/env_after.txt || true
```

Expected diff: exactly one line removed (`INNGEST_BASE_URL=<redacted>`). No other changes.

### 2.4 Constraints

- Do not edit `.env`, `.env.production`, or any other env file.
- Do not commit `.env.local` (it should already be gitignored — verify with `git check-ignore .env.local`).
- If the diff shows more than one line changed, abort and revert the file to its pre-fix state.

---

## 3. Action 2 — Preflight (Hard Gate Before Smoke)

This implements the missing check that allowed attempt 4 to proceed despite Inngest registration failure. Every step must pass before any claim creation, upload, or event firing.

### 3.1 Supabase project ref check (ANTI-PATTERN #6 mitigation)

```bash
ACTIVE_REF=$(cat supabase/.temp/project-ref 2>/dev/null || echo "MISSING")
FORBIDDEN_REF="fcqporzsihuqtfohqtxs"
EXPECTED_NONPROD_REF="aozbgunwhafabfmuwjol"

if [ "$ACTIVE_REF" = "$FORBIDDEN_REF" ]; then
  echo "ABORT: project-ref points to forbidden production project"
  exit 1
fi
if [ "$ACTIVE_REF" != "$EXPECTED_NONPROD_REF" ]; then
  echo "ABORT: project-ref does not match expected non-production ref"
  echo "Active: $ACTIVE_REF"
  echo "Expected: $EXPECTED_NONPROD_REF"
  exit 1
fi
echo "OK: project-ref verified non-production"
```

### 3.2 Required smoke fixtures present

```bash
FIXTURE_DIR="<replace with project's actual fixture path>"
REQUIRED=("claim_form.synthetic.pdf" "police_report.synthetic.pdf" "boarding_pass.synthetic.pdf" "medical_invoice.synthetic.pdf" "hotel_invoice.synthetic.pdf" "receipt.synthetic.pdf" "id_document.synthetic.pdf" "bank_statement.synthetic.pdf" "other_misc.synthetic.pdf")
MISSING=()
for f in "${REQUIRED[@]}"; do
  if [ ! -f "$FIXTURE_DIR/$f" ]; then MISSING+=("$f"); fi
done
if [ ${#MISSING[@]} -gt 0 ]; then
  echo "ABORT: missing fixtures: ${MISSING[@]}"
  exit 1
fi
echo "OK: all 9 fixtures present"
```

**Note:** Codex must replace `<replace with project's actual fixture path>` with the actual path (probably `tests/fixtures/synthetic/` or similar — check repo).

### 3.3 Inngest dev server reachable on 8288

```bash
# Start Inngest dev server in background
npx -y inngest-cli@latest dev --no-discovery > ./.diag/smoke-005/devserver.log 2>&1 &
DEVSERVER_PID=$!
sleep 10

# Probe
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:8288/health 2>/dev/null | grep -q "200\|404"; then
  echo "ABORT: Inngest dev server not reachable on :8288"
  kill $DEVSERVER_PID 2>/dev/null
  exit 1
fi
echo "OK: Inngest dev server reachable"
```

### 3.4 Next.js app reachable AND `/api/inngest` healthy

```bash
INNGEST_DEV=1 NODE_ENV=development pnpm dev > ./.diag/smoke-005/app.log 2>&1 &
APP_PID=$!

for i in $(seq 1 60); do
  if grep -q "Ready" ./.diag/smoke-005/app.log 2>/dev/null; then break; fi
  sleep 1
done

# GET probe
GET_RESP=$(curl -s http://localhost:3000/api/inngest)
echo "$GET_RESP" > ./.diag/smoke-005/get_inngest.json

# Verify expected fields
echo "$GET_RESP" | node -e "
const d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
if (d.functionsFound !== 2 && d.function_count !== 2) {
  console.error('ABORT: expected 2 functions, got', d);
  process.exit(1);
}
if (d.mode?.type !== 'dev' && d.mode !== 'dev') {
  console.error('ABORT: not in dev mode, got', d.mode);
  process.exit(1);
}
console.log('OK: GET /api/inngest healthy');
" || { kill $APP_PID $DEVSERVER_PID 2>/dev/null; exit 1; }
```

### 3.5 Function registration succeeds (the actual ANTI-PATTERN #7 check)

```bash
# Trigger sync via Inngest dev server's discovery
curl -s -X POST http://localhost:8288/dev/apps -H "Content-Type: application/json" -d '{"url":"http://localhost:3000/api/inngest"}' > ./.diag/smoke-005/sync_response.json
sleep 5

# Confirm no /fn/register 404 in app log
if grep -E "POST /fn/register .* 404" ./.diag/smoke-005/app.log; then
  echo "ABORT: /fn/register 404 detected — env fix did not resolve registration loop"
  kill $APP_PID $DEVSERVER_PID 2>/dev/null
  exit 1
fi

# Confirm no PUT /api/inngest 500
if grep -E "PUT /api/inngest .* 500" ./.diag/smoke-005/app.log; then
  echo "ABORT: PUT /api/inngest 500 detected"
  kill $APP_PID $DEVSERVER_PID 2>/dev/null
  exit 1
fi

# Confirm app synced from dev server perspective
if ! grep -q "synced" ./.diag/smoke-005/devserver.log; then
  echo "WARN: 'synced' not found in dev server log — manual verification required"
fi

echo "OK: function registration succeeded"
```

### 3.6 Preflight report (mandatory pause point)

After all five checks pass, **stop the dev servers, write a brief preflight report, and wait for CEO approval before action 3**:

```bash
kill $APP_PID $DEVSERVER_PID 2>/dev/null
sleep 2

cat > ./.diag/smoke-005/PREFLIGHT_REPORT.md <<EOF
# SMOKE-002B-RETRY-005 Preflight Report

- Date: $(date -u +"%Y-%m-%d %H:%M UTC")
- Project ref: <PASS|FAIL>
- Fixtures: <PASS|FAIL>
- Inngest dev server: <PASS|FAIL>
- Next /api/inngest health: <PASS|FAIL>
- Function registration: <PASS|FAIL>

**All five checks passed: <YES|NO>**
**Awaiting CEO approval to proceed to smoke run.**
EOF
cat ./.diag/smoke-005/PREFLIGHT_REPORT.md
```

Append the same report to `docs/agents/workflow/CODEX_REPORT_LOG.md` and stop.

---

## 4. Action 3 — Smoke Run (Only After CEO Approval)

This step runs the actual smoke test. Codex must NOT proceed until receiving explicit approval after the preflight report.

### 4.1 Pre-conditions to verify before each smoke run

- Preflight report exists at `./.diag/smoke-005/PREFLIGHT_REPORT.md` with all PASS.
- CEO approval message in the chat: explicit string "approved: SMOKE-002B-RETRY-005 action 3".
- Both dev servers (Inngest 8288 + Next 3000) restarted fresh (kill any leftovers, restart per 3.3 + 3.4).

### 4.2 Smoke run

Use the existing smoke runner used in attempt 4 (whatever script lives in the repo for this — Codex must locate it; do not invent). Pass these constants:

- Claim ID prefix: `SMOKE-002B-005`
- Fixture set: same 9 documents as attempt 4
- Expected outcome: all 9 documents reach terminal status (success or blocking failure), pass 1 transitions out of `in_progress` per SPRINT-001 lifecycle fix.

### 4.3 Smoke result classification

Possible outcomes:

| Outcome                                                                 | Interpretation                                                        | Next step                                                                           |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| All 9 terminal, no blocking failures, pass 1 = `completed`              | SPRINT-002B works end-to-end                                          | Report success. CEO decides on PR #52 merge.                                        |
| All 9 terminal, some blocking failures, pass 1 = `failed_with_blocking` | Pass lifecycle works; specific extraction route(s) need investigation | Report which route(s) failed and why. **Do NOT loosen contracts.** Anti-pattern #5. |
| Some documents stuck `pending` or `in_progress`                         | Inngest still not processing despite preflight pass                   | Stop. Re-run DIAG-INNGEST-001 with new symptoms.                                    |
| Pass 1 stays `in_progress` after all docs terminal                      | Pass lifecycle bug (SPRINT-001 regression)                            | Stop. New diagnostic spec required.                                                 |
| Other failure mode                                                      | Unknown                                                               | Stop. Report. Do not retry without CEO direction.                                   |

### 4.4 Reporting

Append full result to `docs/agents/workflow/CODEX_REPORT_LOG.md` using the existing smoke report template. Include claim ID, document statuses, pass states, evidence bundle path.

---

## 5. What Codex Must NOT Do

- Do not edit any file under `lib/`, `app/`, `pages/`, `supabase/`, or `inngest/`.
- Do not edit any env file other than the single `INNGEST_BASE_URL` line removal in `.env.local`.
- Do not change `package.json`, lockfiles, or run version updates.
- Do not push to PR #52 branch.
- Do not skip the preflight report pause.
- Do not interpret "preflight passed" as authorization to proceed to smoke. Approval must be explicit and post-preflight.
- Do not weaken extraction contracts, prompts, or fixtures if the smoke surfaces extraction failures (anti-pattern #5).
- Do not retry the smoke without CEO direction if outcome is anything other than full success.

---

## 6. Version

SMOKE-002B-RETRY-005 v1.0 — 05/05/2026
**Predecessor:** DIAG-INNGEST-001 v1.1 (root cause: Branch D — INNGEST_BASE_URL misconfiguration)
**Anti-patterns enforced:** #5 (no contract loosening), #6 (CLI ref check), #7 (dev server health + registration check)
