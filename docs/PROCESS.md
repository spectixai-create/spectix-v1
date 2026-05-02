# Process

## Workflow

1. CEO drafts product or implementation intent.
2. PM reviews and resolves open questions.
3. PM-approved spec lands under [docs/specs](specs/).
4. Codex reads [AGENTS.md](../AGENTS.md), [CURRENT_STATE.md](CURRENT_STATE.md), and the assigned spec.
5. Codex implements, verifies, updates docs/version, and prepares a reviewable PR.
6. CEO reviews and merges.

## Chat Structure

The broader operating model includes seven roles:

- CEO: decision-maker and scope owner.
- PM: spec quality and acceptance criteria.
- Designer: product/design decisions.
- Claude Code: backend implementation when available.
- Codex: current implementation owner.
- KB Curator: project knowledge and documentation hygiene.
- QA: runtime evidence and regression review.

## Transfer Mechanics After D-014

Before D-014, Codex received long inline transfers. After D-014, transfers should be short:

```text
Read AGENTS.md, docs/CURRENT_STATE.md, and docs/specs/spike-XX.md.
Execute Spike #XX on branch <branch>.
Follow the PR template and update CURRENT_STATE/version.
```

## Source Documents

Repository docs are canonical. Chat history and old project knowledge are archival unless copied into [docs](.).
