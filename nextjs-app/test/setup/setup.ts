import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// Run after every test to tear down rendered trees and avoid cross-test leakage.
afterEach(() => {
  cleanup();
});

// Node 25 ships an experimental native `localStorage` global that masks
// jsdom's. With the `--localstorage-file` argv missing, the native one
// becomes a non-functional `{}` (no `getItem` / `setItem` methods). Install
// a real in-memory Storage polyfill on `window.localStorage` for every
// test so app code can call `localStorage.getItem(...)` as it does in
// the browser. Reset between tests to avoid cross-test leakage.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: new MemoryStorage(),
  });
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    writable: true,
    value: new MemoryStorage(),
  });
  // jsdom does not implement `Element.prototype.scrollIntoView`; cmdk
  // (the venue-search combobox) calls it on keyboard navigation / when a
  // second option is present. Install a no-op so combobox tests don't throw
  // `scrollIntoView is not a function`.
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView(): void {};
  }
  if (!('ResizeObserver' in window)) {
    class TestResizeObserver implements ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: TestResizeObserver,
    });
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: TestResizeObserver,
    });
  }
});
