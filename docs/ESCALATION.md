# Escalation

## Decision Authority

The CEO is the single decision-maker for product, scope, and security tradeoffs.

## Mid-Spike Blocker Protocol

1. Stop risky implementation.
2. Push current branch if useful.
3. Update [CURRENT_STATE.md](CURRENT_STATE.md) with the blocker if the branch will be preserved.
4. Report the exact failure and evidence.
5. Wait for explicit CEO go-ahead before making assumptions.

## Do Not Push to Main When

- Verification fails.
- The change touches files outside the assigned boundary.
- Secrets or credentials may have entered tracked files.
- Security behavior is ambiguous.
- The CEO requested review before merge.

## Do Not Delete Files When

- They were not created in the current spike.
- They are generated artifacts whose ownership is unclear.
- Deletion is a cleanup preference rather than part of the spec.

## Communication

Use PR descriptions and chat updates for evidence, blockers, and decisions. Keep evidence concrete: command output summaries, URLs, screenshots, and line references.
