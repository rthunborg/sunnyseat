/**
 * Story 9.4 AC3 — Time-change debounce via `useDeferredValue`.
 *
 * MapView feeds the venue query a DEFERRED copy of `plannerTime.plannerQuery`
 * so a rapid slider drag (each snapped 15-min step flips the planner key)
 * enqueues at most ONE `/api/venues` request after the user settles, while the
 * thumb + time badge keep updating live off `selectedMinutes`/`selectedTime`.
 *
 * This mirrors the exact MapView wiring in miniature (real `TimeProvider` +
 * real `useVenueSearch` + `useDeferredValue`) against a mocked `fetch`, so the
 * behaviour is proven deterministically: settling ON the current wall-clock
 * time resolves to the planner-LESS live key; settling OFF it produces exactly
 * one planner-keyed fetch. The cross-cutting Playwright regression pass is
 * Story 9.10's job — this is the own-surface unit proof.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeferredValue, type ReactNode } from 'react';
import { TimeProvider, useTimeContext } from '@/lib/contexts/TimeContext';
import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
import type { GetVenuesResponse } from '@/lib/types/api';

const SAMPLE_RESPONSE: GetVenuesResponse = {
  venues: [],
  meta: { count: 0, radiusKm: 1.5 },
  timestamp: '2026-05-20T10:00:00.000Z',
  totalCount: 0,
};

// A fixed clock so "live now" is deterministic. The TimeProvider seeds
// `selectedTime` from this wall-clock formatted in Stockholm time: 10:15 UTC
// is 12:15 CEST (May, +2), so the live planner time is 12:15.
const FIXED_NOW = new Date('2026-05-20T10:15:00.000Z');
const LIVE_PLANNER_MINUTES = 12 * 60 + 15; // 12:15 Stockholm

// Captures the params `useVenueSearch` is called with on each render so the
// test can assert the DEFERRED planner key (date/time present or absent).
const searchParamsLog: Array<{ date?: string; time?: string }> = [];

/**
 * Miniature of MapView's AC3 wiring: defer the planner key, feed it to the
 * live venue search. Exposes the TimeContext so the test can drive the slider.
 */
function PlannerSearchHarness({
  onContext,
}: {
  onContext: (ctx: ReturnType<typeof useTimeContext>) => void;
}) {
  const plannerTime = useTimeContext();
  const deferredPlanner = useDeferredValue(plannerTime.plannerQuery);
  useVenueSearch({
    lat: 57.7089,
    lng: 11.9746,
    radiusKm: 1.5,
    enabled: true,
    ...deferredPlanner,
  });
  searchParamsLog.push({ date: deferredPlanner?.date, time: deferredPlanner?.time });
  onContext(plannerTime);
  return null;
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <TimeProvider initialNowIso={FIXED_NOW.toISOString()} clock={() => FIXED_NOW}>
          {children}
        </TimeProvider>
      </QueryClientProvider>
    );
  };
}

describe('Story 9.4 AC3 — deferred planner query', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    searchParamsLog.length = 0;
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_RESPONSE), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('a rapid sequence of time changes that settles OFF the live time enqueues at most one planner fetch', async () => {
    let ctx!: ReturnType<typeof useTimeContext>;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

    render(<PlannerSearchHarness onContext={(c) => { ctx = c; }} />, {
      wrapper: makeWrapper(client),
    });

    // First paint is "live now" → planner-less key → one live fetch.
    await waitFor(() => expect(ctx.isLiveNow).toBe(true));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(searchParamsLog[searchParamsLog.length - 1]).toEqual({ date: undefined, time: undefined });

    // Simulate a drag: several rapid snapped steps in one batch, settling on
    // 14:00 (off the 10:15 live time). The intermediate steps must NOT each
    // fire a fetch — only the settled value drives a single planner request.
    await act(async () => {
      ctx.setSelectedMinutes(11 * 60);
      ctx.setSelectedMinutes(12 * 60);
      ctx.setSelectedMinutes(13 * 60);
      ctx.setSelectedMinutes(14 * 60);
    });

    // Exactly one ADDITIONAL fetch (the settled planner key), not one per step.
    await waitFor(() => {
      const settled = searchParamsLog[searchParamsLog.length - 1];
      expect(settled).toEqual({ date: '2026-05-20', time: '14:00' });
    });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    // Hard guard against per-step churn: the live fetch + the single settled
    // planner fetch = 2 total, never the 4 a per-step coupling would produce.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('collapses a rapid multi-step drag into FEWER distinct planner query keys than slider steps (key-churn, not just fetch-count)', async () => {
    // Complements the fetch-count assertion above with the query-KEY view the
    // story calls out: `useVenueSearch` is the boundary the deferred planner
    // feeds, so the number of DISTINCT planner keys it observes across a rapid
    // drag is what determines query-key churn. With `useDeferredValue`, React
    // coalesces the intermediate snapped values, so the search sees far fewer
    // distinct keys than the count of `setSelectedMinutes` calls — never one
    // key per step. Asserting distinct-key COUNT (not wall-clock timing)
    // keeps this deterministic and non-flaky.
    let ctx!: ReturnType<typeof useTimeContext>;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

    render(<PlannerSearchHarness onContext={(c) => { ctx = c; }} />, {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(ctx.isLiveNow).toBe(true));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    const stepCount = 6;
    await act(async () => {
      // Six rapid snapped steps in one batch, settling on 16:00.
      ctx.setSelectedMinutes(11 * 60);
      ctx.setSelectedMinutes(12 * 60);
      ctx.setSelectedMinutes(13 * 60);
      ctx.setSelectedMinutes(14 * 60);
      ctx.setSelectedMinutes(15 * 60);
      ctx.setSelectedMinutes(16 * 60);
    });

    await waitFor(() =>
      expect(searchParamsLog[searchParamsLog.length - 1]).toEqual({
        date: '2026-05-20',
        time: '16:00',
      }),
    );

    // Count the DISTINCT planner keys the search hook was fed across the drag.
    const distinctPlannerKeys = new Set(
      searchParamsLog.map((p) => `${p.date ?? ''}|${p.time ?? ''}`),
    );
    // The drag fired 6 snapped steps; the deferred key must NOT produce one
    // distinct key per step. We assert it stayed strictly below the step
    // count (the live key + a small number of deferred snapshots ending on
    // 16:00), proving the per-step query-key churn was collapsed.
    expect(distinctPlannerKeys.size).toBeLessThan(stepCount);
    // The settled key is present and the live (planner-less) key was the start.
    expect(distinctPlannerKeys.has('2026-05-20|16:00')).toBe(true);
    expect(distinctPlannerKeys.has('|')).toBe(true);
    // And the network reflects the same collapse: live + one settled = 2.
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('settling the slider back ON the current live time resolves to the planner-LESS live key (not a stale planner no-op)', async () => {
    let ctx!: ReturnType<typeof useTimeContext>;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

    render(<PlannerSearchHarness onContext={(c) => { ctx = c; }} />, {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(ctx.isLiveNow).toBe(true));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    // Move OFF live → a planner key.
    await act(async () => {
      ctx.setSelectedMinutes(14 * 60);
    });
    await waitFor(() =>
      expect(searchParamsLog[searchParamsLog.length - 1]).toEqual({
        date: '2026-05-20',
        time: '14:00',
      }),
    );
    expect(ctx.isLiveNow).toBe(false);

    // Settle BACK onto the live wall-clock time (12:15 Stockholm) → planner-
    // less live key, reading as an intentional "live now" state, NOT a silent
    // no-op stuck on the stale 14:00 planner key.
    await act(async () => {
      ctx.setSelectedMinutes(LIVE_PLANNER_MINUTES);
    });
    await waitFor(() => expect(ctx.isLiveNow).toBe(true));
    await waitFor(() =>
      expect(searchParamsLog[searchParamsLog.length - 1]).toEqual({
        date: undefined,
        time: undefined,
      }),
    );
  });
});
