// Thin wrapper around @axe-core/playwright. Filters violations to
// `impact === 'serious' || 'critical'` so the CI gate fails only on those
// two impact levels. Moderate / minor violations are logged to the test
// output but do not fail the build, per AC2 of Story 1.6.
//
// Rationale: WCAG 2.1 AA compliance (NFR22) maps to serious + critical
// impacts; moderate / minor are heuristic warnings that often have
// false positives or require context-dependent judgement.

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  description: string;
  helpUrl: string;
  nodes: { target: string[]; html: string }[];
}

export async function runAxe(
  page: Page,
  options: { tags?: string[] } = {},
): Promise<AxeViolation[]> {
  const tags = options.tags ?? ['wcag2a', 'wcag2aa'];
  // Axe samples rendered colours at the instant it runs. Wait for visible
  // Motion surfaces to finish their entrance opacity so the gate measures the
  // stable UI state instead of an arbitrary fade frame (which blends both text
  // and background with the page and produces nondeterministic ratios).
  await page.waitForFunction(() => {
    const visibleMotionSurfaces = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reduced-motion]'),
    ).filter((element) => element.getClientRects().length > 0);
    return visibleMotionSurfaces.every(
      (element) => Number.parseFloat(window.getComputedStyle(element).opacity) >= 0.999,
    );
  });
  const result = await new AxeBuilder({ page }).withTags(tags).analyze();

  return (result.violations as unknown as AxeViolation[]).filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
}

export function formatViolations(violations: AxeViolation[]): string {
  if (violations.length === 0) return 'No violations.';
  return violations
    .map(
      (v) =>
        `${v.impact?.toUpperCase()} [${v.id}]: ${v.description}\n` +
        `  Help: ${v.helpUrl}\n` +
        v.nodes
          .slice(0, 3)
          .map((n) => `  Target: ${n.target.join(' > ')}`)
          .join('\n'),
    )
    .join('\n\n');
}
