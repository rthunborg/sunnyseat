'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type { VenueDataDto } from '@/lib/types/api';
import {
  FIVE_MINUTES,
  normalizeVenueDetailQuery,
  venueDetailQueryOptions,
  type VenueDetailParams,
} from './venue-detail-query-options';

export const MAX_DETAIL_PREFETCH_CANDIDATES = 6;
export const DETAIL_PREFETCH_CONCURRENCY = 2;
export const DETAIL_PREFETCH_ERROR_COOLDOWN_MS = 60_000;

let venueDetailPrefetchCooldownUntil = 0;

type VenueDetailPrefetchVenue = Pick<
  VenueDataDto,
  'id' | 'slug' | 'venueSlug' | 'distanceMeters'
>;

type VenueDetailPrefetchCandidate = {
  id: string;
  slug: string;
  distanceMeters: number | undefined;
};

type PreparedVenueDetailPrefetchCandidate = VenueDetailPrefetchCandidate & {
  queryKey: QueryKey;
  queryKeyHash: string;
};

type VenueDetailPrefetchRun = {
  candidates: PreparedVenueDetailPrefetchCandidate[];
  inFlight: Map<string, PreparedVenueDetailPrefetchCandidate>;
  nextIndex: number;
  cancelled: boolean;
};

type VenueDetailPrefetchResult = 'success' | 'cancelled' | 'error';

export type UseVenueDetailPrefetchParams = {
  enabled: boolean;
  listMode: 'near' | 'favourites';
  listVenues: readonly VenueDetailPrefetchVenue[];
  favouriteVenueRows: readonly VenueDetailPrefetchVenue[];
  listSettled: boolean;
  favouritesSettled: boolean;
  detailParams: VenueDetailParams;
  interactionToken: number;
  preserveVenueSlug?: string | null;
};

export function useVenueDetailPrefetch({
  enabled,
  listMode,
  listVenues,
  favouriteVenueRows,
  listSettled,
  favouritesSettled,
  detailParams,
  interactionToken,
  preserveVenueSlug = null,
}: UseVenueDetailPrefetchParams): void {
  const queryClient = useQueryClient();
  const prefetchStartedRef = useRef(false);
  const initialPrefetchKeyRef = useRef<string | null>(null);
  const pendingStartRef = useRef<(() => void) | null>(null);
  const activeRunRef = useRef<VenueDetailPrefetchRun | null>(null);
  const surfaceSettled = listMode === 'favourites' ? favouritesSettled : listSettled;
  const plannerLocationKey = stablePlannerLocationKey(detailParams);
  const candidates = useMemo(
    () =>
      selectVenueDetailPrefetchCandidates({
        listMode,
        listVenues,
        favouriteVenueRows,
      }),
    [favouriteVenueRows, listMode, listVenues],
  );

  useEffect(() => {
    if (interactionToken === 0) return;
    const cancelPendingStart = pendingStartRef.current;
    if (cancelPendingStart) {
      cancelPendingStart();
      pendingStartRef.current = null;
      prefetchStartedRef.current = true;
      initialPrefetchKeyRef.current = plannerLocationKey;
    }
    cancelCandidateQueries(queryClient, activeRunRef.current, preserveVenueSlug);
  }, [interactionToken, plannerLocationKey, preserveVenueSlug, queryClient]);

  useEffect(() => {
    if (!prefetchStartedRef.current || !initialPrefetchKeyRef.current) return;
    if (initialPrefetchKeyRef.current === plannerLocationKey) return;
    cancelCandidateQueries(queryClient, activeRunRef.current, null);
  }, [plannerLocationKey, queryClient]);

  useEffect(() => {
    if (
      !enabled ||
      !surfaceSettled ||
      prefetchStartedRef.current ||
      pendingStartRef.current ||
      isVenueDetailPrefetchInCooldown() ||
      candidates.length === 0
    ) {
      return undefined;
    }

    const cancelIdleStart = scheduleDeterministicYield(() => {
      pendingStartRef.current = null;
      if (prefetchStartedRef.current) return;
      prefetchStartedRef.current = true;
      initialPrefetchKeyRef.current = plannerLocationKey;
      const run = createPrefetchRun(candidates, detailParams);
      activeRunRef.current = run;
      void runVenueDetailPrefetch(queryClient, run).finally(() => {
        if (activeRunRef.current === run) {
          activeRunRef.current = null;
        }
      });
    });
    pendingStartRef.current = cancelIdleStart;

    return () => {
      if (pendingStartRef.current === cancelIdleStart) {
        cancelIdleStart();
        pendingStartRef.current = null;
      }
    };
  }, [
    candidates,
    detailParams.date,
    detailParams.lat,
    detailParams.lng,
    detailParams.time,
    enabled,
    plannerLocationKey,
    queryClient,
    surfaceSettled,
  ]);
}

export async function prefetchSelectedVenueDetail(
  queryClient: QueryClient,
  slug: string | null | undefined,
  detailParams: VenueDetailParams,
): Promise<void> {
  const selectedSlug = safeVenueSlugFromValue(slug);
  if (!selectedSlug) return;
  try {
    await queryClient.prefetchQuery(
      venueDetailQueryOptions(selectedSlug, detailParams),
    );
  } catch {
    // Selected prefetch is an optimization only. The mounted detail query owns
    // user-facing retry/error UI if this speculative request fails.
  }
}

export function selectVenueDetailPrefetchCandidates({
  listMode,
  listVenues,
  favouriteVenueRows,
}: {
  listMode: 'near' | 'favourites';
  listVenues: readonly VenueDetailPrefetchVenue[];
  favouriteVenueRows: readonly VenueDetailPrefetchVenue[];
}): VenueDetailPrefetchCandidate[] {
  const primaryRows = listMode === 'favourites' ? favouriteVenueRows : listVenues;
  const fallbackRows = listMode === 'favourites' ? listVenues : favouriteVenueRows;
  const dedupeIds = new Set<string>();
  const dedupeSlugs = new Set<string>();
  const selected: VenueDetailPrefetchCandidate[] = [];

  appendCandidates(primaryRows, selected, dedupeIds, dedupeSlugs);
  if (selected.length < MAX_DETAIL_PREFETCH_CANDIDATES) {
    appendCandidates(
      [...fallbackRows].sort(compareNearestVenueRows),
      selected,
      dedupeIds,
      dedupeSlugs,
    );
  }
  return selected.slice(0, MAX_DETAIL_PREFETCH_CANDIDATES);
}

function appendCandidates(
  rows: readonly VenueDetailPrefetchVenue[],
  selected: VenueDetailPrefetchCandidate[],
  seenIds: Set<string>,
  seenSlugs: Set<string>,
): void {
  for (const venue of rows) {
    if (selected.length >= MAX_DETAIL_PREFETCH_CANDIDATES) return;
    const slug = safeVenueSlug(venue);
    if (!slug) continue;
    const id = venue.id.trim();
    if (!id || seenIds.has(id) || seenSlugs.has(slug)) continue;
    seenIds.add(id);
    seenSlugs.add(slug);
    selected.push({
      id,
      slug,
      distanceMeters: Number.isFinite(venue.distanceMeters)
        ? venue.distanceMeters
        : undefined,
    });
  }
}

function createPrefetchRun(
  candidates: readonly VenueDetailPrefetchCandidate[],
  detailParams: VenueDetailParams,
): VenueDetailPrefetchRun {
  return {
    candidates: candidates.map((candidate) => {
      const { queryKey } = normalizeVenueDetailQuery(candidate.slug, detailParams);
      return {
        ...candidate,
        queryKey,
        queryKeyHash: queryKeyHash(queryKey),
      };
    }),
    inFlight: new Map(),
    nextIndex: 0,
    cancelled: false,
  };
}

async function runVenueDetailPrefetch(
  queryClient: QueryClient,
  run: VenueDetailPrefetchRun,
): Promise<void> {
  while (!run.cancelled) {
    const batch = nextPrefetchBatch(queryClient, run);
    if (batch.length === 0) return;

    const results = await Promise.all(
      batch.map((candidate) => prefetchCandidate(queryClient, run, candidate)),
    );
    if (results.includes('error')) {
      run.cancelled = true;
      enterVenueDetailPrefetchCooldown();
      return;
    }
  }
}

function nextPrefetchBatch(
  queryClient: QueryClient,
  run: VenueDetailPrefetchRun,
): PreparedVenueDetailPrefetchCandidate[] {
  const batch: PreparedVenueDetailPrefetchCandidate[] = [];
  while (
    !run.cancelled &&
    batch.length < DETAIL_PREFETCH_CONCURRENCY &&
    run.nextIndex < run.candidates.length
  ) {
    const candidate = run.candidates[run.nextIndex];
    run.nextIndex += 1;
    if (isDetailQueryFresh(queryClient, candidate.queryKey)) continue;
    batch.push(candidate);
  }
  return batch;
}

async function prefetchCandidate(
  queryClient: QueryClient,
  run: VenueDetailPrefetchRun,
  candidate: PreparedVenueDetailPrefetchCandidate,
): Promise<VenueDetailPrefetchResult> {
  run.inFlight.set(candidate.queryKeyHash, candidate);
  try {
    await queryClient.prefetchQuery(
      venueDetailQueryOptions(candidate.slug, detailParamsFromQueryKey(candidate.queryKey)),
    );
  } catch {
    return run.cancelled ? 'cancelled' : 'error';
  } finally {
    run.inFlight.delete(candidate.queryKeyHash);
  }
  if (run.cancelled) return 'cancelled';

  // TanStack v5 prefetchQuery resolves void and suppresses errors, so inspect
  // the candidate query state after the shared retry/backoff policy has run.
  const state = queryClient.getQueryState(candidate.queryKey);
  if (state?.status !== 'error') return 'success';

  queryClient.removeQueries({ queryKey: candidate.queryKey, exact: true });
  return 'error';
}

function cancelCandidateQueries(
  queryClient: QueryClient,
  run: VenueDetailPrefetchRun | null,
  preserveSlug: string | null | undefined,
): void {
  if (!run) return;
  run.cancelled = true;
  const openedSlug = preserveSlug?.trim();
  for (const candidate of run.inFlight.values()) {
    // Critical Story 12.10 edge: preserve the opened exact key so the mounted
    // useVenueDetail observer can adopt an already in-flight Mer info request.
    if (openedSlug && candidate.slug === openedSlug) continue;
    cancelExactCandidateQuery(queryClient, candidate.queryKey);
  }
}

function cancelExactCandidateQuery(
  queryClient: QueryClient,
  queryKey: QueryKey,
): void {
  void queryClient.cancelQueries({ queryKey, exact: true }, { silent: true });
}

function isDetailQueryFresh(queryClient: QueryClient, queryKey: QueryKey): boolean {
  const state = queryClient.getQueryState(queryKey);
  if (!state || state.status !== 'success') return false;
  if (state.isInvalidated) return false;
  return Date.now() - state.dataUpdatedAt < FIVE_MINUTES;
}

function scheduleDeterministicYield(callback: () => void): () => void {
  if (
    typeof window !== 'undefined' &&
    typeof window.requestIdleCallback === 'function' &&
    typeof window.cancelIdleCallback === 'function'
  ) {
    const id = window.requestIdleCallback(callback, { timeout: 120 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 16);
  return () => window.clearTimeout(id);
}

function stablePlannerLocationKey(params: VenueDetailParams): string {
  const normalized = normalizeVenueDetailQuery('__prefetch_planner__', params);
  return queryKeyHash(normalized.queryKey);
}

function detailParamsFromQueryKey(queryKey: QueryKey): VenueDetailParams {
  const filters = Array.isArray(queryKey) && isPlainObject(queryKey[3])
    ? queryKey[3]
    : {};
  return {
    date: typeof filters.date === 'string' ? filters.date : undefined,
    time: typeof filters.time === 'string' ? filters.time : undefined,
    lat: typeof filters.lat === 'number' ? filters.lat : undefined,
    lng: typeof filters.lng === 'number' ? filters.lng : undefined,
  };
}

function safeVenueSlug(
  venue: VenueDetailPrefetchVenue,
): string | null {
  return safeVenueSlugFromValue(venue.slug || venue.venueSlug);
}

function safeVenueSlugFromValue(value: string | null | undefined): string | null {
  const slug = (value ?? '').trim();
  if (!slug || /[\u0000-\u001F\u007F-\u009F]/u.test(slug)) return null;
  return slug;
}

function compareNearestVenueRows(
  a: VenueDetailPrefetchVenue,
  b: VenueDetailPrefetchVenue,
): number {
  const distanceA = Number.isFinite(a.distanceMeters) ? a.distanceMeters : Number.POSITIVE_INFINITY;
  const distanceB = Number.isFinite(b.distanceMeters) ? b.distanceMeters : Number.POSITIVE_INFINITY;
  if (distanceA !== distanceB) return distanceA - distanceB;
  return safeVenueSlug(a)?.localeCompare(safeVenueSlug(b) ?? '') ?? 0;
}

function queryKeyHash(queryKey: QueryKey): string {
  return JSON.stringify(queryKey);
}

function enterVenueDetailPrefetchCooldown(now = Date.now()): void {
  venueDetailPrefetchCooldownUntil = Math.max(
    venueDetailPrefetchCooldownUntil,
    now + DETAIL_PREFETCH_ERROR_COOLDOWN_MS,
  );
}

export function isVenueDetailPrefetchInCooldown(now = Date.now()): boolean {
  return now < venueDetailPrefetchCooldownUntil;
}

export function __resetVenueDetailPrefetchCooldownForTests(): void {
  venueDetailPrefetchCooldownUntil = 0;
}

export function __enterVenueDetailPrefetchCooldownForTests(now = Date.now()): void {
  enterVenueDetailPrefetchCooldown(now);
}

export function __createVenueDetailPrefetchRunForTests(
  candidates: readonly VenueDetailPrefetchCandidate[],
  detailParams: VenueDetailParams,
): VenueDetailPrefetchRun {
  return createPrefetchRun(candidates, detailParams);
}

export async function __runVenueDetailPrefetchForTests(
  queryClient: QueryClient,
  run: VenueDetailPrefetchRun,
): Promise<void> {
  await runVenueDetailPrefetch(queryClient, run);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
