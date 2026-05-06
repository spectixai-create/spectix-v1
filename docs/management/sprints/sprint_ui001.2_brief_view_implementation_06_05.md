# SPRINT-UI-001 — Adjuster Brief View MVP (Implementation Spec, iteration 2)

**Date:** 06/05/2026
**Identifier:** SPRINT-UI-001
**Iteration:** 2
**Type:** Implementation. Frontend (Next.js pages + components) + backend API routes + migration.
**Predecessor designs:**

- `design001.10_state_machine_06_05.md` (state machine v1.9, signed-off)
- `design002.7_synthesis_decomposition_06_05.md` (synthesis decomposition v1.6, signed-off)
- `design003.4_ui_requirements_06_05.md` (UI requirements iteration 4, signed-off)

**Predecessor sprints:**

- SPRINT-002C (PR #60 merged) — claim_validations.
- SPRINT-002D (PR #65 merged) — errored + cost cap.
- SPRINT-003A (PR #66 merged) — synthesis MVP. main HEAD: `d830e6e0ef56cce7be38d0d65c2aa3b4d1e02fbe`.

**Status:** Implementation-ready. CEO GPT to dispatch Codex handoff.
**Estimated:** ~1 week Codex.
**Predecessor iteration:** sprint_ui001.1 — superseded after CEO GPT review identified 3 blockers (reject status, audit_log.cost_usd, auth.users FK).

---

## Changes From Iteration 1

| #   | Blocker                                                                                                                                       | Fix                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Spec used `claims.status = 'rejected'`. Main schema uses `rejected_no_coverage`, no `rejected`.                                               | Reject action transitions claim to `rejected_no_coverage` (the canonical rejected terminal state). State guards updated. |
| 2   | Spec inserted `cost_usd` into `audit_log`. Column does not exist.                                                                             | Removed `cost_usd` from all audit_log INSERTs. If cost tracking needed for audit, store inside `details` jsonb.          |
| 3   | Spec used FK to `auth.users` on `question_dispatches.dispatched_by` / `last_dispatched_by`. Existing DB convention avoids FK to `auth.users`. | Removed FK references. Columns are `uuid NOT NULL` only. Validation enforced server-side via auth context.               |

---

## Preconditions

**HARD GATE:** Codex must NOT begin implementation until ALL of:

1. design001.10 + design002.7 + design003.4 sign-off complete (Architect approved).
2. PR #66 (SPRINT-003A) merged to main. Verify via:
   ```bash
   git log --oneline | grep -E "SPRINT-003A|d830e6e"
   ```
3. CEO authorization to start.
4. **Existing main UI inspection:** Codex inspects existing app structure:
   ```bash
   ls -la app/ pages/ src/app/ src/pages/ 2>/dev/null
   grep -r "next-intl\|i18next\|react-intl" package.json
   grep -r "shadcn\|@/components/ui" src/ app/ 2>/dev/null
   grep -r "dir=\"rtl\"\|direction.*rtl" app/ src/ 2>/dev/null
   ```
   Document findings in PR description:
   - App router or pages router?
   - i18n library present? (TBD: use existing OR hardcode Hebrew strings)
   - shadcn/ui already installed? Component path?
   - RTL setup present? (TBD: add `dir="rtl"` to root layout if absent)
5. **Auth pattern verification:**
   ```bash
   grep -r "createServerClient\|getUser\|auth\.\|middleware" middleware.ts app/ src/ 2>/dev/null
   ```
   Document auth check pattern for API routes.
6. **synthesis_results table verification:** Codex confirms PR #66 merged with table + RPC `replace_synthesis_results` active.
7. **claim_validations Form B verification:** confirms `pass_number int` column (not `pass_id`).
8. **claims status vocabulary verification (NEW):**

   ```sql
   SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'claims'::regclass AND contype = 'c' AND conname LIKE '%status%';
   ```

   Confirm:
   - `rejected_no_coverage` exists (canonical rejected state).
   - `reviewed` exists.
   - `cost_capped`, `errored` exist (added by SPRINT-002D).

   If any of these absent, escalate to CEO. **Spec assumes `rejected_no_coverage` (not `rejected`)** based on CEO GPT verification of `docs/DB_SCHEMA.md`.

9. **audit_log columns verification (NEW):**

   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'audit_log';
   ```

   Confirm columns: `action`, `actor_type`, `actor_id`, `details` (jsonb).
   **`cost_usd` column does NOT exist** — spec must NOT insert into `cost_usd`. If cost tracking is later required, embed in `details` jsonb.

   Document audit_log full schema in PR description.

10. **auth.users FK convention verification (NEW):**
    ```sql
    SELECT
      conname,
      conrelid::regclass AS table_name,
      pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE confrelid = 'auth.users'::regclass;
    ```
    Document existing tables that DO reference `auth.users`. Spec default: `question_dispatches.dispatched_by` / `last_dispatched_by` are `uuid NOT NULL` WITHOUT FK to auth.users. If Codex finds existing tables successfully reference auth.users in the project's permission model, Codex MAY add FK and document. Default: NO FK.

If any precondition fails → return precondition status, no code, no PR.

---

## Architecture

### Pages

```
src/app/claims/page.tsx               ← list view
src/app/claims/[id]/page.tsx          ← brief view (server component, fetches data)
src/app/claims/[id]/_components/      ← client components
  ClaimHeader.tsx
  ActionPanel.tsx
  FindingsTab.tsx
  DocumentsTab.tsx
  ValidationTab.tsx
  AuditTab.tsx
  PassTimeline.tsx
  QuestionsList.tsx
src/app/login/page.tsx                ← existing
```

(If repo uses `pages/` router, adjust paths accordingly. Codex confirms in pre-flight.)

### API Routes (7 routes)

```
src/app/api/claims/route.ts           ← GET list
src/app/api/claims/[id]/route.ts      ← GET single (full detail)
src/app/api/claims/[id]/approve/route.ts
src/app/api/claims/[id]/reject/route.ts
src/app/api/claims/[id]/escalate/route.ts
src/app/api/claims/[id]/unescalate/route.ts
src/app/api/claims/[id]/request-info/route.ts
```

Each route:

- Auth gate: reject 401 if not authenticated.
- Validation gate: reject 400 if body invalid (zod schema).
- State guard: reject 409 if claim status incompatible with action.
- DB transaction (where required).
- Audit log entry.
- Return updated claim snapshot.

### Data Flow

```
Page mount → server component fetches /api/claims/[id]
   ↓
Returns: claim row + passes[] + claim_validations[] + synthesis_results[] (with question_dispatches LEFT JOIN) + audit_log[]
   ↓
Renders header + tabs
   ↓
User action (e.g., Send Selected questions)
   ↓
POST /api/claims/[id]/request-info { question_ids, edited_texts }
   ↓
Server: UPSERT question_dispatches, guarded UPDATE claim status, audit_log
   ↓
Returns: updated claim snapshot
   ↓
Frontend re-renders with new state
```

No real-time. Manual refresh button calls page re-mount via Next.js router.refresh().

---

## Migration `0008_ui_support.sql`

```sql
BEGIN;

-- Adjuster escalation flag
ALTER TABLE claims ADD COLUMN escalated_to_investigator boolean NOT NULL DEFAULT false;

-- Question dispatches table (per design002.7)
-- Note: dispatched_by / last_dispatched_by are uuid NOT NULL but NO FK to auth.users
-- (per existing DB convention to avoid auth.users schema permission restrictions).
-- Server-side validation via auth context enforces the value comes from authenticated user.
CREATE TABLE question_dispatches (
  question_id text NOT NULL,
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  first_dispatched_at timestamptz NOT NULL,
  last_dispatched_at timestamptz NOT NULL,
  dispatched_by uuid NOT NULL,
  last_dispatched_by uuid NOT NULL,
  edited_text text,
  PRIMARY KEY (claim_id, question_id)
);
CREATE INDEX idx_question_dispatches_claim ON question_dispatches(claim_id);

-- Codex pre-flight: verify whether FK to auth.users is feasible in current schema permission model.
-- Default: NO FK (per DB convention). If Codex finds existing tables that DO reference auth.users
-- and the project's Supabase schema permits it, Codex MAY add FK and document in PR.
-- Default behavior: no FK.

-- audit_log.action CHECK: Codex inspects in pre-flight.
-- If constrained, ALTER to include 5 new actions:
--   adjuster_decision_approve, adjuster_decision_reject,
--   adjuster_request_info, adjuster_escalate, adjuster_unescalate
-- Codex documents before/after state in PR.

COMMIT;

-- down:
BEGIN;
DROP INDEX IF EXISTS idx_question_dispatches_claim;
DROP TABLE IF EXISTS question_dispatches;
ALTER TABLE claims DROP COLUMN escalated_to_investigator;
-- Restore audit_log.action CHECK if changed.
COMMIT;
```

---

## API Route Specs

### `GET /api/claims`

**Query params:** `status` (filter), `sort` (score|age|id), `search`, `page`, `pageSize=25`.

**Response:**

```typescript
{
  claims: Array<{
    id: string;
    claim_number: string;
    claimant_name: string;
    status: ClaimStatus;
    readiness_score: number | null; // from synthesis_results latest pass_number=3
    top_finding_category: string | null;
    days_open: number;
    escalated_to_investigator: boolean;
    created_at: string;
    updated_at: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
}
```

**Auth:** authenticated user only.

### `GET /api/claims/[id]`

**Response: full snapshot.**

```typescript
{
  claim: { id, claim_number, claimant_name, status, escalated_to_investigator, created_at, updated_at, ... };
  passes: Array<{ pass_number, status, started_at, completed_at, llm_calls_made, cost_usd }>;
  claim_validations: Array<{ layer_id, status, payload, created_at }>;
  synthesis_results: {
    findings: Array<Finding>;
    questions: Array<Question & { is_dispatched: boolean; last_dispatched_at?: string; edited_text?: string }>;
    readiness_score: ReadinessScore | null;
  };
  audit_log: Array<AuditLogEntry>;
}
```

Single round-trip. Server composes via parallel queries + LEFT JOIN per design002.7 query pattern.

**Auth:** authenticated user only.

### `POST /api/claims/[id]/approve`

**Body:** none.

**State guard:** `WHERE status = 'ready'`. Reject 409 if not in ready.

**Effects in transaction:**

```sql
UPDATE claims SET status = 'reviewed', updated_at = now() WHERE id = $1 AND status = 'ready';
INSERT INTO audit_log (action, actor_type, actor_id, details)
  VALUES ('adjuster_decision_approve', 'human', $adjuster_id, jsonb_build_object('claim_id', $1));
```

**Response:** updated claim snapshot.

### `POST /api/claims/[id]/reject`

**Body:** `{ reason: string }` (required, ≤500 chars).

**State guard:** `WHERE status IN ('ready', 'reviewed', 'pending_info', 'errored', 'cost_capped')`. Excludes already-terminal `rejected_no_coverage`. Allows admin-triggered rejection from multiple states.

**Effects:**

```sql
UPDATE claims SET status = 'rejected_no_coverage', updated_at = now()
  WHERE id = $1 AND status IN ('ready', 'reviewed', 'pending_info', 'errored', 'cost_capped');
INSERT INTO audit_log (action, actor_type, actor_id, details)
  VALUES ('adjuster_decision_reject', 'human', $adjuster_id,
    jsonb_build_object('claim_id', $1, 'reason', $reason));
```

**Note:** uses `rejected_no_coverage` (the canonical rejected terminal state in main schema). The state machine spec design001.10 lists both `rejected` and `rejected_no_coverage` as terminal states; current main has only `rejected_no_coverage` per CEO GPT verification of DB_SCHEMA. If future migration adds `rejected`, this route updates accordingly.

### `POST /api/claims/[id]/escalate`

**Body:** none.

**State guard:** `WHERE status NOT IN ('rejected_no_coverage')` (any non-terminal state).

**Effects:**

```sql
UPDATE claims SET escalated_to_investigator = true, updated_at = now()
  WHERE id = $1 AND status NOT IN ('rejected_no_coverage');
INSERT INTO audit_log (action, actor_type, actor_id, details)
  VALUES ('adjuster_escalate', 'human', $adjuster_id, jsonb_build_object('claim_id', $1));
```

### `POST /api/claims/[id]/unescalate`

**Body:** none.

**State guard:** `WHERE escalated_to_investigator = true`.

**Effects:**

```sql
UPDATE claims SET escalated_to_investigator = false, updated_at = now()
  WHERE id = $1 AND escalated_to_investigator = true;
INSERT INTO audit_log (action, actor_type, actor_id, details)
  VALUES ('adjuster_unescalate', 'human', $adjuster_id, jsonb_build_object('claim_id', $1));
```

### `POST /api/claims/[id]/request-info`

**Body:** `{ question_ids: string[], edited_texts?: Record<string,string> }` (validated zod).

**State guard:** idempotent — `WHERE status IN ('ready', 'pending_info')`.

**Effects in transaction (per design002.7 persistence pattern):**

```typescript
await db.transaction(async (tx) => {
  const dispatchedAt = new Date();

  for (const question_id of question_ids) {
    await tx
      .insert(question_dispatches)
      .values({
        claim_id,
        question_id,
        first_dispatched_at: dispatchedAt,
        last_dispatched_at: dispatchedAt,
        dispatched_by: adjuster_id,
        last_dispatched_by: adjuster_id,
        edited_text: edited_texts?.[question_id] ?? null,
      })
      .onConflictDoUpdate({
        target: [question_dispatches.claim_id, question_dispatches.question_id],
        set: {
          last_dispatched_at: dispatchedAt,
          last_dispatched_by: adjuster_id,
          edited_text:
            edited_texts?.[question_id] ?? sql`question_dispatches.edited_text`,
        },
      });
  }

  // Idempotent state transition
  await tx
    .update(claims)
    .set({ status: 'pending_info', updated_at: dispatchedAt })
    .where(
      and(
        eq(claims.id, claim_id),
        inArray(claims.status, ['ready', 'pending_info']),
      ),
    );

  await tx.insert(audit_log).values({
    action: 'adjuster_request_info',
    actor_type: 'human',
    actor_id: adjuster_id,
    details: { claim_id, question_ids, edited_texts },
  });
});
```

**No email/SMS** sent in MVP. The dispatch is logged in question_dispatches; actual claimant notification is SPRINT-UI-002.

---

## Component Specs

### ClaimHeader

```
┌─────────────────────────────────────────────────────┐
│ [Status banner: PENDING INFO]    Score: 80          │
│ תביעה #SMOKE-003A-...   שם המבוטח   ימים פתוחה: 3   │
│                                                      │
│ [Approve] [Request Info] [Escalate] [Reject]        │
│           [escalated badge if flag=true]             │
└─────────────────────────────────────────────────────┘
```

Status banner color:

- `intake`, `processing` → blue.
- `ready` → green.
- `pending_info` → yellow.
- `reviewed` → grey.
- `cost_capped`, `errored` → red.
- `rejected_no_coverage` → dark red. (Per main schema; if `rejected` is added by future migration, treat both same.)

Score band: 0-40 red, 41-70 yellow, 71-100 green.

Action buttons enabled per status:
| Status | Approve | Request Info | Escalate | Reject |
|---|---|---|---|---|
| ready | ✓ | ✓ | ✓ | ✓ |
| pending_info | — | ✓ (re-dispatch) | ✓ | ✓ |
| reviewed | — | — | ✓ | ✓ |
| errored | — | — | ✓ | ✓ |
| cost_capped | — | — | ✓ | ✓ |
| rejected_no_coverage | — | — | — | — |

`Unescalate` button shown only when `escalated_to_investigator = true`. Replaces Escalate button.

### FindingsTab

Default: collapsed table.

```
┌─────────────────────────────────────────────────────┐
│ סיכום: 1 חמור · 1 בינוני · 0 נמוך                   │
├─────────────────────────────────────────────────────┤
│ [HIGH] [inconsistency] אי-התאמה בשם...   [11.1] (3) │
│ [MED]  [anomaly]       סכום חריג בקבלה   [11.3] (1) │
└─────────────────────────────────────────────────────┘
```

Click row → expand inline:

```
│ [HIGH] [inconsistency] אי-התאמה בשם בין מסמכים [11.1] │
│ ───────────────────────────────────────────────────  │
│ תיאור: השם "ישראל ישראלי" במסמך X מול "ישראל...      │
│ Evidence:                                             │
│   - id_document.pdf · field: full_name                │
│   - claim_form.pdf · field: claimant_name             │
│   - police_report.pdf · field: complainant_name       │
│ Source layer: 11.1 (name_match)                       │
└─────────────────────────────────────────────────────┘
```

Click document name → opens PDF in new tab via signed Supabase URL (1-hour TTL).

### QuestionsList

```
┌─────────────────────────────────────────────────────┐
│ שאלות הבהרה (2)                                      │
├─────────────────────────────────────────────────────┤
│ ☑ השם {a} מופיע במסמך X והשם {b}...      [confirmation] │
│   נשלח: 06/05 14:23 לפני 2 שעות                      │
│ ☐ סכום 850 EUR חריג ביחס...              [text]      │
│                                                      │
│ [שלח שאלות נבחרות]                                   │
└─────────────────────────────────────────────────────┘
```

Default checked: questions where `is_dispatched=false`.
Default unchecked: questions where `is_dispatched=true` (greyed).
Click checkbox to toggle. Click question text to inline-edit (V2 — defer to TECH_DEBT entry if complex).

Send button calls `POST /request-info`.

### PassTimeline

Text-only:

```
Pass 1 (חילוץ): $0.04, 38 שניות, 9 מסמכים עובדו.
Pass 2 (אימות): $0.02, 15 שניות, 3 שכבות (11.1, 11.2, 11.3) הסתיימו.
Pass 3 (סינתזה): $0.00, 3 שניות, 2 ממצאים + 2 שאלות + ציון 80.

סה"כ: $0.06, 56 שניות.
```

### DocumentsTab

```
┌─────────────────────────────────────────────────────┐
│ filename             | type    | subtype     | status │
├─────────────────────────────────────────────────────┤
│ id_document.pdf      | id      | id_card     | ✓     │
│ claim_form.pdf       | claim   | claim_form  | ✓     │
│ ...                                                  │
└─────────────────────────────────────────────────────┘
```

Click filename → opens PDF in new tab.

### ValidationTab

3 cards:

```
┌─────────────────────────────────────┐
│ Layer 11.1 — name_match     ✓ done  │
│ ─────────────────────────────────── │
│ 3 שמות נבדקו, 1 mismatch, 2 exact   │
│ ראה evidence ב-finding F1            │
└─────────────────────────────────────┘
```

### AuditTab

Table sorted by created_at DESC.

```
┌─────────────────────────────────────────────────────┐
│ time       | action                  | actor       │
├─────────────────────────────────────────────────────┤
│ 14:25      | claim_synthesis_complet | system      │
│ 14:24      | claim_synthesis_started | system      │
│ 14:23      | claim_validation_complet| system      │
│ ...                                                  │
└─────────────────────────────────────────────────────┘
```

Click row → expand details JSON.

---

## File Layout

```
src/
  app/
    claims/
      page.tsx                              ← list (server component + client filters)
      [id]/
        page.tsx                            ← brief (server component + client tabs)
        _components/
          ClaimHeader.tsx
          ActionPanel.tsx
          FindingsTab.tsx
          DocumentsTab.tsx
          ValidationTab.tsx
          AuditTab.tsx
          PassTimeline.tsx
          QuestionsList.tsx
    api/
      claims/
        route.ts                            ← GET list
        [id]/
          route.ts                          ← GET detail
          approve/route.ts
          reject/route.ts
          escalate/route.ts
          unescalate/route.ts
          request-info/route.ts
  lib/
    ui/
      claim-detail-query.ts                 ← composes the 5-source snapshot query
      status-badges.ts                      ← status → color/label mapping
      strings-he.ts                         ← Hebrew UI strings (per design003.4 i18n table)

supabase/
  migrations/
    0008_ui_support.sql

docs/
  TECH_DEBT.md                              ← append 11A (admin retry UI)
                                            ← append: question text inline edit (if deferred)
  management/sprints/
    sprint_ui001.1_brief_view_implementation_06_05.md  ← THIS spec, included in PR

tests/
  unit/api/
    claims-list.test.ts                     ← filters/sort/pagination
    claim-detail.test.ts                    ← 5-source snapshot composition
    approve.test.ts                         ← guarded UPDATE + audit
    reject.test.ts                          ← reason required
    escalate.test.ts                        ← flag set
    unescalate.test.ts                      ← flag clear
    request-info.test.ts                    ← UPSERT + idempotent state guard

  integration/api/
    claim-actions-flow.test.ts              ← full happy path
    request-info-redispatch.test.ts         ← second dispatch updates last_*, preserves first_*
    request-info-idempotent.test.ts         ← already-pending_info accepts re-dispatch

  e2e (optional, defer if complex):
    adjuster-approve-flow.spec.ts           ← Playwright: list → claim → approve
```

---

## Tests

**Unit:** ~10 API route tests covering all 7 routes + edge cases.

**Integration:** 3 tests:

1. Full flow: list → detail → approve → audit reflects.
2. Re-dispatch: second Request Info on same questions updates `last_*`, preserves `first_*`.
3. Idempotent: Request Info on pending_info claim works (no 409).

**E2E (optional):** 1 Playwright test covering happy path. Skip if existing repo has no Playwright setup; document as TECH_DEBT.

---

## Hebrew + RTL

- Root layout: add `dir="rtl"` if absent (Codex confirms in pre-flight).
- Tailwind RTL utilities: use existing pattern OR add `tailwindcss-rtl` plugin (TECH_DEBT if added).
- Strings: hardcode in `lib/ui/strings-he.ts` for MVP. TECH_DEBT entry: "Externalize UI strings to i18n config when 2+ languages needed."
- Date formatting: use `Intl.DateTimeFormat('he-IL')`.

---

## TECH_DEBT Entries to Add

```markdown
### TECH_DEBT 11A — Admin Retry Endpoint UI

**Current state (MVP):** `/api/admin/claims/:id/retry` endpoint exists per SPRINT-002D PR #65 with 403 auth fallback. UI does not surface retry button for `errored` claims.
**Trigger:** First production `errored` claim that needs admin recovery, OR design of admin RBAC (TECH_DEBT 11x).
**Action:** UI route + button + auth gate. Depends on RBAC pattern (11x).
**Owner:** CEO + Codex.
```

```markdown
### TECH_DEBT 11B — Question Text Inline Edit

**Current state (MVP):** if Codex defers inline edit per Decision 5 step 4, this entry tracks the deferred work.
**Trigger:** User feedback during pilot or demo that adjusters want to edit question text before sending.
**Action:** add textarea + save state in QuestionsList component; pass `edited_texts` map in request-info body (already supported by API).
**Owner:** CEO + Codex.
```

```markdown
### TECH_DEBT 11C — UI String i18n Externalization

**Current state (MVP):** Hebrew strings hardcoded in `lib/ui/strings-he.ts`.
**Trigger:** Need for English/Russian/Arabic adjuster interfaces (e.g., second-pilot insurer with multi-language staff).
**Action:** Migrate to `next-intl` or similar. Move strings to `messages/he.json`, `messages/en.json`, etc.
**Owner:** CEO + Codex.
```

(11A is mandatory per design003.4. 11B/11C optional, only if Codex defers.)

---

## Audit Log Entries

| Action                      | actor_type | details                                    |
| --------------------------- | ---------- | ------------------------------------------ |
| `adjuster_decision_approve` | `human`    | `{ claim_id }`                             |
| `adjuster_decision_reject`  | `human`    | `{ claim_id, reason }`                     |
| `adjuster_request_info`     | `human`    | `{ claim_id, question_ids, edited_texts }` |
| `adjuster_escalate`         | `human`    | `{ claim_id }`                             |
| `adjuster_unescalate`       | `human`    | `{ claim_id }`                             |

`actor_id` = adjuster's user_id (from auth context).

**Note:** `audit_log` does NOT have `cost_usd` column per current main schema. Adjuster actions have no cost. If future actions need cost tracking, embed in `details` jsonb (e.g., `details: { claim_id, cost_usd: 0.05 }`).

---

## Hard Rules

- All adjuster-facing text in Hebrew. RTL layout.
- No new framework / ORM / state management library.
- No `localStorage` / `sessionStorage` in components (per Claude artifact constraints — but this is full Next.js app, so server state is OK).
- No real-time subscriptions. Manual refresh only.
- No email/SMS in this sprint. Request Info is logged-only.
- No admin retry UI (TECH_DEBT 11A).
- No bulk actions, exports, analytics, mobile-responsive in MVP.
- Migration follows D-015 (up + down + reversible).
- All 7 routes use existing auth middleware pattern.

---

## Done Criteria

- [ ] All 10 preconditions verified by Codex with documented findings.
- [ ] Migration `0008_ui_support.sql` applied + reversible (no FK to auth.users by default).
- [ ] All 5 pages implemented (list, brief with 4 tabs, login existing).
- [ ] All 7 API routes implemented per spec (using `rejected_no_coverage` status, no `cost_usd` in audit_log).
- [ ] All 8 client components per spec.
- [ ] Hebrew strings + RTL working.
- [ ] All ~10 unit tests passing.
- [ ] All 3 integration tests passing.
- [ ] TECH_DEBT 11A added to `docs/TECH_DEBT.md` (verify-before-add).
- [ ] sprint_ui001.2 spec file added to `docs/management/sprints/`.
- [ ] PR description documents:
  - App router or pages router used.
  - i18n approach (existing OR hardcoded strings).
  - shadcn/ui component path.
  - RTL setup (existing OR added to root).
  - audit_log full schema (verify cost_usd not used).
  - claims status CHECK constraint values (verify rejected_no_coverage used).
  - auth.users FK decision (default: no FK).
  - Sample screenshots of all 4 tabs (server-rendered).
- [ ] CEO approves merge.
- [ ] Smoke gate (separate, CEO authorizes).
- [ ] Post-smoke: DEMO READY per design003.4 acceptance criteria #1-#10.

---

## Smoke Scope (after merge, CEO authorizes)

1. **List view:** open `/claims`, see 5+ claims from prior smokes (003A baseline + recycle + 3a/3b/3c subcases).
2. **Filter/sort:** filter by `pending_info`, sort by score desc, search by claim_number — verify expected results.
3. **Open ready claim:** approve → verify state transition + audit. Re-fetch shows `reviewed`.
4. **Open pending_info claim:** see questions section, verify `is_dispatched` indicator. Click 1 question (uncheck), Send Selected → verify question_dispatches row, audit log, claim still pending_info.
5. **Open errored claim (manually create one via admin tooling):** see error banner. No retry button.
6. **Escalate flow:** click Escalate on a ready claim → flag visible. Click Unescalate → flag cleared. Both audited.
7. **Reject:** with reason, verify state + audit.
8. **Document viewer:** click document → opens PDF in new tab.
9. **Audit tab:** verify chronology of all actions taken in #3-#7.
10. **Demo criterion #10:** end-to-end happy path < 60 seconds.

PASS = all 10 scenarios work as expected. FAIL on any → diagnostic + fix forward.

---

## Out of Scope (SPRINT-UI-001)

- Claimant-facing UI (SPRINT-UI-002).
- Email/SMS dispatch.
- Admin retry UI (TECH_DEBT 11A).
- Cost cap raise UI.
- Manual override (compensation E.1-E.4).
- Investigator queue (V2).
- Multi-tenant adjuster permissions.
- Accessibility audit.
- Mobile-responsive.
- Analytics dashboard.
- Bulk actions / exports.
- Search beyond ID/name.
- Reports.

---

## Version

sprint_ui001 — iteration 2 — 06/05/2026
**Filename:** `sprint_ui001.2_brief_view_implementation_06_05.md`
**Status:** Implementation-ready. Pending CEO GPT to write Codex handoff.
**Predecessor:** sprint_ui001.1 — superseded after CEO GPT review identified 3 blockers.
**Next step:** CEO GPT writes Codex handoff with defensive verify-before-add for TECH_DEBT 11A + audit_log columns + claims status vocabulary + auth.users FK decision.
