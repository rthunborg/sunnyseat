/**
 * Story 12.6 ATDD RED scaffolds for the shared public-sun domain contract.
 */
import { describe, expect, test } from 'vitest';

type WeatherGateState = 'gated' | 'not_gated' | 'unknown';
type DirectSunState = 'likely' | 'blocked' | 'unknown';

type PublicSunVenue = {
  id: string;
  sunExposurePercent: number;
  weatherGateState: WeatherGateState;
  directSunState: DirectSunState;
  distanceMeters: number;
  currentSunStatus?: string;
  confidence?: number;
};

type PublicSunStep = {
  minutes: number;
  sunExposurePercent: number;
  weatherGateState: WeatherGateState;
  directSunState: DirectSunState;
  currentSunStatus?: string;
};

type PublicSunModule = {
  isVenuePubliclySunny: (venue: Pick<PublicSunVenue, 'sunExposurePercent' | 'weatherGateState' | 'directSunState'>) => boolean;
  compareVenuesByPublicSun: (left: PublicSunVenue, right: PublicSunVenue) => number;
  extractPublicSunWindow: (
    series: PublicSunStep[],
    options: { stepMinutes: number },
  ) => {
    startMinutes: number;
    endMinutes: number;
    weatherGateState: 'not_gated';
    status: 'Sunny' | 'Partial';
  } | null;
  extractPublicSunPeak: (series: PublicSunStep[]) => PublicSunStep | null;
};

const publicSunModulePath = '@/lib/utils/public-sun';

async function loadPublicSun(): Promise<PublicSunModule> {
  return (await import(publicSunModulePath)) as PublicSunModule;
}

describe('Story 12.6 - one public sunny predicate', () => {
  test.each([
    ['exactly 50 is not sunny', 50, 'not_gated', 'likely', 'Sunny', 99, false],
    ['just above 50 is sunny only when likely', 50.01, 'not_gated', 'likely', 'Shaded', 1, true],
    ['40% Partial remains not sunny', 40, 'not_gated', 'likely', 'Partial', 99, false],
    ['gated high exposure remains not sunny', 95, 'gated', 'blocked', 'CloudObscured', 99, false],
    ['contradictory gated likely evidence remains not sunny', 95, 'gated', 'likely', 'CloudObscured', 99, false],
    ['unknown high exposure retains geometry but is not sunny', 95, 'unknown', 'unknown', 'Sunny', 1, false],
  ] as const)(
    '[P0] %s',
    async (_label, sunExposurePercent, weatherGateState, directSunState, currentSunStatus, confidence, expected) => {
      const { isVenuePubliclySunny } = await loadPublicSun();

      expect(
        isVenuePubliclySunny({
          sunExposurePercent,
          weatherGateState,
          directSunState,
          currentSunStatus,
          confidence,
        } as PublicSunVenue),
      ).toBe(expected);
    },
  );

  test('[P0] confidence and diagnostic status never change an explicit direct-sun verdict', async () => {
    const { isVenuePubliclySunny } = await loadPublicSun();
    const invariant = [
      { sunExposurePercent: 51, weatherGateState: 'not_gated', directSunState: 'likely', currentSunStatus: 'NoSun', confidence: 0 },
      { sunExposurePercent: 51, weatherGateState: 'not_gated', directSunState: 'likely', currentSunStatus: 'Sunny', confidence: 100 },
    ] as const;

    expect(invariant.map((venue) => isVenuePubliclySunny(venue))).toEqual([true, true]);
  });
});

describe('Story 12.6 - total comparator, window, and peak', () => {
  test('[P0] orders sunny band, exposure, distance, then stable ID deterministically', async () => {
    const { compareVenuesByPublicSun } = await loadPublicSun();
    const venues: PublicSunVenue[] = [
      { id: 'grey-100', sunExposurePercent: 100, weatherGateState: 'gated', directSunState: 'blocked', distanceMeters: 1 },
      { id: 'grey-80', sunExposurePercent: 80, weatherGateState: 'unknown', directSunState: 'unknown', distanceMeters: 100 },
      { id: 'sun-a', sunExposurePercent: 80, weatherGateState: 'not_gated', directSunState: 'likely', distanceMeters: 100 },
      { id: 'sun-51', sunExposurePercent: 51, weatherGateState: 'not_gated', directSunState: 'likely', distanceMeters: 0 },
      { id: 'grey-50', sunExposurePercent: 50, weatherGateState: 'not_gated', directSunState: 'blocked', distanceMeters: 0 },
    ];

    const expected = ['sun-a', 'sun-51', 'grey-100', 'grey-80', 'grey-50'];
    for (let run = 0; run < 10; run += 1) {
      expect([...venues].reverse().sort(compareVenuesByPublicSun).map((venue) => venue.id)).toEqual(expected);
    }
  });

  test('[P0] extracts the longest contiguous qualifying window and chooses the earliest tie', async () => {
    const { extractPublicSunWindow } = await loadPublicSun();
    const series: PublicSunStep[] = [
      { minutes: 360, sunExposurePercent: 51, weatherGateState: 'unknown', directSunState: 'unknown' },
      { minutes: 375, sunExposurePercent: 70, weatherGateState: 'not_gated', directSunState: 'likely', currentSunStatus: 'Sunny' },
      { minutes: 390, sunExposurePercent: 100, weatherGateState: 'gated', directSunState: 'blocked' },
      { minutes: 405, sunExposurePercent: 80, weatherGateState: 'not_gated', directSunState: 'likely' },
      { minutes: 420, sunExposurePercent: 90, weatherGateState: 'unknown', directSunState: 'unknown' },
      { minutes: 450, sunExposurePercent: 95, weatherGateState: 'not_gated', directSunState: 'likely' },
    ];

    expect(extractPublicSunWindow(series, { stepMinutes: 15 })).toEqual({
      startMinutes: 375,
      endMinutes: 375,
      weatherGateState: 'not_gated',
      status: 'Sunny',
    });
  });

  test('[P1] derives a multi-step window status from the qualifying run', async () => {
    const { extractPublicSunWindow } = await loadPublicSun();
    const series: PublicSunStep[] = [
      { minutes: 540, sunExposurePercent: 10, weatherGateState: 'not_gated', directSunState: 'blocked', currentSunStatus: 'Shaded' },
      { minutes: 720, sunExposurePercent: 95, weatherGateState: 'not_gated', directSunState: 'likely', currentSunStatus: 'Sunny' },
      { minutes: 735, sunExposurePercent: 65, weatherGateState: 'not_gated', directSunState: 'likely', currentSunStatus: 'Partial' },
    ];

    expect(extractPublicSunWindow(series, { stepMinutes: 15 })).toEqual({
      startMinutes: 720,
      endMinutes: 735,
      weatherGateState: 'not_gated',
      status: 'Partial',
    });
  });

  test('[P0] extracts only qualifying peaks and chooses the earlier equal peak', async () => {
    const { extractPublicSunPeak } = await loadPublicSun();
    const series: PublicSunStep[] = [
      { minutes: 600, sunExposurePercent: 100, weatherGateState: 'gated', directSunState: 'blocked' },
      { minutes: 615, sunExposurePercent: 50, weatherGateState: 'not_gated', directSunState: 'blocked' },
      { minutes: 630, sunExposurePercent: 80, weatherGateState: 'unknown', directSunState: 'unknown' },
      { minutes: 645, sunExposurePercent: 80, weatherGateState: 'not_gated', directSunState: 'likely' },
    ];

    expect(extractPublicSunPeak(series)).toEqual(series[3]);
    expect(extractPublicSunPeak(series.slice(0, 2))).toBeNull();
  });
});
