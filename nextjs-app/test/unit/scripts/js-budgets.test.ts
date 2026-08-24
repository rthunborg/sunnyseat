import { mkdtemp, mkdir, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, test } from 'vitest';

const SCRIPT_PATH = path.resolve(process.cwd(), 'scripts/verify-js-budgets.mjs');
const INITIAL_SOURCE = 'globalThis.__initial = "sunnyseat";\n';
const MAP_SOURCE = 'globalThis.maplibregl = { version: "5.24.0" };\n';
const SECOND_MAP_SOURCE = 'globalThis.maplibregl = { worker: true };\n';
const OTHER_SOURCE = 'globalThis.__other = "diagnostic-only";\n';

// Hand-checked with Node's zlib level 9. These literals make the boundary
// assertion independent of the implementation under test.
const INITIAL_GZIP_BYTES = 56;
const MAP_GZIP_BYTES = 67;
const SECOND_MAP_GZIP_BYTES = 62;
const OTHER_GZIP_BYTES = 60;

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

async function createFixture(options: {
  initialPaths?: string[];
  includeMap?: boolean;
  frameworkVersion?: string;
} = {}) {
  const appDir = await mkdtemp(path.join(tmpdir(), 'sunnyseat-js-budget-'));
  temporaryDirectories.push(appDir);

  const initialPaths = options.initialPaths ?? [
    '.next/static/chunks/initial.js',
    '.next/static/chunks/initial.js',
  ];
  const includeMap = options.includeMap ?? true;
  const frameworkVersion = options.frameworkVersion ?? '16.3.1';
  const diagnosticsDir = path.join(appDir, '.next', 'diagnostics');
  const chunksDir = path.join(appDir, '.next', 'static', 'chunks');
  const installedNextDir = path.join(appDir, 'node_modules', 'next');
  await Promise.all([
    mkdir(diagnosticsDir, { recursive: true }),
    mkdir(chunksDir, { recursive: true }),
    mkdir(installedNextDir, { recursive: true }),
  ]);

  await Promise.all([
    writeFile(
      path.join(appDir, 'package.json'),
      JSON.stringify({ dependencies: { next: '16.3.1' } }),
    ),
    writeFile(
      path.join(installedNextDir, 'package.json'),
      JSON.stringify({ name: 'next', version: '16.3.1' }),
    ),
    writeFile(
      path.join(diagnosticsDir, 'framework.json'),
      JSON.stringify({ name: 'Next.js', version: frameworkVersion }),
    ),
    writeFile(
      path.join(diagnosticsDir, 'route-bundle-stats.json'),
      JSON.stringify([
        {
          route: '/[locale]',
          firstLoadUncompressedJsBytes: INITIAL_SOURCE.length,
          firstLoadChunkPaths: initialPaths,
        },
      ]),
    ),
    writeFile(path.join(appDir, '.next', 'BUILD_ID'), 'fixture-build-id\n'),
    writeFile(path.join(chunksDir, 'initial.js'), INITIAL_SOURCE),
    writeFile(path.join(chunksDir, 'other.js'), OTHER_SOURCE),
    ...(includeMap
      ? [writeFile(path.join(chunksDir, 'map.js'), MAP_SOURCE)]
      : []),
  ]);

  // Match Next 16.3.1's write order: package install first, BUILD_ID near the
  // end of the build, then route-bundle-stats after final bundle accounting.
  const packageTime = new Date('2026-08-18T09:00:00.000Z');
  const buildTime = new Date('2026-08-18T09:01:00.000Z');
  const diagnosticsTime = new Date('2026-08-18T09:01:01.000Z');
  await utimes(path.join(appDir, 'package.json'), packageTime, packageTime);
  await utimes(path.join(appDir, '.next', 'BUILD_ID'), buildTime, buildTime);
  await utimes(
    path.join(diagnosticsDir, 'route-bundle-stats.json'),
    diagnosticsTime,
    diagnosticsTime,
  );

  return appDir;
}

function runGate(
  appDir: string,
  budgets: {
    initial: number;
    maplibre: number;
    total: number;
  } = {
    initial: 280 * 1024,
    maplibre: 320 * 1024,
    total: 600 * 1024,
  },
) {
  return spawnSync(
    process.execPath,
    [
      SCRIPT_PATH,
      '--app-dir',
      appDir,
      '--initial-budget-bytes',
      String(budgets.initial),
      '--maplibre-budget-bytes',
      String(budgets.maplibre),
      '--total-budget-bytes',
      String(budgets.total),
      '--json',
    ],
    { encoding: 'utf8' },
  );
}

describe('deterministic JavaScript budget gate', () => {
  test('passes at each exact byte boundary and fails one byte over', async () => {
    const appDir = await createFixture();
    const exactBudgets = {
      initial: INITIAL_GZIP_BYTES,
      maplibre: MAP_GZIP_BYTES,
      total: INITIAL_GZIP_BYTES + MAP_GZIP_BYTES + OTHER_GZIP_BYTES,
    };

    const exact = runGate(appDir, exactBudgets);
    expect(exact.status, exact.stderr).toBe(0);
    expect(JSON.parse(exact.stdout)).toMatchObject({
      initial: { gzipBytes: INITIAL_GZIP_BYTES, budgetBytes: INITIAL_GZIP_BYTES },
      maplibre: { gzipBytes: MAP_GZIP_BYTES, budgetBytes: MAP_GZIP_BYTES },
      total: {
        gzipBytes: INITIAL_GZIP_BYTES + MAP_GZIP_BYTES + OTHER_GZIP_BYTES,
        budgetBytes: INITIAL_GZIP_BYTES + MAP_GZIP_BYTES + OTHER_GZIP_BYTES,
      },
      initialMaplibreUnion: {
        gzipBytes: INITIAL_GZIP_BYTES + MAP_GZIP_BYTES,
      },
    });

    const over = runGate(appDir, { ...exactBudgets, initial: INITIAL_GZIP_BYTES - 1 });
    expect(over.status).toBe(1);
    expect(over.stderr).toContain(
      `Initial route JS ${INITIAL_GZIP_BYTES} B exceeds ${INITIAL_GZIP_BYTES - 1} B`,
    );

    const totalOver = runGate(appDir, {
      ...exactBudgets,
      total: exactBudgets.total - 1,
    });
    expect(totalOver.status).toBe(1);
    expect(totalOver.stderr).toContain(
      `All emitted static JS ${exactBudgets.total} B exceeds ${exactBudgets.total - 1} B`,
    );
  });

  test('fails closed when diagnostics are missing or older than BUILD_ID', async () => {
    const missingDir = await createFixture();
    await rm(path.join(missingDir, '.next', 'diagnostics', 'route-bundle-stats.json'));
    const missing = runGate(missingDir);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('route-bundle-stats.json');

    const staleDir = await createFixture();
    const buildId = await stat(path.join(staleDir, '.next', 'BUILD_ID'));
    const staleTime = new Date(buildId.mtimeMs - 1_000);
    await utimes(
      path.join(staleDir, '.next', 'diagnostics', 'route-bundle-stats.json'),
      staleTime,
      staleTime,
    );
    const stale = runGate(staleDir);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('stale');
  });

  test('fails when the installed Next version and build framework disagree', async () => {
    const appDir = await createFixture({ frameworkVersion: '16.2.2' });

    const result = runGate(appDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'framework.json reports Next.js 16.2.2 but installed next is 16.3.1',
    );
  });

  test('fails closed when no MapLibre-bearing JavaScript exists', async () => {
    const appDir = await createFixture({ includeMap: false });

    const result = runGate(appDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no MapLibre-bearing JavaScript chunk');
  });

  test('sums split MapLibre chunks once and includes unrelated lazy chunks in the total', async () => {
    const appDir = await createFixture();
    await writeFile(
      path.join(appDir, '.next', 'static', 'chunks', 'map-worker.js'),
      SECOND_MAP_SOURCE,
    );

    const result = runGate(appDir);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      initial: { gzipBytes: INITIAL_GZIP_BYTES, chunkCount: 1 },
      maplibre: {
        gzipBytes: MAP_GZIP_BYTES + SECOND_MAP_GZIP_BYTES,
        chunkCount: 2,
      },
      initialMaplibreUnion: {
        gzipBytes: INITIAL_GZIP_BYTES + MAP_GZIP_BYTES + SECOND_MAP_GZIP_BYTES,
        chunkCount: 3,
      },
      total: {
        gzipBytes:
          INITIAL_GZIP_BYTES + MAP_GZIP_BYTES + SECOND_MAP_GZIP_BYTES + OTHER_GZIP_BYTES,
        chunkCount: 4,
      },
    });
  });

  test('rejects any MapLibre chunk that overlaps the root initial graph', async () => {
    const appDir = await createFixture({
      initialPaths: [
        '.next/static/chunks/initial.js',
        '.next/static/chunks/map.js',
      ],
    });

    const result = runGate(appDir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('MapLibre must remain outside the /[locale] initial graph');
    expect(result.stderr).toContain('.next/static/chunks/map.js');
  });
});
