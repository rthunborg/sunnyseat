import { it, expect, vi } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import path from 'node:path';
import { capturedFixtures, type Capture } from '@/scripts/benchmarks/epic-15/capture-inputs';
import { daylight, localDay } from '@/scripts/benchmarks/epic-15/measurement';
import { thresholdScan } from '@/scripts/benchmarks/epic-15/threshold-sampling';
import { pruneShadowCasters } from '@/scripts/benchmarks/epic-15/shadow-broadphase';
import { calculateSolarPosition } from '@/lib/solar/solar-calculation-service';
import { calculateVenueShadowFromBuildings } from '@/lib/solar/shadow-calculation-service';
import { SOLAR_CONSTANTS } from '@/lib/solar/constants';
import { canonicalGeometryInputG2, computeGeometryInputHashG2, geometryCanonicalJson } from '@/lib/services/sun-geometry-hash-g2';
import { encodeGeometryDay as encodeDay, geometryDigest, generationChecksum as checksumGeneration, seasonDates, type GeometryDay } from '@/lib/services/sun-geometry-season-codec';
import { g2Input } from '../../fixtures/epic-15/g2-input';
import { correctG2SubsecondPosition } from '@/lib/solar/g2-solar-position';
import { refineStorageDuration } from '../../fixtures/epic-15/refine-storage-duration';

const guard = vi.hoisted(() => ({ attempts: 0, lat: 57.7089, lng: 11.9746 }));
vi.mock('@/lib/supabase/server', () => ({ supabaseServiceRole: new Proxy({}, { get() { guard.attempts++; throw Error('Provider access forbidden'); } }) }));
vi.mock('@/lib/solar/solar-calculation-service', async original => {
  const actual = await original<typeof import('@/lib/solar/solar-calculation-service')>();
  return { ...actual, calculateSolarPosition: (d: Date, lat = guard.lat, lng = guard.lng) => correctG2SubsecondPosition(actual.calculateSolarPosition(d, lat, lng)) };
});
const quote = (s: string) => `'${s.replaceAll("'", "''")}'`;
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const dayPolicy = { crossingBracketMs: 100 } as const;
const encodeGeometryDay = (input: unknown) => encodeDay(input, dayPolicy);
const generationChecksum = (hash: string, year: number, days: readonly GeometryDay[]) => checksumGeneration(hash, year, days, dayPolicy);

it('I13 measures actual-year distinct-input candidate storage, without a pilot-capacity claim', () => {
  const container = process.env.E15_DB_CONTAINER, out = process.env.E15_DB_OUTPUT;
  if (!container || !/^[0-9a-f]{12,64}$/.test(container) || !out || !path.isAbsolute(out) || existsSync(out)) throw Error('Explicit guard-owned container and fresh absolute output required');
  const database = `e152_storage_${randomUUID().replaceAll('-', '')}`;
  const docker = (args: string[], input?: string) => {
    const r = spawnSync('docker', args, { input, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
    if (r.status !== 0) throw Error(r.stderr || r.error?.message || 'Docker SQL failed');
    return r.stdout.trim();
  };
  expect(docker(['inspect', '--format', '{{index .Config.Labels "com.rasmus.resource-guard.managed"}}|{{index .Config.Labels "com.docker.compose.project.working_dir"}}', container])).toBe('true|C:\\DEV\\sunnyseat'.replaceAll('\\\\', '\\'));
  const q = (s: string) => docker(['exec', '-i', container, 'psql', '-X', '-U', 'sunnyseat', '-d', database, '-v', 'ON_ERROR_STOP=1', '-Atq'], s);
  mkdirSync(out, { recursive: true });
  const originalFetch = globalThis.fetch;
  let databaseCreated = false;
  let activeGeneration: string | null = null;
  globalThis.fetch = async () => { guard.attempts++; throw Error('Network forbidden in storage fixture'); };
  try {
    docker(['exec', '-i', container, 'psql', '-X', '-U', 'sunnyseat', '-d', 'sunnyseat_dev', '-v', 'ON_ERROR_STOP=1', '-Atq'], `create database ${database};`);
    databaseCreated = true;
    q('create extension if not exists postgis;');
    q('create table public.venues(id text primary key, deleted_at timestamptz);');
    const migration = readFileSync('../supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql', 'utf8');
    q(migration);
    const capturePath = '../_bmad-output/test-artifacts/measurements/epic-15/story-15-1/capture-01/inputs.json';
    const captureText = readFileSync(capturePath, 'utf8'), capture = JSON.parse(captureText) as Capture;
    const allFixtures = capturedFixtures(capture);
    const fixture = allFixtures.find(f => f.id === '49');
    const fullCohort = process.env.E15_FULL_COHORT === '1';
    const cohort = fullCohort ? allFixtures : allFixtures.filter(f => f.id === '49');
    if (!fixture) throw Error('Missing captured venue 49');
    Object.assign(guard, fixture.coordinate);
    const sourcePaths = ['lib/solar/constants.ts', 'lib/solar/solar-math.ts', 'lib/solar/solar-calculation-service.ts', 'lib/solar/shadow-calculation-service.ts', 'lib/solar/shadow-geometry.ts', 'lib/services/sun-geometry-coordinates.ts', 'scripts/benchmarks/epic-15/threshold-sampling.ts', 'scripts/benchmarks/epic-15/shadow-broadphase.ts', 'scripts/benchmarks/epic-15/capture-inputs.ts', 'lib/services/sun-geometry-hash-g2.ts', 'lib/services/sun-geometry-season-codec.ts', 'package-lock.json'];
    sourcePaths.push('lib/solar/g2-solar-position.ts', 'test/fixtures/epic-15/refine-storage-duration.ts');
    const sources = Object.fromEntries(sourcePaths.map(p => [p, sha(readFileSync(p))]));
    const manifest = { ...g2Input.manifest, coordinateDerivation: `outer-ring-mean:${sources['lib/services/sun-geometry-coordinates.ts']}`, solarAlgorithm: `source:${geometryDigest(sources)}`, shadowAlgorithm: `source:${sources['lib/solar/shadow-calculation-service.ts']}`, selectionAlgorithm: `capture-and-broadphase:${sources['scripts/benchmarks/epic-15/shadow-broadphase.ts']}`, samplingVersion: `threshold:${sources['scripts/benchmarks/epic-15/threshold-sampling.ts']}`, solarConstants: { ...SOLAR_CONSTANTS }, numericalDependencies: { ...g2Input.manifest.numericalDependencies, lockfile: sources['package-lock.json'] } };
    manifest.samplingVersion += `:duration:${sources['test/fixtures/epic-15/refine-storage-duration.ts']}`;
    const engineId = geometryDigest(manifest);
    q(`insert into public.venues(id) values ${cohort.map(f=>`(${quote(f.id)})`).join(',')}; insert into public.sun_geometry_engine_versions values(${quote(engineId)},${quote(geometryCanonicalJson(manifest))});
      insert into public.sun_geometry_seasons(season_year,start_date,end_date,engine_id) values(2025,'2025-03-01','2025-10-31',${quote(engineId)}),(2026,'2026-03-01','2026-10-31',${quote(engineId)});`);
    const environment = JSON.parse(q("select json_build_object('postgres',version(),'fsync',current_setting('fsync'),'full_page_writes',current_setting('full_page_writes'),'synchronous_commit',current_setting('synchronous_commit'),'database_bytes',pg_database_size(current_database()));"));
    expect(environment.fsync).toBe('on'); expect(environment.full_page_writes).toBe('on');
    writeFileSync(path.join(out, 'environment.json'), JSON.stringify({ database, node: process.version, sources, migrationSha256: sha(migration), harnessSha256: sha(readFileSync('test/integration/epic-15/storage.measurement.ts')), capturePath, captureSha256: sha(captureText), captureDate: capture.capturedAt, fixture: fullCohort ? 'all-42' : '49', cohortVenueIds: cohort.map(f=>f.id), casters: fixture.casters.length, years: [2025,2026], environment, provenance: 'Actual-date calculations using the captured 2026-09-10 scene; previous-year results and deliberate +1m/+2m height corrections to the resolved caster set are counterfactuals, not historical predictions. Capture does not provide roof elevation; nullable source field is disclosed.' }, null, 2));
    const census = () => JSON.parse(q("select json_build_object('database_bytes',pg_database_size(current_database()),'relations',(select json_agg(r) from (select c.relname,pg_table_size(c.oid) as table_toast_bytes,pg_indexes_size(c.oid) as indexes_bytes,pg_total_relation_size(c.oid) as total_bytes from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname) r));"));
    const measurements: object[] = [], retained: { generation: string; days: GeometryDay[] }[] = [];
    for (const variant of [0,1,2]) {
      for (const fixture of variant === 0 ? cohort : cohort.filter(f=>f.id==='49')) {
      Object.assign(guard, fixture.coordinate);
      const casters = fixture.casters.map(c => ({ ...c, height: c.height + variant }));
      const input = { seating: fixture.seating, engineCoordinate: fixture.coordinate, seatingElevationM: fixture.seatingElevationM, groundElevationM: fixture.venueGroundZ ?? null, manifest,
        casters: casters.map(c => ({ id: String(c.id), geometry: c.geometry, effectiveHeightM: c.height, groundElevationM: c.groundZRh2000 ?? null, roofElevationM: c.roofZRh2000 ?? null, importGeneration: capture.snapshot, heightSource: c.heightSource, source: c.source, qualityScore: c.qualityScore, sourcePriority: capture.casters.find(x => x.Id === c.id)?.SourcePriority ?? null, tier: c.shadowCasterTier ?? 'unknown', filterDecision: c.filterDecision ?? 'unknown', casterClass: c.casterClass ?? 'unknown', active: true, sourceFlags: c.sourceFlags ?? [] })) };
      const hash = computeGeometryInputHashG2(input);
      q(`insert into public.sun_geometry_inputs values(${quote(hash)},${quote(engineId)},${quote(canonicalGeometryInputG2(input))}); update public.sun_geometry_input_revisions set staged_hash=${quote(hash)},dirty=true where venue_id=${quote(fixture.id)};`);
      const sourceRevision = Number(q(`select revision+1 from public.sun_geometry_input_revisions where venue_id=${quote(fixture.id)};`));
      for (const year of variant === 2 ? [2026] : [2025,2026]) {
        const generation = `v${fixture.id}-${year}-v${variant}`, dates = seasonDates(year).slice(0, variant === 2 ? 14 : 245);
        activeGeneration = generation;
        q(`insert into public.sun_geometry_venue_generations(id,season_year,venue_id,input_hash,source_revision,run_id) values(${quote(generation)},${year},${quote(fixture.id)},${quote(hash)},${sourceRevision},'actual-year-storage');`);
        const days: GeometryDay[] = [], start = performance.now(), cpu = process.cpuUsage();
        let pending: string[] = [];
        for (const date of dates) {
          if (process.memoryUsage().rss > 512000000) throw Error('Storage fixture worker exceeded 512 MB RSS');
          const horizon = daylight(date, fixture.coordinate.lat, fixture.coordinate.lng, 5);
          const evaluate = (t: number) => {
            const instant = new Date(t);
            const selected = pruneShadowCasters(fixture.seating, casters, calculateSolarPosition(instant), fixture).retained;
            return calculateVenueShadowFromBuildings(fixture.seating, instant, selected, fixture).sunlitAreaPercent;
          };
          const initial = thresholdScan(evaluate, horizon.start, horizon.end, 5, 60000);
          const run = refineStorageDuration(initial, evaluate);
          const origin = localDay(date)[0];
          const d = encodeGeometryDay({ format: 'f64-v1', date, horizon: [horizon.start-origin,horizon.end-origin], offsets: run.points.map(p=>p.t-origin), exposure: run.points.map(p=>p.value), starts: run.intervals.map(r=>r.start-origin), ends: run.intervals.map(r=>r.end-origin), sunny: run.intervals.map(r=>r.sunny), startUncertaintyMs: run.startUncertaintyMs, endUncertaintyMs: run.endUncertaintyMs });
          days.push(d);
          appendFileSync(path.join(out, 'days.ndjson'), JSON.stringify({ generation, inputHash: hash, day: d })+'\n');
          pending.push(`(${quote(generation)},${quote(date)},array[${d.horizon}],array[${d.offsets}],array[${d.exposure}],array[${d.starts}],array[${d.ends}],array[${d.sunny}],array[${d.startUncertaintyMs}],array[${d.endUncertaintyMs}],${d.offsets.length},${quote(d.checksum)})`);
          if (pending.length===7 || days.length===dates.length) { q(`insert into public.sun_geometry_days values ${pending.join(',')};`); pending=[]; }
          if (days.length%35===0) process.stdout.write(`${generation}: ${days.length}/${dates.length} actual dates\n`);
        }
        const usage = process.cpuUsage(cpu);
        measurements.push({ generation, year, variant, dates: dates.length, wallMs: performance.now()-start, nodeCpuMs: (usage.user+usage.system)/1000, samples: days.reduce((n,d)=>n+d.offsets.length,0) });
        writeFileSync(path.join(out, 'measurements-progress.json'), JSON.stringify(measurements, null, 2));
        if (variant<2) {
          expect(q(`select sun_geometry_internal.generation_digest(${quote(generation)});`)).toBe(generationChecksum(hash,year,days));
          q(`update public.sun_geometry_venue_generations set status='ready',completed_days=245,sample_count=${days.reduce((n,d)=>n+d.offsets.length,0)},checksum=sun_geometry_internal.generation_digest(id) where id=${quote(generation)};`);
          if (fixture.id === '49') retained.push({ generation, days });
        } else q(`update public.sun_geometry_venue_generations set status='failed',completed_days=14,sample_count=${days.reduce((n,d)=>n+d.offsets.length,0)} where id=${quote(generation)};`);
        activeGeneration = null;
      }
      if (variant<2) {
        q(`update public.sun_geometry_input_revisions set committed_hash=${quote(hash)},staged_hash=null,dirty=false where venue_id=${quote(fixture.id)};`);
      }
      }
      if (variant<2) {
        for (const year of [2025,2026]) {
          for (const suffix of ['a','b']) {
            const rid = `release-${year}-v${variant}-${suffix}`;
            q(`insert into public.sun_geometry_releases(id,season_year,expected_venues) values(${quote(rid)},${year},${cohort.length});
              insert into public.sun_geometry_release_members
                select ${quote(rid)},i.venue_id,g.id from public.sun_geometry_input_revisions i
                join public.sun_geometry_venue_generations g on g.venue_id=i.venue_id and g.input_hash=i.committed_hash and g.source_revision=i.revision
                where g.season_year=${year} and g.status='ready';
              update public.sun_geometry_releases set status='verified',completed_venues=${cohort.length},checksum=sun_geometry_internal.release_digest(id) where id=${quote(rid)};`);
          }
          q(`insert into public.sun_geometry_current_pointers(season_year,release_id,rollback_release_id) values(${year},'release-${year}-v${variant}-a','release-${year}-v${variant}-b') on conflict(season_year) do update set release_id=excluded.release_id,rollback_release_id=excluded.rollback_release_id;
            insert into public.sun_geometry_evidence_references(evidence_id,generation_id,weather_evidence_id,classifier_version)
              select 'field-'||g.id,g.id,'retained-weather-id','direct-sun-v1' from public.sun_geometry_venue_generations g
              where g.season_year=${year} and g.status='ready' on conflict do nothing;`);
        }
      }
      q('analyze;'); writeFileSync(path.join(out, `census-v${variant}.json`), JSON.stringify(census(),null,2));
    }
    expect(retained).toHaveLength(4);
    expect(retained[0].days.map(d=>d.offsets)).not.toEqual(retained[1].days.map(d=>d.offsets));
    expect(retained[0].days.map(d=>d.exposure)).not.toEqual(retained[2].days.map(d=>d.exposure));
    expect(guard.attempts).toBe(0);
    const final = census();
    writeFileSync(path.join(out,'storage-result.json'),JSON.stringify({ status:'MEASURED_BOUNDED_COHORT', measurements, final, retainedGenerationCount:cohort.length*2+2, failedGenerationCount:1, inputVersions:cohort.length+2, releaseCount:8, sharedGenerationsCountedOnce:true, networkAttempts:guard.attempts, capacityAdmission:'HELD', pilotBudgetVerification:fullCohort ? 'Actual 42-venue current/previous years plus changed retained input measured; compare relation census with accepted budgets; target admission remains held' : 'NOT PROVEN: one captured venue does not certify 42-venue storage or target aggregate coexistence', limitations:['Previous-year calculations use captured current scene and are counterfactual','Deliberate edits are labelled, not historical source versions','No full legacy production dataset in isolated DB','No production latency/capacity or durable crash-recovery claim'] },null,2));
  } catch (error) {
    let failureStateError: string | null = null;
    if (databaseCreated && activeGeneration) {
      try {
        q(`update public.sun_geometry_venue_generations g set status='failed',completed_days=(select count(*) from public.sun_geometry_days d where d.generation_id=g.id),sample_count=(select coalesce(sum(sample_count),0) from public.sun_geometry_days d where d.generation_id=g.id) where g.id=${quote(activeGeneration)} and g.status='building';`);
      } catch (stateError) {
        failureStateError = stateError instanceof Error ? stateError.message : String(stateError);
      }
    }
    const failure = {
      status: 'FAILED',
      database,
      activeGeneration,
      error: error instanceof Error ? error.message : String(error),
      failureStateError,
      recordedAt: new Date().toISOString(),
    };
    const temporary = path.join(out, `storage-failure.${process.pid}.tmp`);
    writeFileSync(temporary, JSON.stringify(failure, null, 2));
    renameSync(temporary, path.join(out, 'storage-failure.json'));
    throw error;
  } finally { globalThis.fetch=originalFetch; }
});
