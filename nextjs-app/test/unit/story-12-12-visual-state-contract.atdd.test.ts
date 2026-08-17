import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(process.cwd(), '..');

describe('Story 12.12 ATDD - deterministic venue photo visual states', () => {
  it('[P0] project-context registers venue-photo-loaded and venue-photo-fallback routes for mobile and desktop', async () => {
    const context = await readFile(path.join(repoRoot, 'project-context.md'), 'utf8');

    for (const state of ['venue-photo-loaded', 'venue-photo-fallback']) {
      expect(context).toMatch(new RegExp(`\\|\\s*${state}\\s*\\|.*_state=${state}.*\\|\\s*mobile\\s*\\|`));
      expect(context).toMatch(new RegExp(`\\|\\s*${state}\\s*\\|.*_state=${state}.*\\|\\s*desktop\\s*\\|`));
      expect(context).toMatch(new RegExp(`${state}.*test-venue-sunny`));
    }
  });

  it('[P0] Claude Design state mapping and capture recipes include both photo states for both viewports', async () => {
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

  it('[P0] active reference baselines record approval and keep future regeneration gated', async () => {
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
    const rebaselineLog = await readFile(
      path.join(process.cwd(), 'docs', 'design', 'references', 'REBASELINE-LOG.md'),
      'utf8',
    );

    expect(stateMapping).toMatch(/approved Story 12\.12 implementation-derived active PNGs/i);
    expect(stateMapping).toMatch(/regenerate only with explicit maintainer approval/i);
    expect(captureScript).toMatch(/only for an explicitly approved rebaseline/i);
    expect(rebaselineLog).toMatch(/Approved: rebaseline Story 12\.12/);
    expect(rebaselineLog).toMatch(/20260719T195547/);
  });
});
