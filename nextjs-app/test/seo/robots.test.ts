import { describe, it, expect } from 'vitest';
import robots from '@/app/robots';

describe('robots.ts', () => {
  const result = robots();

  it('allows all user agents', () => {
    expect(result.rules).toEqual({ userAgent: '*', allow: '/' });
  });

  it('points to sitemap at sunnyseat.se', () => {
    expect(result.sitemap).toBe('https://sunnyseat.se/sitemap.xml');
  });
});
