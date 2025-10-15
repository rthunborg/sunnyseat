// test/setup.ts
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Polyfill Touch API for JSDOM mobile tests
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

// Mock matchMedia for viewport tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
