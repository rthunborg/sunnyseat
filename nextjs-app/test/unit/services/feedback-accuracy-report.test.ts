import { describe, expect, it } from 'vitest';

import { buildFeedbackAccuracyReport } from '@/lib/services/feedback-accuracy-report';

const CURRENT_HASH = 'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OLD_HASH = 'g1:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const venues = [
  {
    venue_id: '1',
    venue_slug: 'test-venue-sunny',
    venue_name: 'Kafé Magasinet',
    area: 'Inom Vallgraven',
    current_geometry_input_hash: CURRENT_HASH,
  },
  {
    venue_id: '2',
    venue_slug: 'second',
    venue_name: 'Second',
    area: 'Haga',
    current_geometry_input_hash: CURRENT_HASH,
  },
  {
    venue_id: '3',
    venue_slug: 'third',
    venue_name: 'Third',
    area: 'Haga',
    current_geometry_input_hash: CURRENT_HASH,
  },
];

function row(overrides: Partial<Parameters<typeof buildFeedbackAccuracyReport>[0]['feedback'][number]>) {
  return {
    venue_id: '1',
    venue_slug: 'test-venue-sunny',
    user_timestamp: '2026-08-06T12:15:00.000Z',
    predicted_state: 'Partial',
    sun_accuracy: 'sunny',
    sun_exposure_percent: 60,
    public_sun_verdict: 'amber',
    weather_gated: false,
    weather_unknown: false,
    geometry_input_hash: CURRENT_HASH,
    ...overrides,
  };
}

describe('feedback accuracy maintainer report', () => {
  it('maps agreement through the shared public sunny predicate vectors', () => {
    const report = buildFeedbackAccuracyReport({
      venues,
      generatedAt: '2026-08-06T12:00:00.000Z',
      feedback: [
        row({ predicted_state: 'Sunny', sun_accuracy: 'sunny', sun_exposure_percent: 95, public_sun_verdict: 'amber' }),
        row({ predicted_state: 'Partial', sun_accuracy: 'not_sunny', sun_exposure_percent: 40, public_sun_verdict: 'grey' }),
        row({ predicted_state: 'Partial', sun_accuracy: 'sunny', sun_exposure_percent: 60, public_sun_verdict: 'amber' }),
        row({ predicted_state: 'Partial', sun_accuracy: 'not_sunny', sun_exposure_percent: 50, public_sun_verdict: 'grey' }),
        row({ predicted_state: 'Sunny', sun_accuracy: 'not_sunny', sun_exposure_percent: 95, public_sun_verdict: 'grey', weather_gated: true }),
        row({ predicted_state: 'Sunny', sun_accuracy: 'sunny', sun_exposure_percent: 95, public_sun_verdict: 'amber', weather_unknown: true }),
      ],
    });

    expect(report.venues[0]).toMatchObject({
      venue_id: '1',
      current_sample_count: 6,
      agreement_count: 6,
      disagreement_count: 0,
      agreement_rate: 1,
      unsure_count: 0,
    });
    expect(report.areas[0]).toMatchObject({
      area: 'Inom Vallgraven',
      current_sample_count: 6,
      agreement_count: 6,
      disagreement_count: 0,
      agreement_rate: 1,
    });
  });

  it('excludes unsure, stale-hash, missing-evidence, and invalid evidence from current agreement', () => {
    const report = buildFeedbackAccuracyReport({
      venues,
      generatedAt: '2026-08-06T12:00:00.000Z',
      feedback: [
        row({ sun_accuracy: 'not_sunny', sun_exposure_percent: 80, public_sun_verdict: 'amber' }),
        row({ sun_accuracy: 'unsure' }),
        row({ geometry_input_hash: OLD_HASH }),
        row({
          sun_exposure_percent: null,
          public_sun_verdict: null,
          weather_gated: null,
          weather_unknown: null,
          geometry_input_hash: null,
        }),
        row({ sun_exposure_percent: null, public_sun_verdict: 'amber' }),
        row({ weather_gated: true, weather_unknown: true }),
      ],
    });

    expect(report.venues[0]).toMatchObject({
      current_sample_count: 1,
      agreement_count: 0,
      disagreement_count: 1,
      unsure_count: 1,
      stale_hash_count: 1,
      legacy_unscored_count: 1,
      invalid_evidence_count: 2,
      representative_wrong_windows: ['12:00-12:59Z'],
    });
  });

  it('enforces minimum sample count for venue and area rankings', () => {
    const report = buildFeedbackAccuracyReport({
      venues,
      generatedAt: '2026-08-06T12:00:00.000Z',
      minimumSampleCount: 2,
      feedback: [
        row({ venue_id: '1', venue_slug: 'test-venue-sunny', sun_accuracy: 'not_sunny' }),
        row({ venue_id: '2', venue_slug: 'second', sun_accuracy: 'not_sunny' }),
        row({ venue_id: '3', venue_slug: 'third', sun_accuracy: 'not_sunny' }),
      ],
    });

    expect(report.venues).toEqual([]);
    expect(report.areas).toHaveLength(1);
    expect(report.areas[0]).toMatchObject({
      area: 'Haga',
      current_sample_count: 2,
      disagreement_count: 2,
      venues: [
        {
          venue_id: '2',
          venue_slug: 'second',
          venue_name: 'Second',
          disagreement_count: 1,
        },
        {
          venue_id: '3',
          venue_slug: 'third',
          venue_name: 'Third',
          disagreement_count: 1,
        },
      ],
    });
  });

  it('sorts by disagreement rate, count, latest disagreeing feedback, and stable identity', () => {
    const report = buildFeedbackAccuracyReport({
      venues,
      generatedAt: '2026-08-06T12:00:00.000Z',
      feedback: [
        row({
          venue_id: '1',
          venue_slug: 'test-venue-sunny',
          sun_accuracy: 'not_sunny',
          user_timestamp: '2026-08-06T12:00:00.000Z',
        }),
        row({
          venue_id: '1',
          venue_slug: 'test-venue-sunny',
          sun_accuracy: 'sunny',
          user_timestamp: '2026-08-06T14:00:00.000Z',
        }),
        row({
          venue_id: '2',
          venue_slug: 'second',
          sun_accuracy: 'not_sunny',
          user_timestamp: '2026-08-06T13:00:00.000Z',
        }),
      ],
    });

    expect(report.venues.map((venue) => venue.venue_id)).toEqual(['2', '1']);
    expect(report.venues.map((venue) => venue.latest_disagreeing_feedback_at)).toEqual([
      '2026-08-06T13:00:00.000Z',
      '2026-08-06T12:00:00.000Z',
    ]);
    expect(report.venues[1].latest_feedback_at).toBe('2026-08-06T14:00:00.000Z');
  });
});
