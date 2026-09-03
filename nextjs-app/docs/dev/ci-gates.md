# Local CI parity — quality-gate recipe

This document is the local equivalent of `.github/workflows/build-and-test-nextjs.yml`. Run from `nextjs-app/`. Every step below maps 1:1 to a CI step; if a CI run fails, reproducing the same step locally will fail the same way.

> **Test-gate policy lives in CLAUDE.md and the `test-gate` skill — this file is operational, not policy. See those for *what must pass*; this file documents *how to run it*.**

---

## TL;DR

```bash
cd nextjs-app
npm ci --no-audit
npm audit --omit=dev --audit-level=high
npm run typecheck
npm run lint
npm run build
npm test
npm run bundle:verify
node scripts/verify-maplibre-async.mjs
npx playwright install --with-deps chromium  # one-time, per machine
npx playwright test
npm run lighthouse
```

If every command exits 0, your branch is in the same shape CI will report.

---

## Local recipe — one section per gate

### Dependency install and production audit

```bash
npm ci --no-audit
npm audit --omit=dev --audit-level=high
```

- `npm ci --no-audit` keeps install output deterministic; the explicit audit immediately after it is the gate.
- The audit omits development dependencies and fails on exploitable high/critical production findings.
- Verified 2026-08-18: the production audit reports 0 vulnerabilities.
- The full audit is not green: 10 findings remain solely in the development-only `@lhci/cli@0.15.1` tree. npm's suggested force path downgrades to unsafe `0.1.0`, so do not use `npm audit fix --force` or add an override for that noise.

### 1. Type check (`npm run typecheck`)

```bash
npm run typecheck
```

- Runs `tsc --noEmit`.
- Expected: 0 errors.
- Maps to CI step: `Type check`.
- Common cause of failure: stale `node_modules`. Run `npm ci --no-audit` first.

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

### 5. JavaScript budgets and MapLibre async boundary

```bash
npm run bundle:verify
node scripts/verify-maplibre-async.mjs
```

- `npm run bundle:verify` reads `.next/diagnostics/route-bundle-stats.json` and the exact `/[locale]` initial chunk graph.
- Gzips each unique JavaScript chunk independently with Node zlib level 9 and compares exact bytes:
  - route initial: at most 280 KiB;
  - all MapLibre-bearing chunks: at most 320 KiB;
  - all emitted files under `.next/static/**/*.js`: at most 600 KiB.
- Requires MapLibre detection and rejects overlap with the initial graph.
- Fails closed on missing/stale diagnostics, missing chunks, or a Next framework-version mismatch.
- Reports the unique initial-plus-MapLibre union as a diagnostic only; every emitted static JavaScript chunk remains part of the binding total budget.
- `node scripts/verify-maplibre-async.mjs` is the separate all-routes MapLibre async verifier. It cross-checks every route manifest's `rootMainFiles` and must stay wired even though the budget verifier also checks the `/[locale]` initial route overlap.
- Maps to CI steps: `Verify JS bundle budgets` and `Verify MapLibre async boundary across all routes`.

### 6. Playwright e2e tests

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

### 7. Accessibility tests (axe-core)

```bash
npx playwright test test/e2e/axe.spec.ts
```

- Runs the axe-core a11y gate against every URL listed in `test/e2e/axe.spec.ts`.
- The gate fails on `serious` or `critical` impact only — `moderate` and `minor` violations are logged but do not fail the build (see `test/e2e/helpers/axe.ts`).
- Maps to CI step: `A11y tests (axe-core)`.

### 8. Lighthouse (`npm run lighthouse`)

```bash
npm run lighthouse
```

- Runs `lhci autorun` against a fresh `npm start` build, 3 iterations, mobile + 4× CPU throttling.
- Thresholds (from `lighthouserc.json`):
  - `categories:performance` ≥ 0.55 (re-baselined; see PRD NFR2 / architecture line 339)
  - `categories:accessibility` ≥ 0.95
- Local-vs-CI variance: expect ±0.05 between Linux runners and local Windows.
- Maps to the `Lighthouse CI` step in `build-and-test`, after Playwright and both axe projects, using the same `.next` tree produced earlier in that job.
- Reports are always uploaded from `.lighthouseci/`; there is no `.next` artifact handoff.

### 9. Bundle analysis (developer-only)

```bash
npm run bundle:analyze
```

- Works in any shell (bash / Git Bash / WSL / PowerShell / cmd) — the script uses `cross-env` to set `ANALYZE=true` portably before running `next build`.
- Opens the `@next/bundle-analyzer` HTML report in the default browser.
- NOT part of CI — purely a development aid. Use it before submitting a PR that adds dependencies, to verify the new dependency is tree-shaken.
- Story 1.6 history: Round 1 P42 documented the PowerShell workaround `$env:ANALYZE = 'true'; npm run build`, but the npm script itself remained bash-only; Round 2 R2-P7 (2026-05-08) fixed the script via `cross-env` so the workaround is no longer needed.

---

## CI runtime and cache maintenance

- Node-24-compatible action pins are exact: `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1` (v7.0.1), `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020` (v7.0.0), and `actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (v7.0.1).
- Those actions execute on GitHub's Node 24 action runtime; `node-version: '22'` remains SunnySeat's tested application runtime.
- A setup-node npm-cache exact hit followed by “not saving cache” is normal informational behavior: the immutable key already exists.
- The intermittent 429/502 was GitHub codeload fetching the former download-artifact action, not a Lighthouse page download. Running Lighthouse in the build job removes that action, its redundant checkout/setup/install, and the large `.next` handoff.

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

### `bundle:verify` reports missing or stale diagnostics

Run a complete `npm run build` first, then rerun `npm run bundle:verify`. The Node gate uses deterministic level-9 gzip and exact byte comparisons, so Windows and Linux should agree. Do not use an interrupted or compile-only build as release evidence.

### `Lighthouse` fails with "Screen emulation mobile setting (true) does not match formFactor setting (desktop)"

Stop using the `desktop` preset. The current config sets `formFactor: "mobile"` and `screenEmulation.mobile: true` — they must agree. If you customise `lighthouserc.json`, keep both consistent.

### Playwright complains about "two different versions of @playwright/test"

You ran `npm install` outside `nextjs-app/` and it created a competing `package.json` at the project root. Delete the root-level `package.json`, `node_modules/`, and `package-lock.json` (project root only — DO NOT touch `nextjs-app/package.json`), then re-run `cd nextjs-app && npm ci --no-audit`.

### `npx playwright test` returns "No tests found"

Playwright's CLI fails on shell glob expansion when an argument contains `$` or `*`. Quote the path or use a relative path without globs: `npx playwright test test/e2e/foo.spec.ts`.

### `axe-core` reports a contrast violation after I update a token

You probably updated a `--color-*` token in `globals.css` but the dev server hasn't hot-reloaded. Stop the dev server, delete `.next/dev/`, and re-run. Lighthouse runs against `npm start` (production build) — for those, run `rm -rf .next && npm run build && npm run lighthouse`.
