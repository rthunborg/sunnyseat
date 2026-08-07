/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.2 (AC2, AC3, AC4, AC5, AC6, AC7, AC8)
 * Migration contracts, maintainer accuracy reporting, stale-hash reset semantics,
 * coverage-cap bypass retirement, and diagnostic-only confidence documentation.
 *
 * Every scaffold stays skipped until the implementation task activates it.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';

const appRoot = process.cwd();
const repoRoot = join(appRoot, '..');
const migrationsDir = join(repoRoot, 'supabase', 'migrations');

function readOptional(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function collectTextFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const entries = readdirSync(root);
  const result: string[] = [];

  for (const entry of entries) {
    const full = join(root, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (['node_modules', '.next', 'coverage', 'test-results', 'playwright-report'].includes(entry)) {
        continue;
      }
      result.push(...collectTextFiles(full));
    } else if (/\.(?:ts|tsx|js|mjs|cjs|json|md|sql|ya?ml|toml)$/i.test(entry)) {
      result.push(full);
    }
  }

  return result;
}

function migrationFiles(): string[] {
  if (!existsSync(migrationsDir)) return [];
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

function readMigration(namePart: string): string {
  const file = migrationFiles().find((candidate) => candidate.includes(namePart));
  return file ? readOptional(join(migrationsDir, file)) : '';
}

function sourceCorpus(paths: string[], exclude: RegExp[] = []): string {
  return paths
    .filter((file) => !exclude.some((pattern) => pattern.test(relative(repoRoot, file))))
    .map((file) => '\nFILE: ' + relative(repoRoot, file) + '\n' + readOptional(file))
    .join('\n');
}

const feedbackMigration = readMigration('feedback_accuracy_loop');
const apiTypes = readOptional(join(appRoot, 'lib', 'types', 'api.ts'));
const supabaseTypes = readOptional(join(appRoot, 'lib', 'supabase', 'types.ts'));
const persistence = readOptional(join(appRoot, 'lib', 'services', 'venue-feedback-persistence.ts'));
const coverageCap = readOptional(join(appRoot, 'lib', 'solar', 'shadow-data-coverage.ts'));
const sunEngine = readOptional(join(appRoot, 'lib', 'services', 'sun-engine.ts'));
const appGitignore = readOptional(join(appRoot, '.gitignore'));
const reportFiles = collectTextFiles(join(appRoot, 'scripts')).filter((file) =>
  /accuracy|feedback|venue/i.test(file),
);
const reportSource = sourceCorpus(reportFiles);
const searchableSource = sourceCorpus(
  [
    ...collectTextFiles(join(appRoot, 'app')),
    ...collectTextFiles(join(appRoot, 'components')),
    ...collectTextFiles(join(appRoot, 'hooks')),
    ...collectTextFiles(join(appRoot, 'lib')),
    ...collectTextFiles(join(appRoot, 'docs')),
    ...collectTextFiles(join(repoRoot, 'docs')),
    ...collectTextFiles(join(repoRoot, '.github')),
    join(repoRoot, '.env.example'),
    join(appRoot, '.env.example'),
  ],
  [/story-12-2-accuracy-ops-and-cap-cleanup\.atdd\.test\.ts$/],
);

describe('[12.2 AC3/AC5] feedback evidence migration and generated type contracts', () => {
  test('[P0] migration adds nullable evidence columns with bounded checks and legacy-row compatibility', () => {
    for (const column of [
      'sun_exposure_percent',
      'public_sun_verdict',
      'weather_gated',
      'weather_unknown',
      'geometry_input_hash',
    ]) {
      expect(feedbackMigration).toMatch(new RegExp('\\b' + column + '\\b', 'i'));
    }

    expect(feedbackMigration).toMatch(/sun_exposure_percent[\s\S]*(?:between\s+0\s+and\s+100|>=\s*0[\s\S]*<=\s*100)/i);
    expect(feedbackMigration).toMatch(/public_sun_verdict[\s\S]*\('amber',\s*'grey'\)/i);
    expect(feedbackMigration).toMatch(/weather_gated[\s\S]*weather_unknown[\s\S]*(?:not|false)/i);
    expect(feedbackMigration).toMatch(/geometry_input_hash[\s\S]*g1:\[0-9a-f\]\{64\}|geometry_input_hash[\s\S]*\^g1:\[0-9a-f\]\{64\}/i);
    expect(feedbackMigration).toMatch(/ALTER\s+TABLE[\s\S]*feedback[\s\S]*ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(feedbackMigration).toMatch(/REVOKE[\s\S]*FROM\s+(?:PUBLIC|anon|authenticated)/i);
    expect(feedbackMigration).not.toMatch(/CREATE\s+POLICY[\s\S]*TO\s+(?:anon|authenticated)/i);
  });

  test('[P0] API and Supabase types expose the evidence fields on request, response, insert, and row shapes', () => {
    for (const source of [apiTypes, supabaseTypes]) {
      expect(source).toMatch(/sunExposurePercent|sun_exposure_percent/);
      expect(source).toMatch(/publicSunVerdict|public_sun_verdict/);
      expect(source).toMatch(/weatherGated|weather_gated/);
      expect(source).toMatch(/weatherUnknown|weather_unknown/);
      expect(source).toMatch(/geometryInputHash|geometry_input_hash/);
      expect(source).toMatch(/amber/);
      expect(source).toMatch(/grey/);
    }
  });

  test('[P0] persistence writes the evidence fields through the service-role insert path only', () => {
    expect(persistence).toMatch(/sun_exposure_percent/);
    expect(persistence).toMatch(/public_sun_verdict/);
    expect(persistence).toMatch(/weather_gated/);
    expect(persistence).toMatch(/weather_unknown/);
    expect(persistence).toMatch(/geometry_input_hash/);
    expect(persistence).toMatch(/from\('feedback'\)[\s\S]*insert/i);
    expect(persistence).not.toMatch(/from\('feedback'\)[\s\S]*select\((?!['"]id,\s*created_at)/i);
  });
});

describe('[12.2 AC2/AC4/AC5] maintainer agreement aggregation and hash reset reporting', () => {
  test('[P0] maintainer report ranks current-hash disagreements deterministically and isolates invalid venue evidence', () => {
    expect(reportFiles.length).toBeGreaterThan(0);
    expect(appGitignore).toMatch(/!scripts\/.*(?:accuracy|feedback|venue).*\.m?ts/i);
    expect(reportSource).toMatch(/geometry_input_hash/i);
    expect(reportSource).toMatch(/current.*geometry.*hash|geometry.*current.*hash/i);
    expect(reportSource).toMatch(/disagreement_rate|agreement_rate/i);
    expect(reportSource).toMatch(/disagreement_count|disagree_count/i);
    expect(reportSource).toMatch(/latest_feedback_at|last_feedback/i);
    expect(reportSource).toMatch(/venue_slug|slug/i);
    expect(reportSource).toMatch(/area|neighborhood/i);
    expect(reportSource).toMatch(/invalid_evidence_count/i);
    expect(reportSource).toMatch(/try[\s\S]*catch|safeParse|allSettled/i);
  });

  test('[P0] aggregation excludes unsure, stale-hash, missing-evidence, and legacy rows from current agreement', () => {
    expect(reportSource).toMatch(/sun_accuracy\s*=\s*'unsure'|sunAccuracy\s*===\s*'unsure'/i);
    expect(reportSource).toMatch(/unsure_count/i);
    expect(reportSource).toMatch(/stale_hash_count/i);
    expect(reportSource).toMatch(/legacy_unscored_count|legacy.*count/i);
    expect(reportSource).toMatch(/missing.*evidence|complete.*evidence/i);
    expect(reportSource).toMatch(/geometry_input_hash\s*=\s*current|current.*geometry_input_hash/i);
  });

  test('[P0] agreement mapping vectors use the shared public sunny predicate rather than raw VenueSunStatus', () => {
    expect(reportSource).toMatch(/sunExposurePercent|sun_exposure_percent/);
    expect(reportSource).toMatch(/>\s*50/);
    expect(reportSource).toMatch(/weatherGateState|weather_gated/);
    expect(reportSource).toMatch(/publicSunVerdict|public_sun_verdict/);
    expect(reportSource).toMatch(/Partial[\s\S]*40[\s\S]*(?:grey|not_sunny)|40[\s\S]*Partial[\s\S]*(?:grey|not_sunny)/i);
    expect(reportSource).toMatch(/Partial[\s\S]*60[\s\S]*(?:amber|sunny)|60[\s\S]*Partial[\s\S]*(?:amber|sunny)/i);
    expect(reportSource).toMatch(/50[\s\S]*(?:grey|not_sunny)/i);
    expect(reportSource).not.toMatch(/predicted_state\s*=\s*sun_accuracy|predictedState\s*===\s*sunAccuracy/i);
  });
});

describe('[12.2 AC6/AC7/AC8] coverage-cap bypass retirement and diagnostic confidence', () => {
  test('[P0] SUNNYSEAT_COVERAGE_CAP escape hatch is removed from code, docs, config, and workflows', () => {
    expect(coverageCap).not.toMatch(/SUNNYSEAT_COVERAGE_CAP|isCoverageCapDisabled/);
    expect(searchableSource).not.toMatch(/SUNNYSEAT_COVERAGE_CAP/);
    expect(searchableSource).not.toMatch(/coverage[-_\s]+cap\s*=\s*off/i);
  });

  test('[P0] the internal coverage cap remains fail-closed for missing or unknown coverage', () => {
    expect(coverageCap).toMatch(/UNKNOWN.*0\.6|0\.6[\s\S]*unknown/i);
    expect(coverageCap).toMatch(/Math\.min|clamp|cap/i);
    expect(coverageCap).not.toMatch(/return\s+confidence\s*;/i);
  });

  test('[P1] retained confidence is documented as diagnostic or maintainer-only, not public percentage copy', () => {
    const documentationText = searchableSource + '\n' + sunEngine;
    expect(documentationText).toMatch(/diagnostic|maintainer-only|maintainer only/i);
    expect(documentationText).toMatch(/confidence/i);
    expect(documentationText).not.toMatch(/visible confidence percentage|screen-reader confidence percentage/i);
  });
});
