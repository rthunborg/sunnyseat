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
 * The rework removed the visible "Säkerhet: NN%" chip and the "Sol HH:mm–HH:mm"
 * window line from the quick-info card, which orphaned three `venue.quickInfo.*`
 * keys: `sunWindow` (only `quickInfoSunWindowTemplate` used it), `sunUnavailable`
 * (only the removed window line's fallback used it), and the already-unconsumed
 * `obscuredPosition` (defined but never wired). All three were deleted from BOTH
 * locales. This suite pins the DELETION so a reader can never silently render a
 * raw key, and confirms the KEPT `confidence*` keys stay (the sr-only accessible
 * confidence line still consumes them).
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

    it(`keeps the confidence* keys (still read by the sr-only accessible line) in ${locale}`, () => {
      const quickInfo = loadQuickInfo(locale);
      expect(quickInfo).toHaveProperty('confidence');
      expect(quickInfo).toHaveProperty('confidenceApproximate');
      expect(quickInfo).toHaveProperty('confidenceUnavailable');
    });
  }
});
