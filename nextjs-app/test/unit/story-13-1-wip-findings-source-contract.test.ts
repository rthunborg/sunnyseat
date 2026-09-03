import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = process.cwd();
const repoRoot = join(appRoot, '..');

function readApp(relativePath: string): string {
  return readFileSync(join(appRoot, relativePath), 'utf8');
}

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('Story 13.1 WIP findings source contract', () => {
  it('keeps bundle and all-routes MapLibre async checks as separate CI gates', () => {
    const workflow = readRepo('.github/workflows/build-and-test-nextjs.yml');
    const ciDocs = readApp('docs/dev/ci-gates.md');
    const bundleIndex = workflow.indexOf('run: npm run bundle:verify');
    const asyncIndex = workflow.indexOf('run: node scripts/verify-maplibre-async.mjs');

    expect(bundleIndex).toBeGreaterThanOrEqual(0);
    expect(asyncIndex).toBeGreaterThan(bundleIndex);
    expect(workflow).toContain('name: Verify JS bundle budgets');
    expect(workflow).toContain('name: Verify MapLibre async boundary across all routes');
    expect(ciDocs).toContain('npm run bundle:verify');
    expect(ciDocs).toContain('node scripts/verify-maplibre-async.mjs');
    expect(ciDocs).toContain('separate all-routes MapLibre async verifier');
  });

  it('keeps the probe CLI preview-aware and replanable without production constants', () => {
    const probe = readApp('scripts/launch-resilience/venue-probe.mjs');
    const probeLib = readApp('scripts/launch-resilience/venue-probe-lib.mjs');

    expect(probe).toContain("environment: { type: 'string' }");
    expect(probe).toContain("positionals[0] === 'replan'");
    expect(probe).toContain('MIN_REPLAN_ORIGIN_ATTEMPTS = 20');
    expect(probe).toContain('Replan requires exactly one edge-prime client sample');
    expect(probe).toContain('normalizeRuntimeEvents(requestLogs.evidence, { environment })');
    expect(probe).toContain('expectedEnvironment: environment');
    expect(probeLib).toContain('event.environment === expectedEnvironment');
  });

  it('keeps DR preview isolated, exact-commit bound, and real-data configured', () => {
    const runbook = readRepo('docs/launch/disaster-recovery-runbook.md');

    for (const expected of [
      '$expectedApplicationCommit',
      '$sessionEvidenceDirectory',
      '$smokeEvidenceDirectory',
      'git clone --no-local $authoringRepositoryRoot $drLocalRoot',
      'git -C $drLocalRoot switch --detach $expectedApplicationCommit',
      'git -C $drLocalRoot rev-parse HEAD',
      'git -C $drLocalRoot status --porcelain=v1',
      'SUNNYSEAT_VENUE_STORE supabase',
      'SUN_ENGINE real',
      'SUNNYSEAT_DR_SOURCE_COMMIT $expectedApplicationCommit',
      '--meta "sunnyseatDrSourceCommit=$expectedApplicationCommit"',
      '$deployment.meta.sunnyseatDrSourceCommit',
      '--environment preview',
      'Push-Location $stagingWorkspace',
    ]) {
      expect(runbook).toContain(expected);
    }
  });

  it('keeps the restore verifier read-only and bound to 42 venues with 61-step contracts', () => {
    const verifier = readRepo('scripts/dr/verify-restore.sql');
    const runbook = readRepo('docs/launch/disaster-recovery-runbook.md');
    const verifierSha256 = createHash('sha256')
      .update(verifier)
      .digest('hex')
      .toUpperCase();

    for (const expected of [
      'begin transaction read only;',
      "current_setting('sunnyseat.dr_as_of_utc')::timestamptz",
      'missing or malformed values fail closed',
      'PGOPTIONS',
      'verifier_parameters as (',
      "set local statement_timeout = '120s';",
      "set local lock_timeout = '5s';",
      "'transaction_read_only', current_setting('transaction_read_only')",
      'public.read_current_venue_sun_geometry_batch(text[],date)',
      'count(*) = 42',
      'count(*) filter (where not hidden and deleted_at is null) = 42',
      'jsonb_array_length(series_row.series) = 61',
      'exact_ordered_61_step_rows',
      '(select count(*) from public.venue_geometry_inputs) = 42',
      '(select count(*) from weather_bucket_groups) = 42',
      'service_role_membership_contract as (',
      'outbound_effect_contract as (',
      'storage_contract as (',
      'verification_summary as (',
      'hard_failure_count',
    ]) {
      expect(verifier).toContain(expected);
    }
    expect(verifier).not.toContain('membership.inherit_option');
    expect(verifier).not.toContain('membership.set_option');
    expect(verifier).not.toContain("set local sunnyseat.dr_as_of_utc = '2026-08-26T00:00:00Z';");
    expect(verifier).not.toContain('timezone(\'Europe/Stockholm\', now())');
    expect(verifier).not.toContain('expires_at > now()');
    expect(runbook).toContain(verifierSha256);
  });

  it('keeps the DR runbook on the isolated approval boundary', () => {
    const runbook = readRepo('docs/launch/disaster-recovery-runbook.md');

    for (const expected of [
      'Status: **RUNBOOK READY; PROVIDER RESTORE NOT EXERCISED**',
      'fresh explicit approval',
      '- restore over the source project or run `supabase backups restore`;',
      '$targetName = "sunnyseat-dr-$sessionId"',
      "if ($targetRef -eq $sourceRef) { throw 'Target equals source.' }",
      'function Assert-ProductionVercelBinding {',
      'function Invoke-DrCleanup {',
      'PASS WITH DOCUMENTED LIMITATIONS',
      'the only valid outcome is **NOT EXERCISED**',
    ]) {
      expect(runbook).toContain(expected);
    }
    expect(runbook).toContain('$allowedDeletePaths = @(');
    expect(runbook).toContain('Vercel DELETE path is outside the DR cleanup allowlist');
    expect(runbook).toContain('Vercel DELETE deployment does not match the ledgered preview deployment.');
    expect(runbook).toContain('Vercel DELETE environment does not match a ledgered preview env.');
    for (const expected of [
      'Invoke-DrCleanupStep',
      'Resolve-DrTargetCleanupIdentity',
      'Get-VercelCleanupProjectIdentity',
      'Remove-ExactVercelApiResource',
      'Get-TargetCleanupVerification',
      'Assert-VercelDisposableProjectAbsent',
      'Assert-SupabaseTargetAbsentAndSourceHealthy',
      'Assert-ProductionApplicationSmoke',
      'Clear-DrSecretsAndLocalFiles',
    ]) {
      expect(runbook).toContain(`'${expected}'`);
    }
    expect(runbook).toContain('$expectedProductionVercelProjectIdSha256');
    expect(runbook).toContain('$expectedAuthoringProductionDeploymentIdSha256');
    expect(runbook).toContain('function Assert-ProductionVercelIdentityBinding {');
    expect(runbook).toContain('Production Vercel project ID does not match reviewed hash binding.');
    expect(runbook).toContain('Authoring production deployment ID does not match reviewed hash binding.');
    expect(runbook).not.toContain('prj_Y3jvsIxhNaruzSYM2pRwMTyRm7Jw');
    expect(runbook).not.toContain('dpl_FszRAy5d7i84BvfTWt1UGHpQURCE');
  });

  it('keeps production audit gates in scheduled service-only workflows', () => {
    const hours = readRepo('.github/workflows/hours-review-audit.yml');
    const geometryWeather = readRepo('.github/workflows/sun-geometry-and-weather.yml');

    expect(hours).toContain('name: Production dependency audit');
    expect(hours).toContain('npm audit --omit=dev --audit-level=high');
    expect(geometryWeather.match(/name: Production dependency audit/gu)).toHaveLength(2);
    expect(geometryWeather.match(/npm audit --omit=dev --audit-level=high/gu)).toHaveLength(2);
  });

  it('keeps launch context aligned to the applied Next security release', () => {
    const agents = readRepo('AGENTS.md');
    const handoff = readRepo('docs/launch/launch-readiness-handoff-2026-08-24.md');

    expect(agents).toContain('Next.js 16.3.3 App Router');
    expect(agents).not.toContain('Next.js 16.3.1');
    expect(handoff).toContain('**Security release applied.**');
    expect(handoff).toContain('Next.js 16.3.3');
    expect(handoff).not.toContain('Security release first');
  });

  it('preloads lazily split venue interaction chunks before first open', () => {
    const mapView = readApp('components/custom/map/MapView.tsx');

    expect(mapView).toContain('const loadVenueDetailOverlay = () =>');
    expect(mapView).toContain('const loadFeedbackFlow = () =>');
    expect(mapView).toContain('const loadReviewFlow = () =>');
    expect(mapView).toContain('requestIdleCallback');
    expect(mapView).toContain('preloadLazyInteractionChunks');
  });

  it('keeps the Motion test seam aligned with LazyMotion and NotFound WAAPI usage', () => {
    const providers = readApp('app/providers.tsx');
    const notFoundTest = readApp('test/components/NotFoundPage.test.tsx');

    expect(providers).toContain('<LazyMotion features={domMin} strict>');
    expect(notFoundTest).toContain("vi.mock('motion/react-m'");
    expect(notFoundTest).toContain("vi.mock('@/hooks/use-reduced-motion'");
    expect(notFoundTest).toContain("Object.defineProperty(HTMLElement.prototype, 'animate'");
  });

  it('keeps reduced-motion hydration defaults fail-closed for motion callers', () => {
    const hook = readApp('hooks/use-reduced-motion.ts');
    const motionSources = [
      'components/composed/feedback/FeedbackPrompt.tsx',
      'components/composed/feedback/ReviewForm.tsx',
      'components/composed/search/VenueSearchCombobox.tsx',
      'components/composed/venue/VenueQuickInfo.tsx',
      'components/custom/coach-tour/FirstRunCoachMarkGuide.tsx',
      'components/custom/feedback/AppFeedbackModal.tsx',
      'components/custom/feedback/FeedbackFlow.tsx',
      'components/custom/feedback/ReviewFlow.tsx',
      'components/custom/routing/RouteOverlay.tsx',
      'components/custom/settings/SettingsModal.tsx',
      'components/custom/sheets/MobileBottomSheet.tsx',
      'components/custom/time/TimeSliderPanel.tsx',
      'components/custom/venue/ShareModal.tsx',
      'components/custom/venue/VenueDetailOverlay.tsx',
    ];

    expect(hook).toContain('function getFallbackSnapshot(): true');
    expect(hook).toContain('return true;');
    for (const source of motionSources) {
      expect(readApp(source)).not.toContain('useReducedMotion() ?? false');
    }
  });

  it('records the exact continuation checkpoint separately from the parent reconciliation SHA', () => {
    const handoff = readRepo('docs/launch/launch-readiness-handoff-2026-08-24.md');

    expect(handoff).toContain('668badb0ce15ee321a6aca207f1c5288dbe8f7ea');
    expect(handoff).toContain('1b1d4083e803a86beed9254d8bcb935ca8499eae');
    expect(handoff).not.toContain('committed as `1b1d408`');
  });
});
