import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = process.cwd();
const repoRoot = join(appRoot, '..');

function readApp(relativePath: string): string {
  return readFileSync(join(appRoot, relativePath), 'utf8');
}

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('Story 12.9 slider/date refinement source contract', () => {
  it('keeps request-count E2E specs off the removed mobile planner-date-next shortcut', () => {
    for (const file of [
      'test/e2e/epic-11-scrub-zero-fetch.spec.ts',
      'test/e2e/story-12-3-persisted-geometry-request-count.atdd.spec.ts',
    ]) {
      const source = readApp(file);
      expect(source, file).not.toContain('planner-date-next');
      expect(source, file).toContain('planner-date-trigger');
      expect(source, file).toContain('selectDifferentDateFromCalendar');
    }
  });

  it('does not absorb the inherited Story 12.4 OnboardingGate hydration work', () => {
    const story = readRepo('_bmad-output/implementation-artifacts/12-9-mobile-bottom-sheet-row-quantized-drag-slim-time-slider.md');
    expect(story).toContain('OnboardingGate hydration pageError remains deferred to Story 12.4');
  });
});
