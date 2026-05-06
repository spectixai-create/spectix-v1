# UI-002A Pre-Flight Check B - Empty-String Handling Sweep

Date: 2026-05-06

Mode: read-only local code inspection

Production project touched: no

## Grep Command

```bash
git grep -n -e "claimant_email" -e "claimant_phone" -- app lib inngest supabase
```

## Raw Output

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

## Per-Hit Classification

| File:line                                                     | Classification         | Empty-string handling | Notes                                                                                                         |
| ------------------------------------------------------------- | ---------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `app/api/claims/route.ts:33`                                  | Schema/type definition | N/A                   | `claimant_email` row type.                                                                                    |
| `app/api/claims/route.ts:34`                                  | Schema/type definition | N/A                   | `claimant_phone` row type.                                                                                    |
| `app/api/claims/route.ts:123`                                 | Write path             | Partial               | Inserts `input.claimantEmail`. Schema requires valid email when present, but does not normalize `'' -> null`. |
| `app/api/claims/route.ts:124`                                 | Write path             | No                    | Inserts `input.claimantPhone`. Schema permits an empty string because it only checks `max(50)`.               |
| `app/api/claims/route.ts:213`                                 | Display/API mapping    | No                    | Raw email value mapped to response. Display-only today.                                                       |
| `app/api/claims/route.ts:214`                                 | Display/API mapping    | No                    | Raw phone value mapped to response. Display-only today.                                                       |
| `lib/adjuster/data.ts:48`                                     | Schema/type definition | N/A                   | `claimant_email` row type.                                                                                    |
| `lib/adjuster/data.ts:49`                                     | Schema/type definition | N/A                   | `claimant_phone` row type.                                                                                    |
| `lib/adjuster/data.ts:651`                                    | Display/API mapping    | No                    | Raw email value mapped to claim snapshot. Display-only today.                                                 |
| `lib/adjuster/data.ts:652`                                    | Display/API mapping    | No                    | Raw phone value mapped to claim snapshot. Display-only today.                                                 |
| `supabase/migrations/0002_schema_audit_implementation.sql:63` | Schema definition      | N/A                   | Adds `claimant_email text`.                                                                                   |
| `supabase/migrations/0002_schema_audit_implementation.sql:64` | Schema definition      | N/A                   | Adds `claimant_phone text`.                                                                                   |

## Dispatch-Logic Read Paths

No existing notification dispatch logic was found. There is currently no production path that reads `claimant_email` or `claimant_phone` for email/SMS dispatch.

## Verdict

POLISH-ONLY

## Findings

- Existing reads are schema/type or display/API mapping reads.
- Existing display mappings do not normalize empty strings, but they are not used for dispatch.
- The intake write path does not consistently normalize empty strings to null, especially for phone.

## Impact for UI-002B

- UI-002B should define and use a contact normalization helper at the dispatch boundary:
  - `const email = (claim.claimant_email ?? '').trim();`
  - `const phone = (claim.claimant_phone ?? '').trim();`
  - require `email.length > 0` or `phone.length > 0` before dispatch.
- Optional polish: normalize phone/email on intake and API response formatting in a later cleanup.
