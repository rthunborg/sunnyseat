import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const PROJECT_ROOT = process.cwd();

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8');
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readProjectFile(relativePath)) as T;
}

function flattenStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.values(value as Record<string, unknown>).flatMap(flattenStrings);
}

describe('Story 12.8 About copy/source contract', () => {
  it('keeps fabricated public accuracy and per-venue confidence numbers out of About', () => {
    const sourceCorpus = [
      readProjectFile('components/custom/about/AboutPage.tsx'),
      readProjectFile('lib/constants/about.ts'),
      ...flattenStrings(readJson('messages/sv/about.json')),
      ...flattenStrings(readJson('messages/en/about.json')),
    ].join('\n');

    expect(sourceCorpus).not.toMatch(/ABOUT_ACCURACY_PLACEHOLDER/);
    expect(sourceCorpus).not.toMatch(/AccuracyCountUp/);
    expect(sourceCorpus).not.toMatch(/about-accuracy-stat/);
    expect(sourceCorpus).not.toMatch(/accuracyStat(?:Aria|Suffix)?/);
    expect(sourceCorpus).not.toMatch(/(^|[^\d])85%/);
    expect(sourceCorpus).not.toMatch(/Träffsäkerhet:\s*85\s*procent/i);
    expect(sourceCorpus).not.toMatch(/\bSäkerhet\s+\d+%/i);
    expect(sourceCorpus).not.toMatch(/\bConfidence\s+\d+%/i);

    expect(existsSync(path.join(PROJECT_ROOT, 'components/custom/about/AccuracyCountUp.tsx'))).toBe(false);
  });

  it('keeps the legend wording aligned with the shared public-sun predicate', () => {
    const publicSunSource = readProjectFile('lib/utils/public-sun.ts');
    const svAbout = readJson<Record<string, string>>('messages/sv/about.json');
    const enAbout = readJson<Record<string, string>>('messages/en/about.json');
    const aboutSource = readProjectFile('components/custom/about/AboutPage.tsx');

    expect(publicSunSource).toMatch(/normalizedPercent\(venue\.sunExposurePercent\)\s*>\s*50/);
    expect(publicSunSource).toMatch(/normalizeWeatherGateState\(venue\.weatherGateState\)\s*!==\s*'gated'/);

    expect(svAbout.mapLegendIntro).toMatch(/vald tid/i);
    expect(svAbout.mapLegendSunnyBody).toMatch(/Mer än hälften/i);
    expect(svAbout.mapLegendSunnyBody).toMatch(/vädret inte blockerar solen/i);
    expect(svAbout.mapLegendShadedBody).toMatch(/skugga, låg solexponering, moln, regn/i);
    expect(svAbout.mapLegendExample).toMatch(/inte att det är 70% chans/i);

    expect(enAbout.mapLegendIntro).toMatch(/selected time/i);
    expect(enAbout.mapLegendSunnyBody).toMatch(/More than half/i);
    expect(enAbout.mapLegendSunnyBody).toMatch(/weather is not blocking it/i);
    expect(enAbout.mapLegendShadedBody).toMatch(/shade, low exposure, cloud, rain/i);
    expect(enAbout.mapLegendExample).toMatch(/not a 70% chance/i);

    expect(aboutSource).not.toMatch(/VenueSunStatus|sunExposurePercent\s*[<>]=?\s*\d+|weatherGateState\s*[!=]=/);
  });

  it('keeps static About swatches on the same token semantics as runtime map pins', () => {
    const aboutSource = readProjectFile('components/custom/about/AboutPage.tsx');
    const venuePinSource = readProjectFile('components/custom/map/VenuePin.tsx');

    for (const token of ['bg-amber-pin', 'border-t-amber-pin', 'bg-pin-shaded', 'border-t-pin-shaded']) {
      expect(venuePinSource).toContain(token);
      expect(aboutSource).toContain(token);
    }

    expect(venuePinSource).toMatch(/data-pin-icon="sun"/);
    expect(venuePinSource).toMatch(/data-pin-icon="cloud"/);
    expect(aboutSource).toMatch(/about-pin-icon-sun/);
    expect(aboutSource).toMatch(/about-pin-icon-cloud/);
  });
});
