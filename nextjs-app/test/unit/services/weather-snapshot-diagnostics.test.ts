import { describe, expect, it } from 'vitest';
import {
  normalizeWeatherSnapshotSlicesWithDiagnostics,
  selectSnapshotSliceForStepWithDiagnostics,
} from '@/lib/services/weather-snapshots';

describe('weather snapshot diagnostics', () => {
  it('reports normalization without converting invalid or absent values to zero', () => {
    const result = normalizeWeatherSnapshotSlicesWithDiagnostics([
      {
        validAt: '2026-09-09T10:00:00.000Z',
        cloudCover: 0,
        cloudCoverLow: 101,
        isRaining: 'false',
      },
      { validAt: 'not-an-instant', cloudCover: 10 },
    ], { requireValidAt: true });
    expect(result.slices[0]).toEqual({
      validAt: '2026-09-09T10:00:00.000Z',
      weatherUnknown: true,
    });
    expect(result.issues).toEqual([
      { index: 0, code: 'malformed-boolean-flag', fields: ['isRaining'] },
      { index: 1, code: 'missing-valid-time', fields: ['validAt'] },
    ]);
  });

  it('admits the signed 90-minute boundaries and rejects 91 minutes', () => {
    const requestedAt = new Date('2026-09-09T10:00:00.000Z');
    for (const minutes of [-90, 90]) {
      const validAt = new Date(requestedAt.getTime() + minutes * 60_000).toISOString();
      expect(selectSnapshotSliceForStepWithDiagnostics({
        requestedAt,
        slices: [{ validAt, cloudCover: 0 }],
      })).toMatchObject({
        matched: true,
        rejected: false,
        signedDifferenceMinutes: minutes,
        absoluteDifferenceMinutes: 90,
        matchingLimitMinutes: 90,
      });
    }
    expect(selectSnapshotSliceForStepWithDiagnostics({
      requestedAt,
      slices: [{ validAt: '2026-09-09T11:31:00.000Z', cloudCover: 0 }],
    })).toMatchObject({
      matched: false,
      rejected: true,
      signedDifferenceMinutes: 91,
      rejectionReason: 'outside-matching-limit',
    });
  });

  it('keeps timestamp-addressable unknown evidence on an equal-distance tie', () => {
    const result = selectSnapshotSliceForStepWithDiagnostics({
      requestedAt: new Date('2026-09-09T10:00:00.000Z'),
      slices: [
        { validAt: '2026-09-09T09:30:00.000Z', cloudCover: 0 },
        { validAt: '2026-09-09T10:30:00.000Z', weatherUnknown: true },
      ],
    });
    expect(result.slice).toEqual({
      validAt: '2026-09-09T10:30:00.000Z',
      weatherUnknown: true,
    });
    expect(result.signedDifferenceMinutes).toBe(30);
  });
});
