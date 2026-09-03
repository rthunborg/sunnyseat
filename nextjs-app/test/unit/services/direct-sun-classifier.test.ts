import { describe, expect, it } from 'vitest';
import {
  classifyDirectSun,
  skyConditionForDirectSun,
  sunStatusForDirectSun,
  weatherGateStateForDirectSun,
} from '@/lib/services/direct-sun-classifier';

const CLEAR = {
  cloudCover: 0,
  cloudCoverLow: 0,
  cloudCoverMedium: 0,
  cloudCoverHigh: 0,
  fogAreaFraction: 0,
  precipitationAmount: 0,
  symbolCode: 'clearsky_day',
};

describe('direct-sun classifier', () => {
  it('blocks the representative complete-overcast medium-layer fixture', () => {
    expect(classifyDirectSun({
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather: { ...CLEAR, cloudCover: 100, cloudCoverMedium: 100, symbolCode: 'cloudy' },
    })).toMatchObject({
      state: 'blocked',
      reasons: ['cloud-obstruction'],
      effectiveCloudCover: 100,
    });
  });

  it('only calls direct sun likely for fresh, complete, coherent clear evidence', () => {
    expect(classifyDirectSun({
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather: CLEAR,
    }).state).toBe('likely');
  });

  it.each([
    ['missing precipitation amount and rain flag', { ...CLEAR, precipitationAmount: undefined }],
    ['negative nowcast rain flag with missing forecast precipitation', {
      ...CLEAR,
      precipitationAmount: undefined,
      isRaining: false,
    }],
    ['raw total cloud above clear threshold despite low weighted cover', {
      ...CLEAR,
      cloudCover: 30,
      cloudCoverHigh: 100,
      symbolCode: 'clearsky_day',
    }],
  ])('never calls %s likely', (_name, weather) => {
    expect(classifyDirectSun({ geometryPotentialPercent: 95, isSunVisible: true, weather }).state)
      .toBe('unknown');
  });

  it.each([
    ['raw complete total cloud with high-only layers', {
      ...CLEAR,
      cloudCover: 100,
      cloudCoverHigh: 0,
      symbolCode: 'clearsky_day',
    }],
    ['cloudy symbol before incomplete fields', { cloudCover: undefined, symbolCode: 'cloudy' }],
  ])('blocks %s', (_name, weather) => {
    expect(classifyDirectSun({ geometryPotentialPercent: 95, isSunVisible: true, weather }).state)
      .toBe('blocked');
  });

  it.each([
    ['broken clouds', { ...CLEAR, cloudCover: 45, cloudCoverLow: 45, symbolCode: 'partlycloudy_day' }],
    ['legacy incomplete snapshot', { ...CLEAR, symbolCode: undefined }],
    ['contradictory clear symbol', { ...CLEAR, cloudCover: 50, cloudCoverLow: 50 }],
  ])('keeps %s as unknown rather than clear', (_name, weather) => {
    expect(classifyDirectSun({ geometryPotentialPercent: 95, isSunVisible: true, weather }).state)
      .toBe('unknown');
  });

  it.each([
    ['forecast precipitation', { ...CLEAR, precipitationAmount: 0.1, symbolCode: 'rain' }, 'precipitation'],
    ['dense fog', { ...CLEAR, fogAreaFraction: 80, symbolCode: 'fog' }, 'fog'],
  ])('blocks %s', (_name, weather, reason) => {
    expect(classifyDirectSun({ geometryPotentialPercent: 95, isSunVisible: true, weather }))
      .toMatchObject({ state: 'blocked', reasons: [reason] });
  });

  it('never calls a geometrically shaded or below-horizon area direct sun', () => {
    expect(classifyDirectSun({ geometryPotentialPercent: 50, isSunVisible: true, weather: CLEAR }).state)
      .toBe('blocked');
    expect(classifyDirectSun({ geometryPotentialPercent: 95, isSunVisible: false, weather: CLEAR }).state)
      .toBe('blocked');
  });

  it('fails malformed cloud percentages closed as unknown', () => {
    expect(classifyDirectSun({
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather: { ...CLEAR, cloudCoverLow: 101 },
    })).toMatchObject({ state: 'unknown', reasons: ['weather-incomplete'] });
  });

  it('fails malformed geometric visibility closed instead of treating it as truthy', () => {
    expect(classifyDirectSun({
      geometryPotentialPercent: 95,
      isSunVisible: 'false' as never,
      weather: CLEAR,
    })).toMatchObject({ state: 'unknown', reasons: ['geometry-incomplete'] });
  });

  it('lets a valid independent overcast blocker win over otherwise incomplete evidence', () => {
    expect(classifyDirectSun({
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather: { cloudCover: 100 },
    })).toMatchObject({ state: 'blocked', reasons: ['cloud-obstruction'] });
  });

  it.each([
    ['non-string symbol', { ...CLEAR, symbolCode: 42 }],
    ['negative precipitation', { ...CLEAR, precipitationAmount: -1 }],
    ['non-boolean rain flag', { ...CLEAR, isRaining: 'false' }],
    ['non-boolean unavailable marker', { ...CLEAR, weatherUnknown: 'false' }],
  ])('fails malformed persisted JSON (%s) closed without throwing', (_name, unsafeWeather) => {
    expect(() => classifyDirectSun({
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather: unsafeWeather as never,
    })).not.toThrow();
    expect(classifyDirectSun({
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather: unsafeWeather as never,
    })).toMatchObject({ state: 'unknown', reasons: ['weather-incomplete'] });
  });

  it('projects status, compatibility gate, and sky from the same decision', () => {
    const classification = classifyDirectSun({
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather: { ...CLEAR, cloudCover: 100, cloudCoverMedium: 100, symbolCode: 'cloudy' },
    });
    expect(sunStatusForDirectSun('Sunny', classification)).toBe('CloudObscured');
    expect(weatherGateStateForDirectSun(classification)).toBe('gated');
    expect(skyConditionForDirectSun(
      { ...CLEAR, cloudCover: 100, cloudCoverMedium: 100, symbolCode: 'cloudy' },
      classification,
    )).toBe('overcast');
  });

  it('never lets forecast precipitation coexist with a clear sky label', () => {
    const weather = { ...CLEAR, precipitationAmount: 0.4, symbolCode: 'rain' };
    const classification = classifyDirectSun({
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather,
    });
    expect(skyConditionForDirectSun(weather, classification)).toBe('rain');
  });

  it.each([
    ['partial fog', { ...CLEAR, fogAreaFraction: 50 }, 'unavailable'],
    ['partly-cloudy symbol', { ...CLEAR, symbolCode: 'partlycloudy_day' }, 'partly-cloudy'],
  ])('never pairs an unknown %s verdict with a clear sky label', (_name, weather, expectedSky) => {
    const classification = classifyDirectSun({
      geometryPotentialPercent: 95,
      isSunVisible: true,
      weather,
    });
    expect(classification.state).toBe('unknown');
    expect(skyConditionForDirectSun(weather, classification)).toBe(expectedSky);
  });
});
