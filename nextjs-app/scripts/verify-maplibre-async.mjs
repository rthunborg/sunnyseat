// nextjs-app/scripts/verify-maplibre-async.mjs
//
// Verifies that maplibre-gl is NOT bundled into any route's main chunk
// graph. Runs after `npm run build`; fails with non-zero exit if maplibre
// is found in any route's `rootMainFiles` set.
//
// AC4 of Story 1.6: "MapLibre GL JS is confirmed to load asynchronously
// (not in the main bundle)".
//
// Strategy: scan every JS chunk under `.next/static/chunks/` for the
// `maplibre-gl` substring. Any chunk that matches must NOT appear in the
// `rootMainFiles` of any per-route `build-manifest.json` under
// `.next/server/app/**`.
//
// Turbopack ships hashed filenames (no stable name like `vendor.js`), so
// content-grep + manifest cross-reference is more robust than name-based
// patterns.

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const BUILD_DIR = '.next';
const STATIC_CHUNKS_DIR = join(BUILD_DIR, 'static', 'chunks');
const SERVER_APP_DIR = join(BUILD_DIR, 'server', 'app');

async function findMaplibreChunks() {
  const matches = [];
  const entries = await readdir(STATIC_CHUNKS_DIR, {
    recursive: true,
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.js')) continue;
    // Story 1.6 P1: `entry.name` is the basename only when readdir is
    // recursive; the full path lives in `entry.parentPath` (Node 20.12+) or
    // `entry.path` (older). Without this, nested chunks crash with ENOENT.
    const parent = entry.parentPath ?? entry.path ?? STATIC_CHUNKS_DIR;
    const fullPath = join(parent, entry.name);
    const contents = await readFile(fullPath, 'utf8');
    // The hyphenated `maplibre-gl` package name is often minified away,
    // but the unhyphenated `maplibregl` global / class names survive.
    // Check both so this works in dev (un-minified) and prod.
    if (contents.includes('maplibre-gl') || contents.includes('maplibregl')) {
      // Display path is relative to STATIC_CHUNKS_DIR so manifest matching
      // can use simple suffix comparison.
      const relativePath = relative(STATIC_CHUNKS_DIR, fullPath).replace(
        /\\/g,
        '/',
      );
      matches.push(`static/chunks/${relativePath}`);
    }
  }
  return matches;
}

async function findRouteManifests() {
  const manifests = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name === 'build-manifest.json') {
        manifests.push(full);
      }
    }
  }
  await walk(SERVER_APP_DIR);
  return manifests;
}

async function getRootMainFiles(manifestPath) {
  const json = JSON.parse(await readFile(manifestPath, 'utf8'));
  return json.rootMainFiles ?? [];
}

async function main() {
  let stats;
  try {
    stats = await stat(BUILD_DIR);
  } catch {
    console.error(`FAIL: ${BUILD_DIR} not found. Run \`npm run build\` first.`);
    process.exit(1);
  }
  if (!stats.isDirectory()) {
    console.error(`FAIL: ${BUILD_DIR} is not a directory.`);
    process.exit(1);
  }

  const maplibreChunks = await findMaplibreChunks();
  if (maplibreChunks.length === 0) {
    // Story 1.6 P3: Diagnostic FAIL — distinguish "build incomplete" from
    // "maplibre stripped via tree-shaking" (the latter would be unexpected
    // given that MapLibre is a runtime dependency of MapView). Surfacing
    // both possibilities lets a CI debugger triage faster.
    console.error(
      `FAIL: no maplibre-gl chunk found under ${STATIC_CHUNKS_DIR}.\n` +
        '  Possible causes:\n' +
        '    1. Build incomplete — re-run `npm run build` and inspect output.\n' +
        '    2. MapLibre tree-shaken away unexpectedly (verify VenuePinLayer + MapContainer + MapControls still import maplibre-gl at top level).\n' +
        '    3. Bundler renamed both `maplibre-gl` and `maplibregl` substrings (very unlikely; would indicate this gate needs a different detection strategy).',
    );
    process.exit(1);
  }

  const manifests = await findRouteManifests();
  if (manifests.length === 0) {
    // Story 1.6 P2: Without route manifests we cannot prove MapLibre is
    // async-loaded — the cross-reference requires per-route data. A
    // missing manifests directory means the build emitted JS chunks but
    // no per-route metadata; trusting "no manifests = no offenders" would
    // be a silent FALSE PASS.
    console.error(
      `FAIL: no route manifests found under ${SERVER_APP_DIR}.\n` +
        '  Cannot verify async-load status without per-route manifest data.\n' +
        '  Re-run `npm run build`; if manifests are still missing, the build is broken.',
    );
    process.exit(1);
  }

  const offenders = [];
  for (const manifest of manifests) {
    const rootFiles = await getRootMainFiles(manifest);
    const overlap = maplibreChunks.filter((c) => rootFiles.includes(c));
    if (overlap.length > 0) {
      offenders.push({ manifest, overlap });
    }
  }

  if (offenders.length > 0) {
    console.error('FAIL: maplibre-gl is bundled into the main route graph.');
    for (const { manifest, overlap } of offenders) {
      console.error(`  - ${manifest}: ${overlap.join(', ')}`);
    }
    process.exit(1);
  }

  console.log(
    `PASS: maplibre-gl is async-loaded (${maplibreChunks.length} maplibre chunk(s); none referenced from any route's rootMainFiles across ${manifests.length} manifest(s)).`,
  );
}

await main();
