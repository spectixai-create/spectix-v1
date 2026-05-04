# Local Task Queue Spec

## Folder Structure

The local dispatcher stores runtime state in ignored files:

```text
.openclaw-local/
  inbox/
  active/
  outbox/
  archive/
  logs/
  state.json
  tasks.json
```

`inbox/` contains newly created tasks. `active/` contains tasks moving through
the workflow. `outbox/` contains prompt and review artifacts for local agent
handoff. `archive/` contains completed task JSON files.

## State Files

`state.json`:

```json
{
  "version": 1,
  "mode": "local-dispatcher",
  "cronEnabled": false,
  "autoMerge": false,
  "autoDeploy": false,
  "channelsEnabled": false,
  "lastRunAt": null
}
```

`tasks.json`:

```json
{
  "version": 1,
  "tasks": []
}
```

## Task JSON

Tasks use this shape:

```json
{
  "id": "DUMMY-OPENCLAW-001",
  "title": "Dummy docs-only routing test",
  "type": "dummy_docs_only",
  "risk": "low",
  "status": "ceo_intent_ready",
  "createdAt": "2026-05-04T00:00:00.000Z",
  "updatedAt": "2026-05-04T00:00:00.000Z",
  "source": "local",
  "allowedFiles": ["docs/agents/dummy-output.md"],
  "forbiddenAreas": [
    "app code",
    "db",
    "auth",
    "billing",
    "pricing",
    "secrets",
    "env",
    "deployment"
  ],
  "workflow": ["ceo", "pm", "ceo_approval", "codex", "qa", "ceo_final"],
  "history": [],
  "payload": {
    "ceoIntent": "",
    "pmSpec": null,
    "codexPrompt": null,
    "codexResult": null,
    "qaReport": null,
    "ceoFinalDecision": null,
    "dispatcherWrites": []
  }
}
```

## Supported Statuses

- `idea`
- `ceo_intent_ready`
- `architect_review`
- `pm_spec_ready`
- `ceo_dev_approved`
- `in_dev`
- `dev_done`
- `qa_review`
- `qa_failed`
- `qa_approved`
- `code_review`
- `ceo_final_review`
- `ready_to_merge`
- `done`
- `blocked`

## Allowed Transitions

The local dummy route uses this path:

```text
ceo_intent_ready
-> pm_spec_ready
-> ceo_dev_approved
-> dev_done
-> qa_approved
-> done
```

The dispatcher rejects unsupported status jumps recorded in task history.

## Safety Rules

The dispatcher rejects tasks whose `allowedFiles` include unsafe areas:

- `.env`
- `.env.local`
- `supabase`
- `migrations`
- package manager lockfiles
- `app/`
- `pages/`
- `src/app/`
- `inngest/`
- `lib/`
- `api/`
- Vercel or deployment files
- auth, billing, or pricing paths

For `DUMMY-OPENCLAW-001`, the only allowed file is:

```text
docs/agents/dummy-output.md
```

The dispatcher does not implement merge, deploy, branch deletion, push, commit,
or external API commands.

## Command Reference

```powershell
node scripts/openclaw-local-dispatcher.mjs init
node scripts/openclaw-local-dispatcher.mjs status
node scripts/openclaw-local-dispatcher.mjs create-dummy
node scripts/openclaw-local-dispatcher.mjs dispatch
node scripts/openclaw-local-dispatcher.mjs approve-dev DUMMY-OPENCLAW-001
node scripts/openclaw-local-dispatcher.mjs run-codex-dummy DUMMY-OPENCLAW-001
node scripts/openclaw-local-dispatcher.mjs qa DUMMY-OPENCLAW-001
node scripts/openclaw-local-dispatcher.mjs final-approve DUMMY-OPENCLAW-001
node scripts/openclaw-local-dispatcher.mjs show DUMMY-OPENCLAW-001
node scripts/openclaw-local-dispatcher.mjs audit
```

Package script aliases:

```powershell
pnpm oc:init
pnpm oc:status
pnpm oc:create-dummy
pnpm oc:dispatch
pnpm oc:audit
```

## Upgrade To Real OpenClaw Channel

When a supported OpenClaw channel becomes available, map incoming commands to
the same task schema and preserve the same safety gates. The real channel should
not enable cron, 24/7, auto-merge, auto-deploy, external production tasks, or
Codex app-code execution until a dummy route passes and the human owner approves
that activation step.
