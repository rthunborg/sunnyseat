/**
 * ATDD RED-PHASE acceptance scaffolds - Story 12.2 (AC1, AC2, AC3, AC5)
 * Feedback POST live identity, typed prediction evidence, and agreement inputs.
 *
 * Every scaffold stays skipped until the implementation task activates it.
 * Activated tests should fail before Story 12.2 implementation, then pass green.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { POST } from '@/app/api/venues/[slug]/feedback/route';

const persistenceMock = vi.hoisted(() => ({
  persistVenueFeedback: vi.fn(async (feedback: Record<string, unknown>) => feedback),
}));

const predictionMock = vi.hoisted(() => {
  type PredictionState = {
    predictedState: 'Sunny' | 'Partial' | 'Shaded' | 'NoSun' | 'CloudObscured';
    sunExposurePercent: number;
    weatherGateState: 'gated' | 'not_gated' | 'unknown';
    geometryInputHash: string;
  };
  const state: PredictionState = {
    predictedState: 'Partial',
    sunExposurePercent: 61,
    weatherGateState: 'not_gated',
    geometryInputHash: 'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  };
  return {
    state,
    buildPersistedSunOutcome: vi.fn(async (venue: Record<string, unknown>) => ({
      venue: {
        ...venue,
        currentSunStatus: predictionMock.state.predictedState,
        sunExposurePercent: predictionMock.state.sunExposurePercent,
        weatherGateState: predictionMock.state.weatherGateState,
        predictionEvidence: {
          geometryInputHash: predictionMock.state.geometryInputHash,
        },
      },
      freshness: { sunDataSource: 'weather' },
    })),
  };
});

vi.mock('@/lib/services/venue-feedback-persistence', () => ({
  persistVenueFeedback: persistenceMock.persistVenueFeedback,
}));

vi.mock('@/lib/services/sun-geometry-repository', () => ({
  buildPersistedSunOutcome: predictionMock.buildPersistedSunOutcome,
  SunGeometryCoverageMissingError: class SunGeometryCoverageMissingError extends Error {},
}));

const appRoot = process.cwd();
const routePath = join(appRoot, 'app', 'api', 'venues', '[slug]', 'feedback', 'route.ts');

function readRouteSource(): string {
  return existsSync(routePath) ? readFileSync(routePath, 'utf8') : '';
}

function makeRequest(identifier: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/venues/${identifier}/feedback`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const completeAmberEvidence = {
  userTimestamp: '2026-07-18T10:15:00.000Z',
  predictedState: 'Partial',
  sunAccuracy: 'sunny',
  sunExposurePercent: 61,
  publicSunVerdict: 'amber',
  weatherGated: false,
  weatherUnknown: false,
  geometryInputHash:
    'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};

describe('[12.2 AC1] feedback POST uses the shared live public venue resolver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T10:20:00.000Z'));
    persistenceMock.persistVenueFeedback.mockClear();
    persistenceMock.persistVenueFeedback.mockImplementation(
      async (feedback: Record<string, unknown>) => feedback,
    );
    predictionMock.state.predictedState = 'Partial';
    predictionMock.state.sunExposurePercent = 61;
    predictionMock.state.weatherGateState = 'not_gated';
    predictionMock.state.geometryInputHash = completeAmberEvidence.geometryInputHash;
    predictionMock.buildPersistedSunOutcome.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('[P0] route source consumes the shared 12.7 resolver and removes live VENUE_FIXTURE matching', () => {
    const source = readRouteSource();

    expect(source).toMatch(/resolve.*public.*venue|public.*venue.*resolver/i);
    expect(source).not.toMatch(/import\s+\{\s*VENUE_FIXTURE\s*\}/);
    expect(source).not.toMatch(/VENUE_FIXTURE\.find/);
    expect(source).toMatch(/fixture.*mode/i);
  });

  test('[P0] hidden and unknown live venues return the same public 404 before persistence', async () => {
    for (const identifier of ['hidden-venue-slug', 'unknown-venue-slug']) {
      const res = await POST(makeRequest(identifier, completeAmberEvidence), {
        params: Promise.resolve({ slug: identifier }),
      });

      expect(res.status).toBe(404);
      await expect(res.json()).resolves.toMatchObject({ status: 404 });
    }
    expect(persistenceMock.persistVenueFeedback).not.toHaveBeenCalled();
  });
});

describe('[12.2 AC2/AC3] feedback evidence contract', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T10:20:00.000Z'));
    persistenceMock.persistVenueFeedback.mockClear();
    persistenceMock.persistVenueFeedback.mockImplementation(
      async (feedback: Record<string, unknown>) => feedback,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('[P0] accepts and persists complete prediction-time evidence for an amber public verdict', async () => {
    const res = await POST(makeRequest('test-venue-sunny', completeAmberEvidence), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      venueId: '1',
      venueSlug: 'test-venue-sunny',
      predictedState: 'Partial',
      sunAccuracy: 'sunny',
      sunExposurePercent: 61,
      publicSunVerdict: 'amber',
      weatherGated: false,
      weatherUnknown: false,
      geometryInputHash:
        'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    expect(persistenceMock.persistVenueFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        sunExposurePercent: 61,
        publicSunVerdict: 'amber',
        weatherGated: false,
        weatherUnknown: false,
        geometryInputHash:
          'g1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    );
  });

  test('[P0] treats exactly 50 percent as grey and maps not_sunny agreement explicitly', async () => {
    predictionMock.state.sunExposurePercent = 50;
    const res = await POST(makeRequest('test-venue-sunny', {
      ...completeAmberEvidence,
      predictedState: 'Partial',
      sunAccuracy: 'not_sunny',
      sunExposurePercent: 50,
      publicSunVerdict: 'grey',
    }), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      predictedState: 'Partial',
      sunAccuracy: 'not_sunny',
      wasSunny: false,
      sunExposurePercent: 50,
      publicSunVerdict: 'grey',
    });
  });

  test('[P0] accepts CloudObscured only as diagnostic predictedState while weather-gated verdict is grey', async () => {
    predictionMock.state.predictedState = 'CloudObscured';
    predictionMock.state.sunExposurePercent = 92;
    predictionMock.state.weatherGateState = 'gated';
    const res = await POST(makeRequest('test-venue-sunny', {
      ...completeAmberEvidence,
      predictedState: 'CloudObscured',
      sunAccuracy: 'not_sunny',
      sunExposurePercent: 92,
      publicSunVerdict: 'grey',
      weatherGated: true,
      weatherUnknown: false,
    }), {
      params: Promise.resolve({ slug: 'test-venue-sunny' }),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      predictedState: 'CloudObscured',
      publicSunVerdict: 'grey',
      weatherGated: true,
    });
  });

  test('[P0] rejects contradictory public verdict, weather flags, and geometry hashes before persistence', async () => {
    const invalidBodies = [
      { ...completeAmberEvidence, sunExposurePercent: 72, publicSunVerdict: 'grey' },
      { ...completeAmberEvidence, weatherGated: true, weatherUnknown: true },
      { ...completeAmberEvidence, geometryInputHash: 'aaaaaaaa' },
      { ...completeAmberEvidence, geometryInputHash:
          'g1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ];

    for (const body of invalidBodies) {
      const res = await POST(makeRequest('test-venue-sunny', body), {
        params: Promise.resolve({ slug: 'test-venue-sunny' }),
      });
      expect(res.status).toBe(400);
    }
    expect(persistenceMock.persistVenueFeedback).not.toHaveBeenCalled();
  });
});
