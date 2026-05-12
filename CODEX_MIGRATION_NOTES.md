# Codex Workflow Migration Notes

Date: 2026-05-11

## What Changed

- `AGENTS.md` is now the canonical SunnySeat agent rulebook.
- `CLAUDE.md` is a short compatibility shim that points Claude Code users to `AGENTS.md`.
- `.codex/config.toml` now contains conservative repo-local Codex defaults and no Claude-specific environment variables.
- `.codex/hooks.json` is a minimal Codex-oriented hook declaration for a best-effort direct-write guard. Codex project-local hooks require the project `.codex` layer to be trusted and active in the current client session.
- `.codex/scripts/sprint-status-gate.sh` reads hook JSON from stdin and blocks direct `sprint-status.yaml` transitions to `review` where detectable.
- PreToolUse hook blocking is a convenience guardrail, not the canonical enforcement boundary.
- `scripts/story-review.sh` is the canonical BMAD story-to-review command and remains the required path for moving stories to `review`.
- Live hook activation did not trigger in the migration session even though direct script smoke tests passed; re-test after trusting/restarting Codex so the project `.codex` layer is loaded.
- `scripts/visual-validate.sh` is a provider-neutral wrapper. In this pass it delegates to the legacy Claude/Anthropic implementation when requested.
- `.gitignore` now allows canonical Codex workflow files, root workflow scripts, and repo-local skills to be tracked while keeping personal state, BMAD local artifacts, `.claude/worktrees`, and secrets ignored.
- Only custom/project-binding SunnySeat skills in `.agents/skills/` were repaired with valid frontmatter and current paths:
  - `frontend-component`
  - `visual-validation`
  - `test-gate`
  - `bmad-story-brief`
  - `review-round-guard`
  - `story-file-audit`
- `bmad-story-brief` is preserved despite its `bmad-` prefix because it is a custom SunnySeat project-binding skill.
- Generic BMAD and WDS skill mirrors were intentionally restored or ignored. BMAD will be reinstalled separately with Codex focus.
- `project-context.md` was updated only for clearly stale workflow references.

## What Remains Claude-Compatible

- `.claude/scripts/` is left intact for rollback and for the current visual validation implementation.
- `.claude/skills/` was not migrated and should remain Claude-local/Claude-specific state.
- `scripts/visual-validate.sh` supports `VISUAL_VALIDATE_PROVIDER=claude` and `VISUAL_VALIDATE_PROVIDER=anthropic` by delegating to `.claude/scripts/visual-validate.sh`.
- `CLAUDE.md` remains as a temporary shim for Claude Code users.
- The active design bundle remains `nextjs-app/docs/design/references/claude-design/` because that path exists in this checkout.

## Manual Verification Needed

- Confirm the project `.codex` layer is trusted/active in Codex before relying on project-local hooks.
- Confirm Codex's exact hook schema for `.codex/hooks.json`. The current config is intentionally conservative and uses a broad PreToolUse matcher so the script can inspect relevant tool calls.
- Confirm Codex actually invokes `.codex/scripts/sprint-status-gate.sh` with proposed write JSON on stdin.
- Run `scripts/story-review.sh <story-id>` on a real in-progress story before relying on it as the only review transition path.
- Dry-run a story review without changing sprint status using `scripts/story-review.sh --dry-run <story-id>`.
- Confirm the review script's flat YAML editor matches future BMAD sprint-status shapes. It intentionally supports the flat `development_status` style used in this checkout and fails if the story key is missing.
- Decide whether E2E tests should be added to `scripts/story-review.sh` by default or kept as story-specific manual checks.

## Visual Validation Provider Status

- Automated OpenAI vision validation was not implemented in this pass.
- `VISUAL_VALIDATE_PROVIDER=claude` or `anthropic` delegates to the existing `.claude/scripts/visual-validate.sh` script and still requires `ANTHROPIC_API_KEY`.
- `VISUAL_VALIDATE_PROVIDER=none` is dry-run/manual mode. It exits non-zero unless `ALLOW_MANUAL_VISUAL_VALIDATION=1` is set, and any such use must be documented in the story or validation artifact.
- No provider API keys were added or committed.

## Missing Docs

The previous inventory expected these files in the active repo tree:

- `screens.md`
- `sunnyseat-screen-flow-map.md`
- `sunnyseat-stitch-prompts.md`

They are not present in the active tree. During verification they appeared only inside ignored `.claude/worktrees` snapshots. A read-only git history check showed the names existed in history, but they were not restored or copied during this migration.

Do not recreate these files from memory. If they are needed, restore them deliberately from the correct source in a separate, reviewed change.

## Rollback

This migration is reversible:

1. Restore the previous full `CLAUDE.md` from git history if Claude Code should become canonical again.
2. Revert `AGENTS.md` to the prior compatibility content if desired.
3. Stop using `scripts/story-review.sh` and return to the legacy `.claude/scripts/sprint-status-gate.sh` flow.
4. Revert `.codex/config.toml`, `.codex/hooks.json`, `.codex/scripts/`, and the `.gitignore` unignore rules.
5. Leave `.claude/scripts/` in place throughout; no Claude-specific scripts were deleted.

Because `_bmad/`, `_bmad-output/`, and `.claude/worktrees/` remain ignored, rollback should not expose local BMAD artifacts or worktree snapshots.
