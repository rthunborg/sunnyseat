import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Story 11.6 (AC2) — venue-detail label-builder prune pin.
 *
 * AC2 removed the "Soltider idag" strip + its peak/best-window subtitle. Three
 * surfaces that BUILD the labels for `VenueDetailContent` had to drop the now-dead
 * `timeline` / `sectionTitle` / `peakTime` / `bestWindow` label fields:
 *   - `VenueDetailContent.tsx` — the `VenueDetailContentLabels` type + component,
 *   - `MapView.tsx#venueDetailLabels` — the live overlay label-builder,
 *   - `ForcedVenueDetailInitialFrame.tsx#venueDetailLabels` — the forced-frame builder.
 *
 * `removed-i18n-keys.test.ts` pins that the JSON keys are gone; the sv/en parity
 * test pins locales stay identical. Neither catches a builder re-introducing a
 * `t('detail.timeline.*')` / `t('detail.sectionTitle')` call — next-intl would then
 * throw (missing key) or silently emit the raw key at runtime. This source-scan
 * pin fails the moment any of those builders references a pruned detail key again,
 * closing the runtime-raw-key regression path the JSON scan cannot see.
 *
 * Scope note: the ENGINE timeline is untouched — `detail.timeline` as a DTO field
 * (a data path, not an i18n `t()` call) is out of scope here. This pin targets the
 * i18n `t('detail.<key>')` reads and the label object field names only.
 */

const APP_ROOT = process.cwd();

const PRUNED_LABEL_FIELDS = ['sectionTitle', 'peakTime', 'bestWindow'] as const;
// `t('detail.timeline...')` and `t('detail.sectionTitle')` etc. — the exact i18n
// read shape that would resurrect a pruned key at runtime.
const PRUNED_I18N_READS = [
  'detail.timeline',
  'detail.sectionTitle',
  'detail.peakTime',
  'detail.bestWindow',
] as const;

function readSource(relativePath: string): string {
  return readFileSync(path.resolve(APP_ROOT, relativePath), 'utf8');
}

describe('Story 11.6 venue-detail label-builders drop the pruned timeline labels', () => {
  const labelBuilderSources = [
    'components/custom/map/MapView.tsx',
    'components/custom/venue/ForcedVenueDetailInitialFrame.tsx',
    'components/composed/venue/VenueDetailContent.tsx',
  ];

  for (const relativePath of labelBuilderSources) {
    it(`references no pruned t('detail.<timeline-key>') read in ${relativePath}`, () => {
      const source = readSource(relativePath);
      const leaked = PRUNED_I18N_READS.filter((key) => source.includes(key));
      expect(leaked).toEqual([]);
    });
  }

  it('drops the timeline / sectionTitle / peakTime / bestWindow fields from VenueDetailContentLabels', () => {
    const source = readSource('components/composed/venue/VenueDetailContent.tsx');
    // Slice out just the label type so we do not false-positive on unrelated
    // identifiers elsewhere in the file (there are none today, but keep it tight).
    const typeStart = source.indexOf('export type VenueDetailContentLabels');
    expect(typeStart).toBeGreaterThan(-1);
    const typeBlock = source.slice(typeStart, source.indexOf('export type VenueDetailContentProps'));
    for (const field of PRUNED_LABEL_FIELDS) {
      expect(typeBlock).not.toContain(`${field}:`);
    }
    // The `timeline` label field (was `timeline: SunTimelineLabels`) is gone; the
    // component no longer imports SunTimelineLabels either.
    expect(typeBlock).not.toContain('timeline');
    expect(source).not.toContain('SunTimelineLabels');
    // The honest badge label field stays — it backs the "ÖPPET · {time}" badge.
    expect(typeBlock).toContain('openUntil:');
  });

  it('keeps SunTimeline / SunForecastBars fully removed (dead render path pruned)', () => {
    // The component + its test were deleted; any lingering import would resurrect
    // the dead render path AC2 pruned. Scan the two builders that used to consume it.
    for (const relativePath of [
      'components/composed/venue/VenueDetailContent.tsx',
      'components/custom/map/MapView.tsx',
    ]) {
      const source = readSource(relativePath);
      expect(source).not.toContain('SunTimeline');
      expect(source).not.toContain('SunForecastBars');
      expect(source).not.toContain('timelineWindowLabel');
    }
  });
});
