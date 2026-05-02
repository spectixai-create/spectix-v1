# Tech Debt

- [ ] Rotate Supabase `service_role` key. It was exposed in chat before repository documentation became canonical.
- [ ] Remove or gate `/api/health` before public launch.
- [ ] Remove `/design-system` before first customer demo.
- [ ] Sample-data refactor: import types from [lib/types.ts](../lib/types.ts) in `sample-claim.ts`, `sample-questions.ts`, `sample-rows.ts`, and `intake-options.ts`.
- [ ] Migration #0002: support question `closed` state, urgency, `resolvedBy`, `resolutionNote`, and `closedAt`.
- [ ] Migration #0002: add reliable document processing status for `DocumentDerivedStatus`.
- [ ] Historical archive for older spikes #00, #00b, #00c, #00d, #00e, #02, #02a, #02b. Deferred to Spike #00z-B.
- [ ] Replace sample dashboard/claim/questions data with real Supabase data once API contracts land.
