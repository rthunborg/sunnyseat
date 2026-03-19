import { describe, it, expect } from 'vitest';
import sitemap from '@/app/sitemap';

describe('sitemap.ts', () => {
  it('returns an array of sitemap entries', async () => {
    const result = await sitemap();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes the home page with priority 1', async () => {
    const result = await sitemap();
    const home = result.find((entry) => entry.url === 'https://sunnyseat.se');
    expect(home).toBeDefined();
    expect(home!.priority).toBe(1);
  });

  it('includes the about page', async () => {
    const result = await sitemap();
    const about = result.find((entry) => entry.url === 'https://sunnyseat.se/about');
    expect(about).toBeDefined();
    expect(about!.priority).toBe(0.5);
  });

  it('includes venue detail pages', async () => {
    const result = await sitemap();
    const venuePages = result.filter((entry) => entry.url.includes('/v/'));
    expect(venuePages.length).toBeGreaterThan(0);
    for (const page of venuePages) {
      expect(page.priority).toBe(0.8);
      expect(page.changeFrequency).toBe('daily');
    }
  });

  it('all URLs use https://sunnyseat.se base', async () => {
    const result = await sitemap();
    for (const entry of result) {
      expect(entry.url).toMatch(/^https:\/\/sunnyseat\.se/);
    }
  });
});
