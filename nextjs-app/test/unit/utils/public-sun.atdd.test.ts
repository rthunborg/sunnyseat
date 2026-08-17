/**
 * Story 12.6 ATDD RED scaffolds for the shared public-sun domain contract.
 */
import { describe, expect, test } from 'vitest';

type WeatherGateState = 'gated' | 'not_gated' | 'unknown';

type PublicSunVenue = {
  id: string;
  sunExposurePercent: number;
  weatherGateState: WeatherGateState;
  distanceMeters: number;
  currentSunStatus?: string;
  confidence?: number;
};

type PublicSunStep = {
  minutes: number;
  sunExposurePercent: number;
  weatherGateState: WeatherGateState;
  currentSunStatus?: string;
};

type PublicSunModule = {
  isVenuePubliclySunny: (venue: Pick<PublicSunVenue, 'sunExposurePercent' | 'weatherGateState'>) => boolean;
  compareVenuesByPublicSun: (left: PublicSunVenue, right: PublicSunVenue) => number;
  extractPublicSunWindow: (
    series: PublicSunStep[],
    options: { stepMinutes: number },
  ) => { startMinutes: number; endMinutes: number; weatherGateState: 'not_gated' | 'unknown' } | null;
  extractPublicSunPeak: (series: PublicSunStep[]) => PublicSunStep | null;
};

const publicSunModulePath = '@/lib/utils/public-sun';

async function loadPublicSun(): Promise<PublicSunModule> {
  return (await import(publicSunModulePath)) as PublicSunModule;
}

describe('Story 12.6 - one public sunny predicate', () => {
  test.each([
    ['exactly 50 is not sunny', 50, 'not_gated', 'Sunny', 99, false],
    ['just above 50 is sunny', 50.01, 'not_gated', 'Shaded', 1, true],
    ['40% Partial remains not sunny', 40, 'not_gated', 'Partial', 99, false],
    ['gated high exposure remains not sunny', 95, 'gated', 'CloudObscured', 99, false],
    ['unknown high exposure retains geometric potential', 95, 'unknown', 'Sunny', 1, true],
  ] as const)(
    '[P0] %s',
    async (_label, sunExposurePercent, weatherGateState, currentSunStatus, confidence, expected) => {
      const { isVenuePubliclySunny } = await loadPublicSun();

      expect(
        isVenuePubliclySunny({
          sunExposurePercent,
          weatherGateState,
          currentSunStatus,
          confidence,
        } as PublicSunVenue),
      ).toBe(expected);
    },
  );

  test('[P0] confidence and diagnostic status never change the verdict', async () => {
    const { isVenuePubliclySunny } = await loadPublicSun();
    const invariant = [
      { sunExposurePercent: 51, weatherGateState: 'not_gated', currentSunStatus: 'NoSun', confidence: 0 },
      { sunExposurePercent: 51, weatherGateState: 'not_gated', currentSunStatus: 'Sunny', confidence: 100 },
    ] as const;

    expect(invariant.map((venue) => isVenuePubliclySunny(venue))).toEqual([true, true]);
  });
});

describe('Story 12.6 - total comparator, window, and peak', () => {
  test('[P0] orders sunny band, exposure, distance, then stable ID deterministically', async () => {
    const { compareVenuesByPublicSun } = await loadPublicSun();
    const venues: PublicSunVenue[] = [
      { id: 'grey-100', sunExposurePercent: 100, weatherGateState: 'gated', distanceMeters: 1 },
      { id: 'sun-b', sunExposurePercent: 80, weatherGateState: 'unknown', distanceMeters: 100 },
      { id: 'sun-a', sunExposurePercent: 80, weatherGateState: 'not_gated', distanceMeters: 100 },
      { id: 'sun-51', sunExposurePercent: 51, weatherGateState: 'not_gated', distanceMeters: 0 },
      { id: 'grey-50', sunExposurePercent: 50, weatherGateState: 'not_gated', distanceMeters: 0 },
    ];

    const expected = ['sun-a', 'sun-b', 'sun-51', 'grey-100', 'grey-50'];
    for (let run = 0; run < 10; run += 1) {
      expect([...venues].reverse().sort(compareVenuesByPublicSun).map((venue) => venue.id)).toEqual(expected);
    }
  });

  test('[P0] extracts the longest contiguous qualifying window and chooses the earliest tie', async () => {
    const { extractPublicSunWindow } = await loadPublicSun();
    const series: PublicSunStep[] = [
      { minutes: 360, sunExposurePercent: 51, weatherGateState: 'unknown' },
      { minutes: 375, sunExposurePercent: 70, weatherGateState: 'not_gated' },
      { minutes: 390, sunExposurePercent: 100, weatherGateState: 'gated' },
      { minutes: 405, sunExposurePercent: 80, weatherGateState: 'not_gated' },
      { minutes: 420, sunExposurePercent: 90, weatherGateState: 'unknown' },
      { minutes: 450, sunExposurePercent: 95, weatherGateState: 'not_gated' },
    ];

    expect(extractPublicSunWindow(series, { stepMinutes: 15 })).toEqual({
      startMinutes: 360,
      endMinutes: 375,
      weatherGateState: 'unknown',
    });
  });

  test('[P0] extracts only qualifying peaks and chooses the earlier equal peak', async () => {
    const { extractPublicSunPeak } = await loadPublicSun();
    const series: PublicSunStep[] = [
      { minutes: 600, sunExposurePercent: 100, weatherGateState: 'gated' },
      { minutes: 615, sunExposurePercent: 50, weatherGateState: 'not_gated' },
      { minutes: 630, sunExposurePercent: 80, weatherGateState: 'unknown' },
      { minutes: 645, sunExposurePercent: 80, weatherGateState: 'not_gated' },
    ];

    expect(extractPublicSunPeak(series)).toEqual(series[2]);
    expect(extractPublicSunPeak(series.slice(0, 2))).toBeNull();
  });
});
