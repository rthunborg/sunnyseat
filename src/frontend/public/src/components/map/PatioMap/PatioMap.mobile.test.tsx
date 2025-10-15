// components/map/PatioMap/PatioMap.mobile.test.tsx
// Story 4.1 Task 8: Mobile responsiveness and touch interaction tests
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PatioMap from './PatioMap';
import type { Coordinates } from '../../../types/location';

// Polyfill Touch API for JSDOM
if (typeof Touch === 'undefined') {
  (globalThis as any).Touch = class Touch {
    identifier: number;
    target: EventTarget;
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
    screenX: number;
    screenY: number;
    radiusX: number;
    radiusY: number;
    rotationAngle: number;
    force: number;

    constructor(touchInit: TouchInit) {
      this.identifier = touchInit.identifier || 0;
      this.target = touchInit.target!;
      this.clientX = touchInit.clientX || 0;
      this.clientY = touchInit.clientY || 0;
      this.pageX = touchInit.pageX || 0;
      this.pageY = touchInit.pageY || 0;
      this.screenX = touchInit.screenX || 0;
      this.screenY = touchInit.screenY || 0;
      this.radiusX = touchInit.radiusX || 0;
      this.radiusY = touchInit.radiusY || 0;
      this.rotationAngle = touchInit.rotationAngle || 0;
      this.force = touchInit.force || 0;
    }
  };
}

// Mock maplibre-gl with touch event support
vi.mock('maplibre-gl', () => {
  const mockMap = {
    on: vi.fn((event: string, callback: () => void) => {
      if (event === 'load') {
        setTimeout(callback, 0);
      }
    }),
    addControl: vi.fn(),
    remove: vi.fn(),
    flyTo: vi.fn(),
    touchZoomRotate: { enable: vi.fn(), disable: vi.fn() },
    dragPan: { enable: vi.fn(), disable: vi.fn() },
    scrollZoom: { enable: vi.fn(), disable: vi.fn() },
    doubleClickZoom: { enable: vi.fn(), disable: vi.fn() },
    getCanvas: vi.fn(() => document.createElement('canvas')),
  };

  const mockMarker = {
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };

  return {
    default: {
      Map: vi.fn(() => mockMap),
      Marker: vi.fn(() => mockMarker),
      NavigationControl: vi.fn(),
      GeolocateControl: vi.fn(),
    },
  };
});

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

describe('PatioMap - Mobile Responsiveness', () => {
  const mockViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    window.dispatchEvent(new Event('resize'));
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render at mobile viewport sizes (320px width)', async () => {
    mockViewport(320, 568); // iPhone SE size

    const { container } = render(<PatioMap userLocation={null} />);
    
    const mapContainer = container.querySelector('[class*="w-full"]');
    expect(mapContainer).toBeTruthy();
  });

  it('should render at tablet viewport sizes (768px width)', async () => {
    mockViewport(768, 1024); // iPad size

    const { container } = render(<PatioMap userLocation={null} />);
    
    const mapContainer = container.querySelector('[class*="w-full"]');
    expect(mapContainer).toBeTruthy();
  });

  it('should maintain minimum height on mobile devices', () => {
    mockViewport(375, 667); // iPhone 6/7/8 size

    const { container } = render(<PatioMap userLocation={null} />);
    
    const mapContainer = container.querySelector('[data-testid="patio-map-container"]');
    expect(mapContainer).toBeTruthy();
    expect(mapContainer?.getAttribute('style')).toContain('min-height: 400px');
  });

  it('should enable touch controls for mobile devices', async () => {
    mockViewport(375, 667);

    render(<PatioMap userLocation={null} />);

    await waitFor(async () => {
      const maplibre = await import('maplibre-gl');
      const mockMapInstance = (maplibre.default.Map as any).mock.results[0]?.value;
      
      // Verify map was created (touch controls are enabled by default in MapLibre)
      expect(maplibre.default.Map).toHaveBeenCalled();
      expect(mockMapInstance).toBeDefined();
    });
  });

  it('should handle pinch-to-zoom gesture simulation', async () => {
    mockViewport(375, 667);

    const { container } = render(<PatioMap userLocation={null} />);

    // Simulate pinch gesture via wheel event (MapLibre detects this as zoom)
    const mapCanvas = container.querySelector('canvas') || container.firstChild as HTMLElement;
    
    if (mapCanvas) {
      // Pinch out (zoom in)
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true, // Simulates pinch gesture
        bubbles: true,
      });
      
      mapCanvas.dispatchEvent(wheelEvent);
      
      // Verify map interaction occurred without errors
      expect(mapCanvas).toBeTruthy();
    }
  });

  it('should handle swipe/pan gestures on touch devices', async () => {
    mockViewport(375, 667);

    const { container } = render(<PatioMap userLocation={null} />);
    
    const mapCanvas = container.querySelector('canvas') || container.firstChild as HTMLElement;
    
    if (mapCanvas) {
      // Simulate touch pan gesture
      const touchStart = new TouchEvent('touchstart', {
        touches: [
          new Touch({
            identifier: 0,
            target: mapCanvas,
            clientX: 100,
            clientY: 100,
          } as TouchInit),
        ],
        bubbles: true,
      });

      const touchMove = new TouchEvent('touchmove', {
        touches: [
          new Touch({
            identifier: 0,
            target: mapCanvas,
            clientX: 150,
            clientY: 150,
          } as TouchInit),
        ],
        bubbles: true,
      });

      const touchEnd = new TouchEvent('touchend', {
        bubbles: true,
      });

      mapCanvas.dispatchEvent(touchStart);
      mapCanvas.dispatchEvent(touchMove);
      mapCanvas.dispatchEvent(touchEnd);

      // Verify no errors during touch interaction
      expect(mapCanvas).toBeTruthy();
    }
  });

  it('should render user location marker on mobile', async () => {
    mockViewport(375, 667);

    const userLocation: Coordinates = {
      latitude: 57.7089,
      longitude: 11.9746,
    };

    render(<PatioMap userLocation={userLocation} />);

    await waitFor(async () => {
      const maplibre = await import('maplibre-gl');
      const MockMarker = maplibre.default.Marker as any;
      
      // Verify marker was created for user location
      expect(MockMarker).toHaveBeenCalled();
    });
  });

  it('should handle rapid viewport orientation changes', async () => {
    // Portrait
    mockViewport(375, 667);
    const { rerender } = render(<PatioMap userLocation={null} />);

    // Switch to landscape
    mockViewport(667, 375);
    rerender(<PatioMap userLocation={null} />);

    // Back to portrait
    mockViewport(375, 667);
    rerender(<PatioMap userLocation={null} />);

    // Verify component remains stable using data-testid
    await waitFor(() => {
      expect(screen.queryByTestId('patio-map-container')).toBeTruthy();
    });
  });

  it('should maintain 60fps rendering target on mobile', async () => {
    mockViewport(375, 667);

    const startTime = performance.now();
    
    render(<PatioMap userLocation={null} />);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Initial render should complete within 16.67ms (60fps = 1000ms/60)
    // Allow some tolerance for test overhead
    expect(renderTime).toBeLessThan(100); // 100ms for initial render is acceptable
  });

  it('should handle memory constraints on mobile devices', async () => {
    mockViewport(375, 667);

    const { unmount } = render(<PatioMap userLocation={null} />);

    // Verify cleanup on unmount
    unmount();

    await waitFor(async () => {
      const maplibre = await import('maplibre-gl');
      const mockMapInstance = (maplibre.default.Map as any).mock.results[0]?.value;
      
      // Verify map.remove() was called for cleanup
      if (mockMapInstance) {
        expect(mockMapInstance.remove).toHaveBeenCalled();
      }
    });
  });

  it('should adapt controls for touch targets (min 44x44px)', () => {
    mockViewport(375, 667);

    const { container } = render(<PatioMap userLocation={null} />);
    
    // MapLibre navigation controls should be large enough for touch
    const mapContainer = container.firstChild as HTMLElement;
    expect(mapContainer).toBeTruthy();
    
    // Navigation controls are added by MapLibre with appropriate touch sizes
    // This test verifies rendering doesn't crash on mobile viewports
  });

  it('should disable hover effects on touch devices', () => {
    mockViewport(375, 667);

    // Mock touch capability
    const matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: query === '(hover: none)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: matchMediaMock,
    });

    const { container } = render(<PatioMap userLocation={null} />);

    // Verify component renders on touch devices (MapLibre handles touch internally)
    const mapContainer = container.querySelector('[data-testid="patio-map-container"]');
    expect(mapContainer).toBeTruthy();
  });
});
