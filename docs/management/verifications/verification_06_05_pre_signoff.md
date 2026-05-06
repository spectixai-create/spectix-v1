# Pre-Sign-Off Verifications — 06/05/2026

**Source:** Codex execution of `codex_prompt_pre_signoff_verifications_06_05.md`.
**Performed against:** `main` HEAD prior to `004ff933e34d1d00e893f7952ccd0e2d664d9b40`.
**Project:** Supabase non-prod `aozbgunwhafabfmuwjol`.

---

## Task 1 — claim_form schema

- Table 1 result (key presence breakdown):

```text
ERROR:
Failed to run sql query:
ERROR: 42703: column "claim_form" does not exist
LINE 2:   claim_form ? 'claimant_email'   AS has_email,
          ^
```

Additional schema confirmation:

```text
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'claims'
  AND column_name = 'claim_form';

Result:
[]
```

- Table 2 result (empty/null counts):

```text
ERROR:
Failed to run sql query:
ERROR: 42703: column "claim_form" does not exist
LINE 2:   count(*) FILTER (WHERE claim_form->>'claimant_email' = '') AS empty_email,
                                 ^
```

- **Verdict: FAIL**
- If FAIL:
  - `public.claims.claim_form` does not exist in non-prod project `aozbgunwhafabfmuwjol`.
  - Missing keys cannot be counted because the JSON column itself is absent.
  - Flag for `design004.3` OR intake schema patch before sign-off.

---

## Task 2 — pass_number coupling

Note: repo has root-level `app/`, `lib/`, and `inngest/`; no `src/` directory exists. Equivalent grep was run against actual repo paths.

- grep #1 raw output (pass_number literals):

```text
app/api/claims/[id]/documents/route.ts:211:      p_pass_number: 1,
app/api/claims/route.ts:39:  brief_pass_number: number | null;
app/api/claims/route.ts:219:    briefPassNumber: row.brief_pass_number,
inngest/functions/process-document.ts:222:        p_pass_number: 1,
inngest/functions/process-document.ts:257:        p_pass_number: 1,
inngest/functions/process-document.ts:540:                p_pass_number: 1,
inngest/functions/process-document.ts:578:            p_pass_number: 1,
inngest/functions/process-document.ts:594:          p_pass_number: 1,
inngest/functions/process-document.ts:1014:      p_pass_number: 1,
inngest/functions/process-document.ts:1178:        p_pass_number: 1,
inngest/functions/run-validation-pass.ts:113:            pass_number: VALIDATION_PASS_NUMBER,
inngest/functions/run-validation-pass.ts:120:          { onConflict: 'claim_id,pass_number' },
inngest/functions/run-validation-pass.ts:122:        .select('pass_number')
inngest/functions/run-validation-pass.ts:127:      return data as { pass_number: number } | null;
inngest/functions/run-validation-pass.ts:129:  )) as { pass_number: number } | null;
inngest/functions/run-validation-pass.ts:185:      .eq('pass_number', VALIDATION_PASS_NUMBER)
inngest/functions/run-validation-pass.ts:186:      .select('pass_number')
inngest/functions/run-validation-pass.ts:255:        pass_number: VALIDATION_PASS_NUMBER,
inngest/functions/run-validation-pass.ts:260:      { onConflict: 'claim_id,pass_number,layer_id' },
inngest/functions/run-validation-pass.ts:297:    pass_number: VALIDATION_PASS_NUMBER,
inngest/synthesis/run-synthesis-pass.ts:80:        pass_number: SYNTHESIS_PASS_NUMBER,
inngest/synthesis/run-synthesis-pass.ts:87:      { onConflict: 'claim_id,pass_number' },
inngest/synthesis/run-synthesis-pass.ts:97:        pass_number: SYNTHESIS_PASS_NUMBER,
inngest/synthesis/run-synthesis-pass.ts:98:        validation_pass_number: passNumber,
inngest/synthesis/run-synthesis-pass.ts:108:        'id, claim_id, pass_number, layer_id, status, payload, created_at',
inngest/synthesis/run-synthesis-pass.ts:111:      .eq('pass_number', SYNTHESIS_VALIDATION_PASS_NUMBER);
inngest/synthesis/run-synthesis-pass.ts:133:        pass_number: SYNTHESIS_PASS_NUMBER,
inngest/synthesis/run-synthesis-pass.ts:139:        pass_number: SYNTHESIS_PASS_NUMBER,
inngest/synthesis/run-synthesis-pass.ts:145:        pass_number: SYNTHESIS_PASS_NUMBER,
inngest/synthesis/run-synthesis-pass.ts:153:      p_pass_number: SYNTHESIS_PASS_NUMBER,
inngest/synthesis/run-synthesis-pass.ts:174:        pass_number: SYNTHESIS_PASS_NUMBER,
inngest/synthesis/run-synthesis-pass.ts:183:      { onConflict: 'claim_id,pass_number' },
inngest/synthesis/run-synthesis-pass.ts:202:        pass_number: SYNTHESIS_PASS_NUMBER,
lib/adjuster/data.ts:54:  brief_pass_number: number | null;
lib/adjuster/data.ts:65:  pass_number: number;
lib/adjuster/data.ts:96:  pass_number: number;
lib/adjuster/data.ts:106:  pass_number: number;
lib/adjuster/data.ts:419:    .eq('pass_number', 3);
lib/adjuster/data.ts:462:    .order('pass_number', { ascending: true });
lib/adjuster/data.ts:492:    .eq('pass_number', 3)
lib/adjuster/data.ts:657:    briefPassNumber: row.brief_pass_number,
lib/adjuster/data.ts:670:    passNumber: Number(row.pass_number),
lib/adjuster/data.ts:705:    passNumber: Number(row.pass_number),
lib/adjuster/data.ts:717:    passNumber: Number(row.pass_number),
lib/errored/recovery.ts:46:    .select('pass_number')
lib/errored/recovery.ts:49:    .order('pass_number', { ascending: false })
lib/errored/recovery.ts:55:  const passNumber = (data as { pass_number?: unknown } | null)?.pass_number;
lib/errored/recovery.ts:196:      last_good_pass_number: passNumber,
lib/errored/transition.ts:66:      last_pass_number: resolvedLastPassNumber,
lib/errored/transition.ts:89:    .select('pass_number')
lib/errored/transition.ts:92:    .order('pass_number', { ascending: false })
lib/errored/transition.ts:98:  const passNumber = (data as { pass_number?: unknown } | null)?.pass_number;
lib/synthesis/types.ts:43:  pass_number: number;
lib/synthesis/types.ts:54:  pass_number: number;
supabase/migrations/0001_initial_schema.sql:64:  pass_number  int  not null,
supabase/migrations/0001_initial_schema.sql:75:create index if not exists findings_pass_number_idx on public.findings (pass_number);
supabase/migrations/0002_schema_audit_implementation.sql:70:ALTER TABLE public.claims ADD COLUMN brief_pass_number int;
supabase/migrations/0002_schema_audit_implementation.sql:92:  pass_number int NOT NULL,
supabase/migrations/0002_schema_audit_implementation.sql:102:  UNIQUE (claim_id, pass_number),
supabase/migrations/0002_schema_audit_implementation.sql:193:    SELECT MAX(pass_number)
supabase/migrations/0002_schema_audit_implementation.sql:211:    ORDER BY pass_number DESC
supabase/migrations/0004_classifier_prep.sql:51:  p_pass_number int,
supabase/migrations/0004_classifier_prep.sql:58:    claim_id, pass_number, status, started_at,
supabase/migrations/0004_classifier_prep.sql:62:    p_claim_id, p_pass_number, 'in_progress', now(),
supabase/migrations/0004_classifier_prep.sql:65:  on conflict (claim_id, pass_number) do update
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:17:  p_pass_number int default 1,
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:31:    hashtextextended(p_claim_id::text || ':' || p_pass_number::text, 0)
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:38:    and p.pass_number = p_pass_number
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:50:    pass_number,
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:57:    p_pass_number,
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:62:  on conflict (claim_id, pass_number) do update
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:86:        'pass_number', p_pass_number,
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:175:  p_pass_number int default 1
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:196:    hashtextextended(p_claim_id::text || ':' || p_pass_number::text, 0)
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:236:    and p.pass_number = p_pass_number
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:253:      pass_number,
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:260:      p_pass_number,
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:265:    on conflict (claim_id, pass_number) do update
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:293:    pass_number,
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:300:    p_pass_number,
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:305:  on conflict (claim_id, pass_number) do update
supabase/migrations/20260504111946_pass_lifecycle_completion.sql:334:        'pass_number', p_pass_number,
supabase/migrations/20260506091500_claim_validations.sql:5:-- Uses pass_number because the repository's passes table has no typed
supabase/migrations/20260506091500_claim_validations.sql:6:-- pass kind and D-016 keys pass accounting by (claim_id, pass_number).
supabase/migrations/20260506091500_claim_validations.sql:17:  pass_number int NOT NULL,
supabase/migrations/20260506091500_claim_validations.sql:30:    pass_number,
supabase/migrations/20260506091500_claim_validations.sql:39:  ON public.claim_validations(claim_id, pass_number);
supabase/migrations/20260506131500_synthesis_results.sql:5:-- questions, and readiness score. Uses Form B pass_number semantics.
supabase/migrations/20260506131500_synthesis_results.sql:16:  pass_number int NOT NULL,
supabase/migrations/20260506131500_synthesis_results.sql:29:  ON public.synthesis_results(claim_id, pass_number);
supabase/migrations/20260506131500_synthesis_results.sql:35:  p_pass_number int,
supabase/migrations/20260506131500_synthesis_results.sql:47:    AND pass_number = p_pass_number;
supabase/migrations/20260506131500_synthesis_results.sql:51:    pass_number,
supabase/migrations/20260506131500_synthesis_results.sql:57:    p_pass_number,
```

- grep #2 raw output (passes table writes):

```text
inngest/functions/process-document.ts:220:      const { error } = await supabaseAdmin.rpc('upsert_pass_increment', {
inngest/functions/process-document.ts:228:        throw new Error(`upsert_pass_increment failed: ${error.message}`);
inngest/functions/process-document.ts:255:      const { error } = await supabaseAdmin.rpc('upsert_pass_increment', {
inngest/functions/process-document.ts:263:        throw new Error(`upsert_pass_increment failed: ${error.message}`);
inngest/functions/process-document.ts:537:              'upsert_pass_increment',
inngest/functions/process-document.ts:548:                `upsert_pass_increment failed: ${rpcError.message}`,
inngest/functions/process-document.ts:576:          const { error } = await supabaseAdmin.rpc('upsert_pass_increment', {
inngest/functions/process-document.ts:584:            throw new Error(`upsert_pass_increment failed: ${error.message}`);
inngest/functions/process-document.ts:592:        const { error } = await supabaseAdmin.rpc('upsert_pass_increment', {
inngest/functions/process-document.ts:600:          throw new Error(`upsert_pass_increment failed: ${error.message}`);
inngest/functions/process-document.ts:1012:    const { error } = await supabaseAdmin.rpc('upsert_pass_increment', {
inngest/functions/process-document.ts:1020:      throw new Error(`upsert_pass_increment failed: ${error.message}`);
inngest/functions/run-validation-pass.ts:109:        .from('passes')
inngest/functions/run-validation-pass.ts:179:      .from('passes')
inngest/synthesis/run-synthesis-pass.ts:77:    const { error: passError } = await supabaseAdmin.from('passes').upsert(
inngest/synthesis/run-synthesis-pass.ts:171:    const { error: passError } = await supabaseAdmin.from('passes').upsert(
lib/adjuster/data.ts:459:    .from('passes')
lib/errored/recovery.ts:45:    .from('passes')
lib/errored/transition.ts:88:    .from('passes')
supabase/migrations/0004_classifier_prep.sql:49:create or replace function public.upsert_pass_increment(
supabase/migrations/0004_classifier_prep.sql:79:    and routine_name = 'upsert_pass_increment'
supabase/rollbacks/0004_classifier_prep.down.sql:6:drop function if exists public.upsert_pass_increment(uuid, int, int, numeric);
```

- **Verdict: AMBIGUOUS**
- If FAIL:
  - No unexpected hardcoded `.eq('pass_number', 3)` outside adjuster/synthesis read paths was found:
    - `lib/adjuster/data.ts:419`
    - `lib/adjuster/data.ts:492`
  - Direct `passes` writes from grep #2 are in Inngest handlers:
    - extraction: `inngest/functions/process-document.ts`
    - validation: `inngest/functions/run-validation-pass.ts`
    - synthesis: `inngest/synthesis/run-synthesis-pass.ts`
  - Ambiguity requiring CEO/Architect decision:
    - `app/api/claims/[id]/documents/route.ts:211` hardcodes `p_pass_number: 1` in an upload API route when calling `reopen_pass_for_document_processing`.
    - That RPC performs an `INSERT INTO public.passes ... ON CONFLICT (claim_id, pass_number) DO UPDATE` in `supabase/migrations/20260504111946_pass_lifecycle_completion.sql`.
    - This is not captured by grep #2's `upsert_pass_increment|.from('passes')|INSERT INTO passes` pattern, but semantically it can write `passes` outside an Inngest handler.

**CEO resolution per design004.3 §16.2 + D-029:** ACCEPTED — the hardcode is consistent with stable pass_number model. `reopen_pass_for_document_processing(p_pass_number=1)` correctly re-targets the extraction pass on document upload. No patch required. RPC semantics to be documented in `docs/architecture/passes_lifecycle.md` per TECH_DEBT 11S (closes in SPRINT-UI-002A pre-flight).

---

## Task 3 — claim_form contact reads

- grep raw output:

```text
app/api/claims/route.ts:33:  claimant_email: string | null;
app/api/claims/route.ts:34:  claimant_phone: string | null;
app/api/claims/route.ts:123:      claimant_email: input.claimantEmail,
app/api/claims/route.ts:124:      claimant_phone: input.claimantPhone,
app/api/claims/route.ts:213:    claimantEmail: row.claimant_email,
app/api/claims/route.ts:214:    claimantPhone: row.claimant_phone,
lib/adjuster/data.ts:48:  claimant_email: string | null;
lib/adjuster/data.ts:49:  claimant_phone: string | null;
lib/adjuster/data.ts:651:    claimantEmail: row.claimant_email,
lib/adjuster/data.ts:652:    claimantPhone: row.claimant_phone,
supabase/migrations/0002_schema_audit_implementation.sql:63:ALTER TABLE public.claims ADD COLUMN claimant_email text;
supabase/migrations/0002_schema_audit_implementation.sql:64:ALTER TABLE public.claims ADD COLUMN claimant_phone text;
```

- Per-hit analysis:
  - `app/api/claims/route.ts:33` — type field only — N/A
  - `app/api/claims/route.ts:34` — type field only — N/A
  - `app/api/claims/route.ts:123` — write from `input.claimantEmail` — does NOT use `.trim()` / empty-check
  - `app/api/claims/route.ts:124` — write from `input.claimantPhone` — does NOT use `.trim()` / empty-check
  - `app/api/claims/route.ts:213` — maps `row.claimant_email` to API response — does NOT use `.trim()` / empty-check
  - `app/api/claims/route.ts:214` — maps `row.claimant_phone` to API response — does NOT use `.trim()` / empty-check
  - `lib/adjuster/data.ts:48` — type field only — N/A
  - `lib/adjuster/data.ts:49` — type field only — N/A
  - `lib/adjuster/data.ts:651` — maps `row.claimant_email` to adjuster snapshot — does NOT use `.trim()` / empty-check
  - `lib/adjuster/data.ts:652` — maps `row.claimant_phone` to adjuster snapshot — does NOT use `.trim()` / empty-check
  - `supabase/migrations/0002_schema_audit_implementation.sql:63` — schema column — N/A
  - `supabase/migrations/0002_schema_audit_implementation.sql:64` — schema column — N/A

- **Verdict: FAIL**
- If FAIL:
  - No `claim_form->>'claimant_email'` or `claim_form->>'claimant_phone'` reads exist (the `claim_form` jsonb does not exist; values live in direct columns).
  - Existing direct-column reads of `claimant_email` / `claimant_phone` do not normalize with `?? ''` + `.trim()` + length checks.
  - `app/api/claims/route.ts:213-214` and `lib/adjuster/data.ts:651-652` return raw nullable/string values.
  - `app/api/claims/route.ts:123-124` writes input values directly; `claimantPhone: z.string().max(50).nullish()` allows `''`.

**CEO resolution per design004.3 §3.1:** dispatch endpoint normalizes with `(claim.claimant_email ?? '').trim()` pattern. Existing display-only reads (write/read in claim CRUD endpoints) flagged for SPRINT-UI-002A pre-flight Check B sweep — patch in implementation sprint if classified as dispatch-related, polish-only otherwise.

---

## Overall

- 3/3 PASS → no.
- Results:
  - Task 1: FAIL (resolved by design004.3 schema correction)
  - Task 2: AMBIGUOUS (resolved by D-029 acknowledgement)
  - Task 3: FAIL (partial fix in design004.3 §3.1; full sweep in SPRINT-UI-002A pre-flight Check B)
- Required updates resolved across:
  - `design004.3` — schema correction (claim_form → direct columns).
  - `D-029` registered — pass_number stable across cycles.
  - `TECH_DEBT 11S` registered — `reopen_pass_for_document_processing` documentation, closes in UI-002A.
  - `sprint_ui002a.1` Check B — full empty-string sweep beyond dispatch endpoint.
