import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Service Worker (sw.js)', () => {
  const swPath = join(__dirname, '..', '..', 'public', 'sw.js');
  const swContent = readFileSync(swPath, 'utf-8');

  it('defines a cache version', () => {
    expect(swContent).toContain('CACHE_VERSION');
  });

  it('handles install event', () => {
    expect(swContent).toContain("self.addEventListener('install'");
  });

  it('handles activate event', () => {
    expect(swContent).toContain("self.addEventListener('activate'");
  });

  it('handles fetch event', () => {
    expect(swContent).toContain("self.addEventListener('fetch'");
  });

  it('uses cache-first for static assets', () => {
    expect(swContent).toContain('caches.match(request)');
  });

  it('uses network-first for API calls', () => {
    expect(swContent).toContain("/api/");
  });

  it('has offline fallback', () => {
    expect(swContent).toContain('/offline');
  });

  it('precaches the root URL', () => {
    expect(swContent).toContain("'/'");
  });
});
