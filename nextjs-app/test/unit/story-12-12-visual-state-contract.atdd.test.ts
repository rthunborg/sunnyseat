import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(process.cwd(), '..');

describe('Story 12.12 ATDD - deterministic venue photo visual states (RED scaffolds)', () => {
  it.skip('[P0] project-context registers venue-photo-loaded and venue-photo-fallback routes for mobile and desktop', async () => {
    const context = await readFile(path.join(repoRoot, 'project-context.md'), 'utf8');

    for (const state of ['venue-photo-loaded', 'venue-photo-fallback']) {
      expect(context).toMatch(new RegExp(`\\|\\s*${state}\\s*\\|.*_state=${state}.*\\|\\s*mobile\\s*\\|`));
      expect(context).toMatch(new RegExp(`\\|\\s*${state}\\s*\\|.*_state=${state}.*\\|\\s*desktop\\s*\\|`));
      expect(context).toMatch(new RegExp(`${state}.*test-venue-sunny`));
    }
  });

  it.skip('[P0] Claude Design state mapping and capture recipes include both photo states for both viewports', async () => {
    const stateMapping = await readFile(
      path.join(
        process.cwd(),
        'docs',
        'design',
        'references',
        'claude-design',
        'STATE-MAPPING.md',
      ),
      'utf8',
    );
    const captureScript = await readFile(
      path.join(process.cwd(), 'scripts', 'capture-claude-design-refs.mjs'),
      'utf8',
    );

    for (const state of ['venue-photo-loaded', 'venue-photo-fallback']) {
      expect(stateMapping).toMatch(new RegExp(state));
      expect(captureScript).toMatch(new RegExp(state));
      expect(captureScript).toMatch(new RegExp(`${state}[^]*mobile`));
      expect(captureScript).toMatch(new RegExp(`${state}[^]*desktop`));
    }
  });

  it.skip('[P0] rebaseline log records the new photo loaded/fallback references in the same operation', async () => {
    const log = await readFile(
      path.join(process.cwd(), 'docs', 'design', 'references', 'REBASELINE-LOG.md'),
      'utf8',
    );

    expect(log).toMatch(/venue-photo-loaded\.png/);
    expect(log).toMatch(/venue-photo-fallback\.png/);
    expect(log).toMatch(/mobile/);
    expect(log).toMatch(/desktop/);
  });
});
