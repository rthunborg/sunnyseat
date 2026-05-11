# Local CI parity — quality-gate recipe

This document is the local equivalent of `.github/workflows/build-and-test-nextjs.yml`. Run from `nextjs-app/`. Every step below maps 1:1 to a CI step; if a CI run fails, reproducing the same step locally will fail the same way.

> **Test-gate policy lives in CLAUDE.md and the `test-gate` skill — this file is operational, not policy. See those for *what must pass*; this file documents *how to run it*.**

---

## TL;DR

```bash
cd nextjs-app
npm ci
npm run typecheck
npm run lint
npm run build
npm test
node scripts/verify-maplibre-async.mjs
npx playwright install --with-deps chromium  # one-time, per machine
npx playwright test
npm run lighthouse
```

If every command exits 0, your branch is in the same shape CI will report.

---

## Local recipe — one section per gate

### 1. Type check (`npm run typecheck`)

```bash
npm run typecheck
```

- Runs `tsc --noEmit`.
- Expected: 0 errors.
- Maps to CI step: `Type check`.
- Common cause of failure: stale `node_modules`. Run `npm ci` first.

### 2. Lint (`npm run lint`)

```bash
npm run lint
```

- Runs `eslint . --quiet`.
- Expected: 0 errors.
- Maps to CI step: `Lint`.
- The vendored Claude Design prototypes are intentionally masked — see `docs/design/references/claude-design/ESLINT-AUDIT.md` for the audit that justifies the `globalIgnores` glob.

### 3. Build (`npm run build`)

```bash
npm run build
```

- Runs `next build` with Turbopack.
- Expected: build succeeds; the bundle-cap step below relies on the `.next/` artefacts this produces.
- Maps to CI step: `Build`.

### 4. Unit + component tests (`npm test`)

```bash
npm test
```

- Runs `vitest run` against `test/unit/**` + `test/components/**`.
- Maps to CI step: `Unit + component tests`.
- Skipped at this layer: e2e (`test/e2e/**`) — those run via Playwright in step 7.

### 5. Bundle size cap

```bash
js_files=$(find .next/static -name '*.js' -print)
[ -z "$js_files" ] && { echo "::error::No JS files — build broken"; exit 1; }
total_size=$(find .next/static -name '*.js' -print0 | xargs -0 cat | gzip -c | wc -c)
total_kb=$((total_size / 1024))
echo "Total gzipped JS: ${total_kb} KB"
[ "$total_kb" -le 600 ] && echo "OK" || echo "OVER BUDGET"
```

- Cap: 600 KB total gzipped JS (re-baselined in Story 1.6 Task 4 from the original 400 KB; see PRD NFR8).
- MapLibre dynamic chunk is included in the total; it is NOT counted in route-initial bundle thanks to `next/dynamic({ ssr: false })` on `MapView`.
- Maps to CI step: `Bundle size check`.
- Story 1.6 review (P5): aggregate via single `gzip -c | wc -c` rather than per-file `gzip -c {} \;` to remove ~10 bytes-per-file gzip-header inflation.

### 6. MapLibre async-load verification

```bash
node scripts/verify-maplibre-async.mjs
```

- Confirms the maplibre-gl chunk is NOT referenced from any route's `rootMainFiles` build manifest.
- Expected: `PASS: maplibre-gl is async-loaded …`.
- Maps to CI step: `Verify maplibre is async-loaded`.

### 7. Playwright e2e tests

One-time per machine:

```bash
npx playwright install --with-deps chromium
```

Then on every run:

```bash
npx playwright test
```

- Runs every spec under `test/e2e/**` against the dev server (started automatically via `playwright.config.ts` `webServer`).
- Maps to CI step: `E2E tests`.

### 8. Accessibility tests (axe-core)

```bash
npx playwright test test/e2e/axe.spec.ts
```

- Runs the axe-core a11y gate against every URL listed in `test/e2e/axe.spec.ts`.
- The gate fails on `serious` or `critical` impact only — `moderate` and `minor` violations are logged but do not fail the build (see `test/e2e/helpers/axe.ts`).
- Maps to CI step: `A11y tests (axe-core)`.

### 9. Lighthouse (`npm run lighthouse`)

```bash
npm run lighthouse
```

- Runs `lhci autorun` against a fresh `npm start` build, 3 iterations, mobile + 4× CPU throttling.
- Thresholds (from `lighthouserc.json`):
  - `categories:performance` ≥ 0.55 (re-baselined; see PRD NFR2 / architecture line 339)
  - `categories:accessibility` ≥ 0.95
- Local-vs-CI variance: expect ±0.05 between Linux runners and local Windows.
- Maps to CI job: `lighthouse` (separate job, runs after `build-and-test`).
- Reports written to `.lighthouseci/`.

### 10. Bundle analysis (developer-only)

```bash
npm run bundle:analyze
```

- Works in any shell (bash / Git Bash / WSL / PowerShell / cmd) — the script uses `cross-env` to set `ANALYZE=true` portably before running `next build`.
- Opens the `@next/bundle-analyzer` HTML report in the default browser.
- NOT part of CI — purely a development aid. Use it before submitting a PR that adds dependencies, to verify the new dependency is tree-shaken.
- Story 1.6 history: Round 1 P42 documented the PowerShell workaround `$env:ANALYZE = 'true'; npm run build`, but the npm script itself remained bash-only; Round 2 R2-P7 (2026-05-08) fixed the script via `cross-env` so the workaround is no longer needed.

---

## Adding a new route to the Lighthouse config

1. Open `lighthouserc.json`.
2. Add the route to the `ci.collect.url` array, e.g.:
   ```json
   "url": [
     "http://localhost:3000/",
     "http://localhost:3000/?venue=test-venue-sunny&_state=venue-detail"
   ]
   ```
3. Re-run `npm run lighthouse` locally; verify each URL passes the thresholds.
4. Commit and push.

Per the Story 1.6 Task 6 plan, only `/` is enabled at 1.6 close-out. Story 2.x adds new screens; each new screen story extends the URL list.

## Adding a new axe rule

The axe gate currently runs the `wcag2a` and `wcag2aa` tag sets (see `test/e2e/helpers/axe.ts`). To add an additional rule:

1. Open `test/e2e/helpers/axe.ts`.
2. Either add the rule's tag to the default `tags` array (e.g. `'best-practice'`), or pass `runAxe(page, { tags: [...] })` from a specific spec.
3. Re-run locally and triage any new violations per Story 1.6 Task 5.5's policy: fix inline if in scope, defer with a `*(Target: <story-id>)*` tag if not. **Do NOT add `aria-hidden` / `role="presentation"` shims to mask violations.**

## Adding locale-aware e2e tests

next-intl's `localePrefix: 'as-needed'` DOES honour `Accept-Language` at `/` — the original Story 1.5 hypothesis ("negotiation broken at root path") was wrong. Story 1.6 Task 10 confirmed this with a `curl` reproduction.

To assert Swedish copy in an e2e test, use Playwright's **`locale` option** — NOT `extraHTTPHeaders`. Device-emulation `Accept-Language` defaults override `extraHTTPHeaders`; `locale` flows through the chromium browser context and is what next-intl's middleware reads.

```typescript
test.describe('Swedish flow', () => {
  test.use({ locale: 'sv-SE' });

  test('renders the Swedish headline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hitta');
  });
});
```

If you need to assert English copy, the default Playwright locale (`en-US`) already steers to `/en` — no `test.use()` needed.

---

## Troubleshooting

### `Type check` fails locally but the IDE is clean

You probably have a stale `tsconfig.tsbuildinfo`. Run `rm tsconfig.tsbuildinfo && npm run typecheck`.

### `Bundle size check` reports a different number than CI

CI runs Linux; local runs Windows. `find` with embedded sub-shells differs between bash and PowerShell. Make sure you ran the command in a real bash (Git Bash, WSL, or the Bash tool from Claude Code) — not PowerShell. The number should match within 1 KB.

### `Lighthouse` fails with "Screen emulation mobile setting (true) does not match formFactor setting (desktop)"

Stop using the `desktop` preset. The current config sets `formFactor: "mobile"` and `screenEmulation.mobile: true` — they must agree. If you customise `lighthouserc.json`, keep both consistent.

### Playwright complains about "two different versions of @playwright/test"

You ran `npm install` outside `nextjs-app/` and it created a competing `package.json` at the project root. Delete the root-level `package.json`, `node_modules/`, and `package-lock.json` (project root only — DO NOT touch `nextjs-app/package.json`), then re-run `cd nextjs-app && npm ci`.

### `npx playwright test` returns "No tests found"

Playwright's CLI fails on shell glob expansion when an argument contains `$` or `*`. Quote the path or use a relative path without globs: `npx playwright test test/e2e/foo.spec.ts`.

### `axe-core` reports a contrast violation after I update a token

You probably updated a `--color-*` token in `globals.css` but the dev server hasn't hot-reloaded. Stop the dev server, delete `.next/dev/`, and re-run. Lighthouse runs against `npm start` (production build) — for those, run `rm -rf .next && npm run build && npm run lighthouse`.
