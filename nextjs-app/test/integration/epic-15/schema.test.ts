import { it, expect } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { g2Input } from '../../fixtures/epic-15/g2-input';
import { g2TopologyBoundaries } from '../../fixtures/epic-15/g2-topology-boundaries';
import { crossingDay, unsupportedWindowDay } from '../../fixtures/epic-15/crossing-day';
import { canonicalGeometryInputG2, computeGeometryInputHashG2, geometryCanonicalJson } from '@/lib/services/sun-geometry-hash-g2';
import { encodeGeometryDay as encodeDay, geometryDigest, seasonDates, generationChecksum as checksumGeneration, type GeometryDayPayload, type GeometryDayValidationPolicy } from '@/lib/services/sun-geometry-season-codec';

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const dayPolicy: GeometryDayValidationPolicy = { crossingBracketMs: 100 };
const encodeGeometryDay = (input: unknown, policy: GeometryDayValidationPolicy = dayPolicy) => encodeDay(input, policy);
const generationChecksum = (hash: string, year: number, days: Parameters<typeof checksumGeneration>[2], policy: GeometryDayValidationPolicy = dayPolicy) => checksumGeneration(hash, year, days, policy);
const migrationPath = '../supabase/migrations/20260915104303_seasonal_geometry_g2_contract.sql';
const prerequisite = `
create extension postgis;
create table public.venues(id text primary key, seating_area jsonb, seating_elevation_m float8, ground_elevation_m float8, lat float8, lng float8, display_lat float8, display_lng float8, name text, hidden boolean default false, deleted_at timestamptz);
create table public.shadow_casters(id integer primary key, geometry geometry, height_m numeric, ground_z_rh2000 numeric, roof_z_rh2000 numeric, source_priority integer, shadow_caster_tier text, filter_decision text, caster_class text, source_flags text[], source_object_metadata jsonb, provenance_metadata jsonb, import_batch_id text, updated_at timestamptz, imported_at timestamptz, active boolean);
grant select,insert,update,delete on public.venues,public.shadow_casters to service_role;
`;

it('I02/I03/I08/I14/I15 isolated migration, real role and rollback contract', async () => {
  const container = process.env.E15_DB_CONTAINER;
  const output = process.env.E15_DB_OUTPUT;
  if (!container || !/^[0-9a-f]{12,64}$/.test(container) || !output || !path.isAbsolute(output)) throw Error('Explicit guard-owned container ID and absolute evidence output required');
  const lane = process.env.E15_DB_LANE ?? 'persistent';
  if (!['persistent', 'disposable'].includes(lane)) throw Error('Unknown isolated database lane');
  const admin = lane === 'disposable' ? 'sunnyseat_test' : 'sunnyseat';
  const bootstrapDatabase = lane === 'disposable' ? 'sunnyseat_test' : 'sunnyseat_dev';
  const database = `e152_${randomUUID().replaceAll('-', '')}`;
  const runId = randomUUID().replaceAll('-', '').slice(0, 12);
  const password = `E152-${randomUUID()}`;
  let createdSharedRoles: string[] = [];
  const logins = {
    service_role: `e152_service_${runId}`,
    anon: `e152_anon_${runId}`,
    authenticated: `e152_auth_${runId}`,
    public: `e152_public_${runId}`,
    owner: `e152_owner_${runId}`,
  } as const;
  const activeRole = (role: string) => role === 'e152_public' ? logins.public
    : role === 'e152_owner' ? logins.owner : role;
  const loginRole = (role: string) => role === 'service_role' ? logins.service_role
    : role === 'anon' ? logins.anon
    : role === 'authenticated' ? logins.authenticated
    : activeRole(role);
  const log: object[] = [];
  const command = (args: string[], input?: string) => spawnSync('docker', args, { input, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const inspect = command(['inspect', '--format', '{{index .Config.Labels "com.rasmus.resource-guard.managed"}}|{{index .Config.Labels "com.docker.compose.project.working_dir"}}', container]);
  expect(inspect.status).toBe(0);
  expect(inspect.stdout.trim()).toBe('true|C:\\DEV\\sunnyseat'.replaceAll('\\\\', '\\'));
  function sql(text: string, role = 'service_role', failure?: string, db = database): string {
    const result = command(['exec', '-i', '-e', `PGPASSWORD=${password}`, container!, 'psql', '-X', '-h', '127.0.0.1', '-U', loginRole(role), '-d', db, '-v', 'ON_ERROR_STOP=1', '-Atq'], `set role ${activeRole(role)};\n${text}`);
    log.push({ role, database: db, sql: text, exit: result.status, stdout: result.stdout, stderr: result.stderr });
    if (failure) { expect(result.status, text).not.toBe(0); expect(result.stderr).toContain(failure); }
    else expect(result.status, result.stderr).toBe(0);
    return result.stdout.trim();
  }
  mkdirSync(output, { recursive: true });
  async function heldTransaction(statement: string, check: () => void) {
    const connection = spawn('docker', ['exec', '-i', '-e', `PGPASSWORD=${password}`, container!, 'psql', '-X', '-h', '127.0.0.1', '-U', logins.service_role, '-d', database, '-v', 'ON_ERROR_STOP=1', '-Atq'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let observed = '';
    const done = new Promise<number | null>(resolve => connection.once('exit', resolve));
    const ready = new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(Error('Transaction barrier timeout')), 10000);
      connection.stdout.on('data', chunk => { observed += String(chunk); if (observed.includes('E152_HELD')) { clearTimeout(deadline); resolve(); } });
      connection.once('error', reject);
    });
    try {
      connection.stdin.write(`set role service_role; begin; ${statement}\n\\echo E152_HELD\n`);
      await ready;
      check();
    } finally {
      connection.stdin.end('rollback;\n');
      expect(await done).toBe(0);
    }
    log.push({ scenario: 'Concurrent retained-reference/inventory barrier', statement, result: 'PASS' });
  }
  try {
    const sharedState = command(['exec', '-i', container, 'psql', '-X', '-U', admin, '-d', bootstrapDatabase, '-Atq'],
      "select coalesce(json_agg(name),'[]'::json) from unnest(array['service_role','anon','authenticated']) name where not exists(select 1 from pg_roles where rolname=name);");
    expect(sharedState.status, sharedState.stderr).toBe(0);
    createdSharedRoles = JSON.parse(sharedState.stdout.trim()) as string[];
    const bootstrap = command(['exec', '-i', container, 'psql', '-X', '-U', admin, '-d', bootstrapDatabase, '-v', 'ON_ERROR_STOP=1', '-Atq'], `
      do $$ begin
        if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
        if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
        if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
        create role ${logins.public} login password ${quote(password)};
        create role ${logins.owner} login password ${quote(password)};
        create role ${logins.service_role} login password ${quote(password)} in role service_role;
        create role ${logins.anon} login password ${quote(password)} in role anon;
        create role ${logins.authenticated} login password ${quote(password)} in role authenticated;
      end $$;
      create database ${database};
    `);
    expect(bootstrap.status, bootstrap.stderr).toBe(0);
    // Admin uses the Compose-local password only. No .env/provider fallback.
    function ownerSql(text: string, failure?: string) {
      const r = command(['exec', '-i', container!, 'psql', '-X', '-U', admin, '-d', database, '-v', 'ON_ERROR_STOP=1', '-Atq'], text);
      log.push({ role: admin, database, sql: text, exit: r.status, stdout: r.stdout, stderr: r.stderr });
      if (failure) { expect(r.status).not.toBe(0); expect(r.stderr).toContain(failure); }
      else expect(r.status, r.stderr).toBe(0);
      return r.stdout.trim();
    }
    ownerSql(prerequisite);
    const migration = readFileSync(migrationPath, 'utf8');
    ownerSql(migration.replace(/commit;\s*$/, "select 1/0; commit;"), 'division by zero');
    expect(ownerSql("select count(*) from pg_tables where tablename='sun_geometry_days';")).toBe('0');
    ownerSql(migration); // Clean prerequisite replay.
    ownerSql(migration); // Idempotent replay, no data replacement.
    ownerSql(`create trigger geometry_immutable before update or delete on public.sun_geometry_seasons
      for each row execute function sun_geometry_internal.immutable_row();
      alter table public.sun_geometry_engine_versions add constraint legacy_manifest_canonical
        check (canonical_manifest = sun_geometry_internal.canonical_json(canonical_manifest::jsonb));`);
    ownerSql(migration);
    expect(ownerSql("select count(*) from pg_trigger where tgrelid='public.sun_geometry_seasons'::regclass and tgname='geometry_immutable' and not tgisinternal;")).toBe('0');
    expect(ownerSql("select count(*) from pg_constraint where conrelid='public.sun_geometry_engine_versions'::regclass and contype='c' and pg_get_constraintdef(oid,true)=pg_get_constraintdef((select oid from pg_constraint where conrelid='public.sun_geometry_engine_versions'::regclass and conname='sun_geometry_manifest_canonical'),true);")).toBe('1');
    for (const mutation of [
      {
        apply: "alter table public.sun_geometry_seasons alter column release_notes type varchar(100);",
        restore: "alter table public.sun_geometry_seasons alter column release_notes type text;",
      },
      {
        apply: "alter table public.sun_geometry_seasons alter column expected_days set default 244;",
        restore: "alter table public.sun_geometry_seasons alter column expected_days set default 245;",
      },
      {
        apply: "drop index public.sun_geometry_member_generation_idx; create index sun_geometry_member_generation_idx on public.sun_geometry_release_members(venue_id);",
        restore: "drop index public.sun_geometry_member_generation_idx; create index sun_geometry_member_generation_idx on public.sun_geometry_release_members(generation_id);",
      },
      {
        apply: "alter table public.sun_geometry_release_members drop constraint sun_geometry_release_members_pkey; alter table public.sun_geometry_release_members add primary key(release_id,generation_id);",
        restore: "alter table public.sun_geometry_release_members drop constraint sun_geometry_release_members_pkey; alter table public.sun_geometry_release_members add primary key(release_id,venue_id);",
      },
    ]) {
      ownerSql(mutation.apply);
      expect(ownerSql("select sun_geometry_internal.catalog_fingerprint();"))
        .not.toBe('cdbcdcb2fa95d5a2440db2730b7989af65b41b0b5380a35f82537c00e0a1b08f');
      ownerSql(mutation.restore);
      ownerSql(migration);
      expect(ownerSql("select sun_geometry_internal.catalog_fingerprint();"))
        .toBe('cdbcdcb2fa95d5a2440db2730b7989af65b41b0b5380a35f82537c00e0a1b08f');
    }
    ownerSql("alter policy geometry_service on public.sun_geometry_inputs using (false); grant select on public.sun_geometry_inputs to anon; alter table public.sun_geometry_inputs disable row level security; drop trigger geometry_input_check on public.sun_geometry_inputs;");
    ownerSql(migration);
    expect(ownerSql("select sun_geometry_internal.catalog_fingerprint();")).toBe('cdbcdcb2fa95d5a2440db2730b7989af65b41b0b5380a35f82537c00e0a1b08f');
    const engineId = geometryDigest(g2Input.manifest), hash = computeGeometryInputHashG2(g2Input);
    const canonicalNumberProbe = '{"small":1e-7,"large":1e21,"scaled":1.0,"\u{10000}":1,"\uE000":2}';
    expect(ownerSql(`select sun_geometry_internal.canonical_json(${quote(canonicalNumberProbe)}::jsonb);`))
      .toBe(geometryCanonicalJson(JSON.parse(canonicalNumberProbe)));
    const floatBoundaries = [0, -0, 1, -1, 1e-7, 1e-6, 1e20, 1e21, 1e23, 5e-324, Number.MAX_VALUE,
      Number.MIN_VALUE, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 1 + Number.EPSILON, 0.30000000000000004];
    // Seeded bit-pattern coverage includes all exponent bands, both signs, and
    // subnormals. SQL must return JS bytes, not merely numerically equal values.
    let bits = BigInt('0x123456789abcdef0');
    const buffer = Buffer.alloc(8);
    for (const hex of ['0000000000000001', '000fffffffffffff', '0010000000000000', '0010000000000001',
      '3fefffffffffffff', '3ff0000000000000', '3ff0000000000001', '433fffffffffffff', '4340000000000000',
      '4340000000000001', '44b52d02c7e14af6', '7feffffffffffffe', '7fefffffffffffff']) {
      const value = Buffer.from(hex, 'hex').readDoubleBE();
      floatBoundaries.push(value, -value);
    }
    for (let i = 0; i < 1024; i++) {
      bits = BigInt.asUintN(64, bits ^ (bits << BigInt(13)));
      bits = BigInt.asUintN(64, bits ^ (bits >> BigInt(7)));
      bits = BigInt.asUintN(64, bits ^ (bits << BigInt(17)));
      buffer.writeBigUInt64BE(bits);
      const value = buffer.readDoubleBE();
      if (Number.isFinite(value)) floatBoundaries.push(value);
    }
    const canonicalFloats = geometryCanonicalJson(floatBoundaries);
    expect(ownerSql(`set extra_float_digits=-3; select sun_geometry_internal.canonical_json(${quote(canonicalFloats)}::jsonb);`)).toBe(canonicalFloats);

    const tables = ownerSql("select tablename from pg_tables where schemaname='public' and tablename like 'sun_geometry_%' order by tablename;").split('\n');
    expect(tables).toHaveLength(11);
    for (const role of ['service_role', 'anon', 'authenticated', 'e152_public']) {
      expect(sql('select current_user;', role)).toBe(activeRole(role));
      for (const table of tables) sql(`select * from public.${table} limit 1;`, role, role === 'service_role' ? undefined : 'permission denied');
      if (role !== 'service_role') sql("select sun_geometry_internal.assert_release('x');", role, 'permission denied');
    }
    expect(sql("select rolbypassrls from pg_roles where rolname=current_user;")).toBe('t');
    expect(ownerSql("select has_function_privilege('anon','sun_geometry_internal.assert_release(text)','EXECUTE');")).toBe('f');
    expect(ownerSql(`select has_table_privilege('${logins.public}','public.sun_geometry_inputs','INSERT');`)).toBe('f');
    expect(ownerSql("select count(*) from pg_class where relname like 'sun_geometry_%' and relkind='r' and (not relrowsecurity or not relforcerowsecurity);")).toBe('0');
    expect(ownerSql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='sun_geometry_internal' and p.proname in ('check_engine','check_input') and p.prosecdef;")).toBe('0');
    const indexes = ownerSql("select indexname from pg_indexes where schemaname='public' and indexname like 'sun_geometry_%' order by indexname;").split('\n');
    expect(indexes).toEqual(expect.arrayContaining([
      'sun_geometry_ready_generation_key',
      'sun_geometry_build_generation_key',
      'sun_geometry_member_generation_idx',
      'sun_geometry_evidence_generation_idx',
    ]));
    expect(ownerSql("select pg_get_expr(i.indpred,i.indrelid) from pg_index i join pg_class c on c.oid=i.indexrelid where c.relname='sun_geometry_ready_generation_key';")).toContain("status = 'ready'");
    expect(ownerSql("select pg_get_expr(i.indpred,i.indrelid) from pg_index i join pg_class c on c.oid=i.indexrelid where c.relname='sun_geometry_build_generation_key';")).toContain("status = 'building'");
    // FORCE RLS against a real non-BYPASSRLS owner, after granting schema access.
    ownerSql(`grant usage on schema public,sun_geometry_internal to ${logins.owner}; grant execute on all functions in schema sun_geometry_internal to ${logins.owner}; alter table public.sun_geometry_engine_versions owner to ${logins.owner};`);
    expect(sql('select count(*) from public.sun_geometry_engine_versions;', 'e152_owner')).toBe('0');
    sql(`insert into public.sun_geometry_engine_versions values(${quote(engineId)},${quote(geometryCanonicalJson(g2Input.manifest))});`, 'e152_owner', 'row-level security');
    ownerSql(`alter table public.sun_geometry_engine_versions owner to ${admin};`);

    // Supported rolling-schema fixture using the unchanged historical migrations.
    ownerSql(readFileSync('../supabase/migrations/20260718193000_persist_sun_geometry_series_and_weather_snapshots.sql', 'utf8'));
    ownerSql(readFileSync('../supabase/migrations/20260817160522_read_current_venue_sun_geometry_batch.sql', 'utf8'));
    sql("insert into public.venues(id,name,hidden) values('venue','Visible',false),('hidden','Hidden',true);");
    sql("insert into public.venue_geometry_inputs(venue_id,status,current_geometry_input_hash) values('venue','ready','g1:'||repeat('a',64));");
    sql("insert into public.venue_sun_geometry_series(venue_id,stockholm_date,geometry_input_hash,series) select 'venue','2026-03-29','g1:'||repeat('a',64),jsonb_agg(jsonb_build_object('minutes',i,'sunExposurePercent',75)) from generate_series(360,1260,15) i;");
    const legacy = sql("select row_to_json(t) from public.read_current_venue_sun_geometry_batch(array['venue'],'2026-03-29') t;");
    ownerSql(`alter table public.sun_geometry_engine_versions drop constraint sun_geometry_accepted_policy_v2;
      alter table public.sun_geometry_engine_versions add constraint sun_geometry_accepted_policy_v2 check (canonical_manifest::jsonb ? 'decoderVersion');
      alter table public.sun_geometry_releases drop constraint sun_geometry_release_season_fk;`);
    ownerSql(migration);
    expect(ownerSql("select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.sun_geometry_engine_versions'::regclass and conname='sun_geometry_accepted_policy_v2';")).toContain('maxEvaluations');
    expect(ownerSql("select count(*) from pg_constraint where conrelid='public.sun_geometry_releases'::regclass and conname='sun_geometry_release_season_fk';")).toBe('1');
    expect(sql("select row_to_json(t) from public.read_current_venue_sun_geometry_batch(array['venue'],'2026-03-29') t;")).toBe(legacy);
    sql("select * from public.read_current_venue_sun_geometry_batch(array['venue'],'2026-03-29');", 'anon', 'permission denied');

    for (const changed of [{ supportedElevationDegrees: 4 }, { thresholdPercent: 40 }, { baseStepMs: 600000 }, { crossingBracketMs: 200 }, { minimumWindowMs: 299000 }]) {
      const manifest = { ...g2Input.manifest, ...changed };
      sql(`insert into public.sun_geometry_engine_versions values(${quote(geometryDigest(manifest))},${quote(geometryCanonicalJson(manifest))});`, 'service_role', 'sun_geometry_accepted_policy');
    }
    const unsupportedDecoder = { ...g2Input.manifest, decoderVersion: 'f64-v2' };
    sql(`insert into public.sun_geometry_engine_versions values(${quote(geometryDigest(unsupportedDecoder))},${quote(geometryCanonicalJson(unsupportedDecoder))});`, 'service_role', 'check constraint');
    const incompleteManifest = geometryCanonicalJson({ decoderVersion: 'f64-v1' });
    sql(`insert into public.sun_geometry_engine_versions values(sun_geometry_internal.sha(${quote(incompleteManifest)}),${quote(incompleteManifest)});`, 'service_role', 'Engine manifest has missing or unknown fields');
    const { ['robust-predicates']: omittedPredicate, ...historicalDependencies } = g2Input.manifest.numericalDependencies;
    expect(omittedPredicate).toBe('2.0.4');
    const missingPredicateManifest = {
      ...structuredClone(g2Input.manifest),
      numericalDependencies: { ...historicalDependencies, lockfile: 'historical-lock-binding' },
    };
    const missingPredicateJson = geometryCanonicalJson(missingPredicateManifest);
    sql(`insert into public.sun_geometry_engine_versions values(sun_geometry_internal.sha(${quote(missingPredicateJson)}),${quote(missingPredicateJson)});`, 'service_role', 'Required numerical dependency');
    const invalidManifestRange = { ...g2Input.manifest, searchRadiusM: -1 };
    const invalidManifestRangeJson = geometryCanonicalJson(invalidManifestRange);
    sql(`insert into public.sun_geometry_engine_versions values(sun_geometry_internal.sha(${quote(invalidManifestRangeJson)}),${quote(invalidManifestRangeJson)});`, 'service_role', 'Invalid engine manifest range');
    for (const literal of ['1e400', '1e-400', '0.10000000000000001', '9007199254740993']) {
      const raw = geometryCanonicalJson({ ...g2Input.manifest, solarConstants: { boundary: 123456 } }).replace('123456', literal);
      sql(`insert into public.sun_geometry_engine_versions values(sun_geometry_internal.sha(${quote(raw)}),${quote(raw)});`, 'service_role', literal.includes('400') ? 'Float64 domain' : 'not canonical JSON');
    }
    for (const key of ['', 'x'.repeat(257)]) {
      const raw = geometryCanonicalJson({ ...g2Input.manifest, solarConstants: { [key]: 1 } });
      sql(`insert into public.sun_geometry_engine_versions values(sun_geometry_internal.sha(${quote(raw)}),${quote(raw)});`, 'service_role', 'manifest map key');
    }
    for (const map of ['solarConstants', 'shadowConstants', 'numericalDependencies'] as const) {
      const invalidInput = structuredClone(g2Input);
      Object.defineProperty(invalidInput.manifest[map], '__proto__', {
        value: map === 'numericalDependencies' ? '1.0.0' : 1, enumerable: true,
      });
      // Use the generic serializer to bypass TS admission without dropping the key.
      const rawManifest = geometryCanonicalJson(invalidInput.manifest);
      const rawInput = geometryCanonicalJson(invalidInput);
      expect(JSON.parse(rawManifest)[map]).toHaveProperty('__proto__');
      sql(`insert into public.sun_geometry_engine_versions values(sun_geometry_internal.sha(${quote(rawManifest)}),${quote(rawManifest)});`, 'service_role', 'manifest map key');
      sql(`select sun_geometry_internal.assert_geometry_input(${quote(rawInput)},${quote(engineId)});`, 'service_role', 'manifest map key');

      // These ordinary keys are preserved by both runtimes, so keep them supported.
      const validInput = structuredClone(g2Input);
      for (const key of ['constructor', 'prototype']) {
        Object.defineProperty(validInput.manifest[map], key, {
          value: map === 'numericalDependencies' ? '1.0.0' : 1, enumerable: true,
        });
      }
      const validEngine = geometryDigest(validInput.manifest), validHash = computeGeometryInputHashG2(validInput);
      const returned = sql(`begin;
        insert into public.sun_geometry_engine_versions values(${quote(validEngine)},${quote(geometryCanonicalJson(validInput.manifest))});
        insert into public.sun_geometry_inputs values(${quote(validHash)},${quote(validEngine)},${quote(canonicalGeometryInputG2(validInput))});
        select canonical_input from public.sun_geometry_inputs where input_hash=${quote(validHash)};
        rollback;`);
      expect(computeGeometryInputHashG2(JSON.parse(returned))).toBe(validHash);
    }
    for (const value of ['\u0000', '\ud800', '\udfff']) {
      for (const manifest of [
        { ...g2Input.manifest, samplingVersion: value },
        { ...g2Input.manifest, solarConstants: { [value]: 1 } },
      ]) {
        // JSON.stringify is deliberately used here to bypass the TS rejection.
        const raw = JSON.stringify(manifest);
        sql(`insert into public.sun_geometry_engine_versions values(sun_geometry_internal.sha(${quote(raw)}),${quote(raw)});`, 'service_role', 'Unicode');
      }
    }
    const boundaryManifest = { ...g2Input.manifest, samplingVersion: '😀'.repeat(256), solarConstants: {
      smallest: Number.MIN_VALUE, largest: Number.MAX_VALUE, midpoint: 1e23, fractional: 0.30000000000000004, ['😀'.repeat(256)]: -1e23,
    } };
    const boundaryEngine = geometryDigest(boundaryManifest);
    const boundaryInput = { ...g2Input, manifest: boundaryManifest };
    sql(`begin;
      insert into public.sun_geometry_engine_versions values(${quote(boundaryEngine)},${quote(geometryCanonicalJson(boundaryManifest))});
      insert into public.sun_geometry_inputs values(${quote(computeGeometryInputHashG2(boundaryInput))},${quote(boundaryEngine)},${quote(canonicalGeometryInputG2(boundaryInput))});
      rollback;`);
    const noncanonicalManifest = ` ${geometryCanonicalJson(g2Input.manifest)}`;
    sql(`insert into public.sun_geometry_engine_versions values(sun_geometry_internal.sha(${quote(noncanonicalManifest)}),${quote(noncanonicalManifest)});`, 'service_role', 'Engine manifest is not canonical JSON');
    sql(`insert into public.sun_geometry_engine_versions values(${quote(engineId)},${quote(geometryCanonicalJson(g2Input.manifest))});
      insert into public.sun_geometry_inputs values(${quote(hash)},${quote(engineId)},${quote(canonicalGeometryInputG2(g2Input))});
      update public.sun_geometry_input_revisions set staged_hash=${quote(hash)};
      update public.sun_geometry_input_revisions set committed_hash=staged_hash,staged_hash=null,dirty=false;
      insert into public.sun_geometry_seasons(season_year,start_date,end_date,engine_id) values(2026,'2026-03-01','2026-10-31',${quote(engineId)}),(2025,'2025-03-01','2025-10-31',${quote(engineId)});`);
    sql(`insert into public.sun_geometry_seasons(season_year,start_date,end_date,engine_id,status,checksum) values(2027,'2027-03-01','2027-10-31',${quote(engineId)},'verified',repeat('a',64));`, 'service_role', 'Season starts building');
    sql(`update public.sun_geometry_seasons set status='verified',checksum=repeat('a',64),expected_venues=2 where season_year=2026 and engine_id=${quote(engineId)};`, 'service_role', 'Season verification is release-owned');
    // These strings deliberately add noncanonical whitespace and a bow-tie
    // prefix. assert_geometry_input must reject each structural bound before
    // canonical JSON or ST_IsValid can inspect that hostile geometry.
    const bowTiePrefix = [[0, 0], [3, 3], [0, 3], [2, 0], [0, 0]];
    const oversizedRing = [...bowTiePrefix, ...Array.from({ length: 2_044 }, () => [0, 0])];
    const aggregateRings = Array.from({ length: 123 }, () => [...bowTiePrefix, ...Array.from({ length: 2_043 }, () => [0, 0])]);
    const noncanonical = (value: unknown) => ` ${JSON.stringify(value)}`;
    const earlyAdmissions: [string, unknown, string][] = [
      ['ring cap', { ...g2Input, seating: { type: 'Polygon', coordinates: [oversizedRing] } }, 'Invalid Polygon ring'],
      ['ring count', { ...g2Input, seating: { type: 'Polygon', coordinates: Array.from({ length: 129 }, () => bowTiePrefix) } }, 'Invalid Polygon'],
      ['caster count', { ...g2Input, casters: Array.from({ length: 5_001 }, () => ({ ...g2Input.casters[0], geometry: { type: 'Polygon', coordinates: [bowTiePrefix] } })) }, 'Invalid caster collection'],
      ['aggregate coordinate cap', { ...g2Input, seating: { type: 'Polygon', coordinates: aggregateRings } }, 'Geometry exceeds coordinate limit'],
    ];
    for (const [name, input, failure] of earlyAdmissions) {
      sql(`select sun_geometry_internal.assert_geometry_input(${quote(noncanonical(input))},${quote(engineId)});`, 'service_role', failure);
      log.push({ scenario: `Early geometry admission before canonicalization/topology: ${name}`, result: 'PASS' });
    }
    for (const [name, coordinates] of Object.entries(g2TopologyBoundaries)) {
      const input = { ...g2Input, seating: { type: 'Polygon', coordinates } };
      if (name.startsWith('valid')) {
        const canonical = canonicalGeometryInputG2(input);
        sql(`begin; insert into public.sun_geometry_inputs values(${quote(computeGeometryInputHashG2(input))},${quote(engineId)},${quote(canonical)}); rollback;`);
      } else {
        expect(() => canonicalGeometryInputG2(input), name).toThrow();
        const raw = geometryCanonicalJson(input);
        sql(`insert into public.sun_geometry_inputs values('g2:'||sun_geometry_internal.sha(${quote(raw)}),${quote(engineId)},${quote(raw)});`, 'service_role', 'Invalid Polygon topology');
      }
    }
    const incompleteInput = geometryCanonicalJson({ manifest: g2Input.manifest });
    sql(`insert into public.sun_geometry_inputs values('g2:'||sun_geometry_internal.sha(${quote(incompleteInput)}),${quote(engineId)},${quote(incompleteInput)});`, 'service_role', 'G2 input has missing or unknown fields');
    const rotatedInput = structuredClone(g2Input);
    rotatedInput.seating.coordinates[0] = [[1, 0], [1, 1], [0, 0], [1, 0]];
    const rotatedInputJson = geometryCanonicalJson(rotatedInput);
    sql(`insert into public.sun_geometry_inputs values('g2:'||sun_geometry_internal.sha(${quote(rotatedInputJson)}),${quote(engineId)},${quote(rotatedInputJson)});`, 'service_role', 'G2 input is not normalized');
    for (const flags of [['z', 'a'], ['a', 'a']]) {
      const flagsInput = structuredClone(g2Input) as unknown as { casters: { sourceFlags: string[] }[] };
      flagsInput.casters[0].sourceFlags = flags;
      const flagsJson = geometryCanonicalJson(flagsInput);
      sql(`insert into public.sun_geometry_inputs values('g2:'||sun_geometry_internal.sha(${quote(flagsJson)}),${quote(engineId)},${quote(flagsJson)});`, 'service_role', 'G2 input is not normalized');
    }
    const outOfRangeInput = structuredClone(g2Input);
    outOfRangeInput.seating.coordinates[0] = [[179, 89], [200, 89], [200, 95], [179, 89]];
    const outOfRangeInputJson = geometryCanonicalJson(outOfRangeInput);
    sql(`insert into public.sun_geometry_inputs values('g2:'||sun_geometry_internal.sha(${quote(outOfRangeInputJson)}),${quote(engineId)},${quote(outOfRangeInputJson)});`, 'service_role', 'Invalid Polygon position');
    const invalidEligibility = structuredClone(g2Input);
    invalidEligibility.casters[0].tier = 'arbitrary';
    const invalidEligibilityJson = geometryCanonicalJson(invalidEligibility);
    sql(`insert into public.sun_geometry_inputs values('g2:'||sun_geometry_internal.sha(${quote(invalidEligibilityJson)}),${quote(engineId)},${quote(invalidEligibilityJson)});`, 'service_role', 'Invalid caster eligibility metadata');
    sql("update public.sun_geometry_input_revisions set revision=revision+50 where venue_id='venue';", 'service_role', 'Revision is server-owned');
    sql(`insert into public.sun_geometry_input_revisions(venue_id,revision,committed_hash,dirty) values('forged-revision',7,${quote(hash)},false);`, 'service_role', 'Input revision starts dirty and server-owned');
    sql("insert into public.sun_geometry_input_revisions(venue_id) values('revision-limit');");
    const beforeOverflow = sql("select row_to_json(i) from public.sun_geometry_input_revisions i where venue_id='revision-limit';");
    sql("update public.sun_geometry_input_revisions set revision=9007199254740991 where venue_id='revision-limit';", 'service_role', 'Revision is server-owned');
    expect(sql("select row_to_json(i) from public.sun_geometry_input_revisions i where venue_id='revision-limit';")).toBe(beforeOverflow);
    const negative = encodeGeometryDay({ format: 'f64-v1', date: '2026-03-01', horizon: null, offsets: [], exposure: [], starts: [], ends: [], sunny: [], startUncertaintyMs: [], endUncertaintyMs: [] });
    // Exercise SQL independently of the TS validator. Invalid fixtures carry a
    // checksum computed from their bytes so rejection cannot be a digest mismatch.
    function checkCrossing(d: GeometryDayPayload, failure?: string, crossingBracketMs = 100) {
      const arr = (values: readonly (number | boolean)[], type = 'float8') => `array[${values.join(',')}]::${type}[]`;
      const encoded = failure ? undefined : encodeGeometryDay(d);
      const horizon = d.horizon ? arr(d.horizon) : 'null::float8[]';
      const digestSql = `sun_geometry_internal.sha(concat_ws('|','f64-v1',${quote(d.date)},${d.horizon ? `sun_geometry_internal.f64_hex(${horizon})` : "'-'"},${[d.offsets,d.exposure,d.starts,d.ends].map(a=>`sun_geometry_internal.f64_hex(${arr(a)})`).join(',')},${quote(d.sunny.map(v=>v?'1':'0').join(''))},sun_geometry_internal.f64_hex(${arr(d.startUncertaintyMs)}),sun_geometry_internal.f64_hex(${arr(d.endUncertaintyMs)})))`;
      sql(`select sun_geometry_internal.validate_day_payload(row('crossing-fixture',${quote(d.date)}::date,${horizon},${arr(d.offsets)},${arr(d.exposure)},${arr(d.starts)},${arr(d.ends)},${arr(d.sunny,'boolean')},${arr(d.startUncertaintyMs)},${arr(d.endUncertaintyMs)},${d.offsets.length},${encoded ? quote(encoded.checksum) : digestSql})::public.sun_geometry_days,2026,${crossingBracketMs});`, 'service_role', failure);
    }
    const unsupported = unsupportedWindowDay(), supported = crossingDay();
    checkCrossing(supported, 'crossing bracket', 10);
    checkCrossing(unsupported, 'crossing bracket');
    checkCrossing({ ...unsupported, exposure: unsupported.exposure.map(()=>100), sunny: unsupported.sunny.map(v=>!v) }, 'crossing bracket');
    for (const date of ['2026-03-29','2026-10-25']) checkCrossing({ ...supported, date });
    checkCrossing({ ...supported, offsets: supported.offsets.filter(t=>t!==300100.5), exposure: supported.exposure.filter((_,i)=>supported.offsets[i]!==300100.5) }, 'crossing bracket');
    checkCrossing({ ...supported, exposure: supported.exposure.map((v,i)=>supported.offsets[i]===300100.5?0:v) }, 'crossing bracket');
    checkCrossing({ ...supported, startUncertaintyMs: [0,49,50], endUncertaintyMs: [49,50,0] }, 'crossing bracket');
    checkCrossing({ ...supported, offsets: supported.offsets.map(t=>t===300100.5?300101.5:t), startUncertaintyMs: [0,51,50], endUncertaintyMs: [51,50,0] }, 'crossing bracket');
    sql(`insert into public.sun_geometry_input_revisions(venue_id) values('historical-negative');
      update public.sun_geometry_input_revisions set staged_hash=${quote(hash)} where venue_id='historical-negative';
      update public.sun_geometry_input_revisions set committed_hash=staged_hash,staged_hash=null,dirty=false where venue_id='historical-negative';
      insert into public.sun_geometry_venue_generations(id,season_year,venue_id,input_hash,source_revision,run_id) values('negative',2026,'historical-negative',${quote(hash)},1,'negative-fixture');
      insert into public.sun_geometry_days values('negative','2026-03-01',null,'{}','{}','{}','{}','{}','{}','{}',0,${quote(negative.checksum)});
      update public.sun_geometry_venue_generations set status='failed',completed_days=1 where id='negative';`);
    for (const year of [2025, 2026]) {
      const days = seasonDates(year).map(date => encodeGeometryDay({ format: 'f64-v1', date, horizon: [10000.5, 610000.5], offsets: [10000.5, 300000, 600000, 610000.5], exposure: [60.125, 70, 80, 90], starts: [10000.5], ends: [610000.5], sunny: [true], startUncertaintyMs: [0], endUncertaintyMs: [0] }));
      for (const venue of ['venue', 'hidden']) {
        const gid = `${venue}-${year}`;
        sql(`insert into public.sun_geometry_venue_generations(id,season_year,venue_id,input_hash,source_revision,run_id) select ${quote(gid)},${year},${quote(venue)},${quote(hash)},revision,'fixture' from public.sun_geometry_input_revisions where venue_id=${quote(venue)};`);
        sql(`update public.sun_geometry_venue_generations set status='ready',checksum=repeat('a',64),completed_days=245 where id=${quote(gid)};`, 'service_role', 'Incomplete generation');
        const rows = days.map(d => `(${quote(gid)},${quote(d.date)},array[${d.horizon}],array[${d.offsets}],array[${d.exposure}],array[${d.starts}],array[${d.ends}],array[true],array[0]::float8[],array[0]::float8[],${d.offsets.length},${quote(d.checksum)})`);
        if (year === 2025 && venue === 'venue') {
          for (const [bad, error] of [
            [rows[0].replace("'2025-03-01'", "'2026-03-01'"), 'Wrong season date'],
            [rows[0].replace('array[60.125,70,80,90]', 'array[101,70,80,90]'), 'Out of range'],
            [rows[0].replace('array[60.125,70,80,90]', "array['NaN'::float8,70,80,90]"), 'Nonfinite'],
            [rows[0].replace('array[60.125,70,80,90]', 'array[[60.125,70,80,90]]'), 'Invalid array dimensions'],
            [rows[0].replace('array[10000.5,300000,600000,610000.5]', 'array[10000.5,10000.5,600000,610000.5]'), 'Invalid offsets'],
            [rows[0].replace('array[10000.5,300000,600000,610000.5]', 'array[10000.5,610000.5]'), 'Array count mismatch'],
            [rows[0].replace('array[10000.5,300000,600000,610000.5]', 'array[10000.5,600000,610000.5]').replace('array[60.125,70,80,90]', 'array[60.125,80,90]').replace(',4,', ',3,'), 'Missing UTC base sample'],
            [rows[0].replace('array[60.125,70,80,90]', 'array[60.125,54,80,90]'), 'Missing conditional probe'],
            ["('venue-2025','2025-03-01',array[21600000,21660000]::float8[],array[21600000,21660000]::float8[],array[0,0]::float8[],array[21600000]::float8[],array[21660000]::float8[],array[true],array[0]::float8[],array[0]::float8[],2,repeat('a',64))", 'Raw interval contradicts endpoint'],
            [rows[0].replace(days[0].checksum, '0'.repeat(64)), 'Day checksum mismatch'],
            [rows[0].replace('array[true]', 'array[false]'), 'Raw interval contradicts'],
          ]) sql(`insert into public.sun_geometry_days values ${bad};`, 'service_role', error);
        }
        sql(`insert into public.sun_geometry_days values ${rows.join(',')};`);
        sql(`update public.sun_geometry_venue_generations set status='ready',completed_days=245,sample_count=980,checksum=repeat('0',64) where id=${quote(gid)};`, 'service_role', 'Incomplete generation/checksum');
        if (year === 2026 && venue === 'venue') {
          expect(sql("select count(*) from public.sun_geometry_days where generation_id='venue-2026' and stockholm_date in ('2026-03-29','2026-10-25');")).toBe('2');
        }
        expect(sql(`select sun_geometry_internal.generation_digest(${quote(gid)});`)).toBe(generationChecksum(hash, year, days));
        sql(`update public.sun_geometry_venue_generations set status='ready',completed_days=245,sample_count=980,checksum=sun_geometry_internal.generation_digest(id) where id=${quote(gid)};`);
        sql(`update public.sun_geometry_days set checksum=repeat('b',64) where generation_id=${quote(gid)};`, 'service_role', 'permission denied');
        sql(`insert into public.sun_geometry_days values ${rows[0]};`, 'service_role', 'Frozen generation');
      }
      for (const suffix of ['a','b']) {
        const rid = `release-${year}-${suffix}`;
        sql(`insert into public.sun_geometry_releases(id,season_year,expected_venues) values(${quote(rid)},${year},2);
          insert into public.sun_geometry_release_members values(${quote(rid)},'venue',${quote('venue-'+year)}),(${quote(rid)},'hidden',${quote('hidden-'+year)});`);
        sql(`update public.sun_geometry_releases set status='verified',completed_venues=2,checksum=repeat('0',64) where id=${quote(rid)};`, 'service_role', 'Release checksum mismatch');
        sql(`update public.sun_geometry_releases set status='verified',completed_venues=2,checksum=sun_geometry_internal.release_digest(id) where id=${quote(rid)};`);
      }
      sql(`insert into public.sun_geometry_current_pointers(season_year,release_id,rollback_release_id) values(${year},'release-${year}-a','release-${year}-b');`);
      expect(sql(`select status from public.sun_geometry_releases where id='release-${year}-a';`)).toBe('current');
      expect(sql(`select status from public.sun_geometry_releases where id='release-${year}-b';`)).toBe('verified');
      expect(sql(`select status from public.sun_geometry_seasons where season_year=${year} and engine_id=${quote(engineId)};`)).toBe('current');
    }
    sql("update public.sun_geometry_releases set status='retired' where id='release-2026-a';", 'service_role', 'Release lifecycle is pointer-owned');
    sql("update public.sun_geometry_releases set status='current' where id='release-2026-b';", 'service_role', 'Release lifecycle is pointer-owned');
    expect(sql("select horizon is null from public.sun_geometry_days where generation_id='negative' and stockholm_date='2026-03-01';")).toBe('t');
    sql("insert into public.sun_geometry_releases(id,season_year,expected_venues) values('missing-generation',2026,1);");
    sql("insert into public.sun_geometry_release_members values('missing-generation','venue','does-not-exist');", 'service_role', 'query returned no rows');
    const pointerBeforeRejectedRelease = sql("select release_id||'|'||rollback_release_id from public.sun_geometry_current_pointers where season_year=2026;");
    sql("update public.sun_geometry_current_pointers set release_id='missing-generation' where season_year=2026;", 'service_role', 'Invalid pointer target');
    expect(sql("select release_id||'|'||rollback_release_id from public.sun_geometry_current_pointers where season_year=2026;")).toBe(pointerBeforeRejectedRelease);
    sql("update public.sun_geometry_venue_generations set status='retired' where id='venue-2026';", 'service_role', 'Cannot retire retained');
    // Exercise same-hash revision reconciliation on an unreferenced generation;
    // retained release/pointer/evidence fixtures must never be retired to make
    // this path pass.
    sql(`insert into public.sun_geometry_input_revisions(venue_id) values('reconcile');
      update public.sun_geometry_input_revisions set staged_hash=${quote(hash)} where venue_id='reconcile';
      update public.sun_geometry_input_revisions set committed_hash=staged_hash,staged_hash=null,dirty=false where venue_id='reconcile';
      insert into public.sun_geometry_venue_generations(id,season_year,venue_id,input_hash,source_revision,run_id)
        select 'reconcile-2026',2026,venue_id,committed_hash,revision,'same-hash-old-revision' from public.sun_geometry_input_revisions where venue_id='reconcile';
      insert into public.sun_geometry_days select 'reconcile-2026',stockholm_date,horizon,offsets,exposure,starts,ends,sunny,start_uncertainty_ms,end_uncertainty_ms,sample_count,checksum from public.sun_geometry_days where generation_id='venue-2026';
      update public.sun_geometry_venue_generations set status='ready',completed_days=245,sample_count=980,checksum=sun_geometry_internal.generation_digest(id) where id='reconcile-2026';`);
    sql("update public.sun_geometry_venue_generations set status='retired' where id='reconcile-2026';", 'service_role', 'Cannot retire compatible');
    sql("update public.sun_geometry_input_revisions set staged_hash=committed_hash,dirty=true where venue_id='reconcile';");
    sql("update public.sun_geometry_input_revisions set committed_hash=staged_hash,staged_hash=null,dirty=false where venue_id='reconcile';");
    expect(sql("select status from public.sun_geometry_venue_generations where id='reconcile-2026';")).toBe('ready');
    sql("update public.sun_geometry_venue_generations set status='retired' where id='reconcile-2026';", 'service_role', 'Cannot retire compatible');
    sql("insert into public.sun_geometry_releases(id,season_year,expected_venues) values('reference-race',2026,1);");
    await heldTransaction("insert into public.sun_geometry_release_members values('reference-race','reconcile','reconcile-2026');", () => {
      sql("set lock_timeout='500ms'; update public.sun_geometry_venue_generations set status='retired' where id='reconcile-2026';", 'service_role', 'lock timeout');
    });
    await heldTransaction("insert into public.sun_geometry_evidence_references(evidence_id,generation_id) values('reference-race','reconcile-2026');", () => {
      sql("set lock_timeout='500ms'; update public.sun_geometry_venue_generations set status='retired' where id='reconcile-2026';", 'service_role', 'lock timeout');
    });
    const before = sql("select md5(string_agg(row_to_json(i)::text,'' order by venue_id)) from public.sun_geometry_input_revisions i;");
    const weather = sql('select md5(coalesce(jsonb_agg(w)::text,\'[]\')) from public.weather_bucket_snapshots w;');
    sql("insert into public.sun_geometry_current_pointers(season_year,release_id) values(2026,'release-2026-a');", 'service_role', 'not-null constraint');
    sql("update public.sun_geometry_current_pointers set rollback_release_id=release_id where season_year=2026;", 'service_role', 'sun_geometry_pointer_distinct_rollback');
    sql("update public.sun_geometry_current_pointers set release_id='release-2026-b',rollback_release_id='release-2026-a' where season_year=2026;");
    expect(sql("select status from public.sun_geometry_releases where id='release-2026-b';")).toBe('current');
    expect(sql("select status from public.sun_geometry_releases where id='release-2026-a';")).toBe('verified');
    expect(sql("select md5(string_agg(row_to_json(i)::text,'' order by venue_id)) from public.sun_geometry_input_revisions i;")).toBe(before);
    expect(sql('select md5(coalesce(jsonb_agg(w)::text,\'[]\')) from public.weather_bucket_snapshots w;')).toBe(weather);
    sql("begin; update public.sun_geometry_current_pointers set release_id='release-2026-a',rollback_release_id='release-2026-b' where season_year=2026; rollback;");
    expect(sql('select release_id from public.sun_geometry_current_pointers where season_year=2026;')).toBe('release-2026-b');
    const sameHashRevision = Number(sql("select revision from public.sun_geometry_input_revisions where venue_id='venue';"));
    sql(`update public.sun_geometry_input_revisions set staged_hash=${quote(hash)},dirty=true where venue_id='venue';`);
    sql("update public.sun_geometry_current_pointers set release_id='release-2026-b',rollback_release_id='release-2026-a' where season_year=2026;", 'service_role', 'Stale/incompatible');
    sql("update public.sun_geometry_input_revisions set committed_hash=staged_hash,staged_hash=null,dirty=false where venue_id='venue';");
    expect(Number(sql("select revision from public.sun_geometry_input_revisions where venue_id='venue';"))).toBeGreaterThan(sameHashRevision);
    sql("update public.sun_geometry_current_pointers set release_id='release-2026-b',rollback_release_id='release-2026-a' where season_year=2026;");
    sql("begin isolation level serializable; update public.sun_geometry_current_pointers set release_id='release-2026-a',rollback_release_id='release-2026-b' where season_year=2026;", 'service_role', 'Release assertion requires read committed transaction');
    const repeatable = spawn('docker', ['exec', '-i', '-e', `PGPASSWORD=${password}`, container, 'psql', '-X', '-h', '127.0.0.1', '-U', logins.service_role, '-d', database, '-v', 'ON_ERROR_STOP=1', '-Atq'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let repeatableOutput = '', repeatableError = '';
    const repeatableDone = new Promise<number | null>(resolve => repeatable.once('exit', resolve));
    const repeatableSnapshot = new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(Error('Repeatable Read snapshot timeout')), 10000);
      repeatable.stdout.on('data', chunk => { repeatableOutput += String(chunk); if (repeatableOutput.includes('E152_RR_SNAPSHOT')) { clearTimeout(deadline); resolve(); } });
      repeatable.stderr.on('data', chunk => { repeatableError += String(chunk); });
      repeatable.once('error', reject);
    });
    try {
      repeatable.stdin.write("set role service_role; begin isolation level repeatable read; select revision from public.sun_geometry_input_revisions where venue_id='venue';\n\\echo E152_RR_SNAPSHOT\n");
      await repeatableSnapshot;
      sql("update public.sun_geometry_input_revisions set dirty=true,revision=revision+1 where venue_id='venue';");
      repeatable.stdin.end("update public.sun_geometry_current_pointers set release_id='release-2026-a',rollback_release_id='release-2026-b' where season_year=2026;\ncommit;\n");
      expect(await repeatableDone).not.toBe(0);
      expect(repeatableError).toContain('Release assertion requires read committed transaction');
      expect(sql('select release_id from public.sun_geometry_current_pointers where season_year=2026;')).toBe('release-2026-b');
      log.push({ scenario: 'I08 stale Repeatable Read snapshot rejected', result: 'PASS', repeatableOutput, repeatableError });
    } finally { if (!repeatable.stdin.writableEnded) repeatable.stdin.end('rollback;\n'); }
    sql("update public.sun_geometry_current_pointers set release_id='release-2025-a' where season_year=2026;", 'service_role', 'Invalid pointer target');
    sql("insert into public.sun_geometry_evidence_references(evidence_id,generation_id,weather_evidence_id,classifier_version) values('field','venue-2026','weather-fixture','classifier-v1');");
    sql("insert into public.sun_geometry_evidence_references(evidence_id,legacy_g1_hash) values('legacy','g1:'||repeat('a',64));");
    await heldTransaction("insert into public.sun_geometry_evidence_references(evidence_id,generation_id) values('held-reference','venue-2026');", () => {
      sql("delete from public.sun_geometry_venue_generations where id='venue-2026';", 'service_role', 'permission denied');
    });
    for (const change of ["insert into public.venues(id) values('concurrent-new');", "update public.venues set deleted_at=clock_timestamp() where id='hidden';"]) {
      await heldTransaction(change, () => {
        sql("set lock_timeout='500ms'; update public.sun_geometry_current_pointers set release_id='release-2026-a',rollback_release_id='release-2026-b' where season_year=2026;", 'service_role', 'lock timeout');
      });
    }
    sql("begin; update public.venues set deleted_at=clock_timestamp() where id='hidden'; update public.sun_geometry_current_pointers set release_id='release-2026-a',rollback_release_id='release-2026-b' where season_year=2026;", 'service_role', 'Inventory mismatch');
    sql("update public.sun_geometry_release_members set generation_id='hidden-2026' where release_id='release-2026-a' and venue_id='venue';", 'service_role', 'permission denied');
    sql("insert into public.sun_geometry_worker_leases values('geometry','worker-a',1,clock_timestamp(),clock_timestamp()+interval '119 seconds');");
    sql("update public.sun_geometry_worker_leases set heartbeat_at=clock_timestamp()+interval '1 day',expires_at=clock_timestamp()+interval '1 day 119 seconds' where slot='geometry';", 'service_role', 'Lease exceeds server-time bound');
    sql("update public.sun_geometry_worker_leases set owner_id='worker-b',fencing_token=2,heartbeat_at=clock_timestamp(),expires_at=clock_timestamp()+interval '119 seconds' where slot='geometry';", 'service_role', 'Active worker lease');
    sql("insert into public.sun_geometry_worker_leases values('publication','publisher',1,clock_timestamp(),clock_timestamp()+interval '119 seconds');");
    sql("delete from public.sun_geometry_venue_generations where id='venue-2026';", 'service_role', 'permission denied');
    sql("delete from public.sun_geometry_releases where id='release-2026-a';", 'service_role', 'permission denied');
    const rev = sql("select revision from public.sun_geometry_input_revisions where venue_id='venue';");
    sql("update public.venues set display_lat=57.7,name='New display name' where id='venue';");
    expect(sql("select revision from public.sun_geometry_input_revisions where venue_id='venue';")).toBe(rev);
    // Deterministic multi-session barrier: hold the revision write uncommitted,
    // demonstrate the pointer waits, then commit and reject the stale target.
    const writer = spawn('docker', ['exec', '-i', '-e', `PGPASSWORD=${password}`, container, 'psql', '-X', '-h', '127.0.0.1', '-U', logins.service_role, '-d', database, '-v', 'ON_ERROR_STOP=1', '-Atq'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let writerOutput = '';
    const writerDone = new Promise<number | null>(resolve => writer.once('exit', resolve));
    const barrier = new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(Error('Writer barrier timeout')), 10000);
      writer.stdout.on('data', chunk => { writerOutput += String(chunk); if (writerOutput.includes('E152_BARRIER')) { clearTimeout(deadline); resolve(); } });
      writer.once('error', reject);
    });
    try {
      writer.stdin.write("set role service_role; begin; update public.venues set seating_elevation_m=coalesce(seating_elevation_m,0)+1 where id='venue';\n\\echo E152_BARRIER\n");
      await barrier;
      sql("set lock_timeout='500ms'; update public.sun_geometry_current_pointers set release_id='release-2026-a' where season_year=2026;", 'service_role', 'lock timeout');
      writer.stdin.end('commit;\n');
      expect(await writerDone).toBe(0);
      log.push({ scenario: 'I08 revision-writer barrier', result: 'PASS', writerOutput });
    } finally { if (!writer.stdin.writableEnded) writer.stdin.end('rollback;\n'); }
    sql("update public.sun_geometry_current_pointers set release_id='release-2026-a' where season_year=2026;", 'service_role', 'Stale/incompatible');
    expect(sql('select release_id from public.sun_geometry_current_pointers where season_year=2026;')).toBe('release-2026-b');
    sql("update public.venues set seating_elevation_m=12 where id='venue';");
    expect(sql("select dirty from public.sun_geometry_input_revisions where venue_id='venue';")).toBe('t');
    sql("update public.sun_geometry_current_pointers set release_id='release-2026-a' where season_year=2026;", 'service_role', 'Stale/incompatible');
    sql("insert into public.venues(id) values('new');");
    sql("update public.sun_geometry_current_pointers set release_id='release-2026-a' where season_year=2026;", 'service_role', 'Inventory mismatch');
    const retainedDigest = sql("select checksum from public.sun_geometry_venue_generations where id='venue-2026';");
    sql("update public.sun_geometry_venue_generations set status='retired',run_id='tampered' where id='venue-2026';", 'service_role', 'Immutable generation');
    sql("update public.sun_geometry_venue_generations set status='retired' where id='venue-2026';", 'service_role', 'Cannot retire retained');
    expect(sql("select checksum from public.sun_geometry_venue_generations where id='venue-2026';")).toBe(retainedDigest);
    expect(sql("select generation_id from public.sun_geometry_evidence_references where evidence_id='field';")).toBe('venue-2026');
    const upgraded = structuredClone(g2Input);
    upgraded.manifest.numericalDependencies.turf = '7.3.6';
    const upgradedEngine = geometryDigest(upgraded.manifest), upgradedHash = computeGeometryInputHashG2(upgraded);
    const oldSeason = sql(`select to_jsonb(s)-array['status','updated_at'] from public.sun_geometry_seasons s where season_year=2026 and engine_id=${quote(engineId)};`);
    sql(`insert into public.sun_geometry_engine_versions values(${quote(upgradedEngine)},${quote(geometryCanonicalJson(upgraded.manifest))});
      insert into public.sun_geometry_inputs values(${quote(upgradedHash)},${quote(upgradedEngine)},${quote(canonicalGeometryInputG2(upgraded))});
      insert into public.sun_geometry_seasons(season_year,start_date,end_date,engine_id) values(2026,'2026-03-01','2026-10-31',${quote(upgradedEngine)});`);
    expect(sql('select count(*) from public.sun_geometry_seasons where season_year=2026;')).toBe('2');
    sql("insert into public.sun_geometry_releases(id,season_year,expected_venues) values('ambiguous-engine',2026,3);", 'service_role', 'Explicit release engine required');
    for (const venue of ['venue', 'hidden', 'new']) {
      const gid = `upgraded-${venue}`;
      sql(`update public.sun_geometry_input_revisions set staged_hash=${quote(upgradedHash)},dirty=true where venue_id=${quote(venue)};
        update public.sun_geometry_input_revisions set committed_hash=staged_hash,staged_hash=null,dirty=false where venue_id=${quote(venue)};
        insert into public.sun_geometry_venue_generations(id,season_year,venue_id,input_hash,source_revision,run_id)
          select ${quote(gid)},2026,venue_id,committed_hash,revision,'new-engine' from public.sun_geometry_input_revisions where venue_id=${quote(venue)};
        insert into public.sun_geometry_days select ${quote(gid)},stockholm_date,horizon,offsets,exposure,starts,ends,sunny,start_uncertainty_ms,end_uncertainty_ms,sample_count,checksum from public.sun_geometry_days where generation_id='venue-2026';
        update public.sun_geometry_venue_generations set status='ready',completed_days=245,sample_count=980,checksum=sun_geometry_internal.generation_digest(id) where id=${quote(gid)};`);
    }
    for (const suffix of ['a', 'b']) {
      sql(`insert into public.sun_geometry_releases(id,season_year,engine_id,expected_venues) values('upgraded-${suffix}',2026,${quote(upgradedEngine)},3);`);
      sql(`insert into public.sun_geometry_release_members values('upgraded-${suffix}','hidden','hidden-2026');`, 'service_role', 'Incompatible/frozen');
      sql(`insert into public.sun_geometry_release_members select 'upgraded-${suffix}',venue_id,id from public.sun_geometry_venue_generations where id like 'upgraded-%';
        update public.sun_geometry_releases set status='verified',completed_venues=3,checksum=sun_geometry_internal.release_digest(id) where id='upgraded-${suffix}';`);
    }
    sql("update public.sun_geometry_current_pointers set release_id='upgraded-a',rollback_release_id='upgraded-b' where season_year=2026;");
    expect(sql(`select to_jsonb(s)-array['status','updated_at'] from public.sun_geometry_seasons s where season_year=2026 and engine_id=${quote(engineId)};`)).toBe(oldSeason);
    expect(sql(`select status from public.sun_geometry_seasons where season_year=2026 and engine_id=${quote(engineId)};`)).toBe('retired');
    expect(sql(`select status from public.sun_geometry_seasons where season_year=2026 and engine_id=${quote(upgradedEngine)};`)).toBe('current');
    expect(sql("select checksum from public.sun_geometry_venue_generations where id='venue-2026';")).toBe(retainedDigest);
    // Real SQL attempts from independently authenticated non-service logins.
    // DDL/ACL assertions alone cannot establish that INSERT/UPDATE are denied.
    const permissionManifest = { ...g2Input.manifest, samplingVersion: 'permission-probe' };
    const permissionEngine = geometryDigest(permissionManifest);
    const validEngineInsert = `insert into public.sun_geometry_engine_versions values(${quote(permissionEngine)},${quote(geometryCanonicalJson(permissionManifest))});`;
    const snapshot = () => ownerSql(`select jsonb_build_object(${tables.map(table => `${quote(table)},(select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from public.${table} t)`).join(',')});`);
    const beforeDeniedWrites = snapshot();
    for (const role of ['anon', 'authenticated', 'e152_public']) {
      const databaseRole = activeRole(role);
      sql(validEngineInsert, role, 'permission denied');
      sql("insert into public.sun_geometry_input_revisions(venue_id) values('denied-write');", role, 'permission denied');
      sql("update public.sun_geometry_input_revisions set staged_hash=null where venue_id='new';", role, 'permission denied');
      for (const table of tables) {
        expect(ownerSql(`select has_table_privilege(${quote(databaseRole)},${quote(`public.${table}`)},'INSERT') or has_table_privilege(${quote(databaseRole)},${quote(`public.${table}`)},'UPDATE');`)).toBe('f');
        // Rows are actual valid persisted fixtures, not malformed placeholder JSON.
        sql(`insert into public.${table} default values;`, role, 'permission denied');
        const column = ownerSql(`select attname from pg_attribute where attrelid=${quote(`public.${table}`)}::regclass and attnum=1;`);
        sql(`update public.${table} set ${column}=${column};`, role, 'permission denied');
      }
      // Separate RLS from the grant layer: temporarily grant table privileges in
      // this isolated DB, then require insert rejection and zero visible updates.
      ownerSql(`grant usage on schema sun_geometry_internal to ${databaseRole}; grant execute on all functions in schema sun_geometry_internal to ${databaseRole}; grant select,insert,update on public.sun_geometry_engine_versions,public.sun_geometry_input_revisions to ${databaseRole};`);
      try {
        sql(validEngineInsert, role, 'row-level security');
        sql("insert into public.sun_geometry_input_revisions(venue_id) values('denied-rls-write');", role, 'row-level security');
        expect(sql("with updated as (update public.sun_geometry_input_revisions set staged_hash=null where venue_id='new' returning venue_id) select count(*) from updated;", role)).toBe('0');
      } finally {
        ownerSql(`revoke select,insert,update on public.sun_geometry_engine_versions,public.sun_geometry_input_revisions from ${databaseRole}; revoke execute on all functions in schema sun_geometry_internal from ${databaseRole}; revoke usage on schema sun_geometry_internal from ${databaseRole};`);
      }
      expect(snapshot()).toBe(beforeDeniedWrites);
    }
    // Positive control proves the exact INSERT payload was otherwise admissible.
    sql(`begin; ${validEngineInsert} rollback;`);
    expect(snapshot()).toBe(beforeDeniedWrites);
    ownerSql(migration);
    writeFileSync(path.join(output, 'schema-result.json'), JSON.stringify({ status: 'PASS', database, checks: log.length, legacyPreserved: true, limitations: ['Synthetic schema fixtures are not actual-year storage evidence', 'Durable crash recovery and candidate API concurrency are later independent proof'] }, null, 2));
  } finally {
    writeFileSync(path.join(output, 'schema-sql-log.json'), JSON.stringify(log, null, 2));
    command(['exec', '-i', container!, 'psql', '-X', '-U', admin, '-d', bootstrapDatabase, '-v', 'ON_ERROR_STOP=1', '-Atq'], `drop database if exists ${database} with (force); drop role if exists ${logins.service_role},${logins.anon},${logins.authenticated},${logins.public},${logins.owner}; ${createdSharedRoles.length ? `drop role if exists ${createdSharedRoles.join(',')};` : ''}`);
  }
});
