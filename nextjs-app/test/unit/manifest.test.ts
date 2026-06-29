import { describe, it, expect } from 'vitest';
import manifest from '@/app/manifest';

/**
 * Story 7.3 Task 10.3 — web app manifest smoke test. Pins the installability
 * fields (AC1) so a token rename or accidental field drop is caught before the
 * PWA stops being installable.
 */
describe('web app manifest (Story 7.3 AC1)', () => {
  it('emits the required installability fields', () => {
    const m = manifest();
    expect(m.name).toBe('SunnySeat');
    expect(m.short_name).toBe('SunnySeat');
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/');
    // Literal token values: --color-amber-primary / --color-surface-cream.
    expect(m.theme_color).toBe('#ffbf00');
    expect(m.background_color).toBe('#fdfaf4');
  });

  it('declares 192 + 512 icons including a maskable variant, all under /icons', () => {
    const icons = manifest().icons ?? [];
    const sizes = icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
    for (const icon of icons) {
      expect(icon.src).toMatch(/^\/icons\/.+\.png$/);
      expect(icon.type).toBe('image/png');
    }
  });
});
