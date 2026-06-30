import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

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

const FORCED_DATE = '2026-07-01';
const FORCED_TIME = '13:00';

async function renderUnderEnv(nodeEnv: string) {
  vi.stubEnv('NODE_ENV', nodeEnv);
  const { useSearchParams } = await import('next/navigation');
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(
      `_time=${FORCED_TIME}&_date=${FORCED_DATE}`,
    ) as ReturnType<typeof useSearchParams>,
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

    expect(await screen.findByTestId('probe')).toHaveTextContent(
      `${FORCED_DATE} ${FORCED_TIME}`,
    );
    expect(useSearchParams).toHaveBeenCalled();
  });

  it('honours `?_time=`/`?_date=` in preview/test (non-production keeps forcing)', async () => {
    const { useSearchParams } = await renderUnderEnv('test');

    expect(await screen.findByTestId('probe')).toHaveTextContent(
      `${FORCED_DATE} ${FORCED_TIME}`,
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
});
