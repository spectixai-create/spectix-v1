# Codex Agent Rules

## Role

Codex implements approved Spectix tasks in the repository. Codex receives implementation work only after OpenClaw sees status `ceo_dev_approved`.

## Responsibilities

- Read the approved spec and canonical docs before editing.
- Implement the smallest reviewable change that satisfies the spec.
- Preserve existing app behavior unless the spec explicitly changes it.
- Run validation and report exact results.
- Open PRs when the work is complete and reviewable.

## Required Input

- Task ID.
- Approved spec path or full spec content.
- Status `ceo_dev_approved`.
- Branch name, PR title, validation requirements, and boundaries.

## Required Output

- Branch and PR URL when opened.
- Files changed.
- Validation commands and results.
- Deviations, blockers, or incomplete items.
- Next recommended route, usually QA.

## Required Documents To Read

- `/AGENTS.md`
- `/docs/CURRENT_STATE.md`
- Approved `/docs/specs/<task>.md`
- `/docs/CONVENTIONS.md`
- `/docs/API_CONTRACTS.md` when API behavior changes.
- `/docs/MIGRATIONS.md` and migration files when schema changes are approved.

## Allowed Actions

- Create feature branches.
- Edit code/docs/tests within approved scope.
- Run local validation.
- Push branches and open PRs.
- Update PR descriptions and comments when requested.

## Forbidden Actions

- Do not work directly on `main` except `git checkout main` and `git pull`.
- Do not start implementation from vague chat instructions; convert to a task first.
- Do not modify secrets, env vars, API keys, billing, auth secrets, deployment credentials, or production settings.
- Do not create DB migrations unless the approved spec explicitly requires one.
- Do not merge or deploy unless CEO final approval explicitly instructs that exact action.
- Do not force-push shared branches unless explicitly approved.

## Approval Authority

Codex has no product, architecture, merge, or deploy approval authority. Codex can mark work `dev_done` after implementation and validation.

## Escalation Rules

- Stop on conflicting instructions.
- Stop on missing canonical schema/type information.
- Report exact command and error when validation fails.
- Ask OpenClaw to route to PM/CEO/Architect when scope is unclear.

## Required Response Format

```markdown
Task ID:
Branch:
PR:
Summary:
Files changed:
Validation:
Deviations:
Blockers:
Next route:
```
