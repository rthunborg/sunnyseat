import { it, expect } from 'vitest';
import { createReadStream, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { decodeGeometryDay, generationChecksum, type GeometryDay, type GeometryDayValidationPolicy } from '@/lib/services/sun-geometry-season-codec';
import { computeGeometryInputHashG2 } from '@/lib/services/sun-geometry-hash-g2';
import { releaseChecksum } from '@/lib/services/sun-geometry-release-contract';
import { storage04ExpectedProvenance, verifyStorage04RetainedProvenance } from '../../fixtures/epic-15/storage-04-provenance';

it('revalidates pinned retained measurement bytes with the final decoder and migration', async () => {
  const container = process.env.E15_DB_CONTAINER;
  const retainedOutput = process.env.E15_RETAINED_OUTPUT;
  const output = process.env.E15_DB_OUTPUT;
  if (!container || !/^[0-9a-f]{12,64}$/.test(container) || !retainedOutput || !output || !path.isAbsolute(retainedOutput) || !path.isAbsolute(output)) throw Error('Explicit isolated retained and fresh output paths required');
  if (path.resolve(retainedOutput) === path.resolve(output) || existsSync(output)) throw Error('Revalidation output must be a separate fresh directory');
  // This streams the 104 MB corpus and validates the original measurement records
  // before PostGIS setup, migration replay, or any other database mutation.
  const retained = await verifyStorage04RetainedProvenance(retainedOutput);
  const finalSourcePaths = [
    'lib/services/sun-geometry-season-codec.ts',
    'lib/services/sun-geometry-hash-g2.ts',
    'lib/services/sun-geometry-release-contract.ts',
    'package.json',
    'package-lock.json',
    'node_modules/robust-predicates/package.json',
    'node_modules/robust-predicates/index.js',
    'node_modules/robust-predicates/esm/orient2d.js',
    'node_modules/robust-predicates/esm/util.js',
    'node_modules/robust-predicates/umd/predicates.js',
    'test/fixtures/epic-15/storage-04-provenance.ts',
    'test/integration/epic-15/storage.revalidation.ts',
    '../supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql',
  ];
  const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
  const finalSources = Object.fromEntries(finalSourcePaths.map(file => [file, sha(file)]));
  const environment = retained.environment;
  const measurement = retained.measurement;
  const sourceDatabase = environment.database as string;
  if (!/^e152_storage_[0-9a-f]{32}$/.test(sourceDatabase)) throw Error('Not an isolated measurement database');
  const database = `e152_revalidate_${createHash('sha256').update(`${sourceDatabase}:${output}`).digest('hex').slice(0, 24)}`;
  const complete = true;
  const resultPath = path.join(output, 'final-revalidation.json');
  mkdirSync(output, { recursive: true });
  const docker = (args: string[], input?: string) => {
    const r = spawnSync('docker', args, { input, encoding: 'utf8', timeout: 600000, maxBuffer: 32 * 1024 * 1024 });
    if (r.status !== 0) throw Error(r.stderr || r.error?.message || 'Isolated SQL failed');
    return r.stdout.trim();
  };
  expect(docker(['inspect', '--format', '{{index .Config.Labels "com.rasmus.resource-guard.managed"}}|{{index .Config.Labels "com.docker.compose.project.working_dir"}}', container])).toBe('true|C:\\DEV\\sunnyseat');
  const lane = (environment as typeof environment & { lane?: string }).lane;
  const admin = lane === 'disposable' ? 'sunnyseat_test' : 'sunnyseat';
  const bootstrapDatabase = lane === 'disposable' ? 'sunnyseat_test' : 'sunnyseat_dev';
  const adminQ = (sql: string) => docker(['exec', '-i', container, 'psql', '-X', '-U', admin, '-d', bootstrapDatabase, '-v', 'ON_ERROR_STOP=1', '-Atq'], sql);
  adminQ(`drop database if exists ${database} with (force); create database ${database} template ${sourceDatabase};`);
  const cleanup = () => { spawnSync('docker', ['exec', '-i', container, 'psql', '-X', '-U', admin, '-d', bootstrapDatabase, '-v', 'ON_ERROR_STOP=1', '-Atq'], { input: `drop database if exists ${database} with (force);`, encoding: 'utf8', timeout: 120000 }); };
  process.once('exit', cleanup);
  const q = (sql: string) => docker(['exec', '-i', container, 'psql', '-X', '-U', 'sunnyseat', '-d', database, '-v', 'ON_ERROR_STOP=1', '-Atq'], sql);
  try {
  q('create extension if not exists postgis;');
  const migration = readFileSync('../supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql', 'utf8');
  q(migration);
  const generations = JSON.parse(q('select json_agg(g) from public.sun_geometry_venue_generations g;')) as { id: string; season_year: number; engine_id: string; input_hash: string; status: string; checksum: string; sample_count: number }[];
  const enginePolicies = new Map((JSON.parse(q("select json_agg(json_build_object('id',id,'crossingBracketMs',(canonical_manifest::jsonb->>'crossingBracketMs')::float8)) from public.sun_geometry_engine_versions;")) as { id: string; crossingBracketMs: number }[])
    .map(engine => [engine.id, { crossingBracketMs: engine.crossingBracketMs } satisfies GeometryDayValidationPolicy]));
  const policyForGeneration = (generationId: string): GeometryDayValidationPolicy => {
    const generation = generations.find(candidate => candidate.id === generationId);
    const policy = generation && enginePolicies.get(generation.engine_id);
    if (!policy) throw Error('Missing immutable engine policy for retained generation');
    return policy;
  };
  const databaseRows = JSON.parse(q('select json_agg(json_build_object(\'key\',generation_id||\':\'||stockholm_date,\'checksum\',checksum)) from public.sun_geometry_days;')) as { key: string; checksum: string }[];
  const persisted = new Map(databaseRows.map(row => [row.key, row.checksum]));
  let unpersistedObservations = 0;
  const seen = new Set<string>(), rawSha = createHash('sha256');
  const diversity = new Map<string, { offsets: string; exposure: string }>();
  let current = '', inputHash = '', days: GeometryDay[] = [], count = 0, samples = 0;
  function finish() {
    if (!current) return;
    const generation = generations.find(g => g.id === current);
    expect(generation).toBeDefined();
    expect(seen.has(current)).toBe(false);
    seen.add(current);
    expect(inputHash).toBe(generation!.input_hash);
    const observedSamples = days.reduce((n, d) => n + d.offsets.length, 0);
    if (complete || generation!.status === 'ready') expect(observedSamples).toBe(Number(generation!.sample_count));
    else expect(observedSamples).toBeGreaterThanOrEqual(Number(generation!.sample_count));
    if (generation!.status === 'ready') expect(generationChecksum(inputHash, generation!.season_year, days, policyForGeneration(current))).toBe(generation!.checksum);
    else expect(['failed', 'building']).toContain(generation!.status);
    if (complete) {
      const recorded = measurement.measurements.filter((m: { generation: string }) => m.generation === current);
      expect(recorded).toHaveLength(1);
      expect(recorded[0].dates).toBe(days.length);
      expect(recorded[0].samples).toBe(observedSamples);
      expect(recorded[0].year).toBe(generation!.season_year);
      if (current.startsWith('v49-')) diversity.set(current, {
        offsets: createHash('sha256').update(JSON.stringify(days.map(d => d.offsets))).digest('hex'),
        exposure: createHash('sha256').update(JSON.stringify(days.map(d => d.exposure))).digest('hex'),
      });
    }
  }
  const daysPath = path.join(retained.root, 'days.ndjson');
  if (existsSync(daysPath)) {
    const stream = createReadStream(daysPath);
    stream.on('data', chunk => rawSha.update(chunk));
    for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
      const row = JSON.parse(line) as { generation: string; inputHash: string; day: GeometryDay };
      if (row.generation !== current) { finish(); current = row.generation; inputHash = row.inputHash; days = []; }
      const day = decodeGeometryDay(row.day, policyForGeneration(row.generation));
      const key = `${row.generation}:${day.date}`;
      if (persisted.has(key)) { expect(day.checksum).toBe(persisted.get(key)); persisted.delete(key); }
      else { expect(complete).toBe(false); unpersistedObservations++; }
      days.push(day); count++; samples += day.offsets.length;
    }
  }
  finish();
  if (complete) expect(seen.size).toBe(generations.length);
  else expect(seen.size).toBeLessThanOrEqual(generations.length);
  expect(persisted.size).toBe(0);
  expect(Number(q("select count(sun_geometry_internal.validate_day_payload(d,g.season_year,(e.canonical_manifest::jsonb->>'crossingBracketMs')::float8)) from public.sun_geometry_days d join public.sun_geometry_venue_generations g on g.id=d.generation_id join public.sun_geometry_engine_versions e on e.id=g.engine_id;"))).toBe(databaseRows.length);
  const inputs = JSON.parse(q('select json_agg(i) from public.sun_geometry_inputs i;')) as { input_hash: string; canonical_input: string }[];
  let legacyInputCount = 0;
  for (const input of inputs) {
    const parsed = JSON.parse(input.canonical_input);
    const dependencies = parsed?.manifest?.numericalDependencies as Record<string, unknown> | undefined;
    if (dependencies && !Object.hasOwn(dependencies, 'robust-predicates') && typeof dependencies.lockfile === 'string') {
      // The migration has already applied full structural/semantic replay with
      // the explicit lockfile-bound legacy exception. Preserve and verify the
      // original immutable identity instead of fabricating a current manifest.
      expect(`g2:${createHash('sha256').update(input.canonical_input).digest('hex')}`).toBe(input.input_hash);
      legacyInputCount++;
    } else {
      expect(computeGeometryInputHashG2(parsed)).toBe(input.input_hash);
    }
  }
  if (complete) {
    const cohortSize = environment.cohortVenueIds.length;
    expect(measurement.networkAttempts).toBe(0);
    expect(generations.filter(g => g.status === 'ready')).toHaveLength(cohortSize * 2 + 2);
    expect(generations.filter(g => g.status === 'failed')).toHaveLength(1);
    expect(measurement.measurements).toHaveLength(generations.length);
    expect(count).toBe((cohortSize * 2 + 2) * 245 + 14);
    expect(inputs).toHaveLength(cohortSize + 2);
    expect(Number(q('select count(*) from public.sun_geometry_evidence_references;'))).toBe(cohortSize * 2 + 2);
    for (const id of ['v49-2025-v0', 'v49-2026-v0', 'v49-2025-v1']) expect(diversity.has(id)).toBe(true);
    expect(diversity.get('v49-2025-v0')!.offsets).not.toBe(diversity.get('v49-2026-v0')!.offsets);
    expect(diversity.get('v49-2025-v0')!.exposure).not.toBe(diversity.get('v49-2025-v1')!.exposure);
  }
  const releases = (JSON.parse(q("select json_agg(x) from (select r.id,r.season_year as year,s.engine_id as \"engineId\",s.format_version as format,r.checksum,(select json_agg(json_build_object('venueId',m.venue_id,'generationId',g.id,'sourceRevision',g.source_revision,'checksum',g.checksum)) from public.sun_geometry_release_members m join public.sun_geometry_venue_generations g on g.id=m.generation_id where m.release_id=r.id) as members from public.sun_geometry_releases r join public.sun_geometry_seasons s using(season_year,engine_id)) x;") || "[]") ?? []) as Parameters<typeof releaseChecksum>[0][];
  for (const release of releases) expect(releaseChecksum(release)).toBe((release as typeof release & { checksum: string }).checksum);
  if (complete) expect(releases).toHaveLength(8);
  expect(Number(q('select count(sun_geometry_internal.assert_release(rid)) from (select release_id as rid from public.sun_geometry_current_pointers union select rollback_release_id from public.sun_geometry_current_pointers) r;'))).toBe(complete ? 4 : 0);
  const census = JSON.parse(q("select json_build_object('database_bytes',pg_database_size(current_database()),'relations',(select json_agg(r) from (select c.relname,pg_table_size(c.oid) as table_toast_bytes,pg_indexes_size(c.oid) as indexes_bytes,pg_total_relation_size(c.oid) as total_bytes from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname) r));"));
  const cohortCensus: object[] = [];
  let legacyCoexistence: object | null = null;
  if (complete && environment.cohortVenueIds.length === 42) {
    // Use the unchanged historical table definitions for the three captured rows.
    // This bounded coexistence sample is never presented as a full legacy census.
    const legacyPath = '../_bmad-output/test-artifacts/measurements/epic-15/story-15-1/legacy-01/rows.json';
    const legacy = JSON.parse(readFileSync(legacyPath, 'utf8'));
    const historical = readFileSync('../supabase/migrations/20260718193000_persist_sun_geometry_series_and_weather_snapshots.sql', 'utf8');
    const boundary = historical.indexOf('create table if not exists public.geometry_precompute_runs');
    expect(boundary).toBeGreaterThan(0);
    q(historical.slice(0, boundary));
    const quoted = (s: string) => `'${s.replaceAll("'", "''")}'`;
    q(`insert into public.venue_sun_geometry_series select * from json_populate_recordset(null::public.venue_sun_geometry_series,${quoted(JSON.stringify(legacy.rows))}::json) on conflict do nothing;`);
    legacyCoexistence = { capturedAt: legacy.at, fixtureSha256: sha(legacyPath), rows: legacy.rows.length, result: JSON.parse(q("select json_build_object('database_bytes',pg_database_size(current_database()),'legacy_relation_bytes',pg_total_relation_size('public.venue_sun_geometry_series'),'empty_input_relation_bytes',pg_total_relation_size('public.venue_geometry_inputs'));")), limitation: 'Three retained captured rows only; full target legacy/aggregate census remains NOT RUN.' };
    // Separate layout specimens measure each complete 42-venue release physically.
    // They are diagnostic copies, excluded from the candidate census above.
    q('create schema if not exists e152_layout_specimens;');
    for (const year of [2025, 2026]) for (const variant of [0, 1]) {
      const table = `e152_layout_specimens.days_${year}_v${variant}`;
      q(`create table if not exists ${table}(like public.sun_geometry_days including all);
        insert into ${table} select d.* from public.sun_geometry_days d join public.sun_geometry_release_members m on m.generation_id=d.generation_id where m.release_id='release-${year}-v${variant}-a' on conflict do nothing; analyze ${table};`);
      const measured = JSON.parse(q(`select json_build_object('rows',(select count(*) from ${table}),'heap_toast_bytes',pg_table_size('${table}'),'index_bytes',pg_indexes_size('${table}'),'total_bytes',pg_total_relation_size('${table}'));`));
      expect(measured.rows).toBe(42 * 245);
      cohortCensus.push({ year, variant, ...measured, decimalBudgetBytes: 30000000, withinBudget: measured.total_bytes <= 30000000 });
    }
  }
  const rawDaysSha256 = rawSha.digest('hex');
  expect(rawDaysSha256).toBe(storage04ExpectedProvenance.daysNdjsonSha256);
  expect(Object.fromEntries(finalSourcePaths.map(file => [file, sha(file)]))).toEqual(finalSources);
  writeFileSync(resultPath, JSON.stringify({ status: 'PASS', coverage: 'COMPLETE_DECLARED_COHORT', database, sourceDatabase, validationIsolation: 'fresh-template-clone', count, persistedRows: databaseRows.length, unpersistedObservations, samples, generations: seen.size, inputs: inputs.length, legacyInputCount, releases: releases.length, rawDaysSha256, retainedMeasurementProvenance: { root: retained.root, expected: storage04ExpectedProvenance }, finalSources, census, cohortCensus, legacyCoexistence, limitation: 'Final validation of immutable, already measured storage-04 bytes in a fresh database clone; numerical calculations retain their original source provenance. The verifier rejects altered corpus or measurement artifacts before database mutation. Lockfile-bound legacy inputs preserve their original hashes and are not relabelled as current manifests. Layout specimens are diagnostic copies excluded from candidate occupancy; shared generations counted once in census. No production admission.' }, null, 2));
  } finally {
    process.removeListener('exit', cleanup);
    cleanup();
  }
});
