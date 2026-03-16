import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ICONS_DIR = join(__dirname, '..', '..', 'public', 'icons');

const REQUIRED_ICONS = [
  'icon-120.png',
  'icon-152.png',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
];

describe('PWA icons', () => {
  for (const icon of REQUIRED_ICONS) {
    it(`${icon} exists and is a valid PNG`, () => {
      const iconPath = join(ICONS_DIR, icon);
      expect(existsSync(iconPath)).toBe(true);

      const buffer = readFileSync(iconPath);
      // PNG magic bytes
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4e); // N
      expect(buffer[3]).toBe(0x47); // G
    });
  }
});
