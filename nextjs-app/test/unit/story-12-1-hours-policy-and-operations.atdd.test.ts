/**
 * ATDD RED-PHASE acceptance scaffolds — Story 12.1 (AC1, AC5, AC7, AC8)
 * Provider-policy, weekly-workflow, documentation, and no-live-provider contracts.
 *
 * Every scaffold stays skipped until the implementation task activates it.
 * No test in this file makes an outbound provider request.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const projectRoot = process.cwd();
const repoRoot = join(projectRoot, '..');

function readOptional(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function collectTextFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    if (statSync(full).isDirectory()) {
      result.push(...collectTextFiles(full));
    } else if (/\.(?:ts|tsx|js|mjs|cjs|json|ya?ml|sql)$/i.test(entry)) {
      result.push(full);
    }
  }
  return result;
}

const productionFiles = [
  ...collectTextFiles(join(projectRoot, 'app')),
  ...collectTextFiles(join(projectRoot, 'lib')),
  ...collectTextFiles(join(projectRoot, 'scripts')),
  ...collectTextFiles(join(repoRoot, '.github', 'workflows')),
];
const productionSource = productionFiles
  .map((file) => '\nFILE: ' + file + '\n' + readOptional(file))
  .join('\n');
const persistenceFiles = [
  ...collectTextFiles(join(repoRoot, 'supabase', 'migrations')),
  ...collectTextFiles(join(projectRoot, 'test')).filter(
    (file) =>
      !file.endsWith('story-12-1-hours-policy-and-operations.atdd.test.ts') &&
      !file.endsWith('story-12-1-review-fixes.test.ts') &&
      !file.endsWith('story-12-1-review-fixes-iteration-2.test.ts') &&
      !file.endsWith(join('test', 'setup', 'setup.ts')),
  ),
];
const persistenceSource = persistenceFiles
  .map((file) => '\nFILE: ' + file + '\n' + readOptional(file))
  .join('\n');

const setupSource = readOptional(join(projectRoot, 'test', 'setup', 'setup.ts'));
const storySource = readOptional(
  join(
    repoRoot,
    '_bmad-output',
    'implementation-artifacts',
    '12-1-google-places-opening-hours-sync-weekly-scheduled-replace-hand-maintained-hours.md',
  ),
);
const authoringDoc = readOptional(join(projectRoot, 'docs', 'venue-data-load.md'));
const scheduledDoc = readOptional(
  join(projectRoot, 'docs', 'github-actions-scheduled-jobs.md'),
);
const environmentDoc = readOptional(
  join(projectRoot, 'docs', 'environment-variables.md'),
);
const envExample = readOptional(join(projectRoot, '.env.example'));
const hoursWorkflow = readOptional(
  join(repoRoot, '.github', 'workflows', 'hours-review-audit.yml'),
);
const legacyWorkflow = readOptional(
  join(repoRoot, '.github', 'workflows', 'scheduled-cron-jobs.yml'),
);
const googleHoursFieldPattern =
  /regular(?:OpeningHours|[\s_-]+opening[\s_-]*hours)/i;
const providerCredentialPattern =
  /\b(?:(?:GOOGLE|PLACES|MAPS|GMAPS|GMP|GCP_MAPS)[A-Z0-9_]*(?:API_KEY|CREDENTIALS?|SECRET|TOKEN))\b/;

describe('[12.1 AC1/AC8] Google-hours path stays prohibited', () => {
  test('[P1] production and scheduled code has no Google hours/content/credential path', () => {
    expect(productionSource).not.toMatch(googleHoursFieldPattern);
    expect(productionSource).not.toMatch(/X-Goog-FieldMask[^\n]*opening/i);
    expect(productionSource).not.toMatch(/places\.googleapis\.com/i);
    expect(productionSource).not.toMatch(/places_api_url/i);
    expect(productionSource).not.toMatch(providerCredentialPattern);
  });

  test('[P1] migrations, SQL fixtures, and tests persist no provider content or credentials', () => {
    expect(persistenceSource).not.toMatch(googleHoursFieldPattern);
    expect(persistenceSource).not.toMatch(/X-Goog-FieldMask[^\n]*opening/i);
    expect(persistenceSource).not.toMatch(/(?:places|maps)\.googleapis\.com/i);
    expect(persistenceSource).not.toMatch(providerCredentialPattern);
    expect(persistenceSource).not.toMatch(
      /places_api_url[\s\S]{0,200}https?:\/\//i,
    );
  });

  test('[P1] normalized Google-hours fields and non-GOOGLE credential aliases are detected', () => {
    for (const field of [
      'regularOpeningHours',
      'regular_opening_hours',
      'regular-opening-hours',
      'regular opening hours',
    ]) {
      expect(field).toMatch(googleHoursFieldPattern);
    }
    for (const credential of [
      'MAPS_API_KEY',
      'GMAPS_CREDENTIAL',
      'GMP_SECRET',
      'GCP_MAPS_TOKEN',
    ]) {
      expect(credential).toMatch(providerCredentialPattern);
    }
  });

  test('[P1] public code has no hours-provider route or request-path integration', () => {
    const hoursCronFiles = productionFiles.filter(
      (file) =>
        /app[\\/]api[\\/]cron/i.test(file) &&
        /(?:opening[-_]?hours|hours[-_]?review|places?)/i.test(file),
    );
    expect(hoursCronFiles).toEqual([]);
    expect(productionSource).not.toMatch(/fetch\([^\n]*(?:google|places|nominatim)/i);
  });

  test('[P1] shared test setup hard-blocks Google/provider hosts with a fix hint', () => {
    expect(setupSource).toMatch(/places\.googleapis\.com/i);
    expect(setupSource).toMatch(/no live|forbidden|fetch guard/i);
    expect(setupSource).toMatch(/mock|inject/i);
  });

  test('[P1] shared fetch guard rejects a live Google Places request', async () => {
    await expect(
      fetch('https://places.googleapis.com/v1/places/example'),
    ).rejects.toThrow(/No live.*provider|places\.googleapis\.com fetch guard/i);
  });

  test('[P1] shared fetch guard also rejects legacy and trailing-dot Google hosts', async () => {
    await expect(
      fetch('https://maps.googleapis.com/maps/api/place/details/json'),
    ).rejects.toThrow(/No live.*provider|Google Maps\/Places host fetch guard/i);
    await expect(
      fetch('https://places.googleapis.com./v1/places/example'),
    ).rejects.toThrow(/No live.*provider|Google Maps\/Places host fetch guard/i);
  });

  test('[P1] story brief preserves the explicit supersession and controlling decisions', () => {
    expect(storySource).toContain('## Superseded Epic Text');
    expect(storySource).toContain('sprint-change-proposal-2026-07-12.md');
    expect(storySource).toContain('technical-google-places-api-policy-epic-12-research-2026-07-12.md');
    expect(storySource).toContain('E12-AD-01');
    expect(storySource).toContain('E12-AD-13');
  });
});

describe('[12.1 AC5/AC7] direct weekly audit workflow and operations docs', () => {
  test('[P1] dedicated workflow is weekly, manually dispatchable, non-overlapping, and direct-script only', () => {
    expect(hoursWorkflow).toMatch(/schedule:/);
    expect(hoursWorkflow).toMatch(/cron:/);
    expect(hoursWorkflow).toMatch(/workflow_dispatch:/);
    expect(hoursWorkflow).toMatch(/concurrency:/);
    expect(hoursWorkflow).toMatch(/environment:\s*production/);
    expect(hoursWorkflow).toMatch(/audit-opening-hours\.mjs/);
    expect(hoursWorkflow).toMatch(/SUN_HOURS_AUDIT_ENABLED/);
    expect(hoursWorkflow).not.toMatch(/\/api\/cron\//);
    expect(hoursWorkflow).not.toMatch(/CRON_SECRET/);
    expect(hoursWorkflow).not.toMatch(/GOOGLE|PLACES_API_KEY/i);
  });

  test('[P1] workflow is main-branch/protected-environment scoped with bounded execution and summary output', () => {
    expect(hoursWorkflow).toMatch(/refs\/heads\/main|branches:\s*\[?main/i);
    expect(hoursWorkflow).toMatch(/timeout-minutes:/);
    expect(hoursWorkflow).toMatch(/GITHUB_STEP_SUMMARY/);
    expect(hoursWorkflow).toMatch(/run[_ -]?id/i);
  });

  test('[P1] legacy scheduled workflow no longer offers or invokes OSM ingestion', () => {
    expect(legacyWorkflow).not.toMatch(/osm-ingestion/i);
    expect(legacyWorkflow).not.toMatch(/\/api\/cron\/osm/i);
  });

  test('[P1] authoring docs remove provider URL examples and explain provider-neutral evidence', () => {
    expect(authoringDoc).not.toMatch(/places_api_url/i);
    expect(authoringDoc).not.toMatch(/places\.googleapis\.com\/v1\/places/i);
    expect(authoringDoc).toMatch(/Place ID[- ]only|Place-ID-only/i);
    expect(authoringDoc).toMatch(/venue_confirmed|venue_website|licensed_provider|manual/);
    expect(authoringDoc).toMatch(/unknown|unknown hours/i);
    expect(authoringDoc).toMatch(/split|24\/7|seasonal|holiday/i);
  });

  test('[P1] scheduled-job and environment docs describe the direct audit and emergency stop', () => {
    const operationsText = scheduledDoc + '\n' + environmentDoc + '\n' + envExample;
    expect(operationsText).toMatch(/audit-opening-hours\.mjs/);
    expect(operationsText).toMatch(/workflow_dispatch/);
    expect(operationsText).toMatch(/SUN_HOURS_AUDIT_ENABLED/);
    expect(operationsText).toMatch(/180 days|180-day/i);
    expect(operationsText).not.toMatch(/GOOGLE_MAPS|PLACES_API_KEY/i);
  });
});
