import { createHash } from 'node:crypto';
import { generationChecksum, seasonDates, type GeometryDay } from './sun-geometry-season-codec';

export interface GeometryReleasePayload {
  readonly id: string;
  readonly year: number;
  readonly engineId: string;
  readonly format: string;
  readonly members: readonly { readonly venueId: string; readonly generationId: string; readonly sourceRevision: number; readonly checksum: string }[];
}
export interface GeometryGenerationContract {
  readonly id: string; readonly venueId: string; readonly year: number;
  readonly inputHash: string; readonly engineId: string; readonly sourceRevision: number;
  readonly format: string; readonly status: string; readonly crossingBracketMs: number;
  readonly days: readonly (GeometryDay & { readonly sampleCount: number })[];
  readonly sampleCount: number; readonly checksum: string;
}
export interface GeometryInputRevision {
  readonly venueId: string; readonly revision: number; readonly committedHash: string; readonly dirty: boolean;
}
export interface GeometryEngineContract {
  readonly id: string; readonly crossingBracketMs: number;
}
const identifier = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const digest = /^[0-9a-f]{64}$/;
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function releaseChecksum(release: GeometryReleasePayload): string {
  seasonDates(release.year);
  if (!identifier.test(release.id) || !digest.test(release.engineId) || release.format !== 'f64-v1') throw Error('Unsupported release identity/version');
  const members = [...release.members].sort((a,b)=>compare(a.venueId,b.venueId));
  if (new Set(members.map(m=>m.venueId)).size !== members.length) throw Error('Duplicate release venue');
  for (const m of members) if (!identifier.test(m.venueId) || !identifier.test(m.generationId) || !Number.isSafeInteger(m.sourceRevision) || m.sourceRevision < 1 || !digest.test(m.checksum)) throw Error('Malformed release member');
  const material = `${release.year}|${release.engineId}|f64-v1|${members.map(m=>`${m.venueId}:${m.generationId}:${m.sourceRevision}:${m.checksum}`).join('\n')}`;
  return createHash('sha256').update(material,'utf8').digest('hex');
}
/** Build/evidence verifier, deliberately not wired into the public request path. */
export function verifyReleaseContract(
  release: GeometryReleasePayload & { readonly checksum: string },
  generations: readonly GeometryGenerationContract[],
  revisions: readonly GeometryInputRevision[],
  engines: readonly GeometryEngineContract[],
  nonDeletedVenueIds: readonly string[],
): void {
  if (releaseChecksum(release) !== release.checksum) throw Error('Release checksum mismatch');
  const expected = [...nonDeletedVenueIds].sort(compare), actual = release.members.map(m=>m.venueId).sort(compare);
  if (new Set(expected).size !== expected.length || expected.length !== actual.length || actual.some((id,i)=>id!==expected[i])) throw Error('Inventory mismatch');
  if (new Set(generations.map(g=>g.id)).size !== generations.length || new Set(revisions.map(r=>r.venueId)).size !== revisions.length || new Set(engines.map(e=>e.id)).size !== engines.length || !engines.some(e=>e.id===release.engineId)) throw Error('Ambiguous evidence identity');
  const generationById = new Map(generations.map(g => [g.id, g]));
  const revisionByVenueId = new Map(revisions.map(r => [r.venueId, r]));
  const engineById = new Map(engines.map(e => [e.id, e]));
  for (const member of release.members) {
    const g = generationById.get(member.generationId), r = revisionByVenueId.get(member.venueId), engine = engineById.get(release.engineId);
    const persistedDays = g?.days.map(({ sampleCount, ...day }) => {
      if (!Number.isSafeInteger(sampleCount) || sampleCount < 0 || sampleCount !== day.offsets.length) throw Error('Incompatible generation sample count');
      return day;
    });
    const persistedSamples = g?.days.reduce((sum, day) => sum + day.sampleCount, 0);
    if (!g || !r || !engine || !Number.isSafeInteger(g.sampleCount) || g.sampleCount < 0 || persistedSamples !== g.sampleCount || r.dirty || g.status!=='ready' || g.venueId!==member.venueId || g.year!==release.year || g.engineId!==release.engineId || g.format!==release.format || g.sourceRevision!==member.sourceRevision || g.inputHash!==r.committedHash || g.crossingBracketMs!==engine.crossingBracketMs || g.checksum!==member.checksum || generationChecksum(g.inputHash,g.year,persistedDays!,{ crossingBracketMs: engine.crossingBracketMs })!==g.checksum) throw Error('Incompatible generation/revision');
  }
}
export function requestedSeasonPointer(date: string, pointers: ReadonlyMap<number,string>): string {
  const year = Number(date.slice(0,4));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || year < 2000 || year > 9998 || !seasonDates(year).includes(date) || !pointers.has(year)) throw Error('SUN_GEOMETRY_COVERAGE_MISSING');
  const pointer = pointers.get(year);
  if (typeof pointer !== 'string' || !identifier.test(pointer)) throw Error('SUN_GEOMETRY_COVERAGE_MISSING');
  return pointer;
}
