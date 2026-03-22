import { describe, it, expect, vi } from 'vitest';
import {
  pinIconDataUrl,
  allPinIconDataUrls,
  loadPinIcons,
  PIN_ANCHOR,
  PIN_ICON_SIZE,
} from '@/lib/map/venue-pin-icons';

describe('venue-pin-icons', () => {
  describe('pinIconDataUrl', () => {
    it('returns a data URL for known statuses', () => {
      for (const status of ['sunny', 'partial', 'shaded', 'upcoming', 'partner']) {
        const url = pinIconDataUrl(status);
        expect(url).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
        expect(url).toContain('svg');
      }
    });

    it('returns shaded color for unknown status', () => {
      const url = pinIconDataUrl('unknown-status');
      // Should use fallback (shaded) colors
      expect(url).toContain(encodeURIComponent('#6B7280'));
    });

    it('each status produces a unique SVG', () => {
      const sunny = pinIconDataUrl('sunny');
      const partial = pinIconDataUrl('partial');
      const shaded = pinIconDataUrl('shaded');
      expect(sunny).not.toBe(partial);
      expect(partial).not.toBe(shaded);
    });

    it('sunny pin uses green fill', () => {
      const url = pinIconDataUrl('sunny');
      expect(url).toContain(encodeURIComponent('#16A34A'));
    });

    it('partner pin uses gold fill', () => {
      const url = pinIconDataUrl('partner');
      expect(url).toContain(encodeURIComponent('#FFD700'));
    });
  });

  describe('allPinIconDataUrls', () => {
    it('returns all five status keys', () => {
      const urls = allPinIconDataUrls();
      expect(Object.keys(urls)).toEqual(
        expect.arrayContaining(['sunny', 'partial', 'shaded', 'upcoming', 'partner']),
      );
      expect(Object.keys(urls)).toHaveLength(5);
    });

    it('all values are data URLs', () => {
      const urls = allPinIconDataUrls();
      for (const url of Object.values(urls)) {
        expect(url).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
      }
    });
  });

  describe('loadPinIcons', () => {
    it('loads all pin images into the map', async () => {
      const mockMap = {
        hasImage: vi.fn().mockReturnValue(false),
        loadImage: vi.fn().mockResolvedValue({ data: 'mock-image-data' }),
        addImage: vi.fn(),
      };

      await loadPinIcons(mockMap);

      expect(mockMap.loadImage).toHaveBeenCalledTimes(5);
      expect(mockMap.addImage).toHaveBeenCalledTimes(5);
      expect(mockMap.addImage).toHaveBeenCalledWith('pin-sunny', 'mock-image-data', { pixelRatio: 2 });
      expect(mockMap.addImage).toHaveBeenCalledWith('pin-partner', 'mock-image-data', { pixelRatio: 2 });
    });

    it('skips images already loaded', async () => {
      const mockMap = {
        hasImage: vi.fn().mockReturnValue(true),
        loadImage: vi.fn(),
        addImage: vi.fn(),
      };

      await loadPinIcons(mockMap);

      expect(mockMap.loadImage).not.toHaveBeenCalled();
      expect(mockMap.addImage).not.toHaveBeenCalled();
    });

    it('handles loadImage failure gracefully', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockMap = {
        hasImage: vi.fn().mockReturnValue(false),
        loadImage: vi.fn().mockRejectedValue(new Error('Network error')),
        addImage: vi.fn(),
      };

      // Should not throw
      await loadPinIcons(mockMap);

      expect(warnSpy).toHaveBeenCalled();
      expect(mockMap.addImage).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('constants', () => {
    it('PIN_ANCHOR is bottom-center', () => {
      expect(PIN_ANCHOR).toEqual([0.5, 1.0]);
    });

    it('PIN_ICON_SIZE is reasonable', () => {
      expect(PIN_ICON_SIZE).toBeGreaterThan(0);
      expect(PIN_ICON_SIZE).toBeLessThanOrEqual(2);
    });
  });
});
