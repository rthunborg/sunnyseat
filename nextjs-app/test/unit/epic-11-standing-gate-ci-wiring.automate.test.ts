/**
 * Story 11.8 (automate coverage) — Epic-11 standing-gate CI-wiring contract.
 *
 * Story 11.8 is the epic's anti-"shipped-but-insufficient" gate (test-design
 * R-001, score 9 CRITICAL). Its whole thesis is that a fix landing green is not
 * enough — the guard must KEEP RUNNING in CI or the symptom silently returns.
 * Every AC2 behaviour (scrub=0 requests, date-change=1 + marker persistence,
 * real-touch slider/sheet gestures, chip parity, axe AA) already has green
 * runtime coverage. But the standing gate that KEEPS those behaviours guarded is
 * two static config surfaces with NO test of their own:
 *
 *   1. `.github/workflows/build-and-test-nextjs.yml` — the CI steps that INVOKE
 *      the Playwright projects. Drop `--project=touch` and the real-touch gate
 *      silently stops running (build stays green, gate gone). Drop
 *      `--project=mobile --project=desktop` and the request-count invariant
 *      stops running. Drop `--project=a11y` and the axe AA gate stops running.
 *   2. `playwright.config.ts` — the per-project `testMatch`/`testIgnore` ROUTING.
 *      Break the `touch` project's `testMatch` and it matches zero specs → a
 *      vacuous green (Playwright passes when 0 tests run). Drop a `testIgnore`
 *      on `mobile`/`desktop` and the CDP-only touch specs double-run under WebKit
 *      (no CDP `Input.dispatchTouchEvent` → false-fail / hang).
 *
 * A repo-wide grep for these facts across `test/` returned only comments inside
 * the spec files themselves — no guard-test existed. This suite locks the wiring
 * in the fast vitest gate, mirroring the `hygiene-config-contracts.automate.test.ts`
 * precedent (read a config file from disk, assert its structural contract, never
 * a rendered pixel). It asserts the WIRING is present — the behaviour specs
 * themselves (run under those projects) prove the behaviour.
 *
 * Story 12.6 closes the earlier mobile axe omission: `a11y-mobile` is a live CI
 * gate and must stay non-vacuous, with an active Story 12.6 mobile pin spec.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd(); // nextjs-app/
const repoRoot = join(projectRoot, '..');

const ciWorkflow = readFileSync(
  join(repoRoot, '.github', 'workflows', 'build-and-test-nextjs.yml'),
  'utf8',
);
const playwrightConfig = readFileSync(
  join(projectRoot, 'playwright.config.ts'),
  'utf8',
);

// The two CDP-only real-touch specs (Chromium `touch` project only).
const TOUCH_SPECS = [
  'epic-11-slider-touch-drag.spec.ts',
  'epic-11-sheet-touch-gestures.spec.ts',
] as const;

describe('Story 11.8 — Epic-11 standing-gate CI-wiring contract (automate)', () => {
  describe('CI workflow keeps invoking every standing Playwright project', () => {
    it('invokes the E2E request-count gate on BOTH breakpoints (--project=mobile --project=desktop)', () => {
      // The scrub=0-requests / date-change=1 + marker-persistence e2e (R-001
      // headline) runs under mobile + desktop. If either project vanishes from
      // the CI step, the standing request-count invariant stops running green.
      expect(ciWorkflow).toMatch(
        /npx playwright test[^\n]*--project=mobile[^\n]*--project=desktop/,
      );
    });

    it('invokes the real-touch gate (--project=touch) — the CDP gesture proof', () => {
      // The real-finger slider-drag + sheet 4-snap gestures (R-004/R-002) run
      // ONLY under the Chromium/Pixel-5 `touch` project. Dropping this step is
      // the exact "shipped but insufficient" failure mode 11.8 exists to block:
      // the emulated mobile-project mouse-drag can pass while a real finger fails.
      expect(ciWorkflow).toMatch(/npx playwright test[^\n]*--project=touch/);
    });

    it('invokes the axe AA gate (--project=a11y)', () => {
      // Desktop axe-core AA contrast gate (11.6 closed the amber-badge debt to
      // ≥4.5:1). Must keep running so a future contrast regression trips CI.
      // Match --project=a11y as a WHOLE arg value (followed by whitespace or
      // end-of-arg) — a bare `\b` boundary spuriously matches --project=a11y-mobile
      // (the `-` is a word boundary), which would let a future a11y→a11y-mobile
      // swap pass this gate vacuously while dropping the desktop axe run.
      expect(ciWorkflow).toMatch(/npx playwright test[^\n]*--project=a11y(?=\s|$)/m);
    });

    it('invokes the mobile axe AA gate (--project=a11y-mobile)', () => {
      expect(ciWorkflow).toMatch(/npx playwright test[^\n]*--project=a11y-mobile/);
    });
  });

  describe('playwright.config.ts keeps the project routing that makes the gate real', () => {
    it('routes BOTH real-touch specs to the touch project via testMatch (else it matches 0 specs → vacuous green)', () => {
      // Playwright passes a project that matches zero tests. If the `touch`
      // project's testMatch stops matching these specs, `--project=touch` runs
      // nothing and reports green — the real-touch gate silently evaporates.
      const touchProject = playwrightConfig.match(
        /name:\s*'touch'[\s\S]*?use:\s*\{[^}]*\}/,
      );
      expect(touchProject, 'touch project block in playwright.config.ts').not.toBeNull();
      for (const spec of TOUCH_SPECS) {
        expect(
          touchProject![0],
          `touch project must testMatch ${spec}`,
        ).toContain(spec);
      }
    });

    it('excludes BOTH real-touch specs from the mobile + desktop projects via testIgnore (else CDP-only specs double-run under WebKit)', () => {
      // The CDP `Input.dispatchTouchEvent` gesture is Chromium-only. If a
      // testIgnore is dropped, the touch specs also run under the WebKit
      // mobile/iPhone-14 project (no CDP) → false-fail or hang. Guard that both
      // standard projects keep excluding both touch specs.
      for (const projectName of ['mobile', 'desktop']) {
        const project = playwrightConfig.match(
          new RegExp(`name:\\s*'${projectName}'[\\s\\S]*?use:\\s*\\{[^}]*\\}`),
        );
        expect(project, `${projectName} project block`).not.toBeNull();
        for (const spec of TOUCH_SPECS) {
          expect(
            project![0],
            `${projectName} project must testIgnore ${spec}`,
          ).toContain(spec);
        }
      }
    });

    it('routes the axe spec to the a11y project via testMatch', () => {
      // The a11y project must keep matching axe.spec.ts, or `--project=a11y`
      // runs nothing (vacuous green) — the contrast gate would silently stop.
      const a11yProject = playwrightConfig.match(
        /name:\s*'a11y'[\s\S]*?use:\s*\{[^}]*\}/,
      );
      expect(a11yProject, "a11y project block").not.toBeNull();
      expect(a11yProject![0]).toMatch(/testMatch:\s*'?\*\*\/axe\.spec\.ts'?/);
    });

    it('routes the mobile axe spec to the a11y-mobile project via testMatch', () => {
      const a11yMobileProject = playwrightConfig.match(
        /name:\s*'a11y-mobile'[\s\S]*?use:\s*\{[^}]*\}/,
      );
      expect(a11yMobileProject, "a11y-mobile project block").not.toBeNull();
      expect(a11yMobileProject![0]).toMatch(/testMatch:\s*'?\*\*\/axe-mobile\.spec\.ts'?/);
    });
  });
});
