import { describe, expect, it } from 'vitest';
import {
  classifyDirectSun,
  classifyDirectSunWithTrace,
} from '@/lib/services/direct-sun-classifier';

const clearWeather = {
  cloudCover: 10,
  cloudCoverLow: 5,
  cloudCoverMedium: 2,
  cloudCoverHigh: 4,
  fogAreaFraction: 0,
  precipitationAmount: 0,
  symbolCode: 'clearsky_day',
  isRaining: false,
};

describe('direct-sun diagnostic trace', () => {
  it.each([
    ['likely', { geometryPotentialPercent: 95, isSunVisible: true, weather: clearWeather }],
    ['geometry obstruction', { geometryPotentialPercent: 50, isSunVisible: true, weather: clearWeather }],
    ['cloud obstruction', {
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather: { ...clearWeather, cloudCover: 100, cloudCoverMedium: 100, symbolCode: 'cloudy' },
    }],
    ['precipitation', {
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather: { ...clearWeather, precipitationAmount: 0.1 },
    }],
    ['fog', {
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather: { ...clearWeather, fogAreaFraction: 80 },
    }],
    ['incomplete', {
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather: { ...clearWeather, cloudCoverLow: undefined },
    }],
    ['contradictory', {
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather: { ...clearWeather, cloudCover: 40, cloudCoverLow: 10, cloudCoverMedium: 10 },
    }],
  ])('uses the exact canonical verdict for %s', (_label, input) => {
    const ordinary = classifyDirectSun(input);
    const traced = classifyDirectSunWithTrace(input);
    expect({
      state: traced.state,
      reasons: traced.reasons,
      effectiveCloudCover: traced.effectiveCloudCover,
    }).toEqual(ordinary);
    expect(traced.trace.filter((rule) => rule.decisive)).toHaveLength(1);
    expect(traced.decisiveRuleIds).toEqual([
      traced.trace.find((rule) => rule.decisive)?.id,
    ]);
  });

  it('marks rules after a geometry early exit as not evaluated', () => {
    const traced = classifyDirectSunWithTrace({
      geometryPotentialPercent: 20,
      isSunVisible: true,
      weather: clearWeather,
    });
    expect(traced.state).toBe('blocked');
    expect(traced.decisiveRuleIds).toEqual(['geometry-blocks-direct-sun']);
    expect(traced.trace.find((rule) => rule.id === 'weather-unavailable')).toMatchObject({
      evaluation: 'not-evaluated',
      operands: {},
    });
  });

  it('preserves zero, false and absent as distinct diagnostic operands', () => {
    const traced = classifyDirectSunWithTrace({
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather: { ...clearWeather, cloudCoverHigh: undefined },
    });
    const complete = traced.trace.find((rule) => rule.id === 'incomplete-clear-evidence');
    expect(complete?.operands.precipitationAmount).toEqual({
      availability: 'available', value: 0, unit: 'mm',
    });
    expect(complete?.operands.isRaining).toEqual({ availability: 'available', value: false });
    expect(complete?.operands.cloudCoverHigh).toEqual({ availability: 'absent' });
  });
});
