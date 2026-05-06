# SPRINT-003A.3 Synthesis MVP Implementation Spec

Date: 2026-05-06
Status: Approved for implementation

## Scope

Implement deterministic synthesis after validation pass 2:

- `synthesis_results` storage using Form B `pass_number`
- deterministic findings from `claim_validations`
- deterministic clarification questions
- readiness score
- `run-synthesis-pass` subscribed to `claim/validation.completed`
- `claim/synthesis.completed` event
- audit actions `claim_synthesis_started` and `claim_synthesis_completed`

## Explicit Constraints

- No LLM calls.
- No rules engine.
- No adjuster UI.
- No question answering flow.
- No native `JSON.stringify` for deterministic IDs.
- Use `safe-stable-stringify` for canonical ID payloads.
- Use `claim_validations.pass_number`, not `pass_id`.
- Read validation rows by `claim_id + pass_number=2`.
- Persist synthesis rows as `pass_number=3`.
- Persist synthesis output with transaction-backed DELETE + INSERT. Never UPSERT `synthesis_results`.

## Event Contract

Input event:

```ts
{ name: 'claim/validation.completed', data: { claimId, passNumber } }
```

Output event:

```ts
{ name: 'claim/synthesis.completed', data: { claimId, passNumber: 3 } }
```

## Terminal Status Guard

The final claim status update must not overwrite terminal states, including:

- `rejected`
- `rejected_no_coverage`
- `errored`
- `cost_capped`
- `ready`

This explicitly protects `rejected_no_coverage` because it exists in current
main and must not be moved to `ready` by synthesis.

## Readiness Score

MVP weights:

- high: 30
- medium: 15
- low: 5

Formula:

```text
score = max(0, 100 - sum(weights))
```

Calibration is deferred to TECH_DEBT 11z.
