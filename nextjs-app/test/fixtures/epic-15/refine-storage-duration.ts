import type { thresholdScan } from '@/scripts/benchmarks/epic-15/threshold-sampling';

/** Measurement-only refinement of already detected boundaries. It does not add
 * event discovery or change the accepted <=100ms bracket policy. Every old and
 * new observation is retained. Integer-ms engine resolution is a hard stop. */
export function refineStorageDuration(run: ReturnType<typeof thresholdScan>, evaluate: (t: number) => number, maxSamples = 20000) {
  const intervals = run.intervals.map(i => ({ ...i }));
  const uncertainty: number[] = Array.from({ length: intervals.length + 1 }, (_, i) => i === 0 || i === intervals.length ? 0 : 50);
  const values = new Map(run.points.map(p => [p.t, p.value]));
  let extraSamples = 0;
  const unresolved = (i: number) => intervals[i].sunny
    && intervals[i].end - intervals[i].start - uncertainty[i] - uncertainty[i + 1] < 300000
    && intervals[i].end - intervals[i].start + uncertainty[i] + uncertainty[i + 1] >= 300000;
  function refine(edge: number) {
    if (edge === 0 || edge === intervals.length) return;
    const boundary = intervals[edge].start;
    const points = [...values].sort((a, b) => a[0] - b[0]);
    const left = points.findLast(p => p[0] < boundary), right = points.find(p => p[0] > boundary);
    if (!left || !right || (left[1] > 50) === (right[1] > 50)) throw Error('Missing detected crossing bracket');
    let low = left[0], high = right[0];
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      if (mid <= low || mid >= high) throw Error('Engine time resolution exhausted');
      let value = values.get(mid);
      if (value === undefined) {
        if (values.size >= maxSamples) throw Error('Duration refinement sample limit');
        value = evaluate(mid);
        if (!Number.isFinite(value) || value < 0 || value > 100) throw Error('Invalid refinement exposure');
        values.set(mid, value); extraSamples++;
      }
      if ((value > 50) === (left[1] > 50)) low = mid; else high = mid;
    }
    intervals[edge - 1].end = intervals[edge].start = (low + high) / 2;
    uncertainty[edge] = (high - low) / 2;
  }
  for (let i = 0; i < intervals.length; i++) if (unresolved(i)) {
    refine(i); refine(i + 1);
    if (unresolved(i)) throw Object.assign(Error('Unresolved duration at integer-ms engine resolution'), {
      details: { interval: intervals[i], startUncertaintyMs: uncertainty[i], endUncertaintyMs: uncertainty[i + 1], extraSamples, points: [...values].sort((a, b) => a[0] - b[0]).map(([t, value]) => ({ t, value })) },
    });
  }
  return { intervals, points: [...values].sort((a, b) => a[0] - b[0]).map(([t, value]) => ({ t, value })), startUncertaintyMs: uncertainty.slice(0, -1), endUncertaintyMs: uncertainty.slice(1), extraSamples };
}
