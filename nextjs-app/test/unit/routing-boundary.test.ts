import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Story 3.4 Task 2.4 — routing-boundary contract pin.
 *
 * Story 3.1 established the shared routing contract: all native-map URLs
 * are built by `lib/services/routing.ts`, and the single user-gesture
 * `window.open` call site lives in `components/custom/map/MapView.tsx`.
 * This scan test pins that boundary so a future story cannot silently
 * reintroduce a hand-rolled maps URL builder or a stray `window.open`
 * outside the approved orchestrator.
 */

const APP_ROOT = process.cwd();
const SCANNED_DIRS = ['app', 'components', 'hooks', 'lib'] as const;
const ROUTING_HELPER = normalize('lib/services/routing.ts');
const WINDOW_OPEN_BOUNDARY = normalize('components/custom/map/MapView.tsx');

const NATIVE_MAP_URL_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Apple Maps URL', pattern: /maps\.apple/ },
  { name: 'Google Maps URL', pattern: /google\.com\/maps/ },
  { name: 'geo: URI scheme', pattern: /['"`]geo:/ },
];

function normalize(relativePath: string): string {
  return relativePath.split(/[\\/]/).join('/');
}

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      collectSourceFiles(fullPath, files);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

function scanRuntimeSources(): Array<{ relativePath: string; content: string }> {
  return SCANNED_DIRS.flatMap((dir) =>
    collectSourceFiles(path.join(APP_ROOT, dir)),
  ).map((filePath) => ({
    relativePath: normalize(path.relative(APP_ROOT, filePath)),
    content: readFileSync(filePath, 'utf8'),
  }));
}

describe('routing boundary contract (Story 3.4 AC #1)', () => {
  const sources = scanRuntimeSources();

  it('scans a non-trivial runtime source tree', () => {
    expect(sources.length).toBeGreaterThan(50);
    expect(sources.some((file) => file.relativePath === ROUTING_HELPER)).toBe(true);
    expect(sources.some((file) => file.relativePath === WINDOW_OPEN_BOUNDARY)).toBe(true);
  });

  it('keeps window.open confined to the single MapView orchestrator call site', () => {
    const offenders = sources
      .filter((file) => file.relativePath !== WINDOW_OPEN_BOUNDARY)
      .filter((file) => file.content.includes('window.open('))
      .map((file) => file.relativePath);
    expect(offenders).toEqual([]);

    const boundary = sources.find((file) => file.relativePath === WINDOW_OPEN_BOUNDARY);
    const callSites = boundary?.content.match(/window\.open\(/g) ?? [];
    expect(callSites).toHaveLength(1);
  });

  it('keeps native-map URL builders confined to lib/services/routing.ts', () => {
    for (const { name, pattern } of NATIVE_MAP_URL_PATTERNS) {
      const offenders = sources
        .filter((file) => file.relativePath !== ROUTING_HELPER)
        .filter((file) => pattern.test(file.content))
        .map((file) => `${file.relativePath} (${name})`);
      expect(offenders).toEqual([]);
    }
  });

  it('routes every consumer of maps URLs through the shared routing helper', () => {
    const consumers = sources.filter(
      (file) =>
        file.relativePath !== ROUTING_HELPER &&
        /from ['"]@\/lib\/services\/routing['"]/.test(file.content),
    );
    const consumerPaths = consumers.map((file) => file.relativePath).sort();
    // The approved Epic 3 consumer set. A new consumer is fine — it must
    // simply use the shared helper — but review this list consciously
    // instead of letting an unrelated surface import URL builders by
    // accident.
    expect(consumerPaths).toEqual([
      'components/composed/venue/VenueDetailContent.tsx',
      'components/custom/feedback/FeedbackFlow.tsx',
      'components/custom/map/MapView.tsx',
    ]);
  });
});
