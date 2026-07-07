---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-identify-targets'
  - 'step-03-generate-tests'
  - 'step-04-validate-and-summarize'
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-07-05'
inputDocuments:
  - _bmad-output/implementation-artifacts/11-3-mobile-tag-filtering-bottom-sheet-overhaul.md
  - nextjs-app/components/composed/venue/MobileTagChips.tsx
  - nextjs-app/components/custom/sheets/MobileBottomSheet.tsx
  - nextjs-app/components/custom/layout/DesktopNavBar.tsx
  - nextjs-app/lib/utils/venue-tags.ts
  - nextjs-app/test/components/MobileTagChips.test.tsx
  - nextjs-app/test/components/MobileBottomSheet.test.tsx
  - nextjs-app/test/components/DesktopNavBar.test.tsx
  - nextjs-app/test/e2e/epic-11-sheet-touch-gestures.spec.ts
  - nextjs-app/test/e2e/epic-11-chip-filter-parity.spec.ts
---

# Test Automation Expansion — Story 11.3 (Mobile Tag Filtering & Bottom-Sheet Overhaul)

## Preflight & Context

- **Mode:** BMad-Integrated (story + implementation landed; expand coverage over shipped code).
- **Stack:** frontend (Next.js + React). Framework present: Playwright (`playwright.config.ts`, `touch`/`mobile`/`desktop`/`a11y`/`a11y-mobile` projects) + Vitest/RTL component suite. No framework scaffolding gap → no HALT.
- **Execution:** sequential, in-session (component-level edge-case authoring on already-tested surfaces; no subagent fan-out needed for this focused single-story task).
- **Coverage philosophy:** additive only. No existing test weakened, reordered, or deleted (`git diff --stat` = 310 insertions / 0 deletions across the three files). Focus = genuine gaps: untested decision-cascade arms, boundary conditions, error/fallback paths.

## Targets & Coverage Plan

The story landed with strong happy-path coverage (vitest 1262, touch e2e 2/2, chip parity 2/2, full e2e 84). The genuine gaps were in the **pure decision logic** and a handful of **boundary/a11y facts** that the ACs pin as code-level truths but that were not directly asserted at unit level. E2E (real-touch four-snap + chip-filter parity) was already comprehensive — no e2e gap identified, so no e2e authored (avoids duplicate coverage per the workflow's anti-duplication rule).

| Surface | Level | Priority | Gap closed |
| --- | --- | --- | --- |
| `MobileBottomSheet` keyboard cascade | Component | P1 | Intermediate rungs (peek↔mid, mid↔full) + ArrowUp/Down saturation + off-ladder `dismissed` fallback branches of `expandOneRung`/`collapseOneRung` |
| `MobileBottomSheet` click cycle | Component | P1 | `clickCycle` full→peek wrap, collapsed→peek re-open, Space (not just Enter) parity, Enter full→peek |
| `MobileBottomSheet` collapsed a11y | Component | P1 | Collapsed body `aria-hidden` + `pointer-events-none` while the handle stays interactive; peek body NOT aria-hidden (the AC2 collapsed-vs-dismissed distinction) |
| `MobileTagChips` | Component | P1 | OR-union multi-active chips; EN-unmapped live-tag fallback to raw canonical ([NOTE] localizeTag drift); canonical toggle on an unmapped chip; first-seen order preserved; className merge keeps the pan-x axis guard; nav accessible name |
| `DesktopNavBar` chip strip (AC4) | Component | P2 | LEFT-arrow enable + negative page scroll; both edge-fades mid-scroll; RIGHT-arrow disabled at true max scroll; `scrollIntoView` on chip focus; 120px page-size floor when clientWidth is tiny |

## Tests Generated

All additions are pure inserts into the existing suites (no new files needed — the surfaces already have homes):

- `nextjs-app/test/components/MobileBottomSheet.test.tsx` — **+10** tests (18 → 28).
- `nextjs-app/test/components/MobileTagChips.test.tsx` — **+6** tests (8 → 14).
- `nextjs-app/test/components/DesktopNavBar.test.tsx` — **+6** tests (AC4 subsuite expanded).

**Net: +22 new component tests.**

## Validation / Gates

- `npx vitest run` (full suite): **1286 passed / 1286** (baseline 1262; +24 including baseline reconciliation — 0 dropped, 0 skipped, 0 failed).
- Three touched files in isolation: **68 passed / 68**.
- `npx tsc --noEmit`: **0 errors** (exit 0).
- `npx eslint` on the three touched files: **0 errors / 0 warnings** (exit 0).
- No production code changed → no re-run of e2e/axe needed; the story's own touch (2/2), chip-parity (2/2), and full e2e (84) runs remain valid.

## Notes / Deferred

- The real-touch gesture-feel proof (`releaseDir` 0-at-release fix) and the map-interactive-behind-collapsed fact are inherently e2e (CDP raw touch under `--project=touch`) and were already covered by `epic-11-sheet-touch-gestures.spec.ts`; @use-gesture's `useDrag` binds are not meaningfully unit-testable in jsdom without re-simulating the library. No unit test attempts to duplicate that — correctly left to the touch project.
- Deliberately did NOT add `pointer:{touch:true}` reasoning tests or any test that would re-introduce the known regression; followed the story's lesson that release direction derives from accumulated movement, not `direction[1]`.
- No reference PNG created or touched (Story 11.7 owns the consolidated rebaseline of the three new visual states).
