import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    let originalCreateElement: typeof document.createElement;

    beforeEach(() => {
      originalCreateElement = document.createElement.bind(document);
    });

    afterEach(() => {
      document.createElement = originalCreateElement;
      vi.restoreAllMocks();
    });

    function setupCanvasMock() {
      const mockImageData = { width: 56, height: 72, data: new Uint8ClampedArray(56 * 72 * 4) };
      const mockCtx = {
        beginPath: vi.fn(),
        arc: vi.fn(),
        quadraticCurveTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        getImageData: vi.fn().mockReturnValue(mockImageData),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        shadowColor: '',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      };
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockCtx),
      };

      document.createElement = vi.fn((tag: string) => {
        if (tag === 'canvas') return mockCanvas as unknown as HTMLCanvasElement;
        return originalCreateElement(tag);
      }) as typeof document.createElement;

      return { mockImageData, mockCtx, mockCanvas };
    }

    it('loads all pin images into the map', () => {
      const { mockImageData } = setupCanvasMock();

      const mockMap = {
        hasImage: vi.fn().mockReturnValue(false),
        addImage: vi.fn(),
      };

      loadPinIcons(mockMap);

      expect(mockMap.addImage).toHaveBeenCalledTimes(5);
      expect(mockMap.addImage).toHaveBeenCalledWith('pin-sunny', mockImageData, { pixelRatio: 2 });
      expect(mockMap.addImage).toHaveBeenCalledWith('pin-partner', mockImageData, { pixelRatio: 2 });
    });

    it('skips images already loaded', () => {
      const mockMap = {
        hasImage: vi.fn().mockReturnValue(true),
        addImage: vi.fn(),
      };

      loadPinIcons(mockMap);

      expect(mockMap.addImage).not.toHaveBeenCalled();
    });

    it('handles canvas failure gracefully', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock canvas to return null context
      document.createElement = vi.fn((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: vi.fn().mockReturnValue(null),
          } as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tag);
      }) as typeof document.createElement;

      const mockMap = {
        hasImage: vi.fn().mockReturnValue(false),
        addImage: vi.fn(),
      };

      // Should not throw — errors are caught per-icon
      loadPinIcons(mockMap);

      // Icons are skipped when canvas context is unavailable
      expect(mockMap.addImage).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(5);
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
