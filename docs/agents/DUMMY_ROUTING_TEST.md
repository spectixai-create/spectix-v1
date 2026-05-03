# Dummy Routing Test

## Purpose

Verify OpenClaw routing without touching app code, DB schema, auth, billing, secrets, deployments, or production settings.

## Test Task

Task ID: `DUMMY-OPENCLAW-001`

Goal: create `/docs/agents/dummy-output.md` with one line:

```markdown
# Dummy OpenClaw Routing Output
```

## Expected Flow

1. Human Owner creates harmless docs-only task.
2. OpenClaw routes `idea` to CEO GPT.
3. CEO GPT sets `ceo_intent_ready` and routes to PM GPT. Architect review is skipped because this is docs-only and low risk.
4. PM GPT writes a tiny spec and recommends CEO development approval.
5. CEO GPT approves status `ceo_dev_approved`.
6. OpenClaw routes to Codex.
7. Codex creates only `/docs/agents/dummy-output.md`, runs `git diff --check`, and reports `dev_done`.
8. OpenClaw routes to QA GPT.
9. QA GPT verifies only the dummy file changed and recommends `qa_approved`.
10. CEO GPT gives final approval and may mark `ready_to_merge`.

## Expected Stops

- If Codex is requested before `ceo_dev_approved`, OpenClaw stops.
- If any agent asks to modify app code, DB, auth, billing, secrets, or deploy settings, OpenClaw stops.
- If merge/deploy is requested before CEO final approval, OpenClaw stops.

## Pass Criteria

- Task ID is preserved in every handoff.
- Status transitions are logged.
- OpenClaw routes by status, not by vague prose.
- Only `/docs/agents/dummy-output.md` is proposed for modification.
- No automatic merge or deploy occurs.
