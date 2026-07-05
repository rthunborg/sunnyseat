/**
 * Story 11.5 (automate coverage) — `globals.css` design-token & CSS contract.
 *
 * AC1 (de-dull) and AC2 (living dot) live almost entirely in `globals.css`
 * tokens/keyframes plus one Tailwind opacity modifier in `MapContainer.tsx`.
 * Their runtime behaviour is asserted by the map/dot e2e (real browser, CSS
 * animations + media queries evaluated) — but that gate is slow and browser-
 * only. jsdom cannot run CSS animations or media queries, so the fast vitest
 * gate held NO regression guard for these CSS surfaces.
 *
 * This suite closes that gap with a source-level contract on the CSS (mirroring
 * the existing `MobileBottomSheet.test.tsx` globals.css token assertions and
 * the `UserPin`/`MapControls` source guards): it locks the pieces a careless
 * edit could silently break — the amber-location-dot token, the halo keyframes
 * + utility, the reduced-motion static override, and the de-dulled map tint
 * (sand wash `/20`, thinned gradient alpha). These assert STRUCTURE/RELATIVE
 * strength, never an exact eyeballed opacity (which Story 11.5 SET by a design
 * gate and may be re-tuned — outcome-asserting, per test-design "Risks to Plan").
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const globalsCss = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');
const mapContainerTsx = readFileSync(
  join(process.cwd(), 'components', 'custom', 'map', 'MapContainer.tsx'),
  'utf8',
);

describe('Story 11.5 — map-legibility & living-dot CSS contract (automate)', () => {
  describe('AC2 — location-dot token (R-016)', () => {
    it('defines the --color-amber-location-dot design token (no raw hex left in UserPin)', () => {
      // The token the tokenized UserPin fill references. If this row is deleted
      // the `var(--color-amber-location-dot)` fill resolves to nothing and the
      // dot goes transparent — a silent regression the jsdom test cannot see.
      expect(globalsCss).toMatch(/--color-amber-location-dot:\s*#[0-9a-fA-F]{6};/);
    });
  });

  describe('AC2 — pulsing halo keyframes + utility', () => {
    it('defines the user-location-halo keyframes as a GPU-friendly transform/opacity pulse', () => {
      // R-018: the pulse must be transform+opacity only (no layout/paint per
      // frame). Guard that the keyframe block exists and animates scale.
      const kf = globalsCss.match(/@keyframes\s+user-location-halo\s*\{[\s\S]*?\n\}/);
      expect(kf, 'user-location-halo keyframes block').not.toBeNull();
      expect(kf![0]).toMatch(/transform:\s*scale\(/);
      expect(kf![0]).toMatch(/opacity:/);
    });

    it('defines the animate-user-location-halo utility running the keyframes on an infinite loop', () => {
      const util = globalsCss.match(/@utility\s+animate-user-location-halo\s*\{[\s\S]*?\n\}/);
      expect(util, 'animate-user-location-halo utility block').not.toBeNull();
      expect(util![0]).toMatch(/animation:\s*user-location-halo[^;]*infinite/);
    });
  });

  describe('AC2 — reduced-motion static halo (Design Gate → Animation)', () => {
    it('pins the halo to a static resting state under prefers-reduced-motion: reduce', () => {
      // The reduced-motion user must see a steady halo, not the pulse. The e2e
      // asserts the computed animationName === 'none'; this locks the CSS rule
      // it keys off so a dropped media query is caught in the fast gate too.
      const mq = globalsCss.match(
        /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/,
      );
      expect(mq, 'prefers-reduced-motion media block').not.toBeNull();
      // The override targets the halo utility and disables the animation.
      expect(mq![0]).toContain('.animate-user-location-halo');
      expect(mq![0]).toMatch(/animation:\s*none/);
    });
  });

  describe('AC1 — de-dulled map tint (outcome: lighter, not an exact opacity)', () => {
    it('applies the sand wash at a light /20 opacity (dropped from the previous /80)', () => {
      // The dull sand layer that AC1 thinned. Guard the light-tint outcome via
      // the Tailwind opacity modifier — a regression back to a heavy /80 (or
      // any value ≥ /50) would re-dull the basemap.
      const match = mapContainerTsx.match(/bg-surface-sand\/(\d+)/);
      expect(match, 'bg-surface-sand opacity modifier').not.toBeNull();
      const opacity = Number(match![1]);
      expect(opacity).toBeLessThanOrEqual(25);
    });

    it('keeps the gradient-map-overlay alpha stops thinned to a light tint', () => {
      // The companion amber wash. Assert the strongest alpha stop is a light
      // value (≤ 0.05) so the "reduced to ~a quarter" outcome cannot silently
      // regress to the old heavy stops (0.1 / 0.05). Not an exact-value lock —
      // any light tint passes; a re-dull fails.
      const gradient = globalsCss.match(/--gradient-map-overlay:\s*[^;]+;/);
      expect(gradient, '--gradient-map-overlay declaration').not.toBeNull();
      const alphas = [...gradient![0].matchAll(/rgba\([^)]*,\s*([0-9.]+)\)/g)].map((m) =>
        Number(m[1]),
      );
      const maxAlpha = Math.max(...alphas);
      expect(maxAlpha).toBeGreaterThan(0); // still a visible warm tone remains
      expect(maxAlpha).toBeLessThanOrEqual(0.05);
    });
  });
});
