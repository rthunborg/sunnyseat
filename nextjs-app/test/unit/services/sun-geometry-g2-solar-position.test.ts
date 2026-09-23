import { expect, it } from 'vitest';
import { calculateSolarPosition } from '@/lib/solar/solar-calculation-service';
import { correctG2SubsecondPosition } from '@/lib/solar/g2-solar-position';

it('adds the missing millisecond UTC-minute term for g2 without mutating g1', () => {
  const at = (ms: number) => calculateSolarPosition(new Date(Date.UTC(2026, 8, 9, 16, 0, 0, ms)), 57.7, 11.97);
  const original = at(500), saved = structuredClone(original);
  const corrected = correctG2SubsecondPosition(original);
  expect(corrected.hourAngle - original.hourAngle).toBeCloseTo(500 / 240000, 10);
  expect(original).toEqual(saved);
  expect(correctG2SubsecondPosition(at(0))).toEqual(at(0));
  const before = correctG2SubsecondPosition(at(999));
  const after = correctG2SubsecondPosition(calculateSolarPosition(new Date('2026-09-09T16:00:01.000Z'), 57.7, 11.97));
  expect(Math.abs(after.hourAngle - before.hourAngle)).toBeLessThan(0.00001);
  expect(Math.abs(after.elevation - before.elevation)).toBeLessThan(0.00001);
});
