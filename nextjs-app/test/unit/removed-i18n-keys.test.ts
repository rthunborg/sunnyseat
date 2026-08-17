import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Story 9.6 (Map Chrome Consolidation & Dead-Control Cleanup) — removed-key pin.
 *
 * The dead placeholder controls this story deleted had i18n labels that are now
 * orphaned: the "Café"/"Öppet nu" list-category buttons (`venue.controls.
 * categoryCafe` / `venue.controls.openNow`) and the desktop-nav pager chevrons
 * (`common.nav.previous` / `common.nav.next`). Their JSON keys were removed from
 * BOTH locales so no reader can silently render a fallback raw key.
 *
 * `messages-parity.test.ts` only guarantees sv/en stay structurally identical —
 * it would happily pass if these keys were re-added to both locales. This suite
 * pins the DELETION itself: it fails if a removed key creeps back into either
 * locale, and it confirms the kept sibling (`venue.controls.unavailable`) stays.
 */

const MESSAGES_DIR = path.resolve(process.cwd(), 'messages');
const LOCALES = ['sv', 'en'] as const;

function loadNamespace(locale: string, namespaceFile: string): Record<string, unknown> {
  const raw = readFileSync(path.join(MESSAGES_DIR, locale, namespaceFile), 'utf8');
  return JSON.parse(raw) as Record<string, unknown>;
}

// The list-controls copy lives at `venue.json` -> `list` -> `controls`.
function loadListControls(locale: string): Record<string, unknown> {
  const list = loadNamespace(locale, 'venue.json').list as Record<string, unknown> | undefined;
  return (list?.controls ?? {}) as Record<string, unknown>;
}

describe('Story 9.6 removed i18n keys have no remaining reader', () => {
  for (const locale of LOCALES) {
    it(`drops the dead list-category labels from venue.list.controls in ${locale}`, () => {
      const controls = loadListControls(locale);
      expect(controls).not.toHaveProperty('categoryCafe');
      expect(controls).not.toHaveProperty('openNow');
    });

    it(`keeps venue.list.controls.unavailable (still used by favourites-mode) in ${locale}`, () => {
      const controls = loadListControls(locale);
      expect(controls).toHaveProperty('unavailable');
      expect(typeof controls.unavailable).toBe('string');
    });

    it(`drops the dead pager-chevron labels from common.nav in ${locale}`, () => {
      const nav = loadNamespace(locale, 'common.json').nav as Record<string, unknown> | undefined;
      expect(nav).toBeDefined();
      expect(nav).not.toHaveProperty('previous');
      expect(nav).not.toHaveProperty('next');
    });
  }

  it('leaves no reader for the removed keys anywhere in the message files', () => {
    // A raw-string scan across every namespace/locale as a belt-and-braces
    // guard against the keys reappearing under a different parent path.
    for (const locale of LOCALES) {
      for (const namespaceFile of ['venue.json', 'common.json']) {
        const raw = readFileSync(path.join(MESSAGES_DIR, locale, namespaceFile), 'utf8');
        expect(raw).not.toContain('"categoryCafe"');
        expect(raw).not.toContain('"openNow"');
        expect(raw).not.toContain('"previous"');
        expect(raw).not.toContain('"next"');
      }
    }
  });
});

/**
 * Story 11.4 (AC4) — quick-info reference alignment removed-key pin.
 *
 * The rework removed the visible confidence chip and the "Sol HH:mm–HH:mm"
 * window line from the quick-info card, which orphaned three `venue.quickInfo.*`
 * keys: `sunWindow` (only `quickInfoSunWindowTemplate` used it), `sunUnavailable`
 * (only the removed window line's fallback used it), and the already-unconsumed
 * `obscuredPosition` (defined but never wired). All three were deleted from BOTH
 * locales. This suite pins the DELETION so a reader can never silently render a
 * raw key. Story 12.13 supersedes the former sr-only confidence exception below.
 */
describe('Story 11.4 removed quick-info i18n keys have no remaining reader', () => {
  function loadQuickInfo(locale: string): Record<string, unknown> {
    const quickInfo = (loadNamespace(locale, 'venue.json').quickInfo ??
      {}) as Record<string, unknown>;
    return quickInfo;
  }

  for (const locale of LOCALES) {
    it(`drops sunWindow / sunUnavailable / obscuredPosition from venue.quickInfo in ${locale}`, () => {
      const quickInfo = loadQuickInfo(locale);
      expect(quickInfo).not.toHaveProperty('sunWindow');
      expect(quickInfo).not.toHaveProperty('sunUnavailable');
      expect(quickInfo).not.toHaveProperty('obscuredPosition');
    });

    it(`drops the superseded confidence* keys from venue.quickInfo in ${locale}`, () => {
      const quickInfo = loadQuickInfo(locale);
      expect(quickInfo).not.toHaveProperty('confidence');
      expect(quickInfo).not.toHaveProperty('confidenceApproximate');
      expect(quickInfo).not.toHaveProperty('confidenceUnavailable');
    });
  }
});

/**
 * Story 12.13 — user-facing confidence display removal.
 *
 * The public model confidence number remains internal/diagnostic and may still
 * exist in engine, feedback evidence, SQL, and maintainer-only code. These pins
 * are scoped to i18n namespaces and UI source files that can render to users.
 */
describe('Story 12.13 removed confidence display keys have no public reader', () => {
  function loadVenueNamespace(locale: string): Record<string, unknown> {
    return loadNamespace(locale, 'venue.json');
  }

  for (const locale of LOCALES) {
    it(`drops confidence keys from public venue namespaces in ${locale}`, () => {
      const venue = loadVenueNamespace(locale);
      const quickInfo = (venue.quickInfo ?? {}) as Record<string, unknown>;
      const route = (venue.route ?? {}) as Record<string, unknown>;
      const list = (venue.list ?? {}) as Record<string, unknown>;
      const detail = (venue.detail ?? {}) as Record<string, unknown>;

      for (const namespace of [quickInfo, route, list, detail]) {
        expect(namespace).not.toHaveProperty('confidence');
        expect(namespace).not.toHaveProperty('confidenceApproximate');
        expect(namespace).not.toHaveProperty('confidenceUnavailable');
      }
      expect(String(list.cardAria)).not.toContain('{confidence}');
    });
  }

  it('keeps no public confidence display helper or translation keys', () => {
    for (const locale of LOCALES) {
      const raw = readFileSync(path.join(MESSAGES_DIR, locale, 'venue.json'), 'utf8');
      expect(raw).not.toContain('"confidence"');
      expect(raw).not.toContain('"confidenceApproximate"');
      expect(raw).not.toContain('"confidenceUnavailable"');
      expect(raw).not.toContain('{confidence}');
      expect(raw).not.toContain('Säkerhet');
      expect(raw).not.toContain('Confidence');
    }
  });

  it('does not let public UI source re-import confidence display plumbing', () => {
    const publicUiFiles = [
      'components/composed/venue/VenueCard.tsx',
      'components/custom/venue/VenueList.tsx',
      'components/composed/venue/VenueQuickInfo.tsx',
      'components/composed/venue/VenueDetailContent.tsx',
      'components/custom/map/MapView.tsx',
      'components/custom/routing/RouteOverlay.tsx',
      'components/custom/favourites/FavouritesList.tsx',
      'components/custom/venue/VenueDetailOverlay.tsx',
      'components/custom/venue/ForcedVenueDetailInitialFrame.tsx',
    ];

    for (const relativePath of publicUiFiles) {
      const source = readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
      expect(source).not.toContain('getConfidenceDisplayState');
      expect(source).not.toContain('confidencePercent');
      expect(source).not.toContain('confidenceMeta');
      expect(source).not.toContain('showVisibleConfidence');
      expect(source).not.toContain('routeConfidenceLabel');
    }
  });

  it('keeps the no-public-confidence boundary explicit while preserving internal evidence paths', () => {
    const publicUiFiles = [
      'components/composed/venue/VenueCard.tsx',
      'components/custom/venue/VenueList.tsx',
      'components/composed/venue/VenueQuickInfo.tsx',
      'components/composed/venue/VenueDetailContent.tsx',
      'components/custom/map/MapView.tsx',
      'components/custom/routing/RouteOverlay.tsx',
      'components/custom/favourites/FavouritesList.tsx',
      'components/custom/venue/VenueDetailOverlay.tsx',
      'components/custom/venue/ForcedVenueDetailInitialFrame.tsx',
    ];

    for (const relativePath of publicUiFiles) {
      const sourceWithoutComments = stripTypeScriptComments(
        readFileSync(path.resolve(process.cwd(), relativePath), 'utf8'),
      );
      expect(sourceWithoutComments).not.toMatch(
        /\b(?:Säkerhet|Confidence)\b\s*[:·-]?\s*(?:\{percent\}|\{confidence\}|\d+\s*%)/i,
      );
      expect(sourceWithoutComments).not.toMatch(
        /\bconfidence(?:Display|Meta|Percent|Label|Approximate|Unavailable)\b/i,
      );
    }

    const apiTypes = readFileSync(path.resolve(process.cwd(), 'lib/types/api.ts'), 'utf8');
    expect(apiTypes).toMatch(/confidence:\s*number/);
    expect(apiTypes).toMatch(/Story 12\.13 removed every public[\s\S]*?surfaces/i);

    const feedbackSession = readFileSync(
      path.resolve(process.cwd(), 'lib/services/feedback-session.ts'),
      'utf8',
    );
    expect(feedbackSession).toMatch(/confidenceAtPrediction:\s*venue\.confidence/);

    const feedbackRoute = readFileSync(
      path.resolve(process.cwd(), 'app/api/venues/[slug]/feedback/route.ts'),
      'utf8',
    );
    expect(feedbackRoute).toMatch(/confidenceAtPrediction:\s*z\.number\(\)\.min\(0\)\.max\(100\)\.optional\(\)/);

    const confidenceCalculator = readFileSync(
      path.resolve(process.cwd(), 'lib/solar/confidence-calculator.ts'),
      'utf8',
    );
    expect(confidenceCalculator).toMatch(/export function calculateConfidenceFactors/);
    expect(confidenceCalculator).toMatch(/export function calculateDisplayConfidence/);
  });
});

function stripTypeScriptComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Story 11.6 (AC2) — "Soltider idag" removal removed-key pin.
 *
 * AC2 removed the venue-detail day-timeline strip (`VenueTimeline`/`SunTimeline`
 * render path) and its peak/best-window subtitle. That orphaned four
 * `venue.detail.*` keys: the whole `timeline` block, the strip's `sectionTitle`,
 * and the subtitle's `peakTime` / `bestWindow`. All four were deleted from BOTH
 * locales. `messages-parity.test.ts` only guarantees sv/en stay identical — it
 * would pass if any of these were re-added to both locales. This suite pins the
 * DELETION so a reader can never render a raw key, and confirms the KEPT
 * `detail.openUntil` stays (the honest "ÖPPET · {time}" badge still consumes it).
 *
 * NOTE: the engine timeline computation (the `detail.timeline` DTO, the `[slug]`
 * route, `VenueSunTimelineDto`) is deliberately untouched — Story 11.1 consumes
 * the day-series. This pin is scoped to the venue-detail i18n presentation keys
 * that AC2 pruned, not the data path.
 */
describe('Story 11.6 removed venue-detail timeline i18n keys have no remaining reader', () => {
  function loadDetail(locale: string): Record<string, unknown> {
    const detail = (loadNamespace(locale, 'venue.json').detail ?? {}) as Record<string, unknown>;
    return detail;
  }

  for (const locale of LOCALES) {
    it(`drops the timeline block + sectionTitle/peakTime/bestWindow from venue.detail in ${locale}`, () => {
      const detail = loadDetail(locale);
      expect(detail).not.toHaveProperty('timeline');
      expect(detail).not.toHaveProperty('sectionTitle');
      expect(detail).not.toHaveProperty('peakTime');
      expect(detail).not.toHaveProperty('bestWindow');
    });

    it(`keeps venue.detail.openUntil (still read by the honest ÖPPET badge) in ${locale}`, () => {
      const detail = loadDetail(locale);
      expect(detail).toHaveProperty('openUntil');
      expect(typeof detail.openUntil).toBe('string');
    });
  }

  it('leaves no reader for the removed timeline keys anywhere in venue.json (both locales)', () => {
    // Belt-and-braces raw scan: guards against the keys reappearing under a
    // different parent path. Scoped to venue.json — `feedback.json` legitimately
    // has its own `sectionTitle` ("Omdömen"), which this story keeps.
    for (const locale of LOCALES) {
      const raw = readFileSync(path.join(MESSAGES_DIR, locale, 'venue.json'), 'utf8');
      expect(raw).not.toContain('"timeline"');
      expect(raw).not.toContain('"sectionTitle"');
      expect(raw).not.toContain('"peakTime"');
      expect(raw).not.toContain('"bestWindow"');
    }
  });
});
