import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import type { AxeResults } from 'axe-core';

/**
 * Run axe-core accessibility audit on the current page.
 * Configured for WCAG 2.1 AA compliance per project requirements.
 */
export async function checkAccessibility(
  page: Page,
  options?: { exclude?: string[] }
): Promise<AxeResults> {
  let builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
  ]);

  // Exclude known third-party elements that we can't control
  const defaultExclusions = ['[role="application"]']; // MapLibre canvas
  const exclusions = [...defaultExclusions, ...(options?.exclude ?? [])];

  for (const selector of exclusions) {
    builder = builder.exclude(selector);
  }

  return builder.analyze();
}
