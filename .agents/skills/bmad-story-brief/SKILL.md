---
name: bmad-story-brief
description: Use when creating, reading, auditing, implementing, or reviewing SunnySeat BMAD stories, acceptance criteria, sprint-status entries, and story completion rules.
---

# BMAD Story Brief

This is a custom SunnySeat project-binding skill. It is intentionally preserved even though its name starts with `bmad-`. Generic BMAD framework skills are not migrated in this pass; BMAD will be reinstalled separately with Codex focus.

BMAD artifacts are local and gitignored in this repo. Treat them as important working context, but do not assume they exist in a fresh clone.

Primary paths:

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/<story-id>.md`

Current story files in this checkout live directly under `_bmad-output/implementation-artifacts/` and use dash-style story IDs such as `1-6-ci-cd-quality-gates.md`.

## Status Flow

```text
backlog -> ready-for-dev -> in-progress -> review -> done
```

- `ready-for-dev`: story file is created and audited.
- `in-progress`: dev agent is implementing the story.
- `review`: implementation and gates passed; waiting for human review.
- `done`: human approved.

Do not manually edit sprint status to set `review`. Use:

```bash
scripts/story-review.sh <story-id>
```

## Story Quality

Every story should include:

- A clear user story.
- Acceptance criteria with observable outcomes.
- Tasks/subtasks mapped to acceptance criteria.
- Dev Notes with real file paths, API contracts, dependencies, and constraints.
- References to `AGENTS.md`, `project-context.md`, `epics.md`, architecture, and UX/design docs when relevant.
- Dev Agent Record, Completion Notes, Change Log, and File List.

Frontend stories should include design gate criteria for visual match, behaviour, animation, and visual validation when the source epic includes them.

## Definition Of Done

A story is ready for review only when:

1. All acceptance criteria are satisfied.
2. All story tasks/subtasks are checked off.
3. The Dev Agent Record and File List are complete.
4. Typecheck, lint, and relevant tests pass.
5. Frontend visual validation passes or any manual acceptance is explicitly documented.
6. `scripts/story-review.sh <story-id>` succeeds and updates sprint status.

## Delegation Briefs

When delegating story work, include:

- Story file path.
- Specific tasks/subtasks owned by the delegate.
- Relevant Screen IDs and routes from `project-context.md` for frontend work.
- UX spec sections and design-token references.
- Exact write scope.

The delegate must read the full story before editing.
