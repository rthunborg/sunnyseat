/**
 * COVERAGE EXPANSION — Story 10.5 AC4 net-new #2: the shared no-live-Met.no fetch
 * guard's HOST-MATCHING logic (`isApiMetNoRequest` in `test/setup/setup.ts`).
 *
 * =========================================================================
 * WHY THIS FILE IS NET-NEW (residual gap, NOT a matrix duplicate)
 * =========================================================================
 * The guard itself is the single highest-value regression guard the epic added
 * (retro-note 10.4 R1: a masked live Met.no call slipped a green vitest run). Its
 * acceptance test (`no-live-metno-fetch-guard.atdd.test.ts`, 3 tests) proves the
 * guard EXISTS and is surgical for the two happy-path shapes:
 *   - a string `https://api.met.no/...locationforecast` URL is rejected,
 *   - a string `https://api.met.no/...nowcast` URL is rejected,
 *   - a relative `/api/venues` URL is NOT trapped.
 *
 * But the guard's DISTINCTIVE host-matching edges — the exact code Story 10.5
 * authored — are unpinned. Those edges are precisely where a well-meaning future
 * edit silently re-opens the masked-live-call class this guard exists to close:
 *
 *   1. INPUT-SHAPE COVERAGE: `fetch` accepts `string | URL | Request`. The guard's
 *      `isApiMetNoRequest` branches on all three, but only the STRING shape is
 *      tested. The engine's real weather clients build requests in more than one
 *      shape; if a refactor passes a `URL` or `Request` object and the guard only
 *      recognised strings, a live call would leak — undetected.
 *   2. EXACT-HOST DISCIPLINE (the load-bearing decision): the guard matches
 *      `host === 'api.met.no'`, NOT `raw.includes('api.met.no')`. A naive
 *      substring rewrite would (a) FALSE-POSITIVE trap a benign
 *      `https://api.met.no.evil.example/...` suffix host, and (b) still pass the
 *      3 happy-path acceptance tests — so nothing catches the regression. And a
 *      prefix host `https://notapi.met.no/...` must NOT be a false match either.
 *   3. SURGICAL PASS-THROUGH (the deliberate scoping decision, flagged in the
 *      story's Completion Notes): the guard traps ONLY `api.met.no` and lets every
 *      OTHER external absolute host through, so benign absolute-URL fixtures (e.g.
 *      map-tile / thumbnail hosts) still work. No test guards this scope; a future
 *      broadening to "all external hosts" would silently break those fixtures.
 *
 * These are residual gaps AROUND net-new Story-10.5 code — they do NOT duplicate
 * the already-comprehensive engine/gate/effective-cover/confidence matrix, which
 * lives in the `*.atdd.test.ts` / `effective-cloud-cover.test.ts` suites.
 *
 * MECHANISM: like the acceptance test, this file does NOT mock fetch — it relies on
 * the SHARED setup guard being active for every test. A rejected `api.met.no` call
 * proves the guard fired; a NON-guard error (or resolution) for any other host
 * proves the guard stayed surgical. We distinguish the guard's own rejection from a
 * generic network failure by matching the guard's message text.
 */

import { describe, expect, it } from 'vitest';

// The guard's own error message (from `test/setup/setup.ts`). We assert on this
// specific text so a plain network/connection failure is never mistaken for the
// guard firing — the two must be told apart for the surgical-scope assertions.
const GUARD_MESSAGE = /api\.met\.no fetch guard|No live Met\.no fetch allowed/i;

/** Did the given rejection come from the guard (vs. a generic network error)? */
function isGuardRejection(err: unknown): boolean {
  return GUARD_MESSAGE.test(String((err as Error)?.message ?? err));
}

/** Attempt a fetch and report whether the GUARD (not the network) rejected it. */
async function guardTrippedFor(input: string | URL | Request): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 100);
  try {
    await fetch(input, { signal: controller.signal });
    return false; // resolved ⇒ guard did not fire
  } catch (err) {
    return isGuardRejection(err);
  } finally {
    clearTimeout(timeout);
  }
}

describe('[10.5 AC4 coverage] fetch-guard input-shape coverage (string | URL | Request)', () => {
  it('traps a URL-OBJECT request to api.met.no (not just string inputs)', async () => {
    const trapped = await guardTrippedFor(
      new URL('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=57.7089&lon=11.9746'),
    );
    expect(trapped).toBe(true);
  });

  it('traps a Request-OBJECT to api.met.no (the client may build a Request, not a string)', async () => {
    const trapped = await guardTrippedFor(
      new Request('https://api.met.no/weatherapi/nowcast/2.0/complete?lat=57.7089&lon=11.9746'),
    );
    expect(trapped).toBe(true);
  });

  it('traps a case-varied host (API.MET.NO) — host matching is case-insensitive', async () => {
    const trapped = await guardTrippedFor('https://API.MET.NO/weatherapi/locationforecast/2.0/complete');
    expect(trapped).toBe(true);
  });
});

describe('[10.5 AC4 coverage] fetch-guard EXACT-host discipline (no substring / subdomain spoofing)', () => {
  it('does NOT trap a SUFFIX-spoof host api.met.no.evil.example — exact host, never a substring match', async () => {
    // A naive `.includes("api.met.no")` rewrite would FALSE-POSITIVE trap this
    // benign third-party host (its hostname merely CONTAINS the string). The guard
    // must match the exact hostname `api.met.no`, so this must pass through and
    // fail (if at all) only with a NETWORK error — never the guard's message.
    const trapped = await guardTrippedFor('https://api.met.no.evil.example/steal?lat=1&lon=2');
    expect(trapped).toBe(false);
  });

  it('does NOT trap a PREFIX host notapi.met.no — it is not the live weather host', async () => {
    const trapped = await guardTrippedFor('https://notapi.met.no/weatherapi/locationforecast/2.0/complete');
    expect(trapped).toBe(false);
  });

  it('does NOT trap the met.no marketing apex (only the api.met.no data host is live-forbidden)', async () => {
    // Only `api.met.no` serves the live forecast/nowcast data the guard exists to
    // block. A different met.no host is not the masked-call risk and must not be
    // trapped, so the guard stays surgical.
    const trapped = await guardTrippedFor('https://www.met.no/en/about-us');
    expect(trapped).toBe(false);
  });
});

describe('[10.5 AC4 coverage] fetch-guard SURGICAL pass-through (other external hosts unaffected)', () => {
  it('does NOT trap an unrelated external absolute host (benign tile/thumbnail fixtures still work)', async () => {
    // The Completion-Notes scoping decision: the guard is deliberately scoped to
    // api.met.no ONLY, so benign absolute-URL fixtures some tests construct are not
    // trapped. A future broadening to "all external hosts" would silently break
    // them — this assertion is the regression net for that scope.
    const trapped = await guardTrippedFor('https://tiles.example.com/12/34/56.png');
    expect(trapped).toBe(false);
  });

  it('does NOT trap a same-origin ABSOLUTE URL (localhost) — only external api.met.no is forbidden', async () => {
    const trapped = await guardTrippedFor('http://localhost/api/venues');
    expect(trapped).toBe(false);
  });

  it('does NOT surface the GUARD error for a non-met.no / odd input — the guard degrades to "not met.no"', async () => {
    // `isApiMetNoRequest` parses against an `http://localhost` base and returns
    // false for anything that does not resolve to the `api.met.no` host (an odd or
    // relative-looking input resolves same-origin, never met.no). A parse failure
    // is likewise swallowed (returns false). Either way the guard must NOT fire, so
    // its message is never surfaced (a generic fetch/network error may still occur).
    const trapped = await guardTrippedFor('::::not-a-url::::');
    expect(trapped).toBe(false);
  });
});
