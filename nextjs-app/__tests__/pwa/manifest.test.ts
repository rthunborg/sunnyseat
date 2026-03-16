import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('PWA manifest.json', () => {
  const manifestPath = join(__dirname, '..', '..', 'public', 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  it('has required name fields', () => {
    expect(manifest.name).toBe('SunnySeat — Hitta soliga uteplatser');
    expect(manifest.short_name).toBe('SunnySeat');
  });

  it('uses standalone display mode', () => {
    expect(manifest.display).toBe('standalone');
  });

  it('has correct theme and background colors', () => {
    expect(manifest.theme_color).toBe('#0EA5E9');
    expect(manifest.background_color).toBe('#FFFFFF');
  });

  it('has start_url set to root', () => {
    expect(manifest.start_url).toBe('/');
  });

  it('includes all required icon sizes', () => {
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('120x120');
    expect(sizes).toContain('152x152');
    expect(sizes).toContain('180x180');
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  it('has a maskable icon', () => {
    const maskable = manifest.icons.find(
      (i: { purpose?: string }) => i.purpose === 'maskable'
    );
    expect(maskable).toBeDefined();
    expect(maskable.sizes).toBe('512x512');
  });

  it('all icons are PNG type', () => {
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png');
    }
  });
});
