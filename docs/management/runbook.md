# Spectix Runbook

Operational notes for recurring environment and validation issues.

## Vercel preview health 500 + Supabase logs 401

A Vercel Preview deployment returning `/api/health` 500 while Supabase logs show
401 can indicate a corrupted or wrong `SUPABASE_SERVICE_ROLE_KEY` in the Vercel
Preview scope.

Resolution:

1. Re-copy the service_role key from Supabase Studio:
   Settings -> API -> Legacy Tab -> service_role copy button.
2. Do not use manual reveal/copy if the copy button is available.
3. Re-paste into the correct Vercel environment/scope.
4. Redeploy the affected Preview with build cache OFF.
5. Re-check `/api/health`.
6. Do not print the key or JWT.
7. Verify only by non-secret facts:
   - JWT length.
   - role claim equals `service_role`.
   - project ref equals expected non-prod ref.
   - `/api/health` returns 200.
