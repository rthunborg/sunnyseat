/**
 * Story 9.10 AC2 (net-new guard) — clean-URL date selection refetches with the
 * new date.
 *
 * The Story 9.0 prod-gate (`test/components/AppContextProviders.test.tsx`) proves
 * the OTHER half of the contract: a `?_date=`/`?_time=` URL is IGNORED in
 * production and never read. This guard proves the complement — that normal
 * IN-APP date selection on a CLEAN url (no `?_time=`/`?_date=` forcing at all)
 * still drives a fresh `/api/venues` request whose query key and request URL
 * carry the newly-selected future date.
 *
 * It mirrors the MapView wiring in miniature (real `TimeProvider` seeded with a
 * FIXED clock and NO forced planner, real `useVenueSearch`) against a mocked
 * `fetch`, so the behaviour is deterministic: selecting a future date flips
 * `plannerQuery` from `undefined` (live now → planner-less list key) to a
 * `{ date, time }` planner key, and the hook fires exactly one new
 * planner-keyed fetch carrying that date. Guards against a regression that would
 * leave in-app date selection stuck on the live/list key (no refetch).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { TimeProvider, useTimeContext } from '@/lib/contexts/TimeContext';
import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
import type { GetVenuesResponse } from '@/lib/types/api';

const SAMPLE_RESPONSE: GetVenuesResponse = {
  venues: [],
  meta: { count: 0, radiusKm: 1.5 },
  timestamp: '2026-05-20T10:00:00.000Z',
  totalCount: 0,
};

// A fixed clock so "today" and "live now" are deterministic. 10:15 UTC on
// 2026-05-20 is 12:15 CEST (May, +2), so today's date key is 2026-05-20.
const FIXED_NOW = new Date('2026-05-20T10:15:00.000Z');
const TODAY_KEY = '2026-05-20';
const FUTURE_DATE_KEY = '2026-05-23'; // three days out — inside the planner window

// Captures the params `useVenueSearch` is called with on each render + the
// request URLs `fetch` receives, so the test can assert both the query-key and
// the wire-level refetch carry the newly-selected date.
const searchParamsLog: Array<{ date?: string; time?: string }> = [];

function PlannerSearchHarness({
  onContext,
}: {
  onContext: (ctx: ReturnType<typeof useTimeContext>) => void;
}) {
  const plannerTime = useTimeContext();
  // NO `useDeferredValue` here: a date selection is a discrete commit (not a
  // rapid drag), so the plain planner key is what MapView feeds after the user
  // picks a date. This isolates the date-selection → refetch seam.
  useVenueSearch({
    lat: 57.7089,
    lng: 11.9746,
    radiusKm: 1.5,
    enabled: true,
    ...plannerTime.plannerQuery,
  });
  searchParamsLog.push({
    date: plannerTime.plannerQuery?.date,
    time: plannerTime.plannerQuery?.time,
  });
  onContext(plannerTime);
  return null;
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {/* Clean URL: no `forcedDate`/`forcedTime` — this is the production /
            normal in-app path, NOT the dev `?_time=` forcing path. */}
        <TimeProvider initialNowIso={FIXED_NOW.toISOString()} clock={() => FIXED_NOW}>
          {children}
        </TimeProvider>
      </QueryClientProvider>
    );
  };
}

describe('Story 9.10 AC2 — clean-URL date selection refetches with the new date', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  const fetchedUrls: string[] = [];

  beforeEach(() => {
    searchParamsLog.length = 0;
    fetchedUrls.length = 0;
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      fetchedUrls.push(String(input));
      return Promise.resolve(
        new Response(JSON.stringify(SAMPLE_RESPONSE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('selecting a future date flows the new date into the venue query and fires a fresh fetch', async () => {
    let ctx!: ReturnType<typeof useTimeContext>;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(<PlannerSearchHarness onContext={(c) => { ctx = c; }} />, {
      wrapper: makeWrapper(client),
    });

    // First paint is "live now" on today → planner-LESS list key → one live
    // fetch that carries NO date param.
    await waitFor(() => expect(ctx.isLiveNow).toBe(true));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(searchParamsLog.at(-1)).toEqual({ date: undefined, time: undefined });
    expect(fetchedUrls[0]).not.toContain('date=');

    // Select a FUTURE date (clean in-app selection, no URL forcing). The
    // provider must accept it and flip the planner key to carry that date.
    let accepted = false;
    await act(async () => {
      accepted = ctx.selectDate(FUTURE_DATE_KEY);
    });
    expect(accepted).toBe(true);

    // The query key now carries the newly-selected future date...
    await waitFor(() => {
      expect(searchParamsLog.at(-1)?.date).toBe(FUTURE_DATE_KEY);
    });
    expect(ctx.selectedDate).toBe(FUTURE_DATE_KEY);
    expect(ctx.mode).toBe('future');

    // ...and a FRESH `/api/venues` fetch fired for that date (the refetch AC2
    // demands — not left stuck on the live list key).
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    const plannerUrl = fetchedUrls.at(-1) ?? '';
    expect(plannerUrl).toContain(`date=${FUTURE_DATE_KEY}`);
    expect(plannerUrl).toContain('time=');
  });

  it('reselecting today returns to the planner-less live key (a date change back to now refetches the live list, not a stale planner)', async () => {
    let ctx!: ReturnType<typeof useTimeContext>;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(<PlannerSearchHarness onContext={(c) => { ctx = c; }} />, {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(ctx.isLiveNow).toBe(true));

    // Future → planner key.
    await act(async () => {
      ctx.selectDate(FUTURE_DATE_KEY);
    });
    await waitFor(() => expect(searchParamsLog.at(-1)?.date).toBe(FUTURE_DATE_KEY));

    // Back to today → planner-less live key (isLiveNow, plannerQuery undefined),
    // proving the date-selection seam works in BOTH directions.
    await act(async () => {
      ctx.selectDate(TODAY_KEY);
    });
    await waitFor(() => expect(ctx.isLiveNow).toBe(true));
    await waitFor(() =>
      expect(searchParamsLog.at(-1)).toEqual({ date: undefined, time: undefined }),
    );
  });
});
