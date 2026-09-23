import { expect, it } from 'vitest';
import { thresholdScan } from '@/scripts/benchmarks/epic-15/threshold-sampling';
import { refineStorageDuration } from '../../fixtures/epic-15/refine-storage-duration';

it('resolves a detected near-300s duration while retaining all observations', () => {
  const evaluate = (t: number) => t >= 100030 && t < 400031 ? 80 : 0;
  const initial = thresholdScan(evaluate, 0, 600000, 5);
  const refined = refineStorageDuration(initial, evaluate);
  expect(refined.extraSamples).toBeGreaterThan(0);
  for (const p of initial.points) expect(refined.points).toContainEqual(p);
  const sunny = refined.intervals.findIndex(i => i.sunny);
  expect(refined.intervals[sunny].end - refined.intervals[sunny].start - refined.startUncertaintyMs[sunny] - refined.endUncertaintyMs[sunny]).toBeGreaterThanOrEqual(300000);
});
it('does no extra work for already resolved durations and preserves failure limits', () => {
  const run = thresholdScan(t => t >= 100030 && t < 450031 ? 80 : 0, 0, 600000, 5);
  expect(refineStorageDuration(run, () => { throw Error('Unexpected evaluation'); }).points).toEqual(run.points);
  const exactly300s = (t: number) => t >= 100030 && t < 400030 ? 80 : 0;
  const ambiguous = thresholdScan(exactly300s, 0, 600000, 5);
  expect(() => refineStorageDuration(ambiguous, exactly300s, ambiguous.samples)).toThrow('sample limit');
  expect(() => refineStorageDuration(ambiguous, exactly300s)).toThrow('Unresolved duration');
});
