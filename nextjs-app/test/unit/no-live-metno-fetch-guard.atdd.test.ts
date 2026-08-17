/**
 * ATDD RED-PHASE scaffolds — Story 10.5 AC4 (net-new #2): the epic-wide
 * "no live Met.no in any test" shared-setup fetch guard.
 *
 * =========================================================================
 * WHY THIS GUARD EXISTS (retro-note 10.4 R1)
 * =========================================================================
 * A 10.4 unit test silently issued a REAL outbound fetch to
 * `api.met.no/nowcast/2.0/complete` via an un-mocked lazy-import path. It PASSED
 * only because the weather client swallows all errors → `undefined` (non-gating),
 * masking the live call. A green vitest run cannot detect a masked live call. The
 * 10.4 review fixed THAT test with a per-file `vi.mock`, but the retro-note
 * escalated it to an EPIC-WIDE invariant: the no-live-Met.no discipline needs an
 * explicit fetch-stub guard in the SHARED test setup, not just per-file mocks, so
 * a WHOLE CLASS of masked-live-call regressions becomes a hard failure.
 *
 * =========================================================================
 * WHAT THE DEV IMPLEMENTS (Story 10.5 Task 4)
 * =========================================================================
 * `test/setup/setup.ts` (the ONLY vitest `setupFiles` entry — verified: it has NO
 * global fetch stub today) gains a `beforeEach`/`afterEach` that installs a
 * `vi.stubGlobal('fetch', …)` wrapper which THROWS if any test attempts an
 * outbound request to an `api.met.no` host. Keep it surgical: allow same-origin /
 * relative URLs and MSW-style mocks; ONLY trap real `api.met.no` (and defensively
 * any absolute `http(s)://` to an external host IFF that does not break the
 * existing suite — verify against the full run; if it breaks, scope to
 * `api.met.no` only and note it in Completion Notes).
 *
 * =========================================================================
 * RED-PHASE STATUS
 * =========================================================================
 * `.skip`-gated so `vitest run` is green on HEAD before the guard lands. On HEAD
 * the guard does NOT exist, so `fetch('https://api.met.no/...')` would attempt a
 * REAL request (the exact regression class this guards) — these assertions are
 * RED until the dev adds the shared guard to `setup.ts`. The dev un-skips this
 * file AFTER wiring the guard and confirms it goes GREEN.
 *
 * NOTE ON MECHANISM: this test does NOT mock fetch itself — it relies on the
 * SHARED setup guard being active for every test. So the assertions here double
 * as the acceptance test FOR the guard: a rejected `api.met.no` call proves the
 * guard is installed; a permitted relative/same-origin call proves it is surgical
 * (does not break legitimate MSW / same-origin fetches).
 */

import { describe, expect, it } from 'vitest';

describe('[10.5 AC4] shared no-live-Met.no fetch guard (installed in test/setup/setup.ts)', () => {
  it('THROWS / rejects when any test attempts an outbound fetch to an api.met.no host', async () => {
    // Once the shared guard is active, this must be trapped — NOT allowed to
    // reach the network. A masked live call becomes a hard failure.
    await expect(
      fetch('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=57.7089&lon=11.9746'),
    ).rejects.toThrow(/met\.no|guard|live|forbidden/i);
  });

  it('THROWS / rejects for the nowcast host too (the exact 10.4 R1 masked-call path)', async () => {
    await expect(
      fetch('https://api.met.no/weatherapi/nowcast/2.0/complete?lat=57.7089&lon=11.9746'),
    ).rejects.toThrow(/met\.no|guard|live|forbidden/i);
  });

  it('does NOT trap same-origin / relative URLs (guard is surgical — legitimate mocks/fetches still work)', async () => {
    // A relative or same-origin request must NOT be blocked by the guard. In the
    // vitest/jsdom environment such a request will fail to CONNECT (there is no
    // server) — but it must fail with a NETWORK/connection error, NOT the guard's
    // "no live Met.no" error. If the dev scopes the guard to api.met.no only,
    // this passes trivially; if they extend it to all external hosts, the guard
    // must still allow relative/same-origin.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 100);
    let guardTripped = false;
    try {
      await fetch('/api/venues', { signal: controller.signal });
    } catch (err) {
      // Any error is acceptable EXCEPT the guard's own message — the guard must
      // not have fired for a relative URL.
      guardTripped = /no live met\.no|met\.no fetch guard|forbidden.*met/i.test(String(err));
    } finally {
      clearTimeout(timeout);
    }
    expect(guardTripped).toBe(false);
  });
});
