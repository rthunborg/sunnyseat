---
name: test-gate
description: Use when preparing a SunnySeat story for review, deciding what checks must run, interpreting check failures, or updating sprint status through the canonical story-review gate.
---

# Test Gate Policy

Before a story can move to `review`, the relevant deterministic checks must pass. The canonical command is:

```bash
scripts/story-review.sh <story-id>
```

Do not manually edit `_bmad-output/implementation-artifacts/sprint-status.yaml` to set a story to `review`.

## Required Checks

Run app commands from `nextjs-app/`:

- Typecheck: `npx tsc --noEmit`
- Lint: `npx eslint . --quiet`
- Unit/component tests: `npx vitest run`
- E2E tests when required by the story: `npx playwright test`
- Visual validation for frontend screen stories

`scripts/story-review.sh` detects and runs `lint`, `typecheck`, and `test` package scripts from `nextjs-app/package.json`, then runs `scripts/visual-validate.sh` when the story references a mapped Screen ID. Story-specific E2E checks may still need to be run manually and recorded.

## Failure Rules

- Pre-existing typecheck or lint failures outside story scope are blockers. Surface them to Rasmus instead of hiding them.
- Do not add `eslint-disable`, `@ts-ignore`, ignore globs, or shim fixes just to pass the gate.
- If visual validation fails because code is wrong, fix code.
- If visual validation fails because the reference is out of story scope, stop and ask for explicit accept-with-rationale.

## Key Files

| File | Purpose |
|---|---|
| `AGENTS.md` | Canonical commands and project rules |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Local sprint state |
| `scripts/story-review.sh` | Canonical review transition gate |
| `scripts/visual-validate.sh` | Provider-neutral visual wrapper |
| `.codex/scripts/sprint-status-gate.sh` | Best-effort direct-write guardrail |
| `project-context.md` | Screen ID -> Route Map |
