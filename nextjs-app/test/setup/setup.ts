import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, vi } from 'vitest';

type MotionElementProps = React.HTMLAttributes<HTMLElement> & {
  animate?: unknown;
  exit?: unknown;
  initial?: unknown;
  layout?: unknown;
  transition?: {
    delay?: unknown;
    duration?: unknown;
    type?: unknown;
  };
  children?: React.ReactNode;
};

const MOTION_TEST_TAGS = [
  'aside',
  'button',
  'div',
  'form',
  'header',
  'li',
  'main',
  'nav',
  'p',
  'section',
  'span',
  'ul',
] as const;

function jsonMotionProp(value: unknown): string | undefined {
  return value === undefined ? undefined : JSON.stringify(value);
}

function transitionEndStyle(animate: unknown): React.CSSProperties | undefined {
  if (!animate || typeof animate !== 'object' || Array.isArray(animate)) {
    return undefined;
  }
  const transitionEnd = (animate as { transitionEnd?: unknown }).transitionEnd;
  if (
    !transitionEnd ||
    typeof transitionEnd !== 'object' ||
    Array.isArray(transitionEnd)
  ) {
    return undefined;
  }
  return transitionEnd as React.CSSProperties;
}

function createMotionTestElement(tagName: string) {
  return React.forwardRef<HTMLElement, MotionElementProps>(function MotionTestElement(
    {
      animate,
      children,
      exit,
      initial,
      layout: _layout,
      transition,
      ...props
    },
    ref,
  ) {
    const motionEndStyle = transitionEndStyle(animate);
    const style = motionEndStyle
      ? { ...props.style, ...motionEndStyle }
      : props.style;

    return React.createElement(
      tagName,
      {
        ...props,
        ref,
        style,
        'data-has-float': animate ? 'true' : 'false',
        'data-motion-animate': jsonMotionProp(animate),
        'data-motion-delay': transition ? String(transition.delay ?? '') : undefined,
        'data-motion-duration': transition ? String(transition.duration ?? '') : undefined,
        'data-motion-exit': jsonMotionProp(exit),
        'data-motion-height': animate
          ? String((animate as { height?: unknown }).height ?? '')
          : undefined,
        'data-motion-initial': jsonMotionProp(initial),
        'data-motion-type': transition ? String(transition.type ?? '') : undefined,
      },
      children,
    );
  });
}

const motionTestElements = Object.fromEntries(
  MOTION_TEST_TAGS.map((tagName) => [tagName, createMotionTestElement(tagName)]),
);

vi.mock('motion/react-m', () => motionTestElements);

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

const nativeFetch = globalThis.fetch;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECT_BODY_BYTES = 1024 * 1024;
const crossOriginSensitiveHeaders = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'cookie2',
];
const bodyHeaders = [
  'content-encoding',
  'content-language',
  'content-length',
  'content-location',
  'content-type',
  'transfer-encoding',
];

async function redirectedRequest(
  current: Request,
  status: number,
  nextUrl: URL,
): Promise<Request> {
  const method = current.method.toUpperCase();
  const switchToGet =
    (status === 303 && method !== 'GET' && method !== 'HEAD') ||
    ((status === 301 || status === 302) && method === 'POST');
  const nextMethod = switchToGet ? 'GET' : method;
  const headers = new Headers(current.headers);
  if (new URL(current.url).origin !== nextUrl.origin) {
    for (const name of crossOriginSensitiveHeaders) headers.delete(name);
  }
  if (switchToGet) {
    for (const name of bodyHeaders) headers.delete(name);
  }

  let body: ArrayBuffer | undefined;
  if (nextMethod !== 'GET' && nextMethod !== 'HEAD') {
    const declaredLength = Number(current.headers.get('content-length'));
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_REDIRECT_BODY_BYTES
    ) {
      throw new TypeError('fetch redirect body exceeds replay limit');
    }
    try {
      body = await current.clone().arrayBuffer();
    } catch {
      throw new TypeError('fetch redirect body is not replayable');
    }
    if (body.byteLength > MAX_REDIRECT_BODY_BYTES) {
      throw new TypeError('fetch redirect body exceeds replay limit');
    }
  }
  const requestInit: RequestInit & { duplex?: 'half' } = {
    method: nextMethod,
    headers,
    body,
    cache: current.cache,
    credentials: current.credentials,
    integrity: current.integrity,
    keepalive: current.keepalive,
    mode: current.mode,
    redirect: current.redirect,
    referrer: current.referrer,
    referrerPolicy: current.referrerPolicy,
    signal: current.signal,
  };
  if (body !== undefined) requestInit.duplex = 'half';
  return new Request(nextUrl, requestInit);
}

beforeEach(() => {
  const guardedFetch: typeof fetch = async (input, init) => {
    if (isApiMetNoRequest(input as RequestInfo | URL)) {
      throw new Error(MET_NO_FETCH_GUARD_MESSAGE);
    }
    if (isGooglePlacesRequest(input as RequestInfo | URL)) {
      throw new Error(GOOGLE_PLACES_FETCH_GUARD_MESSAGE);
    }
    if (typeof nativeFetch === 'function') {
      // Force native fetch to expose redirects before following them. Otherwise
      // a harmless-looking URL can redirect to a live provider below this guard.
      // Follow only Fetch-standard redirect statuses and rebuild every hop from
      // a normalized Request so method/body/header/redirect semantics survive.
      const normalizedInput =
        input instanceof Request
          ? input
          : new URL(String(input), window.location.href);
      let current = new Request(normalizedInput, init);
      for (let redirects = 0; redirects <= 20; redirects += 1) {
        if (isApiMetNoRequest(current)) {
          throw new Error(MET_NO_FETCH_GUARD_MESSAGE);
        }
        if (isGooglePlacesRequest(current)) {
          throw new Error(GOOGLE_PLACES_FETCH_GUARD_MESSAGE);
        }
        const response = await nativeFetch(current.clone(), {
          redirect: 'manual',
        });
        if (!redirectStatuses.has(response.status)) return response;
        if (current.redirect === 'manual') return response;
        if (current.redirect === 'error') {
          await response.body?.cancel().catch(() => undefined);
          throw new TypeError('fetch redirect rejected by redirect:error');
        }
        const location = response.headers.get('location');
        if (!location) return response;
        if (redirects === 20) {
          await response.body?.cancel().catch(() => undefined);
          throw new TypeError('fetch redirect limit exceeded');
        }
        const nextUrl = new URL(location, current.url);
        if (isApiMetNoRequest(nextUrl)) {
          await response.body?.cancel().catch(() => undefined);
          throw new Error(MET_NO_FETCH_GUARD_MESSAGE);
        }
        if (isGooglePlacesRequest(nextUrl)) {
          await response.body?.cancel().catch(() => undefined);
          throw new Error(GOOGLE_PLACES_FETCH_GUARD_MESSAGE);
        }
        await response.body?.cancel().catch(() => undefined);
        current = await redirectedRequest(current, response.status, nextUrl);
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

function createDefaultMatchMedia(): typeof window.matchMedia {
  return (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

beforeEach(() => {
  const defaultMatchMedia = createDefaultMatchMedia();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: defaultMatchMedia,
  });
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    writable: true,
    value: defaultMatchMedia,
  });
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
  // jsdom does not implement `Element.prototype.scrollIntoView`; the venue
  // search combobox calls it during keyboard navigation. Install a no-op so
  // combobox tests don't throw
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
