# Test Gate Policy
 
This skill documents the test requirements that must be satisfied before any story can be marked as complete. It covers what tests are required, what "passing" means, and how enforcement works through both BMAD's native workflow and the hook system.
 
## What Must Pass
 
Before any story transitions to `review` status in `sprint-status.yaml`, all of the following must be true:
 
### 1. Type checking
 
Run the type check command specified in the project's AGENTS.md (e.g. `npx tsc --noEmit`). Zero type errors. No `@ts-ignore` or `@ts-expect-error` comments added to suppress failures (existing ones from before the story are acceptable). The PostToolUse hook runs this automatically after every TypeScript file write.
 
### 2. Linting
 
Run the lint command specified in the project's AGENTS.md (e.g. `npx eslint . --quiet`). Zero errors (warnings are acceptable). The PostToolUse hook runs lint with auto-fix after every file write, so most issues are auto-corrected. Remaining errors after auto-fix are real problems that need manual resolution.
 
### 3. Unit and integration tests
 
Run the test command specified in the project's AGENTS.md (e.g. `npx vitest run` or `npx jest --passWithNoTests`). All tests pass. The specific test runner varies per project — always check AGENTS.md for the correct command.
 
### 4. Visual validation (frontend stories only)
 
Frontend stories with a Figma screen ID in their acceptance criteria must also pass screenshot comparison. This is handled by `.Codex/scripts/sprint-status-gate.sh` and is documented in the `visual-validation` skill. Backend-only stories skip this automatically.
 
## What Tests to Write
 
### For every story
 
Every story must include tests that verify its acceptance criteria. The acceptance criteria are the contract — if a criterion says "user can filter by date range," there must be a test that exercises date range filtering.
 
### For frontend stories
 
- **Component rendering**: the component renders without errors with required props
- **State coverage**: each UI state defined in the UX behaviour spec (loading, empty, error, success) renders correctly
- **Interaction behaviour**: user actions defined in the spec (tap, swipe, submit) produce the expected outcome
- **Accessibility**: interactive elements have correct ARIA roles and labels (use `@testing-library/jest-dom` matchers)
 
Animation timing does not need unit tests. It is covered by the UX behaviour spec and verified through visual validation and manual review.
 
### For backend stories
 
- **API contracts**: endpoints return expected status codes and response shapes for valid and invalid inputs
- **Data integrity**: database operations produce correct state (create, read, update, delete)
- **Auth/authz**: protected endpoints reject unauthenticated and unauthorised requests
- **Edge cases**: null inputs, empty collections, boundary values
 
### For integration stories
 
- **End-to-end flow**: the happy path from user action to database state to API response works
- **Error propagation**: errors at each layer surface correctly to the caller
 
## When Tests Are Allowed to Be Absent
 
The only acceptable reason for a story to have no new test files is if the story is purely configuration (e.g. updating environment variables, adjusting build config, adding a dependency) and has no behavioural changes to verify. In this case, existing tests must still pass.
 
If you believe a story doesn't need tests but it involves code changes, you are probably wrong. Write at least one smoke test that exercises the changed code path.
 
## How Enforcement Works
 
### Per-write hooks (continuous feedback)
 
Three PostToolUse hooks fire after every file write during development:
 
1. **Lint** — runs the project's linter with auto-fix on the changed file, reports remaining errors
2. **Type check** — runs the project's type checker on TypeScript files, reports type errors
3. **Related tests** — runs the project's test runner for tests related to the changed file only
 
These provide immediate feedback. They are not the final gate — they catch issues at the point of introduction so the agent can fix them before moving on, rather than discovering a pile of failures at story completion.
 
The specific commands for each hook are configured in `.Codex/settings.json` under the `hooks` key. Check AGENTS.md for the project's test runner, lint command, and type check command if you need to verify what's running.
 
### Story completion gate (final enforcement)
 
BMAD's dev agent enforces test discipline natively:
 
- **Step 7** (Implementation Complete) — the dev agent runs the full test suite and verifies all tests pass before proceeding
- **Step 9** (Update Status) — the dev agent writes `review` to `sprint-status.yaml`
 
The PreToolUse hook on `sprint-status.yaml` writes triggers `.Codex/scripts/sprint-status-gate.sh`, which:
 
1. Checks whether the write is a transition to `review` status (other writes pass through)
2. Extracts the story key from the YAML content
3. Looks up the story file for a Figma screen ID reference
4. If a screen ID is found, runs `.Codex/scripts/visual-validate.sh` with the screen ID and its mapped route from `project-context.md`
5. If visual validation fails, blocks the write with exit 1 and feeds the failure description back to the agent
 
If the write is blocked, the agent must fix the reported issues and re-attempt. The gate cannot be bypassed by instruction — it is a shell script that runs outside the agent's control.
 
## Using BMAD's Test Architect (Murat)
 
If the Test Architect module is installed, Murat provides two capabilities relevant to this policy:
 
- **AT (ATDD)**: generates failing acceptance tests from story criteria *before* implementation starts. This creates a red-green-refactor cycle where tests are written to spec, not retrofitted.
- **RV (Review Tests)**: scores test quality against the story criteria *after* implementation, producing a quality report before QA handoff.
 
The recommended sequence per story is: AT → implement → RV → gate. This is optional but strongly recommended, especially for complex stories.
 
## Key Files
 
| File | Purpose |
|---|---|
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Story status tracking — the gate triggers on writes to this file |
| `.Codex/scripts/sprint-status-gate.sh` | The pre-write gate script |
| `.Codex/scripts/visual-validate.sh` | Visual comparison (called by the gate for frontend stories) |
| `project-context.md` | Screen ID -> Route Map for visual validation lookups |