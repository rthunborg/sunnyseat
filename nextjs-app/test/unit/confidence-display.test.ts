import { describe, expect, it } from 'vitest';
import { getConfidenceDisplayState } from '@/lib/utils/confidence-display';

const LABELS = {
  confidence: 'Säkerhet',
  approximate: 'cirka',
  unavailable: 'Säkerhet saknas',
};

const NOW = new Date('2026-05-22T12:00:00.000Z');

describe('getConfidenceDisplayState', () => {
  it('formats exact confidence when weather metadata is fresh', () => {
    expect(
      getConfidenceDisplayState({
        confidence: 84.6,
        meta: {
          sunDataSource: 'weather',
          weatherUpdatedAt: '2026-05-22T11:00:00.000Z',
        },
        now: NOW,
        labels: LABELS,
      }),
    ).toEqual({
      kind: 'exact',
      visibleText: '85%',
      accessibleText: 'Säkerhet 85%',
      value: 85,
    });
  });

  it('adds a tilde and circa accessible text when weather is older than two hours', () => {
    expect(
      getConfidenceDisplayState({
        confidence: 84.6,
        meta: {
          sunDataSource: 'weather',
          weatherUpdatedAt: '2026-05-22T09:59:59.000Z',
        },
        now: NOW,
        labels: LABELS,
      }),
    ).toEqual({
      kind: 'approximate',
      visibleText: '~85%',
      accessibleText: 'Säkerhet cirka 85%',
      value: 85,
    });
  });

  it('hides confidence when weather is unavailable or geometry-only', () => {
    expect(
      getConfidenceDisplayState({
        confidence: 85,
        meta: { sunDataSource: 'geometry-only' },
        now: NOW,
        labels: LABELS,
      }),
    ).toEqual({
      kind: 'hidden',
      visibleText: null,
      accessibleText: 'Säkerhet saknas',
    });
  });

  it('hides confidence for missing, unparsable, or invalid inputs', () => {
    const base = {
      meta: { sunDataSource: 'weather' as const },
      now: NOW,
      labels: LABELS,
    };

    expect(getConfidenceDisplayState({ ...base, confidence: undefined })).toMatchObject({
      kind: 'hidden',
    });
    expect(
      getConfidenceDisplayState({
        ...base,
        confidence: 80,
        meta: { sunDataSource: 'weather', weatherUpdatedAt: 'not-a-date' },
      }),
    ).toMatchObject({ kind: 'hidden' });
    expect(
      getConfidenceDisplayState({
        ...base,
        confidence: Number.NaN,
        meta: { sunDataSource: 'weather', weatherUpdatedAt: '2026-05-22T11:00:00.000Z' },
      }),
    ).toMatchObject({ kind: 'hidden' });
  });

  it('clamps confidence to 0..100 before display', () => {
    const meta = {
      sunDataSource: 'weather' as const,
      weatherUpdatedAt: '2026-05-22T11:00:00.000Z',
    };

    expect(
      getConfidenceDisplayState({
        confidence: 130,
        meta,
        now: NOW,
        labels: LABELS,
      }),
    ).toMatchObject({ visibleText: '100%', value: 100 });
    expect(
      getConfidenceDisplayState({
        confidence: -10,
        meta,
        now: NOW,
        labels: LABELS,
      }),
    ).toMatchObject({ visibleText: '0%', value: 0 });
  });
});
