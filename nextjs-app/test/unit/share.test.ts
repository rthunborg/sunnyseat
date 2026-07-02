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

  it('tolerates a leading "?" or a bare search string identically', () => {
    // window.location.search carries a leading "?"; a hand-built search may not.
    // URLSearchParams treats a leading "?" as part of the first key, so the
    // builder must round-trip both forms to the same clean venue link.
    const withQ = buildVenueShareUrl('https://sunnyseat.app', '/', '?tags=rooftop', 'x');
    const withoutQ = buildVenueShareUrl('https://sunnyseat.app', '/', 'tags=rooftop', 'x');
    expect(withQ).toBe('https://sunnyseat.app/?venue=x');
    expect(withoutQ).toBe('https://sunnyseat.app/?venue=x');
  });

  it('drops the tag-filter param under BOTH the "tags" and legacy "tag" keys', () => {
    const url = buildVenueShareUrl(
      'https://sunnyseat.app',
      '/en',
      '?tag=rooftop&tags=terrace',
      'kafe-magasinet',
    );
    expect(url).toBe('https://sunnyseat.app/en?venue=kafe-magasinet');
  });

  it('does NOT strip a fragment/hash — it is not part of window.location.search', () => {
    // The builder only reconstructs origin+pathname+query; any hash the caller
    // passes in `search` is ignored, never leaked into the shared link.
    const url = buildVenueShareUrl('https://sunnyseat.app', '/', '?_time=14:00', 'x');
    expect(url).not.toContain('#');
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

  it('strips the sharer live planner/dev params from the recipient link', () => {
    // A sharer sitting on a dev-forced, time-planned, tag-filtered URL must hand
    // the recipient a clean venue link — the strip must apply to the LIVE search,
    // not just to a hand-built one.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'https://sunnyseat.app',
        pathname: '/en',
        search: '?_state=venue-detail&_time=14:00&_date=2026-07-01&tags=rooftop&venue=old',
      },
    });
    expect(currentVenueShareUrl('kafe-magasinet')).toBe(
      'https://sunnyseat.app/en?venue=kafe-magasinet',
    );
  });

  it('accepts a whitespace-only slug verbatim (slug filtering is MapView\'s job, not the builder\'s)', () => {
    // The builder only guards falsy slugs; a whitespace slug is truthy, so it is
    // preserved (URL-encoded). Whether such a slug resolves is a routing concern
    // exercised by MapView's deep-link tests, kept out of the pure builder.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://sunnyseat.app', pathname: '/', search: '' },
    });
    expect(currentVenueShareUrl(' ')).toBe('https://sunnyseat.app/?venue=+');
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

  it('reports "failed" when navigator.share throws SYNCHRONOUSLY (not just rejects)', async () => {
    // Some engines throw synchronously (e.g. a security error) instead of
    // returning a rejected promise. The try/catch must still keep the button
    // alive by routing to the modal fallback.
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: vi.fn(() => {
        throw new DOMException('Not allowed', 'NotAllowedError');
      }),
    });
    await expect(
      shareVenueNatively({ title: 'Kafé Magasinet', url: 'https://sunnyseat.app/?venue=x' }),
    ).resolves.toBe('failed');
  });

  it('classifies a NON-DOMException abort-named rejection as "failed", not "cancelled"', async () => {
    // The cancel path is pinned to a real DOMException AbortError. A plain Error
    // that merely borrows the name must NOT be mistaken for a user cancel — it
    // falls back to the modal so the share path is never silently swallowed.
    const abortLike = Object.assign(new Error('aborted'), { name: 'AbortError' });
    stubShare(() => Promise.reject(abortLike));
    await expect(
      shareVenueNatively({ title: 'Kafé Magasinet', url: 'https://sunnyseat.app/?venue=x' }),
    ).resolves.toBe('failed');
  });
});
