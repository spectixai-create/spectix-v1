# Chat Setup Checklist

Use this checklist when opening a new Spectix CEO, Architect, PM, QA, or Codex
chat.

## First Turn

- [ ] Verify repository state before doing work.
- [ ] Check open PRs.
- [ ] Check dispatcher status.
- [ ] Confirm the active role and scope.
- [ ] Do not edit files in the first turn.
- [ ] Do not approve implementation until state is verified.

Suggested Codex verification:

```powershell
git status --short
git branch --show-current
git log --oneline -12
gh pr list --state open
node scripts/openclaw-local-dispatcher.mjs status
node scripts/openclaw-local-dispatcher.mjs list
node scripts/openclaw-local-dispatcher.mjs next
node scripts/openclaw-local-dispatcher.mjs audit
```

## Final Handoff Files

- [FINAL_CEO_CHAT_HANDOFF.md](prompts/FINAL_CEO_CHAT_HANDOFF.md)
- [FINAL_CODEX_HANDOFF.md](prompts/FINAL_CODEX_HANDOFF.md)
- [FINAL_PM_HANDOFF.md](prompts/FINAL_PM_HANDOFF.md)
- [FINAL_QA_HANDOFF.md](prompts/FINAL_QA_HANDOFF.md)
- [FINAL_ARCHITECT_HANDOFF.md](prompts/FINAL_ARCHITECT_HANDOFF.md)

## Operations Packages

- [OPENCLAW_NEXT_ACTIONS.md](prompts/OPENCLAW_NEXT_ACTIONS.md)
- [SPRINT-001_PASS_LIFECYCLE_PACKAGE.md](prompts/SPRINT-001_PASS_LIFECYCLE_PACKAGE.md)

## Hard Gates

- No production mutation without explicit approval.
- No merge without approved PR/head SHA.
- No smoke without approved environment and explicit execution approval.
- No secrets in chat or repo.
- No OpenClaw 24/7 until Slack dummy routing passes.
- No auto-merge or auto-deploy.
