**Sections §3.1, §7, §14.2 SUPERSEDED by design004.3. Other sections current.**

# SPRINT-DESIGN-004 — Claimant Question Response Flow (iteration 2)

**Date:** 06/05/2026
**Identifier:** SPRINT-DESIGN-004
**Iteration:** 2 (full spec)
**Type:** Design only.
**Predecessors:** design001.11 (state machine, concurrent), design002.8 (synthesis, concurrent), design003.4 (adjuster UI), design004.1 (skeleton).

**Status:** Joint sign-off pending with design001.11 + design002.8.

---

## Changes From Iteration 1 (skeleton)

| #   | Change                                                                                   | Trigger                                                                                 |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | All 8 decisions resolved with concrete implementation                                    | User input on D1/D2/D8 + defaults on D3-D7                                              |
| 2   | Magic link schema: `revoked_at` column added (separate from `expires_at`)                | Adjuster regenerate-link must invalidate prior token without polluting expiry semantics |
| 3   | Magic link schema: token stored as SHA-256 hash, not plaintext                           | Storage security                                                                        |
| 4   | 3 RPCs defined: `save_draft`, `link_document_to_question`, `finalize_question_responses` | RLS deny-all-by-default; route handlers cannot raw INSERT under service_role            |
| 5   | Inngest `waitForEvent` pattern for email→SMS fallback                                    | Avoids ad-hoc timeout logic; uses Inngest primitives                                    |
| 6   | Pre-check on claim_form contact info (NULL OR empty string)                              | Adjuster cannot dispatch if no contact info; UI banner                                  |
| 7   | Migration 0009 starts with DO block verifying Migration 0008 applied                     | UI-001 migration is hard prerequisite                                                   |
| 8   | `actor_type='claimant'` audit semantics specified (concurrent with design001.11)         | Audit traceability for non-authenticated actor                                          |
| 9   | Bearer auth disclosure section added (§8.1)                                              | Honest documentation of MVP security trade-offs                                         |
| 10  | Sign-off gate verifications (claim_form schema check + Codex grep) added to §14          | Pre-sprint validation, not pre-implementation                                           |

---

## Purpose

(Same as iteration 1.)

SPRINT-UI-002 closes the claimant-facing gap: builds the path that lets claimants receive notifications, view dispatched questions, respond per question type, and trigger the re-cycle.

**Per design003.4 timeline gate:** SPRINT-UI-002 must dispatch within **2 weeks of SPRINT-UI-001 merge (PR #68)**, before first pilot LOI.

---

## Resolved Decisions

| #   | Decision             | Resolution                                                                               | Source             |
| --- | -------------------- | ---------------------------------------------------------------------------------------- | ------------------ |
| D1  | Notification channel | **Email primary (Resend) + SMS fallback (Twilio).** WhatsApp deferred to V2.             | User 06/05/2026    |
| D2  | Authentication       | **Magic link, 24h TTL, single-use, hashed storage, `revoked_at` support.**               | User 06/05/2026    |
| D3  | URL structure        | **`app.spectix.com/c/[claim_id]?token=xxx`** — single page, all questions on one screen. | Default (skeleton) |
| D4  | Renderers per type   | **text / document / confirmation / correction**, per skeleton.                           | Default (skeleton) |
| D5  | Multi-question       | **All on one page, scrollable.**                                                         | Default (skeleton) |
| D6  | Partial submission   | **Server-side autosave** to `question_response_drafts`.                                  | Default (skeleton) |
| D7  | Document upload path | **Same Storage bucket** + `documents.response_to_question_id` linking.                   | Default (skeleton) |
| D8  | Re-cycle trigger     | **Manual "I'm done" button.** Claimant explicitly says complete.                         | User 06/05/2026    |

---

## User Flows

### 3.1 — Adjuster (UI-001 + dispatch additions)

1. Claim in status `pending_info` (post-synthesis with `kind='question'` rows OR adjuster Request Info action). Brief view (UI-001) lists questions with `not_dispatched` indicator (no `notification_sent_at` on `question_dispatches`).
2. Adjuster clicks **"שלח שאלות לתובע"** (bulk dispatch button).
3. Backend transaction in `/api/claims/[id]/dispatch-questions`:
   - **Pre-check** (handles NULL and empty string):
     ```typescript
     const email = (claim.claim_form?.claimant_email ?? '').trim();
     const phone = (claim.claim_form?.claimant_phone ?? '').trim();
     if (!email && !phone) {
       return NextResponse.json(
         { error: 'missing_contact_info' },
         { status: 422 },
       );
     }
     ```
   - Generate magic link: 32-byte random base64url → 43-char token. Store SHA-256 hash + `claim_id` + `expires_at = now() + interval '24 hours'` + `created_by = adjuster_id`.
   - `question_dispatches`: UPSERT for each selected `question_id` (existing pattern from design002.7) with `notification_channel = email ? 'email' : 'sms'` and `notification_attempts = 0`.
   - Fire Inngest event `claim/dispatch-questions` with `{claim_id, dispatch_id, claimant_email, claimant_phone, magic_link_url}`. Inngest function handles provider calls (§7.3).
4. Brief view auto-refreshes → indicator changes to `dispatched HH:MM` (uses `last_dispatched_at`, per design002.8 query).

### 3.2 — Adjuster regenerate-link

Adjuster sees expired or otherwise invalid token state. Endpoint `/api/claims/[id]/regenerate-link`:

1. Find latest active link (`used_at IS NULL AND revoked_at IS NULL` and not expired) → if exists, set `revoked_at = now()`.
2. Generate new magic link (same flow as 3.1 step 3 second half).
3. Fire Inngest re-dispatch event.
4. Audit `claimant_link_regenerated` action (actor_type='human', actor_id=adjuster_id).

### 3.3 — Claimant

1. Receives email (or SMS fallback) with link.
2. Clicks → `app.spectix.com/c/[claim_id]?token=xxx`.
3. Server hashes token (SHA-256), queries `claimant_magic_links` with **broad query** (no filter on `used_at`/`revoked_at`/`expires_at` — needs to differentiate states):
   ```sql
   SELECT used_at, revoked_at, expires_at FROM claimant_magic_links
   WHERE token_hash = $1 AND claim_id = $2;
   ```
   Application logic determines state:
   ```typescript
   if (!row) state = 'invalid';
   else if (row.revoked_at) state = 'revoked';
   else if (row.used_at) state = 'used';
   else if (row.expires_at < now()) state = 'expired';
   else state = 'valid';
   ```
   Audit `claimant_link_opened` with `{claim_id, valid: boolean, state}`.
4. Invalid/expired/used/revoked → error page (per state). For `expired`, CTA "Ask insurer for a new link" (no self-serve regenerate to prevent abuse).
5. Valid → render question list page. Each question row uses renderer per `expected_answer_type` (D4).
6. Claimant types/uploads → autosave on `blur` event (debounced 500ms) → POST `/api/c/[claim_id]/draft` → RPC `save_draft` (atomic, FOR UPDATE on token row to serialize with revoke).
7. Claimant clicks **"סיימתי, שלח"**:
   - Disabled until all dispatched questions have a draft (UI shows progress N/M).
   - On click → POST `/api/c/[claim_id]/finalize` → RPC `finalize_question_responses`:
     - Validate token (atomic, `FOR UPDATE`).
     - Validate `claim.status = 'pending_info'`.
     - INSERT (or UPSERT on conflict) into `question_responses` from `question_response_drafts`.
     - DELETE drafts.
     - Mark token `used_at = now()`.
     - UPDATE `claims.status = 'processing'`.
     - INSERT audit `claimant_response_submitted` (actor_type='claimant', actor_id=claim_id, details `{claim_id, question_count}`).
   - On RPC success: route handler fires Inngest event `claim/responses.submitted` with `{claim_id}` to trigger re-cycle.
8. Claimant sees `/c/[claim_id]/done` confirmation page.

### 3.4 — Re-cycle (system)

Inngest function `claim-recycle` listens for `claim/responses.submitted`:

1. (claim already in `processing` from finalize RPC.)
2. Fire `claim/extraction.completed` event with metadata indicating "no new documents" if no `documents` rows uploaded via `/upload` flow. (If documents WERE uploaded with `response_to_question_id` set, re-extraction processes them per existing pattern.)
3. Pipeline proceeds: validation (UPSERT `pass_number=2`) → synthesis (DELETE+INSERT `pass_number=3`).
4. Synthesis prompt receives `question_responses` per design002.8 Decision 6 query.
5. Final `claim.status` per design001.11 B.1 (`ready` / `pending_info` / `rejected_no_coverage`).

---

## Data Model — Migration 0009

### 4.1 — Pre-flight: Migration 0008 ordering check

```sql
-- First statement of Migration 0009.
-- UI-001 added question_dispatches via Migration 0008. We ALTER it here.
-- Fail loud if 0008 not applied (e.g., wrong env or out-of-order).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'question_dispatches'
  ) THEN
    RAISE EXCEPTION 'Migration 0008 (UI-001) must be applied before Migration 0009';
  END IF;
END $$;
```

### 4.2 — New tables

```sql
-- 4.2.1 — Autosave drafts (ephemeral, cleared on finalize)
CREATE TABLE question_response_drafts (
  question_id text NOT NULL,
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  response_value jsonb NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (claim_id, question_id)
);
-- No FK to question_dispatches: drafts may exist briefly before adjuster dispatch (edge case).
-- Application layer enforces "only render drafts for dispatched questions".

-- 4.2.2 — Final responses (durable)
CREATE TABLE question_responses (
  question_id text NOT NULL,
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  response_value jsonb NOT NULL,
  responded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (claim_id, question_id)
);
-- PK (claim_id, question_id) — UPSERT semantics on re-submit.
-- If claimant re-answers same question_id in cycle 2, UPDATEs response_value.
-- Historical values traceable via audit_log claimant_response_submitted entries (no content, but timestamps + question_count).
CREATE INDEX idx_question_responses_claim ON question_responses(claim_id);

-- 4.2.3 — Magic link tokens
CREATE TABLE claimant_magic_links (
  token_hash text PRIMARY KEY,                                 -- SHA-256 hex of token; token itself NEVER stored
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  revoked_at timestamptz NULL,                                 -- adjuster regenerate-link sets this; separate from expiry
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)           -- adjuster who triggered dispatch
);
-- INDEX for adjuster's "active link" queries (regenerate flow):
CREATE INDEX idx_claimant_magic_links_active
  ON claimant_magic_links(claim_id)
  WHERE used_at IS NULL AND revoked_at IS NULL;
-- The GET /c/[claim_id] route does NOT use this index — it queries broadly to differentiate states.
```

### 4.3 — Existing tables modified

```sql
-- 4.3.1 — documents: link uploads to questions
ALTER TABLE documents ADD COLUMN response_to_question_id text NULL;
CREATE INDEX idx_documents_response_question
  ON documents(claim_id, response_to_question_id)
  WHERE response_to_question_id IS NOT NULL;

-- 4.3.2 — audit_log: extend actor_type enum (per design001.11 K.7)
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_type_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_actor_type_check
  CHECK (actor_type IN ('system', 'human', 'claimant'));

-- 4.3.3 — question_dispatches: notification metadata (per design002.8)
ALTER TABLE question_dispatches
  ADD COLUMN notification_sent_at timestamptz NULL,
  ADD COLUMN notification_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN notification_last_error text NULL,
  ADD COLUMN notification_channel text NULL
    CHECK (notification_channel IN ('email', 'sms', 'both'));
```

### 4.4 — RPCs (SECURITY DEFINER)

#### 4.4.1 — `save_draft` — atomic autosave

```sql
CREATE OR REPLACE FUNCTION save_draft(
  p_token_hash text,
  p_claim_id uuid,
  p_question_id text,
  p_response_value jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link_row claimant_magic_links%ROWTYPE;
BEGIN
  -- FOR UPDATE serializes with adjuster regenerate-link (design001.11 D.5)
  SELECT * INTO v_link_row FROM claimant_magic_links
    WHERE token_hash = p_token_hash AND claim_id = p_claim_id
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'token_not_found' USING ERRCODE = 'P0001'; END IF;
  IF v_link_row.used_at IS NOT NULL THEN RAISE EXCEPTION 'token_used' USING ERRCODE = 'P0002'; END IF;
  IF v_link_row.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'token_revoked' USING ERRCODE = 'P0003'; END IF;
  IF v_link_row.expires_at < now() THEN RAISE EXCEPTION 'token_expired' USING ERRCODE = 'P0004'; END IF;

  INSERT INTO question_response_drafts (claim_id, question_id, response_value, saved_at)
    VALUES (p_claim_id, p_question_id, p_response_value, now())
  ON CONFLICT (claim_id, question_id) DO UPDATE
    SET response_value = EXCLUDED.response_value, saved_at = now();

  RETURN jsonb_build_object('saved', true, 'saved_at', now());
END;
$$;
```

#### 4.4.2 — `link_document_to_question` — atomic linking after upload

```sql
CREATE OR REPLACE FUNCTION link_document_to_question(
  p_token_hash text,
  p_claim_id uuid,
  p_document_id uuid,
  p_question_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link_row claimant_magic_links%ROWTYPE;
BEGIN
  SELECT * INTO v_link_row FROM claimant_magic_links
    WHERE token_hash = p_token_hash AND claim_id = p_claim_id
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'token_not_found'; END IF;
  IF v_link_row.used_at IS NOT NULL THEN RAISE EXCEPTION 'token_used'; END IF;
  IF v_link_row.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'token_revoked'; END IF;
  IF v_link_row.expires_at < now() THEN RAISE EXCEPTION 'token_expired'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM documents WHERE id = p_document_id AND claim_id = p_claim_id
  ) THEN
    RAISE EXCEPTION 'document_not_in_claim';
  END IF;

  UPDATE documents SET response_to_question_id = p_question_id
    WHERE id = p_document_id AND claim_id = p_claim_id;

  RETURN jsonb_build_object('linked', true);
END;
$$;
```

#### 4.4.3 — `finalize_question_responses` — atomic submit + state transition

```sql
CREATE OR REPLACE FUNCTION finalize_question_responses(
  p_token_hash text,
  p_claim_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link_row claimant_magic_links%ROWTYPE;
  v_claim_status text;
  v_inserted int;
BEGIN
  SELECT * INTO v_link_row FROM claimant_magic_links
    WHERE token_hash = p_token_hash AND claim_id = p_claim_id
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'token_not_found'; END IF;
  IF v_link_row.used_at IS NOT NULL THEN RAISE EXCEPTION 'token_used'; END IF;
  IF v_link_row.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'token_revoked'; END IF;
  IF v_link_row.expires_at < now() THEN RAISE EXCEPTION 'token_expired'; END IF;

  SELECT status INTO v_claim_status FROM claims WHERE id = p_claim_id FOR UPDATE;
  IF v_claim_status != 'pending_info' THEN
    RAISE EXCEPTION 'claim_state_invalid' USING DETAIL = v_claim_status;
  END IF;

  -- Promote drafts to responses (UPSERT pattern on re-submit edge case)
  INSERT INTO question_responses (claim_id, question_id, response_value, responded_at)
  SELECT claim_id, question_id, response_value, now()
    FROM question_response_drafts WHERE claim_id = p_claim_id
  ON CONFLICT (claim_id, question_id) DO UPDATE
    SET response_value = EXCLUDED.response_value, responded_at = now();
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  DELETE FROM question_response_drafts WHERE claim_id = p_claim_id;
  UPDATE claimant_magic_links SET used_at = now() WHERE token_hash = p_token_hash;
  UPDATE claims SET status = 'processing', updated_at = now() WHERE id = p_claim_id;

  -- Audit (no response content per §8.5)
  INSERT INTO audit_log (action, actor_type, actor_id, details)
    VALUES ('claimant_response_submitted', 'claimant', p_claim_id::text,
            jsonb_build_object('claim_id', p_claim_id, 'question_count', v_inserted));

  RETURN jsonb_build_object('inserted', v_inserted);
END;
$$;
```

### 4.5 — RLS

All 3 new tables (`question_response_drafts`, `question_responses`, `claimant_magic_links`): RLS ON, deny-all-by-default.

Access pattern: route handlers use Supabase anon client + RPC calls only. RPCs run as `SECURITY DEFINER` and validate token internally. No raw `INSERT`/`UPDATE`/`DELETE` from route handlers under service_role on these tables. This eliminates the entire class of "RLS bypass via service_role" risks.

---

## API Endpoints

### 5.1 — Adjuster-facing (authenticated)

| Method | Path                                  | Purpose                                                                                    |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| POST   | `/api/claims/[id]/dispatch-questions` | Bulk dispatch (per §3.1). Pre-check contact info, generate magic link, fire Inngest event. |
| POST   | `/api/claims/[id]/regenerate-link`    | Per §3.2. Revoke prior, generate new, re-dispatch.                                         |

### 5.2 — Claimant-facing (public, rate-limited, RPC-based)

| Method | Path                         | Purpose                         | Implementation                                                                                     |
| ------ | ---------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| GET    | `/c/[claim_id]?token=xxx`    | Landing page; validate + render | Route handler hashes token, broad query on `claimant_magic_links`, renders state-appropriate page. |
| POST   | `/api/c/[claim_id]/draft`    | Autosave                        | RPC `save_draft`                                                                                   |
| POST   | `/api/c/[claim_id]/upload`   | Document upload                 | Storage upload (anon client with restricted bucket policy), then RPC `link_document_to_question`   |
| POST   | `/api/c/[claim_id]/finalize` | Submit + trigger re-cycle       | RPC `finalize_question_responses` + fire Inngest `claim/responses.submitted`                       |

### 5.3 — Webhooks

| Method | Path                   | Purpose                | Auth                                               |
| ------ | ---------------------- | ---------------------- | -------------------------------------------------- |
| POST   | `/api/webhooks/resend` | Email status callbacks | HMAC-SHA256 signature verification (Resend secret) |
| POST   | `/api/webhooks/twilio` | SMS status callbacks   | Twilio signature verification                      |

Webhook handlers translate provider events to Inngest events (`resend/email.received`, `twilio/sms.received`) with `dispatch_id` in payload — used by `claimant-notify` Inngest function for `waitForEvent` (§7.3).

---

## UI Components

### 6.1 — Public claimant page (`/c/[claim_id]`)

Layout (RTL, mobile-first):

```
┌─ Header: Spectix logo | תביעה #C-2026-XXXX | שלום, [first_name]
├─ Banner: "ה-link תקף עד 07/05 14:30"
├─ Section per question (all on one page, scrollable):
│  Q1: <question_text> + context tooltip
│       <Renderer per expected_answer_type>
│       Status: "נשמר" / "שומר..." / "שגיאה"
│  ...
│  Qn: ...
└─ Footer: [סיימתי, שלח] disabled until N/M complete
```

`<head>` includes `<meta name="referrer" content="no-referrer">` to prevent token leak via Referer header on outbound clicks.

### 6.2 — Renderers per expected_answer_type

| Type           | Renderer                                                   | Validation                                                                                                         |
| -------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `text`         | textarea, RTL, max 1000 chars (per skeleton), char counter | required, min 1 char                                                                                               |
| `document`     | file picker with `capture="environment"` (mobile camera)   | min 1 file; max 10 files; max 10MB each; MIME whitelist pdf/jpeg/png/heic/webp; magic-byte verify in route handler |
| `confirmation` | radio "כן" / "לא" + optional comment textarea              | one selected                                                                                                       |
| `correction`   | original value (read-only) above + textarea below          | corrected value != original                                                                                        |

### 6.3 — Tech stack — RTL note

Stack: Next.js + shadcn/ui + Tailwind (per design003.4). RTL on `/c/*` requires:

- Tailwind `dir="rtl"` on `/c/*` root layout.
- shadcn/ui Sheet/Dialog/Toast: reuse RTL patches established in UI-001 (PR #68).
- Renderer components: explicit RTL alignment + icon flipping verification (per renderer, in smoke test).

### 6.4 — Adjuster brief view additions (UI-001 patch within SPRINT-UI-002)

Per question row in brief view:

- Badge: `not_dispatched` | `dispatched HH:MM` | `responded HH:MM` | `expired` | `revoked`
- Conditional button: "regenerate link" if state in {`expired`, `revoked`}
- Top-of-section: `[שלח שאלות לתובע]` bulk dispatch button (only enabled if at least one question in `not_dispatched`)
- Banner: red `"לא ניתן לשלוח — חסרים פרטי קשר"` if `claim_form` lacks both email and phone

---

## Notification Infrastructure

### 7.1 — Resend (email primary)

- Endpoint: `POST https://api.resend.com/emails`
- From: `noreply@spectix.com` (DKIM/SPF/DMARC required in DNS — vov pre-sprint setup)
- Subject: `תביעה {claim_number} — דרושה התייחסותך`
- Body: HTML + plaintext fallback. Hebrew. Includes `first_name`, `claim_number`, question count, CTA link, 24h validity.
- Tier: free 3K/month (sufficient for pilot scale ~50/month). TECH_DEBT 11N tracks upgrade trigger.

### 7.2 — Twilio (SMS fallback)

- Endpoint: `POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json`
- From: Israel number (rented, ~$5/month)
- Body: `Spectix: תביעה {claim_number} — יש {N} שאלות. {full_link} (24h)`. Hebrew Unicode; multi-segment if needed (short link service deferred — TECH_DEBT 11L).

### 7.3 — Inngest function `claimant-notify` (waitForEvent pattern)

```typescript
export const claimantNotify = inngest.createFunction(
  { id: 'claimant-notify' },
  { event: 'claim/dispatch-questions' },
  async ({ event, step }) => {
    const { claim_id, dispatch_id, claimant_email, claimant_phone, magic_link_url } = event.data;

    // Path A: email-first
    if (claimant_email) {
      await step.run('send-email', () =>
        resendSend({ to: claimant_email, dispatch_id, magic_link_url, ... }));

      // Wait for webhook OR 30min timeout. Match ensures isolation across concurrent dispatches.
      const webhookEvent = await step.waitForEvent(`resend.${dispatch_id}`, {
        event: 'resend/email.received',
        match: 'data.dispatch_id',
        timeout: '30m',
      });

      const shouldFallback = !webhookEvent
        || ['bounced', 'complaint'].includes(webhookEvent.data.status);

      if (shouldFallback && claimant_phone) {
        await step.run('send-sms-fallback', () =>
          twilioSend({ to: claimant_phone, dispatch_id, magic_link_url, ... }));
      }
    } else if (claimant_phone) {
      // Path B: no email → SMS direct
      await step.run('send-sms-direct', () =>
        twilioSend({ to: claimant_phone, dispatch_id, magic_link_url, ... }));
    }
    // Path C: both empty — pre-check at dispatch endpoint blocks. Never reaches here.
  }
);
```

**Inngest match isolation:** `match: 'data.dispatch_id'` is exact equality. Concurrent dispatches for different `dispatch_id` values are isolated — function waiting for `dispatch_id_A` won't fire on event with `dispatch_id_B`.

**Late bounce after delivered:** if Resend reports `delivered` first then `bounced` later (rare), `waitForEvent` already returned on `delivered`. Late `bounced` event is recorded in `notification_last_error` via webhook handler but does **not** trigger SMS retry. Adjuster sees red badge, can manually regenerate. Acceptable trade-off; TECH_DEBT 11P tracks upgrade if bounce rate > 5%.

### 7.4 — Cost estimate

- Email: $0 (Resend free tier).
- SMS fallback: ~$0.05 × ~5% bounce rate = ~$0.0025/dispatch average.
- 100 dispatches/month = ~$0.25/month. Negligible.

---

## Security

### 8.1 — Bearer auth disclosure

Magic link is bearer authentication. Anyone holding the link can act on the claimant's behalf. There is no second factor in MVP.

- **Risks:** claimant forwards link; attacker intercepts email/SMS; logs leak via referrer.
- **Mitigations built in:** SHA-256 hashed storage, single-use (`used_at`), 24h TTL, claim_id binding, referrer policy meta tag.
- **NOT in MVP:** SMS code 2FA, IP geo-restriction, session pinning.
- **Future trigger (TECH_DEBT 11O):** add SMS code as second factor if pilot insurer demands enhanced auth (GDPR-adjacent or claim-value-tier requirement).

This pattern aligns with industry passwordless auth (Supabase Magic Links, Auth0 Passwordless). Acceptable for MVP. **Documented explicitly to avoid implicit security guarantees.**

### 8.2 — Token storage and format

- Format: 32-byte URL-safe random → base64url encode → 43 chars (per skeleton, kept).
- Storage: SHA-256 hash only. Plaintext token exists only in the email/SMS body sent to claimant.
- Single-use: `used_at` set on finalize.
- Revocation: `revoked_at` (separate from `expires_at` — adjuster regenerate is a different semantic).
- Claim binding: `claim_id` column; route validates URL claim_id matches row.
- Referrer policy: `<meta name="referrer" content="no-referrer">` on `/c/*` to prevent leak via outbound link clicks.

### 8.3 — Rate limiting

| Route                                   | Limit  | Scope          |
| --------------------------------------- | ------ | -------------- |
| `GET /c/[claim_id]`                     | 30/min | per IP         |
| `POST /api/c/[claim_id]/draft`          | 60/min | per token_hash |
| `POST /api/c/[claim_id]/upload`         | 10/min | per token_hash |
| `POST /api/c/[claim_id]/finalize`       | 3/min  | per token_hash |
| `POST /api/claims/[id]/regenerate-link` | 1/hour | per claim_id   |

Exceeding → 429 + audit `claimant_token_invalid` with `attempted_endpoint`.

### 8.4 — Document upload

- MIME whitelist: pdf, jpeg, png, heic, webp.
- Magic-byte verification in route handler (defense against MIME spoofing).
- Max 10MB per file (matches intake).
- Storage path: `claim-documents/{claim_id}/claimant-responses/{question_id}/{filename}`.
- Virus scan: out of scope for MVP (TECH_DEBT 11J).

### 8.5 — PII

- Notification body (email/SMS): contains `claim_number` + `first_name` only. NO full name, NO medical details, NO amounts, NO question text.
- `audit_log` claimant entries: `details = {claim_id, question_count, ...}` — NEVER `response_value` or question text. Response content lives only in `question_responses` (RLS-protected).

### 8.6 — Webhook auth

- Resend: HMAC-SHA256 signature header verification with `RESEND_WEBHOOK_SECRET`.
- Twilio: standard Twilio signature verification with `TWILIO_AUTH_TOKEN`.
- Invalid → 401 + alert.

### 8.7 — ENV validation (production startup)

```typescript
// Run at boot, e.g., in instrumentation.ts
if (process.env.NODE_ENV === 'production') {
  if ('SKIP_NOTIFICATIONS' in process.env) {
    throw new Error(
      'SKIP_NOTIFICATIONS env var must NOT be set in production (any value)',
    );
  }
  for (const required of [
    'RESEND_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_FROM_NUMBER',
  ]) {
    if (!process.env[required])
      throw new Error(`Missing required env: ${required}`);
  }
}
```

`SKIP_NOTIFICATIONS` existence (any value) is the violation, not just `=== 'true'`. Prevents accidental misconfiguration leakage.

---

## Edge Cases

| Case                                        | Handling                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Token expired                               | State `expired`, error page, CTA "Ask insurer for new link"                                               |
| Token used (double-click)                   | State `used`, 410 message "Your responses were received"                                                  |
| Token revoked (adjuster regenerated)        | State `revoked`, 401 "Link was updated. Check your latest email/SMS."                                     |
| Token claim_id mismatch                     | State `invalid`, 403                                                                                      |
| Claim status not `pending_info` at finalize | RPC raises `claim_state_invalid`; route → 409 + audit                                                     |
| Claimant exits mid-form                     | Drafts persisted; returns with same link → resumes                                                        |
| Submit with un-answered question            | Disabled button; per-question warning surfaced in UI                                                      |
| Both providers fail                         | `notification_last_error` set; adjuster sees red badge; manual regenerate possible                        |
| Re-cycle emits identical question hash      | UPSERT on `question_responses` updates value with new claimant input (if re-answered) or leaves unchanged |
| Late delivered after SMS sent               | Both email + SMS arrive at claimant; acceptable, no rollback                                              |
| Late bounce after delivered                 | Logged in `notification_last_error`; no automatic SMS retry (TECH_DEBT 11P)                               |
| Missing contact info at dispatch            | 422 `missing_contact_info`; UI red banner; claim stays `pending_info`                                     |
| Concurrent autosave + adjuster regenerate   | `FOR UPDATE` lock in `save_draft` serializes; one wins, other gets `token_revoked` error                  |
| Document upload after token revoked         | RPC `link_document_to_question` returns `token_revoked`; orphaned file in Storage (cleanup TECH_DEBT 11Q) |

---

## Acceptance Criteria

### 10.1 — Adjuster path

- [ ] Brief view shows `not_dispatched` for new questions post-synthesis.
- [ ] Pre-check blocks dispatch when both email and phone are NULL or empty string; UI banner.
- [ ] Dispatch → email arrives at claimant within 5 seconds.
- [ ] Brief view updates to `dispatched HH:MM` within 10 seconds.
- [ ] Regenerate-link sets prior `revoked_at` and sends new email; old token returns `revoked` state.

### 10.2 — Claimant path

- [ ] `/c/[claim_id]?token=...` page loads in < 2 seconds.
- [ ] All 4 renderers (text, document, confirmation, correction) work and autosave.
- [ ] Document upload (PDF + JPG) succeeds; row in `documents` with correct `response_to_question_id`.
- [ ] Page refresh → drafts re-rendered correctly.
- [ ] "סיימתי, שלח" disabled until all questions complete.
- [ ] Submit → done page; claim transitions to `processing`.

### 10.3 — Re-cycle

- [ ] After finalize, `claim.status = 'processing'` within RPC return.
- [ ] Inngest `claim/responses.submitted` fires; pipeline runs (extraction-skip → validation → synthesis).
- [ ] Synthesis prompt receives `question_responses` per design002.8 query.
- [ ] Final state is `ready` / `pending_info` / `rejected_no_coverage` per synthesis output.

### 10.4 — Security

- [ ] Token expired → 401, state `expired`.
- [ ] Token used → 410, state `used`.
- [ ] Token revoked → 401, state `revoked`.
- [ ] Token claim_id mismatch → 403, state `invalid`.
- [ ] Rate limit 429 fires per scopes.
- [ ] Webhook with bad signature → 401.
- [ ] Production boot fails if `SKIP_NOTIFICATIONS` env var is set.
- [ ] Migration 0009 fails with explicit message if Migration 0008 not applied.

### 10.5 — Notification fallback

- [ ] Email sent first; SMS NOT sent if Resend webhook reports `delivered` within 30min.
- [ ] Bounce/complaint webhook → SMS sent within 30min.
- [ ] No email in claim_form → SMS direct (skip email).
- [ ] Both empty → dispatch fails 422.
- [ ] Late bounce after delivered → log only, no SMS retry.

---

## TECH_DEBT Entries

| ID             | Description                                                        | Trigger                                 |
| -------------- | ------------------------------------------------------------------ | --------------------------------------- |
| 11D (existing) | Notification provider selection — RESOLVED by D1 (Resend + Twilio) | resolved                                |
| 11E (existing) | WhatsApp V2 — UNCHANGED                                            | post-pilot, Meta Business verified      |
| 11F (existing) | Multi-language UI — UNCHANGED                                      | first non-Hebrew claimant               |
| 11J (NEW)      | Virus scanning on document upload (ClamAV/Cloudflare)              | pre-production hardening                |
| 11K (NEW)      | Multi-cycle response summarization in synthesis prompt             | claims with >2 cycles in pilot          |
| 11L (NEW)      | Short link service `s.spectix.com`                                 | >30% SMS multi-segment                  |
| 11M (NEW)      | Notification preference per claimant (email-only, sms-only, both)  | claimant feedback                       |
| 11N (NEW)      | Resend tier upgrade (>2K dispatches/month)                         | scale milestone                         |
| 11O (NEW)      | SMS code 2FA on magic link                                         | pilot insurer enhanced auth requirement |
| 11P (NEW)      | Late bounce auto-SMS retry                                         | bounce rate > 5%                        |
| 11Q (NEW)      | Storage cleanup for orphaned uploads                               | post-pilot ops review                   |

---

## Open Questions — All Resolved

1. **Re-cycle trigger event name** — `claim/responses.submitted` (NEW). Distinct from `claim/extraction.completed` (existing).
2. **Document re-classification scope** — only documents with `response_to_question_id` set are re-classified in re-cycle; pre-existing documents skipped. Existing pipeline behavior.
3. **Synthesis prompt input** — per design002.8 Decision 6 query.
4. **`SKIP_NOTIFICATIONS` env validation** — existence in production = fail-fast (§8.7).
5. **Token revocation column** — `revoked_at` separate from `expires_at` (§4.2.3).
6. **Claim partial lock during claimant flow** — Approve forbidden via API guard (`status = 'ready'` only, per design001.11 B.5). Other operations (regenerate-link, view) allowed.

---

## Estimate

| Area                                                              | Days (Codex)                                              |
| ----------------------------------------------------------------- | --------------------------------------------------------- |
| Migration 0009 + 3 RPCs                                           | 2                                                         |
| Adjuster endpoints (dispatch + regenerate)                        | 2                                                         |
| Claimant public routes (4 endpoints + middleware + rate limiting) | 3                                                         |
| Inngest claimant-notify function (waitForEvent)                   | 1.5                                                       |
| Inngest claim-recycle event handler                               | 0.5 (mostly reuses existing extraction-completed handler) |
| Resend integration + webhook                                      | 1                                                         |
| Twilio integration + webhook                                      | 1                                                         |
| Frontend claimant page (4 renderers + autosave + finalize + RTL)  | 4                                                         |
| Brief view additions (UI-001 patch within sprint)                 | 1.5                                                       |
| Smoke + E2E + edge cases                                          | 2.5                                                       |
| **Total**                                                         | **~19 days = ~4 weeks**                                   |

No cuts. Larger than skeleton estimate (~1.5 weeks) because the skeleton did not account for: 3 RPCs, Inngest fallback complexity, public route hardening, RTL component verification per renderer.

---

## Dependencies

### 14.1 — Pre-sprint (vov)

| Dependency                                                                                               | Time   |
| -------------------------------------------------------------------------------------------------------- | ------ |
| Resend account + DKIM/SPF/DMARC for spectix.com                                                          | ~1h    |
| Twilio account + Israel number rental ($5/mo)                                                            | ~1h    |
| DNS for `app.spectix.com` (subdomain or path-based via Vercel — path-based preferred for SSL simplicity) | ~30min |

### 14.2 — Sign-off gate verifications (PRE-architect-review)

vov runs these before joint sign-off and attaches output to the Architect upload:

**(a) `claim_form` schema check (Supabase non-prod):**

```sql
SELECT
  claim_form ? 'claimant_email' AS has_email,
  claim_form ? 'claimant_phone' AS has_phone,
  claim_form ? 'first_name' AS has_first_name,
  claim_form ? 'claim_number' AS has_claim_number,
  count(*)
FROM claims WHERE claim_form IS NOT NULL
GROUP BY 1, 2, 3, 4;
```

If any of the 4 keys missing in any row → design004.3 OR intake schema patch required before sprint.

**(b) Codex grep — verify no hidden coupling:**

```bash
grep -rn "pass_number" src/app/api/claims/ src/lib/ src/inngest/
grep -rn "claim_form->>'claimant_email'\|claim_form->>'claimant_phone'" src/ supabase/
```

Confirms (a) UI-001 / Inngest functions don't have stale assumptions about `pass_number`, (b) any existing reads of contact info handle empty strings.

### 14.3 — Repo dependencies

| Dependency                                  | Status                                          |
| ------------------------------------------- | ----------------------------------------------- |
| SPRINT-UI-001 (PR #68) merged in main       | ✅                                              |
| Migration 0008 applied in Supabase non-prod | Verified by Migration 0009 DO block at run time |
| design001.11 (concurrent revision)          | Drafted (joint sign-off)                        |
| design002.8 (concurrent revision)           | Drafted (joint sign-off)                        |

---

## Cross-References

- `design001.11_state_machine_06_05.md` — actor_type='claimant', new audit actions, B.5 trigger expansion (concurrent, joint sign-off).
- `design002.8_synthesis_decomposition_06_05.md` — question_dispatches notification columns, synthesis prompt input expansion (concurrent, joint sign-off).
- `design003.4_ui_requirements_06_05.md` — adjuster UI consumes question_dispatches; UI-002 patches brief view.
- `design004.1_claimant_responses_06_05.md` — predecessor skeleton (→ archive on sign-off).
- `sprint_ui001.2_brief_view_implementation_06_05.md` — predecessor sprint (PR #68 merged).
- `sprint_ui002.1` (TBD) — implementation spec, drafted post-sign-off.

---

## Done Criteria for design004 iteration 2

- [x] All 8 decisions resolved with concrete implementation.
- [x] Migration 0009 specified including pre-flight DO block.
- [x] 3 RPCs defined with full SQL.
- [x] Inngest fallback pattern with `waitForEvent` documented.
- [x] All security sections (bearer disclosure, rate limits, RLS, ENV validation) complete.
- [x] Acceptance criteria across 5 categories.
- [x] Estimate updated based on actual scope (~19 days).
- [x] Sign-off gate verifications listed (claim_form schema + Codex grep).
- [ ] **Joint Architect sign-off with design001.11 + design002.8.**
- [ ] sprint_ui002.1 implementation spec drafted post sign-off.

---

## Version

design004 — iteration 2 — 06/05/2026
**Filename:** `design004.2_claimant_responses_06_05.md`
**Status:** Joint sign-off pending with design001.11 + design002.8.
**Predecessor:** design004.1 (skeleton, → archive on sign-off).
**Next step:** Architect joint review across the trio.
