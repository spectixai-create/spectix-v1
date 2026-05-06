# UI-002A Pre-Flight Check A - Contact Columns

Date: 2026-05-06

Mode: read-only non-prod Supabase inspection

Project checked: `aozbgunwhafabfmuwjol`

Production project touched: no

## Query 1 - Contact Columns

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='claims'
  AND column_name IN ('claimant_email', 'claimant_phone', 'claimant_name', 'claim_number')
ORDER BY column_name;
```

Result:

```json
[
  {
    "column_name": "claim_number",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "column_name": "claimant_email",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "column_name": "claimant_name",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "column_name": "claimant_phone",
    "data_type": "text",
    "is_nullable": "YES"
  }
]
```

## Query 2 - Missing Contact Values

```sql
SELECT
  count(*) FILTER (WHERE COALESCE(claimant_email, '') = '') AS missing_email,
  count(*) FILTER (WHERE COALESCE(claimant_phone, '') = '') AS missing_phone,
  count(*) FILTER (
    WHERE COALESCE(claimant_email, '') = ''
      AND COALESCE(claimant_phone, '') = ''
  ) AS missing_both,
  count(*) AS total
FROM claims;
```

Result:

```json
[
  {
    "missing_email": 25,
    "missing_phone": 25,
    "missing_both": 25,
    "total": 28
  }
]
```

## Verdict

FAIL

## Findings

- The required columns exist on `public.claims`.
- `claim_number` is non-nullable.
- `claimant_email`, `claimant_phone`, and `claimant_name` are nullable.
- Current non-prod data is not notification-ready: 25 of 28 claims have no email, no phone, or both.

## Impact for UI-002B

- UI-002B cannot assume every historical claim has a usable notification destination.
- Dispatch logic must normalize contact values with `?? ''`, `.trim()`, and length checks.
- UI-002B must include a no-contact branch, fallback behavior, or explicit eligibility guard before notification dispatch.
