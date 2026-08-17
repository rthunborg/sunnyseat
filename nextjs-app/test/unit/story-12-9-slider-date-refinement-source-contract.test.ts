import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = process.cwd();

function readApp(relativePath: string): string {
  return readFileSync(join(appRoot, relativePath), 'utf8');
}

function codeWithoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
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
    for (const file of [
      'components/custom/map/MapView.tsx',
      'components/custom/sheets/MobileBottomSheet.tsx',
      'components/custom/time/TimeSliderPanel.tsx',
      'components/composed/time/TimeSlider.tsx',
    ]) {
      const code = codeWithoutComments(readApp(file));
      expect(code, file).not.toContain('OnboardingGate');
      expect(code, file).not.toContain('components/custom/onboarding');
    }
  });
});
