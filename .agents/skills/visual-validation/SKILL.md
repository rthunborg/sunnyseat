# Visual Validation

This skill describes the automated screenshot comparison system that gates frontend story completion. It compares the running implementation against the **Codex Design prototype reference PNG** and blocks story completion if structural differences are found.

## How It Works

Visual validation runs automatically as part of the sprint-status gate. When the BMAD dev agent writes `review` to `sprint-status.yaml` for a frontend story, the gate script (`.Codex/scripts/sprint-status-gate.sh`) detects the transition, looks up the story's screen ID and corresponding route from `project-context.md`, and calls `.Codex/scripts/visual-validate.sh`.

The flow:

1. **Playwright screenshots** the running dev server at the route specified for that story (viewport: 390x844 mobile or 1440x900 desktop)
2. **Reference PNG** is loaded from `nextjs-app/docs/design/references/screens/{mobile|desktop}/{screen-id}.png`
3. **Both images** are base64-encoded and sent to the Anthropic API (Codex Sonnet) as a one-shot vision comparison
4. The API returns **PASS** or **FAIL** with a description
5. If FAIL, the gate blocks the `sprint-status.yaml` write and feeds the diff description back to the agent

You do not need to call this manually during normal development. It triggers automatically through the hook system.

### Where the reference PNGs come from

The reference PNGs are **not** hand-exported from Figma. They are produced by driving the Codex Design HTML prototypes (in `nextjs-app/docs/design/references/Codex-design/`) to the matching screen state via Playwright, then saving the screenshot:

```
nextjs-app/scripts/capture-Codex-design-refs.mjs
```

State-forcing recipes — which prototype to open, what `localStorage`/`SUNNY_DEFAULTS` to seed, which Tweaks-panel button to click — live in `RECIPES` inside that file and are documented per Screen ID in `nextjs-app/docs/design/references/Codex-design/STATE-MAPPING.md`.

For the visual gate to PASS, the reference PNG must exist for the story's `(screen-id, viewport)` pair. If you add a new state-variant story, you also extend the recipes so the gate has something to compare against.

Screens the prototype does not cover (`not-found`, `about`, `premium-recovery`, `map-primary-offline`) keep their original Figma exports under `references/screens/legacy/`. Until they're promoted into `references/screens/{mobile,desktop}/` (or the prototype gains them), validation for those screens compares against the legacy capture.

## What Triggers a FAIL

The vision comparison is strict on structural issues and lenient on cosmetic noise.

### Blocking issues (will FAIL)

- Wrong layout structure (e.g. 2-column grid instead of 3-column)
- Missing components that are present in the Figma reference
- Incorrect colour scheme (wrong primary colour, wrong background)
- Broken responsive behaviour at the target viewport
- Elements in the wrong position or order relative to the reference
- Missing or incorrectly sized images/icons where the reference shows specific ones

### Non-blocking issues (will NOT fail)

- Minor pixel-level spacing differences (a few pixels of padding variance)
- Placeholder text or images (lorem ipsum where real content will go)
- Loading states or skeleton screens captured mid-load
- Hover states not visible in a static screenshot
- Cursor state differences
- Animation frames captured at different points (static screenshots cannot verify animations — the UX behaviour spec and test suite cover those)

### Map-screen special handling

Screens containing a map canvas (`map-primary`, `map-with-selected-venue`, `map-panel-venues`, etc.) get special treatment. The map tile content is dynamic and will never match the reference exactly. The comparison ignores: different street layouts, tile imagery, geographic content, map labels, zoom level, pin positions, and pin count. It focuses on: UI chrome overlaying the map (search bars, floating buttons, bottom sheets, nav bars, time sliders), the warm/sand colour tint of the map area, the visual styling of venue pins (sunny vs shaded variants), and the overall layout composition of non-map elements.

## When Visual Validation Fails

If the gate returns FAIL, you will see output like:

```
VISUAL GATE FAILED: FAIL: card grid is 2-column instead of 3-column,
header background is white instead of the pale blue from the design,
bottom navigation bar is missing entirely
```

### How to respond to a failure

1. **Read the diff description carefully.** Each item in the comma-separated list is a specific structural issue.
2. **Fix the issues in order of severity.** Missing components and wrong layout come first; colour mismatches second.
3. **Read the Codex Design prototype source.** Open the relevant prototype JSX in `nextjs-app/docs/design/references/Codex-design/project/src*/` and verify the correct structure from the source (not from the rendered PNG). The reference PNG is downstream of the source — if there is doubt, the JSX is authoritative.
4. **Re-read DESIGN.md** if the failure mentions colour issues — ensure you are referencing the correct design tokens.
5. **Do not adjust the visual-validate.sh script or the comparison prompt to make a failure pass.** Fix the implementation instead.
6. After fixing, the agent can re-attempt the `review` transition on `sprint-status.yaml`, which will re-trigger the validation automatically.

### When to escalate

There are two distinct cases for "the reference looks wrong" — handle each differently:

**Case A — the reference PNG is stale (prototype was updated, capture wasn't re-run).**
Check the timestamps: if `nextjs-app/docs/design/references/Codex-design/` was refreshed (via `scripts/fetch-Codex-design.sh`) more recently than the relevant `references/screens/{viewport}/{screen-id}.png`, regenerate the PNG yourself rather than escalating:

```
cd nextjs-app
node scripts/capture-Codex-design-refs.mjs <screen-id>
```

Then re-run the gate. **Do not force a pass.**

**Case B — the prototype itself disagrees with the implementation intent.**
If the Codex Design prototype for this screen does not reflect the current design intent (e.g. the user iterated in Codex Design but hasn't shared the new bundle yet), flag to the human operator:

> "Visual validation is failing because the implementation matches the updated design intent but differs from the captured Codex Design reference for `[screen-id]`. The bundle at `references/Codex-design/` may be out of date relative to the live Codex Design project. Please run `scripts/fetch-Codex-design.sh` to refresh it, then re-run the capture script before re-validating."

**Case C — the recipe for this screen-state is broken or missing.**
If the visual gate fails because no reference PNG exists, or because the captured PNG shows the wrong state (e.g. you wanted "paywall open" but got "map view"), the recipe in `nextjs-app/scripts/capture-Codex-design-refs.mjs` needs work. Inspect the prototype manually (`open` the relevant HTML file in a browser, drive it to the target state, observe what state-forcing primitives reach it) and update the recipe. `STATE-MAPPING.md` documents the available primitives.

## Manual Validation

In cases where you need to run visual validation outside the normal gate flow (e.g. during debugging or before the full story is complete):

```bash
.Codex/scripts/visual-validate.sh <screen-id> <route> [mobile|desktop]
# Example:
.Codex/scripts/visual-validate.sh map-primary / mobile
.Codex/scripts/visual-validate.sh venue-detail "/?venue=test-venue-sunny&_state=venue-detail" mobile
```

Requires:
- The dev server running (defaults to `http://localhost:3000`, override with `DEV_SERVER_URL` env var)
- `ANTHROPIC_API_KEY` set in the shell environment
- Playwright installed (`cd nextjs-app && npx playwright install chromium` if not present)

## Scope and Limitations

- Visual validation compares **one viewport size** per run. The gate reads the viewport column from the Screen ID -> Route Map in `project-context.md` to determine whether to use mobile (390x844) or desktop (1440x900).
- It cannot verify animations, transitions, or interaction behaviour. Those are covered by the UX behaviour spec and the test suite.
- It cannot verify content correctness (right data, right copy). It only compares visual structure and appearance.
- Backend-only stories with no Figma screen reference skip visual validation entirely — the gate passes them through silently.

## Key Files

| File | Purpose |
|---|---|
| `.Codex/scripts/visual-validate.sh` | The comparison script (screenshots dev server, calls Anthropic API) |
| `.Codex/scripts/sprint-status-gate.sh` | The gate that calls visual-validate.sh on `review` transitions |
| `project-context.md` | Contains the Screen ID -> Route Map the gate reads |
| `nextjs-app/docs/design/references/screens/mobile/` | Figma reference PNGs for mobile viewport (390px) |
| `nextjs-app/docs/design/references/screens/desktop/` | Figma reference PNGs for desktop viewport (1280px) |
