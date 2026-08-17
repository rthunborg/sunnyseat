import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { addDaysToDateKey, stockholmDateKey } from '@/lib/utils/time-planner';

/**
 * Story 9.0 regression guard: `?_time=`/`?_date=` planner-forcing must be
 * honoured only outside production. In production the gate must return the
 * un-forced provider tree (live clock / normal selection) and must NOT call
 * `useSearchParams` (proving the dev branch is DCE-eligible). Mirrors the
 * canonical pattern in `test/unit/use-forced-state.test.ts`.
 *
 * Each case stubs `NODE_ENV`, then `vi.resetModules()` + dynamic `import` so the
 * env-conditional branch in `SearchParamTimeProviders` is freshly evaluated.
 * `useTimeContext` (the probe's consumer) MUST be imported from the same fresh
 * module generation as `AppContextProviders`, otherwise the probe reads a
 * different `TimeContext` instance than the provider supplies.
 */

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}));

// The non-time providers wrapping the gate are irrelevant to this test and
// pull in heavy context (geolocation, map, settings modals + i18n). Replace
// them with transparent passthroughs so the test stays focused on the gate.
vi.mock('@/lib/contexts/MapInstanceContext', () => ({
  MapInstanceProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/contexts/MapSelectionContext', () => ({
  MapSelectionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/contexts/FavouritesContext', () => ({
  FavouritesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/hooks/useGeolocation', () => ({
  GeolocationProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/contexts/SettingsContext', () => ({
  SettingsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/custom/settings/SettingsModalRoot', () => ({
  SettingsModalRoot: () => null,
}));

// Story 11.2 (AC3): a forced/URL date outside the today->today+3 window now
// CLAMPS to today, so a far-future literal (previously 2999-12-31) would no
// longer round-trip in the dev/preview cases. Anchor the forced date to today+2
// (in-window) computed from the live clock, so:
//   - dev/preview: the in-window forced date IS applied and renders verbatim;
//   - production: the un-forced tree renders live *today* (today+0), which is
//     never today+2, so `not.toHaveTextContent(FORCED_DATE)` still holds.
// The load-bearing, time-independent proof remains
// `expect(useSearchParams).not.toHaveBeenCalled()`.
const FORCED_DATE = addDaysToDateKey(stockholmDateKey(new Date()), 2);
const FORCED_TIME = '13:00';

async function renderUnderEnv(
  nodeEnv: string,
  query = `_time=${FORCED_TIME}&_date=${FORCED_DATE}`,
) {
  vi.stubEnv('NODE_ENV', nodeEnv);
  const { useSearchParams } = await import('next/navigation');
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(query) as ReturnType<typeof useSearchParams>,
  );
  // Import the consumer hook from the SAME fresh module generation as the
  // provider tree below — `vi.resetModules()` in beforeEach means a statically
  // imported `useTimeContext` would read a stale `TimeContext` object.
  const { useTimeContext } = await import('@/lib/contexts/TimeContext');
  const { AppContextProviders } = await import(
    '@/components/custom/layout/AppContextProviders'
  );

  function Probe() {
    const { selectedDate, selectedTime } = useTimeContext();
    return <span data-testid="probe">{`${selectedDate} ${selectedTime}`}</span>;
  }

  render(
    <AppContextProviders>
      <Probe />
    </AppContextProviders>,
  );
  return { useSearchParams };
}

describe('AppContextProviders — `?_time=`/`?_date=` production gate', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('honours `?_time=`/`?_date=` in development (forces the planner)', async () => {
    const { useSearchParams } = await renderUnderEnv('development');

    await waitFor(() =>
      expect(screen.getByTestId('probe')).toHaveTextContent(
        `${FORCED_DATE} ${FORCED_TIME}`,
      ),
    );
    expect(useSearchParams).toHaveBeenCalled();
  });

  it('keeps the child tree mounted once while dev URL forcing syncs', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { useSearchParams } = await import('next/navigation');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(`_time=${FORCED_TIME}&_date=${FORCED_DATE}`) as ReturnType<
        typeof useSearchParams
      >,
    );
    const { AppContextProviders } = await import(
      '@/components/custom/layout/AppContextProviders'
    );
    const mountSpy = vi.fn();
    const unmountSpy = vi.fn();

    function ChildProbe() {
      useEffect(() => {
        mountSpy();
        return () => unmountSpy();
      }, []);
      return <span data-testid="child-probe">child</span>;
    }

    render(
      <AppContextProviders>
        <ChildProbe />
      </AppContextProviders>,
    );

    await waitFor(() =>
      expect(screen.getAllByTestId('child-probe')).toHaveLength(1),
    );
    expect(mountSpy).toHaveBeenCalledTimes(1);
    expect(unmountSpy).not.toHaveBeenCalled();
    expect(useSearchParams).toHaveBeenCalled();
  });

  it('honours `?_time=`/`?_date=` in preview/test (non-production keeps forcing)', async () => {
    const { useSearchParams } = await renderUnderEnv('test');

    await waitFor(() =>
      expect(screen.getByTestId('probe')).toHaveTextContent(
        `${FORCED_DATE} ${FORCED_TIME}`,
      ),
    );
    expect(useSearchParams).toHaveBeenCalled();
  });

  it('ignores `?_time=`/`?_date=` in production and never reads the URL', async () => {
    const { useSearchParams } = await renderUnderEnv('production');

    const probe = await screen.findByTestId('probe');
    // Production path renders the un-forced provider tree: the forced
    // 2026-07-01 date is never applied (the live/seed date is used instead).
    expect(probe).not.toHaveTextContent(FORCED_DATE);
    // `useSearchParams` is not called at all — the dev branch is unreachable
    // in production and DCE-eligible (zero-bundle-footprint contract).
    expect(useSearchParams).not.toHaveBeenCalled();
  });

  // The gate is a literal `=== 'production'` comparison, NOT an allowlist of
  // known dev envs. Any non-production NODE_ENV (here an arbitrary "preview"
  // string, as AC #1 calls out for preview builds) must keep forcing active.
  it('honours forcing for an arbitrary non-production env (e.g. preview)', async () => {
    const { useSearchParams } = await renderUnderEnv('preview');

    await waitFor(() =>
      expect(screen.getByTestId('probe')).toHaveTextContent(
        `${FORCED_DATE} ${FORCED_TIME}`,
      ),
    );
    expect(useSearchParams).toHaveBeenCalled();
  });

  // `?_time=` without `?_date=`: the time is forced and the date falls back to
  // today (stateFromForcedPlanner uses stockholmDateKey(clock()) when
  // forcedDate is absent). The existing dev/test cases always supply both
  // params, so this exercises the date-fallback branch that they do not.
  it('honours `?_time=` alone in development (forces time, date falls back to today)', async () => {
    const { useSearchParams } = await renderUnderEnv('development', `_time=${FORCED_TIME}`);

    // Time IS forced; the forced 2026-07-01 date is NOT applied (no `_date`),
    // so the date resolves to today rather than the forced date.
    await waitFor(() =>
      expect(screen.getByTestId('probe')).toHaveTextContent(FORCED_TIME),
    );
    const probe = screen.getByTestId('probe');
    expect(probe).not.toHaveTextContent(FORCED_DATE);
    expect(useSearchParams).toHaveBeenCalled();
  });

  // `?_date=` without `?_time=`: stateFromForcedPlanner returns null when
  // forcedTime is absent, so a date-only URL is a no-op even in development —
  // the forced 2026-07-01 date must NOT be applied. Guards against a regression
  // that would honour `_date` independently of `_time`.
  it('ignores `?_date=` alone in development (no `_time` ⇒ no forcing)', async () => {
    const { useSearchParams } = await renderUnderEnv('development', `_date=${FORCED_DATE}`);

    const probe = await screen.findByTestId('probe');
    expect(probe).not.toHaveTextContent(FORCED_DATE);
    // The URL was still read (dev branch is live), it simply produced no force.
    expect(useSearchParams).toHaveBeenCalled();
  });

  // Production gate fires regardless of which params are present: a `?_time=`
  // alone URL must still be ignored and never read in production.
  it('ignores `?_time=` alone in production and never reads the URL', async () => {
    const { useSearchParams } = await renderUnderEnv('production', `_time=${FORCED_TIME}`);

    const probe = await screen.findByTestId('probe');
    // Un-forced tree: the forced 2026-07-01 date is never pinned. (The forced
    // time is not asserted-absent here because the live clock could legitimately
    // read 13:00 — the load-bearing proof is that the URL is never read at all.)
    expect(probe).not.toHaveTextContent(FORCED_DATE);
    expect(useSearchParams).not.toHaveBeenCalled();
  });
});
