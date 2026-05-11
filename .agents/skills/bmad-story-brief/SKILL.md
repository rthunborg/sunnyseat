---
name: bmad-story-brief
description: BMAD story format, acceptance criteria structure, and story completion rules. Use this skill whenever creating a new story, reading or interpreting an existing story, writing acceptance criteria, generating a task brief for a sub-agent or team member, checking whether a story meets BMAD quality standards, or marking a story as complete. Also triggers when working with sprint-status.yaml, epic files, story files, or when the agent needs to understand what a well-formed BMAD story looks like. If the task mentions stories, epics, acceptance criteria, task briefs, or sprint planning, this skill applies.
---

# BMAD Story Brief

This skill defines the BMAD story format, how to read and write stories, and what "story complete" means. It is the reference for any agent creating, implementing, or reviewing BMAD stories.

## Story File Format

Story files live in the implementation artifacts directory. The file name follows the pattern `{epic_num}_{story_num}_{slug}.md` (e.g. `7_4_venue-detail-page.md`, `2_3_sun-exposure-calculation-api.md`).

The sprint-status key uses dashes instead of underscores: `7-4-venue-detail-page`.

### Required Sections

Every story file must contain these sections in this order:

```markdown
# Story {epic_num}.{story_num}: {Story Title}

## Status

{status}

## Story

**As a** {role},
**I want** {action},
**so that** {benefit}.

## Acceptance Criteria

1. **{Criterion title}.** {Detailed specification of what must be true.}
2. **{Criterion title}.** {Detailed specification.}

## Tasks / Subtasks

- [ ] **Task 1: {Task Name}** (AC: {which acceptance criteria this covers})
  - [ ] Subtask 1.1
  - [ ] Subtask 1.2
- [ ] **Task 2: {Task Name}** (AC: {criteria numbers})
  - [ ] Subtask 2.1

## Dev Notes

{Architecture alignment, dependencies, data models, API contracts,
implementation guidance, performance budgets, and any context the
dev agent needs to implement correctly.}

### References
{Cite source paths: [Source: docs/<file>.md#Section]}

## Dev Agent Record

### Agent Model Used
{agent_model_name_version}

### Completion Notes List
### File List
```

### Status Values

Stories progress through these statuses in `sprint-status.yaml`:

```
backlog → ready-for-dev → in-progress → review → done
```

- **backlog**: Story exists in the epics file but no story file has been created yet
- **ready-for-dev**: The create-story workflow has produced a complete story file with all context
- **in-progress**: A dev agent is actively implementing this story
- **review**: Implementation is complete and all gates have passed — awaiting human review
- **done**: Human has approved the implementation

The `ready-for-dev → in-progress` transition is written by the dev agent when it begins work. The `in-progress → review` transition triggers the sprint-status gate hook. The `review → done` transition happens after human approval.

## Writing Acceptance Criteria

Acceptance criteria are the contract between planning and implementation. Each criterion must be specific enough that an agent can verify it programmatically or by inspection — no ambiguous language.

### Structure

Each criterion is a numbered item with a bolded title and a detailed specification:

```markdown
1. **Endpoint returns paginated results.** GET `/api/venues` accepts `page` and
   `limit` query params (defaults: page=1, limit=20). Response includes `data`
   array, `total` count, `page`, and `hasMore` boolean.
```

Not this:
```markdown
1. The API should work correctly and return results.
```

### Frontend Story Criteria

Every frontend story that references a Figma design must include these four criteria. Add them manually if the create-story workflow did not produce them:

```markdown
- Visual: Matches Figma frame `{screen-id}` ({figma-frame-url})
- Behaviour: All interactions and states defined in UX behaviour spec §{screen-id} are implemented
- Animation: Entrance/exit animations match spec timings (±50ms tolerance)
- Visual validation: Screenshot comparison against Figma reference passes before QA handoff
```

The `Visual validation` criterion is what the sprint-status gate enforces automatically. Backend-only stories do not need these criteria.

### Criteria Completeness Check

Before a story is marked `ready-for-dev`, verify each acceptance criterion answers:

- What is the observable outcome? (what the user sees, what the API returns, what the database contains)
- What are the exact values? (status codes, pixel sizes, timing in ms, text strings)
- What are the edge cases? (empty state, error state, boundary values, missing permissions)

If a criterion cannot be verified by an agent reading the spec alone, it is too vague.

## Dev Notes Section

The Dev Notes section is what separates a useful story from a requirements dump. It must contain everything the dev agent needs to implement without guessing. This includes:

- **Architecture alignment**: how this story fits into the broader system
- **Dependencies**: which stories must be complete, which services/interfaces are consumed
- **Data models**: TypeScript interfaces, database schemas, API request/response shapes — with actual code blocks
- **File locations**: exact paths where new files should be created, referencing the project's established structure
- **Performance budgets**: response time targets, bundle size limits, rendering budgets
- **Reuse instructions**: which existing components, hooks, or services to import rather than recreate
- **What NOT to do**: anti-patterns, libraries to avoid, approaches that were tried and rejected

The create-story workflow performs exhaustive analysis of architecture docs, previous stories, and git history to populate this section. If implementing a story and the Dev Notes section feels thin, check whether the create-story workflow was run or whether the story was created manually.

## Task Brief for Sub-Agent Delegation

When the dev agent (Amelia) delegates a story to a sub-agent (frontend, backend, test), it must provide:

1. **The story file path** — so the sub-agent can read the full story with all context
2. **The specific tasks** — which Task numbers from the Tasks/Subtasks section this sub-agent owns
3. **Figma screen references** — for frontend tasks, so the sub-agent knows the visual target (PNGs in `nextjs-app/docs/design/references/screens/` or Figma MCP if available)
4. **UX behaviour spec section** — for frontend tasks, the relevant section of `_bmad-output/planning-artifacts/ux-design-specification.md`
5. **Working directories** — which directories the sub-agent should create/modify files in

Example delegation:

```
Implement Story 2.3 Tasks 1-4 (frontend).
Story file: _bmad-output/implementation-artifacts/stories/2_3_venue-detail-view.md
Figma screens: venue-detail (mobile + desktop)
UX spec: _bmad-output/planning-artifacts/ux-design-specification.md §venue-detail
Working dirs: nextjs-app/app/, nextjs-app/components/custom/venue/
```

The sub-agent must read the full story file before starting. It must not begin implementation without understanding the acceptance criteria, dev notes, and dependencies.

## Definition of Done

A story is complete when ALL of the following are true:

1. **All acceptance criteria are met** — every numbered criterion has been implemented and is verifiable
2. **All tasks are checked off** — every `- [ ]` in the Tasks/Subtasks section is `- [x]`
3. **Type checking passes** — the project's type check command (see AGENTS.md) returns zero errors
4. **Linting passes** — the project's lint command (see AGENTS.md) returns zero errors
5. **All tests pass** — the project's test runner (see AGENTS.md) exits 0 with no failures
6. **Visual validation passes** (frontend stories only) — screenshot comparison returns PASS
7. **Dev Agent Record is filled** — agent model, files created/modified, build status, test count, and any notes
8. **Status transitions to review** — the dev agent writes `review` to `sprint-status.yaml`, which triggers the gate

The Dev Agent Record section at the bottom of the story must be updated with:

```markdown
## Dev Agent Record

### Agent Model Used
Codex (Opus 4.6)

### Completion Notes List
- Mock venue data used — replace with Supabase query when DB is ready
- SearchBar uses hardcoded venue list for V1

### File List
- `app/v/[slug]/page.tsx` — Venue detail route (created)
- `components/custom/VenueDetailHeader.tsx` — Header component (created)
- `lib/i18n/sv.ts` — Swedish translations (modified)
```

## Quality Standards

### What Makes a Good Story

- **Self-contained**: the dev agent can implement from this file alone, without asking questions
- **Specific**: every criterion has measurable outcomes, exact values, and explicit edge cases
- **Grounded**: dev notes reference real file paths, real interfaces, real data models from the codebase
- **Honest about scope**: if something is deferred, it says so explicitly rather than leaving ambiguity

### What Makes a Bad Story

- Acceptance criteria that say "should work correctly" or "handles errors gracefully" without specifying what "correctly" or "gracefully" means
- Dev notes that repeat the acceptance criteria in different words instead of adding implementation context
- Missing dependencies — the story assumes interfaces or data that don't exist yet without flagging it
- No task breakdown — a single monolithic task instead of discrete, checkable subtasks

### The create-story Validation Checklist

BMAD's create-story workflow includes a validation step that checks the story file for:

- Reinvention risks (creating duplicate functionality instead of reusing existing)
- Wrong libraries or framework versions
- Wrong file locations violating project structure
- Missing previous story learnings
- Vague or ambiguous implementation guidance
- Missing acceptance criteria coverage

If the validation identifies critical issues, they must be fixed before the story transitions to `ready-for-dev`.