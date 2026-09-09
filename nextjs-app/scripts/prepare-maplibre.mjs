import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { minify } from 'terser';
import path from 'node:path';

// Build the two browser entry points together, sharing their common code.
// Native module URLs avoid bundling shared code twice in Next and the worker.
const packageDir = path.resolve('node_modules/maplibre-gl');
const { version } = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'));
const declaredVersion = JSON.parse(await readFile('lib/maplibre-version.json', 'utf8')).version;
if (version !== declaredVersion) throw new Error('MapLibre runtime version does not match installed dependency');
if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error('Unexpected MapLibre version');
const destination = path.resolve('public/vendor/maplibre', version);
const generatedRoot = path.resolve('public/vendor/maplibre');
if (!destination.startsWith(`${generatedRoot}${path.sep}`)) throw new Error('Invalid output directory');
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
const result = await build({
  entryPoints: {
    'maplibre-gl': 'scripts/maplibre-entry.mjs',
    'maplibre-gl-worker': path.join(packageDir, 'dist/maplibre-gl-worker.mjs'),
  },
  outdir: destination,
  bundle: true,
  splitting: true,
  format: 'esm',
  target: 'es2022',
  minify: false,
  outExtension: { '.js': '.mjs' },
  metafile: true,
});
const hashes = {};
for (const file of Object.keys(result.metafile.outputs)) {
  const compressed = await minify(await readFile(file, 'utf8'), {
    ecma: 2022, module: true, compress: { passes: 3 }, mangle: true,
  });
  if (!compressed.code) throw new Error('MapLibre module minification produced no output');
  await writeFile(file, compressed.code);
  hashes[path.basename(file)] = createHash('sha256').update(await readFile(file)).digest('hex');
}
await copyFile(path.join(packageDir, 'LICENSE.txt'), path.join(destination, 'LICENSE.txt'));
await writeFile(path.join(destination, 'manifest.json'), JSON.stringify({ version, hashes }));
console.log(`Prepared same-origin MapLibre ${version} modules.`);
