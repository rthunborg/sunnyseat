# Project: SunnySeat

SunnySeat is a sun-prediction PWA for Gothenburg that answers "which venue's outdoor seating is in direct sun right now?" It combines 2.5D building shadow geometry, Met.no weather, and a venue database into confidence-scored per-venue sunlight predictions. The backend engine from the original plan is complete; the current phase is a full front-end rebuild on top of the existing APIs.

This file is the canonical repo-level rulebook for Codex and other AI coding agents. `CLAUDE.md` is only a temporary compatibility shim.

## Stack

> **Working directory:** The repository root (`C:\Users\Rasmus\sunnyseat\`) is **not** the Next.js app root. The application lives in `nextjs-app/`. Git operations and planning-doc reads happen from the root. All `npm`/`npx` app commands must run from `nextjs-app/`.

- Frontend: Next.js 16.2.2 App Router, TypeScript strict, Tailwind CSS v4 CSS-first `@theme`, shadcn/ui v4, MapLibre GL JS 5.x, TanStack Query 5.x, Motion 12.x (`motion/react`), `@use-gesture/react`, `cmdk`, `next-intl`, Serwist, `date-fns-tz`
- Backend: Supabase PostgreSQL 15 + PostGIS, Next.js API routes, Zod v4, server-only Supabase service-role infrastructure, dormant Future Monetization Swish Merchant API, Met.no Locationforecast 2.0
- Deployment: Vercel

### Commands

- Type check: `cd nextjs-app && npx tsc --noEmit`
- Lint: `cd nextjs-app && npx eslint . --quiet`
- Unit/component tests: `cd nextjs-app && npx vitest run`
- E2E tests: `cd nextjs-app && npx playwright test`
- Dev server: `cd nextjs-app && npm run dev`

### Shell Scripts On Windows

Agents normally run commands through PowerShell in this checkout. Do not execute `.sh` files directly from PowerShell, because Windows may prompt for an app association and plain `bash` resolves to WSL on this machine. Use the repo wrapper so scripts run in Git Bash against the Windows `node_modules` tree:

- Story review gate: `.\scripts\run-sh.ps1 scripts/story-review.sh <story-id>`
- Visual validation: `.\scripts\run-sh.ps1 scripts/visual-validate.sh <screen-id> <route> [mobile|desktop]`
- Other repo shell scripts: `.\scripts\run-sh.ps1 <script-path> [args...]`

If invoking Git Bash manually, use `C:\Program Files\Git\bin\bash.exe` explicitly. Do not rely on `bash` from `PATH`.

## Repository Layout

```text
/
  AGENTS.md                                  canonical agent rulebook
  CLAUDE.md                                  temporary Claude Code compatibility shim
  project-context.md                         durable project context and Screen ID -> Route Map
  CODEX_MIGRATION_NOTES.md                   Codex workflow migration notes

  .codex/
    config.toml                              repo-local Codex defaults
    hooks.json                               conservative Codex hook wiring
    scripts/sprint-status-gate.sh            hook adapter; blocks direct review transitions where detectable

  .claude/scripts/                           legacy Claude Code hook/tool scripts, kept intact for rollback
  .agents/skills/                            custom/project-binding SunnySeat skills only for this migration

  scripts/
    story-review.sh                          canonical BMAD story -> review gate
    visual-validate.sh                       provider-neutral visual validation wrapper
    fetch-claude-design.sh                   local helper for refreshing the Claude Design bundle when present

  _bmad/                                     local/gitignored BMAD method source; do not edit casually
  _bmad-output/
    planning-artifacts/                      local/gitignored PRD, architecture, epics, UX spec
    implementation-artifacts/                local/gitignored sprint status, story files, validation artifacts

  building_geodata/                          large local geodata inputs

  nextjs-app/
    app/                                     Next.js App Router pages, layouts, API routes
    components/ui/                           Layer 1: shadcn/ui primitives
    components/composed/                     Layer 2: multi-primitive compositions
    components/custom/                       Layer 3: feature components
    hooks/queries/                           TanStack Query wrappers
    hooks/mutations/                         TanStack mutation wrappers
    lib/solar/                               existing sun/shadow engine; do not modify for frontend work
    lib/weather/                             existing Met.no adapter
    lib/supabase/                            existing Supabase clients/types
    lib/middleware/                          existing logging middleware
    lib/buildings/                           existing building import helpers
    lib/query-keys.ts                        central TanStack Query key factory
    messages/                                next-intl translations, Swedish primary
    test/                                    Vitest and Playwright tests
    docs/design/DESIGN.md                    canonical design token system
    docs/design/references/claude-design/    primary visual + behaviour reference bundle, if present locally
    docs/design/references/screens/          visual validation reference PNGs
    docs/design/references/REBASELINE-LOG.md rebaseline audit trail
    docs/dev/state-forcing.md                `_state` query param convention
    scripts/capture-claude-design-refs.mjs   reference PNG capture helper, if present locally
```

`_bmad/`, `_bmad-output/`, and most generated/local artifacts are intentionally gitignored. Treat them as important local context, but do not assume they exist in a fresh clone.

## Critical Rules

### Agent Delegation

Agents may spawn subagents when it is useful and relevant to the task at hand, including parallel review layers, codebase exploration, verification, and other bounded subtasks that materially advance the work. Keep delegated tasks concrete, read-only unless implementation ownership is explicit, and integrate the results before presenting conclusions. This repo-level permission is intended to avoid repeated human approval prompts for normal subagent use; it cannot override higher-priority platform or runtime instructions if those are stricter.

### Design Tokens

Design tokens are binding. Before frontend work, read `nextjs-app/docs/design/DESIGN.md`. Use Tailwind v4 `@theme` utilities and project tokens only. Do not introduce raw hex values, ad-hoc pixel spacing, custom shadows, or arbitrary Tailwind colors that are not mapped to the design system. If the required value is missing, surface it as a design decision.

### Visual Source Of Truth

The visual and behaviour reference is the current local Claude Design bundle at `nextjs-app/docs/design/references/claude-design/`, together with captured PNGs in `nextjs-app/docs/design/references/screens/{mobile,desktop}/`.

Read the bundle README and relevant JSX/source when present. Match the visual outcome, not the prototype implementation. Do not copy its DOM structure, inline CSS values, React decomposition, or arbitrary pixel nudges into production code. Use shadcn primitives, Tailwind token utilities, Motion, and the project component architecture.

The older root docs `screens.md`, `sunnyseat-screen-flow-map.md`, and `sunnyseat-stitch-prompts.md` are not present in the active repo tree as of this migration. Do not invent or restore them without explicit human direction.

### UX Behaviour

For frontend stories, read `_bmad-output/planning-artifacts/ux-design-specification.md` when available. Animation timings, state transitions, loading/empty/error patterns, and interaction mechanics come from that spec. If the static prototype and UX spec disagree on timing or behaviour, the UX spec wins. If they disagree on visual layout, flag the conflict.

### API Boundary

Client components must not import from `nextjs-app/lib/solar`, `nextjs-app/lib/weather`, `nextjs-app/lib/supabase`, `nextjs-app/lib/middleware`, or `nextjs-app/lib/buildings`. All data access flows through `nextjs-app/app/api/*` routes and is wrapped by hooks in `hooks/queries/` or `hooks/mutations/`. Query keys come from `nextjs-app/lib/query-keys.ts`; do not construct them inline.

### Future Monetization Code

Planner, future date simulation, and favourites are free MVP functionality. Active MVP code must not depend on premium state, Swish payments, Season Pass copy, paywalls, lock badges, payment routes, or recovery flows. If dormant premium/payment code is worth saving, move it out of live runtime paths and preserve the contract in `_bmad-output/planning-artifacts/future-monetization-season-pass.md` or an explicit inactive `future-premium` archive. Do not leave unused premium providers, hooks, routes, or components wired into the MVP app.

### Component Architecture

Follow the three-layer dependency direction:

```text
components/custom/ -> components/composed/ -> components/ui/
```

`components/ui/` contains shadcn primitives. `components/composed/` combines primitives into reusable UI structures. `components/custom/` contains feature/domain components. Do not skip layers or create reverse dependencies.

### Swedish Copy

Swedish is the default user-facing language. Buttons, empty states, errors, tabs, labels, and confirmation text should be Swedish unless the story explicitly covers another locale. Use scoped `next-intl` keys such as `useTranslations('venue')`; do not hardcode English user-facing copy in Swedish UI.

### Accessibility

Meet WCAG 2.1 AA. Every interactive element needs a semantic role, accessible name, visible focus indicator, and a 44x44 px minimum touch target. Do not rely on color alone for map pins or status. Respect `prefers-reduced-motion`.

### Performance

The frontend budget is <=600 KB gzipped JS total, with initial route <=280 KB and the MapLibre dynamic chunk <=320 KB. Load MapLibre async. Map tile failures fall back to the design-token surface color. Use shadcn `Skeleton` for loading states, not full-page spinners.

## BMAD Story Workflow

- `project-context.md` is durable project context and contains the canonical Screen ID -> Route Map used by visual validation.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` is local sprint state.
- Story files currently live directly under `_bmad-output/implementation-artifacts/` in this checkout.
- Do not directly edit `_bmad-output/implementation-artifacts/sprint-status.yaml` to mark a story `review`.
- Use `scripts/story-review.sh <story-id>` to move a story to `review`. On Windows/PowerShell, invoke it through `.\scripts\run-sh.ps1 scripts/story-review.sh <story-id>`. The script is the canonical gate and should run checks before it edits sprint status.
- The optional `.codex/scripts/sprint-status-gate.sh` hook is a convenience guardrail against accidental direct transitions; it is not the canonical enforcement boundary.
- Human approval moves stories from `review` to `done`.

Before starting every story, run the baseline typecheck and lint from `nextjs-app/`. If either reports errors outside the story scope, stop and surface them before editing. Do not hide failures with `eslint-disable`, `@ts-ignore`, ignore globs, or shim fixes.

## Visual Validation

Frontend stories with a screen reference must pass visual validation before review. The root wrapper is:

```bash
scripts/visual-validate.sh <screen-id> <route> [mobile|desktop]
```

On Windows/PowerShell, invoke this through `.\scripts\run-sh.ps1 scripts/visual-validate.sh <screen-id> <route> [mobile|desktop]`.

The wrapper is provider-neutral. In this migration it preserves the existing legacy implementation by delegating to `.claude/scripts/visual-validate.sh` when `VISUAL_VALIDATE_PROVIDER=claude` or `anthropic`. `VISUAL_VALIDATE_PROVIDER=none` is a manual/dry-run mode and is not an automated pass unless explicitly allowed by environment and documented in the validation artifact.

If the gate fails because the implementation is wrong, fix the implementation. If it fails because the reference PNG depicts UI outside the current story scope, stop and ask Rasmus for explicit accept-with-rationale. Do not bypass the hook, replace references, or transition sprint status to `review` without that confirmation.

Any reference PNG or capture-recipe change must update `nextjs-app/docs/design/references/REBASELINE-LOG.md` in the same operation.

## Custom Skills

SunnySeat keeps only custom/project-binding skills during this migration:

- `frontend-component`
- `visual-validation`
- `test-gate`
- `bmad-story-brief`
- `review-round-guard`
- `story-file-audit`

`bmad-story-brief` is intentionally preserved despite its `bmad-` prefix because it is a SunnySeat project-binding skill. Generic BMAD skills and WDS skills are intentionally not migrated or repaired in this pass; BMAD will be reinstalled separately with Codex focus. Do not rely on generic `bmad-*`, `wds-*`, or `wds-agent-*` skills unless they are reinstalled later.

## Testing Requirements

Before a story is marked `review`, the relevant checks must pass:

- Typecheck: `cd nextjs-app && npx tsc --noEmit`
- Lint: `cd nextjs-app && npx eslint . --quiet`
- Unit/component tests: `cd nextjs-app && npx vitest run`
- E2E tests when required by the story: `cd nextjs-app && npx playwright test`
- Visual validation for frontend screen stories

`scripts/story-review.sh` runs the configured package scripts it can detect (`lint`, `typecheck`, `test`) and visual validation when a screen mapping is found. Run additional story-specific or E2E checks manually when required by the acceptance criteria.

## Codex And GitHub Review Guidelines

When reviewing code, lead with actionable findings and include file/line references. Specifically flag:

- Design-token violations: raw colors, arbitrary spacing, custom shadows, copied prototype CSS, or non-token Tailwind colors.
- English user-facing copy in Swedish UI.
- Accessibility regressions: missing labels, keyboard traps, insufficient focus, color-only status, touch targets under 44x44 px, reduced-motion issues.
- API-boundary violations from client components into backend engine modules.
- Three-layer architecture violations.
- Direct sprint-status `review` transitions that bypass `scripts/story-review.sh`.
- Missing or unreported checks. Verify the author either ran the required commands or clearly documented why a check could not run.

## Dev-Only Conventions

- State forcing uses `?_state=<screen-id>` and `nextjs-app/lib/dev/use-forced-state.ts`.
- The valid screen IDs are those in the Screen ID -> Route Map in `project-context.md`.
- Venue-specific state-variant screens use the seeded dev slug `test-venue-sunny`.

## Git Workflow

- One commit per completed story.
- Commit message format: `feat(<epic-number>): <story title>`.
- One branch per epic: `epic/<epic-number>-<epic-slug>`.
- Merge to `main` after the epic passes manual review.
- Start a fresh Codex session for each new story so context stays scoped.

## Secrets

No secrets or API keys belong in committed files. `.env.local` and similar local environment files stay ignored; production secrets live in deployment environment variables.
