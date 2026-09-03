import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

export const DEFAULT_JS_BUDGETS = Object.freeze({
  initial: 280 * 1024,
  maplibre: 320 * 1024,
  total: 600 * 1024,
});

const ROOT_ROUTE = '/[locale]';
const MAPLIBRE_MARKER = /maplibre(?:-gl|gl)/iu;

function fail(message) {
  throw new Error(message);
}

async function readRequiredFile(filePath, label) {
  try {
    return await readFile(filePath);
  } catch (error) {
    fail(`Required ${label} is missing or unreadable at ${filePath}: ${error.message}`);
  }
}

async function readRequiredJson(filePath, label) {
  const contents = await readRequiredFile(filePath, label);
  try {
    return JSON.parse(contents.toString('utf8'));
  } catch (error) {
    fail(`Required ${label} is not valid JSON at ${filePath}: ${error.message}`);
  }
}

async function requiredStat(filePath, label) {
  try {
    return await stat(filePath);
  } catch (error) {
    fail(`Required ${label} is missing or unreadable at ${filePath}: ${error.message}`);
  }
}

function canonicalBuildPath(appDir, absolutePath) {
  return path.relative(appDir, absolutePath).replaceAll('\\', '/');
}

function resolveDiagnosticChunkPath(appDir, diagnosticPath) {
  if (typeof diagnosticPath !== 'string') {
    fail(`Route ${ROOT_ROUTE} contains a non-string firstLoadChunkPaths entry.`);
  }
  const canonical = diagnosticPath.replaceAll('\\', '/').replace(/^\.\//u, '');
  if (!canonical.startsWith('.next/static/') || !canonical.endsWith('.js')) {
    fail(`Route ${ROOT_ROUTE} contains an invalid JavaScript chunk path: ${diagnosticPath}`);
  }
  const absolute = path.resolve(appDir, ...canonical.split('/'));
  const staticRoot = path.resolve(appDir, '.next', 'static');
  const relativeToStatic = path.relative(staticRoot, absolute);
  if (
    relativeToStatic === '' ||
    relativeToStatic.startsWith(`..${path.sep}`) ||
    relativeToStatic === '..' ||
    path.isAbsolute(relativeToStatic)
  ) {
    fail(`Route ${ROOT_ROUTE} chunk escapes .next/static: ${diagnosticPath}`);
  }
  return { absolute, canonical: canonicalBuildPath(appDir, absolute) };
}

async function findJavaScriptFiles(directory) {
  const results = [];
  async function walk(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      fail(`Cannot scan JavaScript build output at ${directory}: ${error.message}`);
    }
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        results.push(absolute);
      }
    }
  }
  await walk(directory);
  return results.sort((left, right) => left.localeCompare(right, 'en'));
}

async function gzipSizes(paths) {
  const sizes = new Map();
  for (const filePath of [...paths].sort((left, right) => left.localeCompare(right, 'en'))) {
    const contents = await readRequiredFile(filePath, 'JavaScript chunk');
    sizes.set(filePath, gzipSync(contents, { level: 9 }).byteLength);
  }
  return sizes;
}

function sumUnique(paths, sizes) {
  let gzipBytes = 0;
  for (const filePath of new Set(paths)) {
    const size = sizes.get(filePath);
    if (size === undefined) fail(`No deterministic gzip measurement exists for ${filePath}.`);
    gzipBytes += size;
  }
  return gzipBytes;
}

function metric(paths, sizes, budgetBytes) {
  const unique = [...new Set(paths)].sort((left, right) => left.localeCompare(right, 'en'));
  return {
    gzipBytes: sumUnique(unique, sizes),
    budgetBytes,
    chunkCount: unique.length,
    chunks: unique,
  };
}

function assertBudget(label, measurement) {
  if (measurement.gzipBytes > measurement.budgetBytes) {
    fail(`${label} ${measurement.gzipBytes} B exceeds ${measurement.budgetBytes} B.`);
  }
}

function assertPositiveInteger(name, value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail(`${name} must be a positive integer byte count; received ${value}.`);
  }
}

export async function verifyJsBudgets({
  appDir = process.cwd(),
  budgets = DEFAULT_JS_BUDGETS,
} = {}) {
  const resolvedAppDir = path.resolve(appDir);
  assertPositiveInteger('initial budget', budgets.initial);
  assertPositiveInteger('MapLibre budget', budgets.maplibre);
  assertPositiveInteger('canonical total budget', budgets.total);

  const packagePath = path.join(resolvedAppDir, 'package.json');
  const installedNextPath = path.join(resolvedAppDir, 'node_modules', 'next', 'package.json');
  const buildIdPath = path.join(resolvedAppDir, '.next', 'BUILD_ID');
  const diagnosticsDir = path.join(resolvedAppDir, '.next', 'diagnostics');
  const frameworkPath = path.join(diagnosticsDir, 'framework.json');
  const routeStatsPath = path.join(diagnosticsDir, 'route-bundle-stats.json');
  const staticDir = path.join(resolvedAppDir, '.next', 'static');

  const [appPackage, installedNext, framework, routeStats, buildId, packageInfo, buildInfo, routeInfo] =
    await Promise.all([
      readRequiredJson(packagePath, 'package.json'),
      readRequiredJson(installedNextPath, 'installed Next package metadata'),
      readRequiredJson(frameworkPath, 'framework.json'),
      readRequiredJson(routeStatsPath, 'route-bundle-stats.json'),
      readRequiredFile(buildIdPath, 'BUILD_ID'),
      requiredStat(packagePath, 'package.json'),
      requiredStat(buildIdPath, 'BUILD_ID'),
      requiredStat(routeStatsPath, 'route-bundle-stats.json'),
    ]);

  if (buildId.toString('utf8').trim() === '') fail('Required BUILD_ID is empty.');
  if (framework?.name !== 'Next.js' || typeof framework.version !== 'string') {
    fail('framework.json does not identify a Next.js build with a version.');
  }
  if (installedNext?.name !== 'next' || typeof installedNext.version !== 'string') {
    fail('Installed next package metadata is invalid.');
  }
  if (framework.version !== installedNext.version) {
    fail(
      `framework.json reports Next.js ${framework.version} but installed next is ${installedNext.version}.`,
    );
  }
  const declaredNext = appPackage?.dependencies?.next;
  if (typeof declaredNext !== 'string' || declaredNext.trim() === '') {
    fail('package.json must declare next as a production dependency.');
  }
  if (routeInfo.mtimeMs < buildInfo.mtimeMs || routeInfo.mtimeMs < packageInfo.mtimeMs) {
    fail(
      'route-bundle-stats.json is stale relative to BUILD_ID or package.json; run `npm run build` again.',
    );
  }
  if (!Array.isArray(routeStats)) {
    fail('route-bundle-stats.json must contain an array of route diagnostics.');
  }
  const rootStats = routeStats.find((entry) => entry?.route === ROOT_ROUTE);
  if (!rootStats || !Array.isArray(rootStats.firstLoadChunkPaths)) {
    fail(`route-bundle-stats.json does not contain ${ROOT_ROUTE} firstLoadChunkPaths.`);
  }
  if (rootStats.firstLoadChunkPaths.length === 0) {
    fail(`Route ${ROOT_ROUTE} firstLoadChunkPaths is empty; initial route bytes cannot be verified.`);
  }

  const initialResolved = rootStats.firstLoadChunkPaths.map((chunkPath) =>
    resolveDiagnosticChunkPath(resolvedAppDir, chunkPath),
  );
  const initialPaths = [...new Set(initialResolved.map(({ absolute }) => absolute))];
  for (const filePath of initialPaths) {
    const info = await requiredStat(filePath, 'route initial JavaScript chunk');
    if (!info.isFile()) fail(`Route initial JavaScript chunk is not a file: ${filePath}`);
  }

  const allStaticPaths = await findJavaScriptFiles(staticDir);
  if (allStaticPaths.length === 0) {
    fail(`No JavaScript files were emitted under ${staticDir}.`);
  }

  const maplibrePaths = [];
  for (const filePath of allStaticPaths) {
    const contents = await readRequiredFile(filePath, 'static JavaScript chunk');

    if (MAPLIBRE_MARKER.test(contents.toString('utf8'))) maplibrePaths.push(filePath);
  }
  if (maplibrePaths.length === 0) {
    fail('Build contains no MapLibre-bearing JavaScript chunk; async loading cannot be verified.');
  }

  const initialSet = new Set(initialPaths);
  const overlap = maplibrePaths.filter((filePath) => initialSet.has(filePath));
  if (overlap.length > 0) {
    fail(
      `MapLibre must remain outside the ${ROOT_ROUTE} initial graph; overlap: ${overlap
        .map((filePath) => canonicalBuildPath(resolvedAppDir, filePath))
        .join(', ')}`,
    );
  }

  const sizePaths = new Set([...allStaticPaths, ...initialPaths]);
  const sizes = await gzipSizes(sizePaths);
  const initialMaplibrePaths = [...new Set([...initialPaths, ...maplibrePaths])];
  const report = {
    schemaVersion: 2,
    route: ROOT_ROUTE,
    build: {
      id: buildId.toString('utf8').trim(),
      framework: framework.name,
      frameworkVersion: framework.version,
      declaredNext,
      installedNext: installedNext.version,
    },
    initial: metric(initialPaths, sizes, budgets.initial),
    maplibre: metric(maplibrePaths, sizes, budgets.maplibre),
    total: metric(allStaticPaths, sizes, budgets.total),
    initialMaplibreUnion: metric(
      initialMaplibrePaths,
      sizes,
      Number.MAX_SAFE_INTEGER,
    ),
  };
  for (const section of [
    report.initial,
    report.maplibre,
    report.total,
    report.initialMaplibreUnion,
  ]) {
    section.chunks = section.chunks.map((filePath) =>
      canonicalBuildPath(resolvedAppDir, filePath),
    );
  }

  assertBudget('Initial route JS', report.initial);
  assertBudget('MapLibre-loaded JS', report.maplibre);
  assertBudget('All emitted static JS', report.total);
  return report;
}

function parsePositiveInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    fail(`${flag} requires a positive integer byte count.`);
  }
  return parsed;
}

function parseArguments(argv) {
  const options = {
    appDir: process.cwd(),
    budgets: { ...DEFAULT_JS_BUDGETS },
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      options.json = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value) fail(`${argument} requires a value.`);
    if (argument === '--app-dir') options.appDir = value;
    else if (argument === '--initial-budget-bytes') {
      options.budgets.initial = parsePositiveInteger(value, argument);
    } else if (argument === '--maplibre-budget-bytes') {
      options.budgets.maplibre = parsePositiveInteger(value, argument);
    } else if (argument === '--total-budget-bytes') {
      options.budgets.total = parsePositiveInteger(value, argument);
    } else {
      fail(`Unknown argument: ${argument}`);
    }
    index += 1;
  }
  return options;
}

function kibibytes(bytes) {
  return (bytes / 1024).toFixed(2);
}

export async function runCli(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const report = await verifyJsBudgets(options);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
    return;
  }
  console.log(
    `PASS: /[locale] initial ${kibibytes(report.initial.gzipBytes)} KiB / ${kibibytes(report.initial.budgetBytes)} KiB; ` +
      `MapLibre-loaded ${kibibytes(report.maplibre.gzipBytes)} KiB / ${kibibytes(report.maplibre.budgetBytes)} KiB; ` +
      `all emitted static JS ${kibibytes(report.total.gzipBytes)} KiB / ${kibibytes(report.total.budgetBytes)} KiB.`,
  );
  console.log(
    `Diagnostic only: initial + MapLibre union ${kibibytes(report.initialMaplibreUnion.gzipBytes)} KiB across ${report.initialMaplibreUnion.chunkCount} unique chunks.`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    await runCli();
  } catch (error) {
    console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
