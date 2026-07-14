import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// Run after every test to tear down rendered trees and avoid cross-test leakage.
afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Story 10.5 AC4 (net-new #2) — the epic-wide "no live Met.no in any test"
// shared-setup fetch guard (retro-note 10.4 R1).
//
// A 10.4 unit test silently issued a REAL outbound fetch to
// `api.met.no/nowcast/2.0/complete` via an un-mocked lazy-import path. It passed
// only because the weather client swallows all errors → `undefined`
// (non-gating), masking the live call — a green vitest run cannot detect a
// masked live call. Per-file `vi.mock` fixed that one test, but the discipline
// needs an explicit guard in shared setup so a WHOLE CLASS of masked-live-call
// regressions becomes a HARD failure instead of a silent pass.
//
// SURGICAL SCOPE: the guard traps ONLY outbound requests whose host is
// `api.met.no` (the exact live weather host). Relative / same-origin URLs, MSW
// mocks, and any other absolute host pass through untouched, so legitimate
// fetch-based tests are unaffected. The full suite is verified green with this
// scope; broadening to all external hosts is deliberately avoided because it
// would trap benign absolute-URL fixtures (e.g. thumbnail image URLs) that some
// tests build. See Completion Notes.
const MET_NO_FETCH_GUARD_MESSAGE =
  'No live Met.no fetch allowed in tests (api.met.no fetch guard, Story 10.5 AC4). ' +
  'Mock @/lib/weather/met-no-service / @/lib/weather/nowcast-service (or inject an override) instead.';
const GOOGLE_PLACES_FETCH_GUARD_MESSAGE =
  'No live hours-provider fetch allowed in tests (Google Maps/Places host fetch guard, Story 12.1 AC1). ' +
  'Mock or inject the provider adapter instead; Google opening-hours content is prohibited.';

function requestHost(input: RequestInfo | URL): string | undefined {
  let raw: string;
  if (typeof input === 'string') {
    raw = input;
  } else if (input instanceof URL) {
    raw = input.href;
  } else if (typeof Request !== 'undefined' && input instanceof Request) {
    raw = input.url;
  } else {
    raw = String((input as { url?: unknown }).url ?? input);
  }
  // Only absolute URLs can target an external host. Parse against a dummy base
  // so relative URLs resolve to the (allowed) same-origin and never match.
  let host: string;
  try {
    host = new URL(raw, 'http://localhost').hostname.toLowerCase();
  } catch {
    return undefined;
  }
  return host.replace(/\.+$/, '');
}

function isApiMetNoRequest(input: RequestInfo | URL): boolean {
  return requestHost(input) === 'api.met.no';
}

function isGooglePlacesRequest(input: RequestInfo | URL): boolean {
  const host = requestHost(input);
  return host === 'places.googleapis.com' || host === 'maps.googleapis.com';
}

beforeEach(() => {
  const realFetch = globalThis.fetch;
  const guardedFetch: typeof fetch = async (input, init) => {
    if (isApiMetNoRequest(input as RequestInfo | URL)) {
      throw new Error(MET_NO_FETCH_GUARD_MESSAGE);
    }
    if (isGooglePlacesRequest(input as RequestInfo | URL)) {
      throw new Error(GOOGLE_PLACES_FETCH_GUARD_MESSAGE);
    }
    if (typeof realFetch === 'function') {
      // Force native fetch to expose redirects before following them. Otherwise
      // a harmless-looking URL can redirect to a live provider below this guard.
      // Follow allowed redirects explicitly, preserving the platform hop limit.
      let currentInput: RequestInfo | URL = input as RequestInfo | URL;
      let currentInit = init;
      for (let redirects = 0; redirects <= 10; redirects += 1) {
        const response = await realFetch(currentInput, {
          ...currentInit,
          redirect: 'manual',
        });
        if (response.status < 300 || response.status >= 400) return response;

        const location = response.headers.get('location');
        if (!location || currentInit?.redirect === 'manual') return response;
        if (currentInit?.redirect === 'error') {
          throw new TypeError('fetch redirect rejected by redirect:error');
        }
        if (redirects === 10) throw new TypeError('fetch redirect limit exceeded');

        const base =
          typeof currentInput === 'string'
            ? currentInput
            : currentInput instanceof URL
              ? currentInput.href
              : currentInput.url;
        const nextUrl = new URL(location, base);
        if (isApiMetNoRequest(nextUrl)) throw new Error(MET_NO_FETCH_GUARD_MESSAGE);
        if (isGooglePlacesRequest(nextUrl)) {
          throw new Error(GOOGLE_PLACES_FETCH_GUARD_MESSAGE);
        }

        const method = (
          currentInit?.method ??
          (typeof Request !== 'undefined' && currentInput instanceof Request
            ? currentInput.method
            : 'GET')
        ).toUpperCase();
        const switchToGet =
          response.status === 303 ||
          ((response.status === 301 || response.status === 302) && method === 'POST');
        currentInput = nextUrl;
        currentInit = switchToGet
          ? { ...currentInit, method: 'GET', body: undefined }
          : currentInit;
      }
    }
    // jsdom/node has no live server for same-origin/relative URLs; surface a
    // NETWORK-style failure (NOT the guard's message) so a surgical guard is
    // provable and legitimate mocks can still intercept before reaching here.
    throw new TypeError('fetch failed: no fetch implementation available in test env');
  };
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: guardedFetch,
  });
});

afterEach(() => {
  // The guard is re-installed fresh in each beforeEach; leave the current
  // reference in place between tests (vitest resets module state per file).
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
