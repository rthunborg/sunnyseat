import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('Story 12.6 - server/client public-sun contract', () => {
  test('[P0] route and visible list import the same pure comparator', () => {
    const route = readSource('app/api/venues/route.ts');
    const list = readSource('components/custom/venue/VenueList.tsx');

    for (const source of [route, list]) {
      expect(source).toMatch(/from ['"]@\/lib\/utils\/public-sun['"]/);
      expect(source).toContain('compareVenuesByPublicSun');
    }
    expect(route).toContain('extractPublicSunPeak');
    expect(route).not.toMatch(/SUN_STATUS_RANK|sunListRank/);
  });

  test('[P0] shared module remains client/server-safe and reusable downstream', () => {
    const source = readSource('lib/utils/public-sun.ts');

    expect(source).toContain('isVenuePubliclySunny');
    expect(source).toContain('extractPublicSunWindow');
    expect(source).toContain('extractPublicSunPeak');
    expect(source).not.toMatch(/@\/lib\/(solar|weather|supabase|middleware|buildings)(?:\/|['"])/);
  });

  test('[P0] public DTO, day-series, and pin data carry the explicit tri-state gate', () => {
    const apiTypes = readSource('lib/types/api.ts');
    const mapTypes = readSource('lib/types/map.ts');

    expect(apiTypes).toMatch(/type WeatherGateState\s*=\s*['"]gated['"]\s*\|\s*['"]not_gated['"]\s*\|\s*['"]unknown['"]/);
    expect((apiTypes.match(/weatherGateState\s*:\s*WeatherGateState/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(mapTypes).toMatch(/weatherGateState\s*:\s*WeatherGateState/);
  });
});
