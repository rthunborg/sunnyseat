import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildVenueShareUrl,
  currentVenueShareUrl,
  shareVenueNatively,
} from '@/lib/utils/share';

/**
 * Story 9.8 — the shareable venue deep-link builder + native-share dispatch.
 *
 * The share URL REUSES the existing `?venue=<slug>` deep-link (see the MapView
 * deep-link-resolution tests) — this suite pins the URL SHAPE (locale prefix
 * preserved, planner/dev params dropped, slug encoded) and the capability-gated
 * native-share outcome semantics.
 */

describe('buildVenueShareUrl (AC1/AC3 — share URL shape)', () => {
  it('produces origin + pathname + ?venue=<slug> for the default (Swedish) locale', () => {
    expect(buildVenueShareUrl('https://sunnyseat.app', '/', '', 'kafe-magasinet')).toBe(
      'https://sunnyseat.app/?venue=kafe-magasinet',
    );
  });

  it('preserves the /en locale prefix so an English user shares an English link', () => {
    expect(buildVenueShareUrl('https://sunnyseat.app', '/en', '', 'kafe-magasinet')).toBe(
      'https://sunnyseat.app/en?venue=kafe-magasinet',
    );
  });

  it('encodes special characters in the slug', () => {
    expect(buildVenueShareUrl('https://sunnyseat.app', '/', '', 'kafé & co')).toContain(
      'venue=kaf%C3%A9+%26+co',
    );
  });

  it('drops the sharer planner/dev params (_state/_time/_date/tags) — a clean venue link', () => {
    const url = buildVenueShareUrl(
      'https://sunnyseat.app',
      '/',
      '?_state=venue-detail&_time=14:00&_date=2026-07-01&tags=rooftop',
      'kafe-magasinet',
    );
    expect(url).toBe('https://sunnyseat.app/?venue=kafe-magasinet');
    expect(url).not.toContain('_state');
    expect(url).not.toContain('_time');
    expect(url).not.toContain('_date');
    expect(url).not.toContain('tags');
  });

  it('overrides an existing venue param rather than duplicating it', () => {
    const url = buildVenueShareUrl(
      'https://sunnyseat.app',
      '/',
      '?venue=old-slug',
      'new-slug',
    );
    expect(url).toBe('https://sunnyseat.app/?venue=new-slug');
  });

  it('keeps unrelated query params the recipient may still want', () => {
    const url = buildVenueShareUrl(
      'https://sunnyseat.app',
      '/',
      '?ref=newsletter',
      'kafe-magasinet',
    );
    expect(url).toContain('ref=newsletter');
    expect(url).toContain('venue=kafe-magasinet');
  });
});

describe('currentVenueShareUrl (client-only reader)', () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('reads the live window.location for origin/pathname/search', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'https://sunnyseat.app',
        pathname: '/en',
        search: '?_time=14:00',
      },
    });
    expect(currentVenueShareUrl('kafe-magasinet')).toBe(
      'https://sunnyseat.app/en?venue=kafe-magasinet',
    );
  });

  it('returns null without a slug', () => {
    expect(currentVenueShareUrl(null)).toBeNull();
    expect(currentVenueShareUrl(undefined)).toBeNull();
    expect(currentVenueShareUrl('')).toBeNull();
  });
});

describe('shareVenueNatively (AC1 — capability-gated native share)', () => {
  const originalShare = Object.getOwnPropertyDescriptor(navigator, 'share');

  afterEach(() => {
    if (originalShare) {
      Object.defineProperty(navigator, 'share', originalShare);
    } else {
      // @ts-expect-error — test cleanup: remove the mocked capability.
      delete navigator.share;
    }
    vi.restoreAllMocks();
  });

  function stubShare(impl: (data: ShareData) => Promise<void>) {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: vi.fn(impl),
    });
    return navigator.share as unknown as ReturnType<typeof vi.fn>;
  }

  it('reports "unsupported" when navigator.share is absent (→ modal fallback)', async () => {
    if ('share' in navigator) {
      // @ts-expect-error — simulate a browser without the Web Share API.
      delete navigator.share;
    }
    await expect(
      shareVenueNatively({ title: 'Kafé Magasinet', url: 'https://sunnyseat.app/?venue=x' }),
    ).resolves.toBe('unsupported');
  });

  it('calls navigator.share with the payload and reports "shared" on success', async () => {
    const share = stubShare(() => Promise.resolve());
    const payload = {
      title: 'Kafé Magasinet',
      text: 'Kolla in soltiden',
      url: 'https://sunnyseat.app/?venue=kafe-magasinet',
    };
    await expect(shareVenueNatively(payload)).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(payload);
  });

  it('swallows a user-cancelled AbortError and reports "cancelled" (no error surfaced)', async () => {
    stubShare(() => Promise.reject(new DOMException('User cancelled', 'AbortError')));
    await expect(
      shareVenueNatively({ title: 'Kafé Magasinet', url: 'https://sunnyseat.app/?venue=x' }),
    ).resolves.toBe('cancelled');
  });

  it('reports "failed" for a non-abort rejection (→ modal fallback)', async () => {
    stubShare(() => Promise.reject(new DOMException('Denied', 'NotAllowedError')));
    await expect(
      shareVenueNatively({ title: 'Kafé Magasinet', url: 'https://sunnyseat.app/?venue=x' }),
    ).resolves.toBe('failed');
  });
});
