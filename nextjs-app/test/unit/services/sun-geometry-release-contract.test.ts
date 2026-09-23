import { describe, expect, it } from 'vitest';
import { releaseChecksum, verifyReleaseContract, requestedSeasonPointer } from '@/lib/services/sun-geometry-release-contract';
import { encodeGeometryDay, generationChecksum, seasonDates } from '@/lib/services/sun-geometry-season-codec';

const hash = 'g2:' + 'a'.repeat(64), engineId = 'b'.repeat(64);
const policy = { crossingBracketMs: 100 } as const;
const rawDays = seasonDates(2026).map(date => encodeGeometryDay({ format: 'f64-v1', date, horizon: null, offsets: [], exposure: [], starts: [], ends: [], sunny: [], startUncertaintyMs: [], endUncertaintyMs: [] }, policy));
const days = rawDays.map(day => ({ ...day, sampleCount: day.offsets.length }));
const generation = { id: 'g', venueId: 'hidden', year: 2026, inputHash: hash, engineId, sourceRevision: 2, format: 'f64-v1', status: 'ready', crossingBracketMs: 100, days, sampleCount: 0, checksum: generationChecksum(hash,2026,rawDays,policy) } as const;
const candidate = { id: 'r', year: 2026, engineId, format: 'f64-v1', members: [{ venueId: 'hidden', generationId: 'g', sourceRevision: 2, checksum: generation.checksum }] } as const;
const revisions = [{ venueId: 'hidden', revision: 2, committedHash: hash, dirty: false }];
const engines = [{ id: engineId, crossingBracketMs: 100 }];
describe('I02/I14 exact immutable release contract', () => {
  it('verifies full hidden venue coverage and chain', () => {
    expect(() => verifyReleaseContract({ ...candidate, checksum: releaseChecksum(candidate) }, [generation], revisions, engines, ['hidden'])).not.toThrow();
  });
  it('accepts the maximum safe revision and rejects rounded or non-positive identities', () => {
    const atBoundary = { ...candidate, members: [{ ...candidate.members[0], sourceRevision: Number.MAX_SAFE_INTEGER }] };
    expect(() => verifyReleaseContract(
      { ...atBoundary, checksum: releaseChecksum(atBoundary) },
      [{ ...generation, sourceRevision: Number.MAX_SAFE_INTEGER }],
      [{ ...revisions[0], revision: Number.MAX_SAFE_INTEGER }], engines, ['hidden'],
    )).not.toThrow();
    for (const sourceRevision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN]) {
      expect(() => releaseChecksum({ ...candidate, members: [{ ...candidate.members[0], sourceRevision }] })).toThrow('Malformed release member');
    }
  });
  it.each([{ inventory: [] }, { inventory: ['hidden','new'] }, { inventory: ['replacement'] }])('rejects changed inventory $inventory', ({ inventory }) => {
    expect(() => verifyReleaseContract({ ...candidate, checksum: releaseChecksum(candidate) }, [generation], revisions, engines, inventory)).toThrow();
  });
  it('rejects missing generation, wrong date, stale input, dirty input, bad checksum and decoder', () => {
    const manifest = { ...candidate, checksum: releaseChecksum(candidate) };
    expect(() => verifyReleaseContract(manifest, [], revisions, engines, ['hidden'])).toThrow();
    expect(() => verifyReleaseContract(manifest, [{ ...generation, days: days.slice(1) }], revisions, engines, ['hidden'])).toThrow();
    for (const changed of [{ dirty: true }, { committedHash: 'g2:'+'c'.repeat(64) }]) {
      expect(() => verifyReleaseContract(manifest, [generation], [{ ...revisions[0], ...changed }], engines, ['hidden'])).toThrow();
    }
    expect(() => verifyReleaseContract({ ...manifest, checksum: 'c'.repeat(64) }, [generation], revisions, engines, ['hidden'])).toThrow();
    expect(() => verifyReleaseContract({ ...manifest, format: 'future-decoder' }, [generation], revisions, engines, ['hidden'])).toThrow();
  });
  it('uses the immutable engine crossing policy and preserves same-hash reconciled generations', () => {
    const manifest = { ...candidate, checksum: releaseChecksum(candidate) };
    expect(() => verifyReleaseContract(manifest, [{ ...generation, crossingBracketMs: 1000 }], revisions, [{ id: engineId, crossingBracketMs: 10 }], ['hidden']))
      .toThrow('Incompatible generation/revision');
    expect(() => verifyReleaseContract(manifest, [generation], [{ ...revisions[0], revision: 3 }], engines, ['hidden'])).not.toThrow();
    expect(() => verifyReleaseContract(manifest, [generation], revisions, [], ['hidden'])).toThrow('Ambiguous evidence identity');
  });
  it('rejects persisted day and generation sample-count drift', () => {
    const manifest = { ...candidate, checksum: releaseChecksum(candidate) };
    expect(() => verifyReleaseContract(manifest, [{ ...generation, days: [{ ...days[0], sampleCount: 1 }, ...days.slice(1)] }], revisions, engines, ['hidden']))
      .toThrow('sample count');
    expect(() => verifyReleaseContract(manifest, [{ ...generation, sampleCount: 1 }], revisions, engines, ['hidden']))
      .toThrow('Incompatible generation/revision');
  });
  it('resolves solely by requested date year and fails without an exact season', () => {
    expect(requestedSeasonPointer('2025-10-31', new Map([[2025,'previous'],[2026,'current']]))).toBe('previous');
    expect(() => requestedSeasonPointer('2027-03-01', new Map([[2026,'current']]))).toThrow('SUN_GEOMETRY_COVERAGE_MISSING');
    expect(() => requestedSeasonPointer('2026-11-01', new Map([[2026,'current']]))).toThrow();
    expect(() => requestedSeasonPointer('9999-03-01', new Map())).toThrow('SUN_GEOMETRY_COVERAGE_MISSING');
    for (const pointer of ['', ' bad', '.bad', 'x'.repeat(129), 42]) {
      expect(() => requestedSeasonPointer('2026-03-01', new Map([[2026, pointer]]) as ReadonlyMap<number, string>)).toThrow('SUN_GEOMETRY_COVERAGE_MISSING');
    }
  });
});
