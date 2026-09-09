import { afterEach, expect, test, vi } from 'vitest';
import { resolveForcedVisualVenueDetail } from '@/components/custom/venue/forced-venue-detail';
import { publicSunVerdictFor } from '@/lib/utils/public-sun';

afterEach(() => vi.unstubAllEnvs());

test('obscured dev fixture declares blocking evidence without making the ordinary fallback likely', () => {
  vi.stubEnv('NODE_ENV', 'development');
  const fallback = resolveForcedVisualVenueDetail('test-venue-sunny', 'feedback');
  const obscured = resolveForcedVisualVenueDetail('test-venue-sunny', 'venue-detail-obscured');
  expect(fallback?.directSunState).toBeUndefined();
  expect(publicSunVerdictFor(fallback!)).toBe('grey');
  expect(obscured).toMatchObject({ directSunState: 'blocked', directSunReasons: ['cloud-obstruction'], weatherGateState: 'gated' });
  expect(publicSunVerdictFor(obscured!)).toBe('grey');
  expect(obscured?.sunExposurePercent).toBe(fallback?.sunExposurePercent);
  expect(obscured?.sunWindow).toEqual(fallback?.sunWindow);
});

test('forced evidence remains unavailable in production', () => {
  vi.stubEnv('NODE_ENV', 'production');
  expect(resolveForcedVisualVenueDetail('test-venue-sunny', 'feedback')).toBeNull();
  expect(resolveForcedVisualVenueDetail('test-venue-sunny', 'venue-detail-obscured')).toBeNull();
});
