---
name: visual-validation
description: Use when debugging or running SunnySeat screenshot comparison, visual gate failures, Screen ID route mappings, reference PNGs, or provider-neutral visual validation scripts.
---

# Visual Validation

SunnySeat visual validation compares a running implementation screenshot with reference PNGs under:

- `nextjs-app/docs/design/references/screens/mobile/`
- `nextjs-app/docs/design/references/screens/desktop/`

The canonical route source is the Screen ID -> Route Map in `project-context.md`.

## Current Tooling Shape

- Canonical story review gate: `scripts/story-review.sh <story-id>`
- Provider-neutral visual wrapper: `scripts/visual-validate.sh <screen-id> <route> [mobile|desktop]`
- Best-effort Codex hook adapter: `.codex/scripts/sprint-status-gate.sh`
- Legacy Claude implementation kept for compatibility: `.claude/scripts/visual-validate.sh`

The root visual wrapper currently delegates to the legacy Claude/Anthropic implementation when `VISUAL_VALIDATE_PROVIDER=claude` or `anthropic`. `VISUAL_VALIDATE_PROVIDER=openai` is intentionally not implemented in this migration. `VISUAL_VALIDATE_PROVIDER=none` is a dry-run/manual review mode and is not an automated passing gate unless a human explicitly allows and documents it.

## How To Run

```bash
scripts/visual-validate.sh map-primary / mobile
scripts/visual-validate.sh venue-detail "/v/test-venue-sunny?_state=venue-detail" mobile
```

Prerequisites for the legacy provider:

- Dev server running, default `DEV_SERVER_URL=http://localhost:3000`
- `ANTHROPIC_API_KEY` available in the shell
- Playwright installed in `nextjs-app/`

## Failure Handling

If visual validation fails because implementation differs from the reference, fix the implementation. Do not tune the validator prompt or bypass the gate.

If the reference PNG depicts UI outside the current story scope, stop and ask Rasmus for an explicit accept-with-rationale before moving the story to review.

If a reference PNG or capture recipe changes, update `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation.

## Reference Generation

The active prototype bundle path is `nextjs-app/docs/design/references/claude-design/`. The active capture helper, when present, is:

```bash
cd nextjs-app
node scripts/capture-claude-design-refs.mjs <screen-id>
```

Do not add renamed design-bundle paths that do not exist in the active tree. The expected docs `screens.md`, `sunnyseat-screen-flow-map.md`, and `sunnyseat-stitch-prompts.md` are missing from the active tree; do not invent them.
