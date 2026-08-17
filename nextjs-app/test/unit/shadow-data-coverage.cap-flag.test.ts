import { describe, expect, it } from 'vitest';

import {
  applyShadowDataCoverageCap,
  createUnknownCoverage,
} from '@/lib/solar/shadow-data-coverage';

describe('applyShadowDataCoverageCap fail-closed coverage cap', () => {
  it('clamps to the unknown-cluster cap (0.6)', () => {
    expect(
      applyShadowDataCoverageCap(0.92, createUnknownCoverage('haga', 'Haga'))
    ).toBe(0.6);
    expect(applyShadowDataCoverageCap(0.92, undefined)).toBe(0.6);
  });

  it('never raises confidence above the coverage cap', () => {
    expect(
      applyShadowDataCoverageCap(0.92, createUnknownCoverage('haga', 'Haga'))
    ).toBe(0.6);
    expect(
      applyShadowDataCoverageCap(0.41, createUnknownCoverage('haga', 'Haga'))
    ).toBe(0.41);
  });

  it('allows eligible coverage to preserve high internal diagnostic confidence', () => {
    expect(
      applyShadowDataCoverageCap(0.92, {
        ...createUnknownCoverage('haga', 'Haga'),
        status: 'eligible',
        confidenceCap: 1,
        allowsHighConfidence: true,
      }),
    ).toBe(0.92);
  });
});
