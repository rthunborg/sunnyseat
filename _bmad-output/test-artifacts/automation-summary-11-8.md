---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-identify-targets'
  - 'step-03-generate-tests'
  - 'step-04-validate-and-summarize'
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-07-05'
workflowType: 'testarch-automate'
inputDocuments:
  - '_bmad-output/implementation-artifacts/11-8-live-verification-pass-touch-gesture-perf-guards.md'
  - '_bmad-output/test-artifacts/atdd-checklist-11-8.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-11.md'
  - '.github/workflows/build-and-test-nextjs.yml'
  - 'nextjs-app/playwright.config.ts'
  - 'nextjs-app/test/unit/hygiene-config-contracts.automate.test.ts (precedent)'
---

# Automation Coverage Summary — Story 11.8 (Live Verification / Standing Gate)

**Date:** 2026-07-05 · **Author:** Rasmus (Master Test Architect) · **Stack:** frontend (Next.js + Playwright + Vitest)

## Preflight

- Framework verified: `playwright.config.ts` + Vitest present. BMAD-integrated mode (story + test-design + ATDD checklist 11-8 all present).
- Core knowledge fragments applied: `test-levels-framework.md`, `test-priorities-matrix.md`, `selective-testing.md`, `test-quality.md`, `ci-burn-in.md`.

## Target identification (dedup-first)

Story 11.8 is a VERIFICATION story: it wrote no product code; it promoted seam specs to standing CI gates, hardened a touch flake, fixed a stale cross-epic regex. The ATDD checklist (11-8) already exhaustively mapped every AC2 "at least" behaviour to its existing green spec and — correctly — authored **zero** new behaviour tests (dedup discipline, test-design line 228–234). The dev-story pass then confirmed the full matrix green (vitest 1354; Playwright mobile 52 / desktop 35 / touch 3 / a11y 12).

Applying strict dedup discipline, I re-scanned for automatable gaps NOT covered by ATDD. **Every AC2/AC3 RUNTIME behaviour is already guarded — no new behaviour test is warranted.** One genuine, non-duplicative gap surfaced:

### GAP (the one worth a test): the standing-gate CI-wiring contract

The epic's thesis (R-001, score 9 CRITICAL — "shipped but insufficient cannot repeat") depends on two STATIC config surfaces that had **no test of their own** (repo-wide grep across `test/` returned only in-spec comments):

1. `.github/workflows/build-and-test-nextjs.yml` — the steps that INVOKE the Playwright projects. Drop `--project=touch` → the real-touch gesture gate silently stops running (green build, gate gone). Same for `--project=mobile --project=desktop` (request-count invariant) and `--project=a11y` (axe AA).
2. `nextjs-app/playwright.config.ts` — the per-project `testMatch`/`testIgnore` routing. Break the `touch` project's `testMatch` → it matches 0 specs → Playwright reports a **vacuous green**. Drop a `mobile`/`desktop` `testIgnore` → the CDP-only touch specs double-run under WebKit (no CDP `Input.dispatchTouchEvent`) → false-fail / hang.

This is exactly the silent-degradation failure mode the story exists to block, it is automatable in the fast vitest gate, and it duplicates nothing (the behaviour specs test the behaviour; this guards that CI keeps INVOKING them). It follows the established `hygiene-config-contracts.automate.test.ts` precedent (read a config from disk, assert its structural contract, never a rendered pixel).

## Coverage added

| Target | Level | Priority | Test |
| ------ | ----- | -------- | ---- |
| CI invokes `--project=mobile --project=desktop` (request-count gate) | Unit (config-contract) | P0 | `epic-11-standing-gate-ci-wiring.automate.test.ts` |
| CI invokes `--project=touch` (real-touch gesture gate) | Unit (config-contract) | P0 | ″ |
| CI invokes `--project=a11y` (axe AA gate) | Unit (config-contract) | P1 | ″ |
| CI does NOT blind-wire `a11y-mobile` (Story-5.1 fixme — deliberate omission) | Unit (config-contract) | P1 | ″ |
| `touch` project `testMatch`es both real-touch specs (no vacuous green) | Unit (config-contract) | P0 | ″ |
| `mobile`+`desktop` projects `testIgnore` both touch specs (no WebKit double-run) | Unit (config-contract) | P0 | ″ |
| `a11y` project `testMatch`es axe.spec.ts | Unit (config-contract) | P1 | ″ |

7 assertions, one new file: `nextjs-app/test/unit/epic-11-standing-gate-ci-wiring.automate.test.ts`.

## Non-vacuousness check

Each guard was verified to BITE via inline mutation (dropped `--project=touch` → touch assertion fails; wired `a11y-mobile` → omission guard trips; emptied the `touch` project `testMatch` → routing assertion fails). No guard is a tautology.

## Gates

- New suite: **7/7 green** (`vitest run`).
- Full vitest: **143 files / 1361 tests pass** (was 142 / 1354 → exactly +1 file, +7 tests; nothing regressed, count did not drop).
- `npm run typecheck`: 0 errors. `npm run lint`: 0 errors.

## Explicitly NOT added (dedup discipline held)

- No new copy of any AC2 behaviour (scrub=0, date-change=1, marker persistence, real-touch slider/sheet, chip parity, quick-info sr-only, today-window). All already green at the correct single level per the ATDD coverage map — a third copy would be a dedup breach.
- No live-perf / physical-device / PNG-blessing automation — those are wall-clock / device / human-judgement bound (Post-Merge Verification Protocol `needs-human`), by definition not CI-automatable.
