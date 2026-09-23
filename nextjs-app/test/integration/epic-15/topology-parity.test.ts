import { expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { geometryInputG2Schema, inspectPolygonTopologyG2 } from '@/lib/services/sun-geometry-hash-g2';
import { g2Input } from '../../fixtures/epic-15/g2-input';
import { topologyParityCases } from '../../fixtures/epic-15/g2-sweep-parity';

it('differentially matches PostGIS ST_IsValid for the bounded endpoint-sweep corpus', () => {
  const container = process.env.E15_DB_CONTAINER;
  const output = process.env.E15_DB_OUTPUT;
  if (!container || !/^[0-9a-f]{12,64}$/.test(container) || !output || !path.isAbsolute(output)) {
    throw Error('Explicit guard-owned container ID and absolute evidence output required');
  }
  const lane = process.env.E15_DB_LANE ?? 'persistent';
  if (!['persistent', 'disposable'].includes(lane)) throw Error('Unknown isolated database lane');
  const admin = lane === 'disposable' ? 'sunnyseat_test' : 'sunnyseat';
  const database = lane === 'disposable' ? 'sunnyseat_test' : 'sunnyseat_dev';

  const docker = (args: string[], input?: string) => spawnSync('docker', args, {
    input,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const inspected = docker(['inspect', '--format', '{{index .Config.Labels "com.rasmus.resource-guard.managed"}}|{{index .Config.Labels "com.docker.compose.project.working_dir"}}', container]);
  expect(inspected.status, inspected.stderr).toBe(0);
  expect(inspected.stdout.trim()).toBe('true|C:\\DEV\\sunnyseat');

  const local = topologyParityCases.map(specimen => {
    try {
      return {
        id: specimen.id,
        valid: inspectPolygonTopologyG2(specimen.coordinates).valid,
        parsed: geometryInputG2Schema.safeParse({
          ...g2Input,
          seating: { type: 'Polygon', coordinates: specimen.coordinates },
        }).success,
      };
    } catch (error) {
      throw new Error(`Topology inspection failed for ${specimen.id} ${JSON.stringify(specimen.coordinates)}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  });
  const parseMismatch = local.find(result => result.valid !== result.parsed);
  expect(parseMismatch, 'Structural geometry admission must not diverge from endpoint-sweep validity').toBeUndefined();

  const payload = JSON.stringify(topologyParityCases.map(specimen => ({
    id: specimen.id,
    geometry: { type: 'Polygon', coordinates: specimen.coordinates },
  })));
  const query = `
    begin read only;
    with cases as (
      select value->>'id' as id, st_geomfromgeojson((value->'geometry')::text) as geometry
      from jsonb_array_elements($parity$${payload}$parity$::jsonb)
    )
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'valid', st_isvalid(geometry)) order by id), '[]'::jsonb)
    from cases;
    commit;
  `;
  const result = docker(['exec', '-i', container, 'psql', '-X', '-U', admin, '-d', database, '-v', 'ON_ERROR_STOP=1', '-Atq'], query);
  expect(result.status, result.stderr).toBe(0);
  const postgis = JSON.parse(result.stdout.trim()) as { id: string; valid: boolean }[];
  const expected = new Map(local.map(({ id, valid }) => [id, valid]));
  const mismatch = postgis.find(row => row.valid !== expected.get(row.id));
  expect(mismatch, `PostGIS mismatch: ${JSON.stringify(mismatch)}`).toBeUndefined();
  expect(postgis).toHaveLength(topologyParityCases.length);
  const metadata = docker(['exec', '-i', container, 'psql', '-X', '-U', admin, '-d', database, '-v', 'ON_ERROR_STOP=1', '-Atq'], 'show server_version; select postgis_version();');
  expect(metadata.status, metadata.stderr).toBe(0);

  mkdirSync(output, { recursive: true });
  writeFileSync(path.join(output, 'topology-parity-result.json'), JSON.stringify({
    status: 'PASS',
    corpus: 'g2-sweep-parity fixed-seed 0x152a6d91',
    cases: topologyParityCases.length,
    categories: Object.fromEntries([...new Set(topologyParityCases.map(specimen => specimen.category))]
      .map(category => [category, topologyParityCases.filter(specimen => specimen.category === category).length])),
    postgres: metadata.stdout.trim().split('\n'),
    limitation: 'Differential validity corpus only; it does not establish production capacity, physical sunlight accuracy, or later-story readiness.',
  }, null, 2));
});
