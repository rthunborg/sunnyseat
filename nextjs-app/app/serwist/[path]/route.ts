import { spawnSync } from 'node:child_process';
import { createSerwistRoute } from '@serwist/turbopack';

/**
 * Serves the Serwist-bundled service worker at `/serwist/sw.js` (Story 7.3
 * Task 2). `@serwist/turbopack` is the Turbopack-native integration (Next 16
 * builds with Turbopack by default, where the classic webpack `@serwist/next`
 * plugin would not run). The route bundles `app/sw.ts` with esbuild and emits
 * `sw.js` (+ its sourcemap) as `force-static` output; `dynamicParams: false`
 * 404s any other path under `/serwist`. The GET handler returns the SW with a
 * `Service-Worker-Allowed: /` header, so `SerwistProvider` (in the root
 * layout) can register it at the root scope even though it is served from a
 * sub-path.
 *
 * Cache invalidation on new deployments (AC2): the precache `revision` is
 * keyed to the build's git commit, so each deployment versions the precached
 * `/` shell and supersedes the previous cache. A random id is used when git is
 * unavailable (e.g. a detached build environment) so the SW still rebuilds.
 */
const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: 'app/sw.ts',
    additionalPrecacheEntries: [{ url: '/', revision }],
    useNativeEsbuild: true,
  });
