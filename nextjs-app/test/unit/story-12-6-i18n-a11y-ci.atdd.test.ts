import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf8');
const messages = (locale: 'sv' | 'en') =>
  JSON.parse(read('messages', locale, 'map.json')) as Record<string, string>;

describe('Story 12.6 - localized non-colour accessible outcomes', () => {
  test('[P0] Swedish and English expose sunny, not-sunny, and unknown-weather meaning', () => {
    const sv = messages('sv');
    const en = messages('en');
    const svValues = Object.values(sv);
    const enValues = Object.values(en);

    expect(svValues).toEqual(expect.arrayContaining([
      expect.stringMatching(/soligt vid vald tid.*\{percent\}/i),
      expect.stringMatching(/inte soligt vid vald tid/i),
      expect.stringMatching(/v.der.*(saknas|otillg.nglig|ok.nt)/i),
    ]));
    expect(enValues).toEqual(expect.arrayContaining([
      expect.stringMatching(/sunny at selected time.*\{percent\}/i),
      expect.stringMatching(/not sunny at selected time/i),
      expect.stringMatching(/weather.*(unavailable|unknown)/i),
    ]));

    for (const dictionary of [sv, en]) {
      const notSunny = Object.values(dictionary).find((value) =>
        /inte soligt vid vald tid|not sunny at selected time/i.test(value),
      );
      expect(notSunny).toBeDefined();
      expect(notSunny).not.toContain('{percent}');
      expect(Object.keys(dictionary)).not.toEqual(
        expect.arrayContaining(['pinPartialAria', 'pinShadedAria', 'pinObscuredAria']),
      );
      expect(Object.values(dictionary).join(' ')).not.toMatch(/\{confidence\}|s.kerhet\s+\{\w+\}|confidence\s+\{\w+\}/i);
    }
  });

  test('[P1] a pin-bearing a11y-mobile scenario is active and invoked by CI', () => {
    const workflow = read('..', '.github', 'workflows', 'build-and-test-nextjs.yml');
    const config = read('playwright.config.ts');
    const pinA11y = read('test', 'e2e', 'story-12-6', 'axe-mobile.spec.ts');
    const standingGate = read('test', 'unit', 'epic-11-standing-gate-ci-wiring.automate.test.ts');

    expect(workflow).toMatch(/npx playwright test[^\n]*--project=a11y-mobile/);
    expect(config).toMatch(/name:\s*['"]a11y-mobile['"][\s\S]*?testMatch:\s*['"]\*\*\/axe-mobile\.spec\.ts['"]/);
    expect(pinA11y).toMatch(/test\(['"].*pin/i);
    expect(pinA11y).not.toMatch(/test\.(skip|fixme)\(/);
    expect(standingGate).not.toMatch(/not\.toMatch\(\/--project=a11y-mobile/);
  });
});
