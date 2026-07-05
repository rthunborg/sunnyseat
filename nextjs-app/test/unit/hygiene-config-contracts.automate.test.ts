/**
 * Story 11.7 (automate coverage) — hygiene config-contract guards.
 *
 * Story 11.7 landed three orthogonal hygiene fixes that produce BYTE-IDENTICAL
 * UI (nothing renders), so they carry NO runtime/e2e/visual regression guard.
 * Each is a static config/source contract a careless future edit could silently
 * revert — re-adding the lightningcss error-swallow, blanket-sweeping
 * `.gitattributes`, or resurrecting the deleted `toSunStatusToken` mapper. This
 * suite locks those contracts in the fast vitest gate, mirroring the existing
 * source-level `map-legibility-tokens.automate.test.ts` precedent (read a file
 * from disk, assert its structural contract — never a rendered pixel).
 *
 * All three items were entirely uncovered before this suite (a repo-wide grep
 * for `vercel.json` / `gitattributes` / `installCommand` / `toSunStatusToken`
 * across `test/` returned nothing).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const repoRoot = join(projectRoot, '..');

const vercelJsonRaw = readFileSync(join(projectRoot, 'vercel.json'), 'utf8');
const vercelJson = JSON.parse(vercelJsonRaw) as {
  buildCommand: string;
  installCommand: string;
};
const vercelDeploymentDoc = readFileSync(
  join(projectRoot, 'docs', 'vercel-deployment.md'),
  'utf8',
);
const gitattributes = readFileSync(join(repoRoot, '.gitattributes'), 'utf8');
const sunStatusSource = readFileSync(
  join(projectRoot, 'lib', 'utils', 'sun-status-presentation.ts'),
  'utf8',
);
const sunStatusTestSource = readFileSync(
  join(projectRoot, 'test', 'unit', 'sun-status-presentation.test.ts'),
  'utf8',
);

// Matches any shell error-swallow tail: `|| true`, `; true`, `|| :`, `|| exit 0`.
// These are the constructs that mask a non-zero exit and let a broken build ship.
// (`|| :` is the shell no-op builtin — `:` is not a word char, so it is matched
// explicitly rather than via `\b`.)
const ERROR_SWALLOW = /(\|\||;)\s*(true\b|:|exit\s+0\b)/;

describe('Story 11.7 — hygiene config-contract guards (automate)', () => {
  describe('AC1 — vercel.json build fails LOUD (no lightningcss error-swallow)', () => {
    it('installCommand contains NO error-swallow (`|| true` / `; true`) so a failed lightningcss install aborts the deploy', () => {
      // The exact regression this closes: Epic 8's A2 install step ended with
      // `... lightningcss@1.31.1 2>&1 || true`, masking a broken native binary
      // so a silently-broken build shipped. A future edit re-adding any swallow
      // tail is caught here.
      expect(vercelJson.installCommand).not.toMatch(ERROR_SWALLOW);
    });

    it('installCommand keeps every load-bearing fragment (the root-reach lightningcss install is the documented Vercel workaround)', () => {
      // Removing the swallow must NOT mean deleting the second install. Guard
      // that the deliberate, load-bearing pieces survive so a "cleanup" cannot
      // gut the workaround: dev deps, the `(cd .. && ...)` root reach, the
      // no-lock + pinned version, and the stderr merge.
      const cmd = vercelJson.installCommand;
      expect(cmd).toContain('--include=dev');
      expect(cmd).toMatch(/\(cd \.\. &&/); // root-reach subshell
      expect(cmd).toContain('--no-package-lock');
      expect(cmd).toContain('lightningcss@1.31.1'); // pinned version
      expect(cmd).toContain('2>&1'); // stderr merged so failures surface
      // The two installs are chained with `&&` so a non-zero exit propagates.
      expect(cmd).toMatch(/npm install --include=dev\s*&&/);
    });

    it('keeps buildCommand a clean `npm run build` (the swallow was NEVER here — do not migrate it back)', () => {
      // The epic prose said "build command"; the swallow actually lived in the
      // install step. Pin buildCommand clean so nobody "fixes" the wrong line.
      expect(vercelJson.buildCommand).toBe('npm run build');
      expect(vercelJson.buildCommand).not.toMatch(ERROR_SWALLOW);
    });

    it('docs/vercel-deployment.md mirrors the exact installCommand (config + doc must not drift)', () => {
      // The doc quotes the installCommand verbatim at ~:154. If either side
      // drifts (esp. the doc re-showing `|| true`) the mirror is broken. Assert
      // the doc contains the live installCommand string and NO swallow tail.
      expect(vercelDeploymentDoc).toContain(vercelJson.installCommand);
      const mirrored = vercelDeploymentDoc.match(/"installCommand":\s*"([^"]*)"/);
      expect(mirrored, 'mirrored installCommand string in the doc').not.toBeNull();
      expect(mirrored![1]).not.toMatch(ERROR_SWALLOW);
    });
  });

  describe('AC1 — .gitattributes stays a SCOPED EOL policy (never a blanket sweep)', () => {
    it('does NOT use a blanket `* text=auto` (R-016: that makes the renormalization diff unreviewable)', () => {
      // A blanket rule would sweep the ~113 tracked `*.log` BMAD/Playwright
      // artifacts and every binary into one unreviewable diff. The whole point
      // of the scoped policy is defeated the moment `* text=auto` appears.
      const uncommented = gitattributes
        .split('\n')
        .filter((line) => !line.trim().startsWith('#'))
        .join('\n');
      expect(uncommented).not.toMatch(/^\s*\*\s+text\s*=\s*auto\b/m);
    });

    it('never adds `.log` to the text/EOL set (the .log artifacts must stay untouched)', () => {
      // `.log` files are review-capture/console artifacts, deliberately excluded.
      // A rule like `*.log text ...` re-swallows them into the renormalization.
      expect(gitattributes).not.toMatch(/^\s*\*\.log\b/m);
    });

    it('pins `text eol=lf` on the core source extensions (ends the recurring CRLF<->LF review churn)', () => {
      // These are the extensions whose CRLF/LF churn cost real review rounds
      // (e.g. Epic 10's confidence-calculator.ts). Each must carry an LF rule.
      const lfExtensions = ['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'md', 'yml', 'yaml', 'sql', 'sh'];
      for (const ext of lfExtensions) {
        const rule = new RegExp(`^\\s*\\*\\.${ext}\\s+text\\s+eol=lf\\b`, 'm');
        expect(gitattributes, `expected \`*.${ext} text eol=lf\` rule`).toMatch(rule);
      }
    });

    it('guards binaries with `-text` so the reference PNGs and fonts are NEVER EOL-normalized', () => {
      // The 12 rebaselined reference PNGs (and fonts) must never be touched by
      // normalization — a corrupted binary is a silent, invisible regression.
      const binaryGuards = ['png', 'jpg', 'ico', 'woff', 'woff2', 'ttf'];
      for (const ext of binaryGuards) {
        const rule = new RegExp(`^\\s*\\*\\.${ext}\\s+-text\\b`, 'm');
        expect(gitattributes, `expected binary guard \`*.${ext} -text\``).toMatch(rule);
      }
    });
  });

  describe('AC2 — orphaned toSunStatusToken mapper stays DELETED (no half-state, R-017)', () => {
    it('does not re-export toSunStatusToken from sun-status-presentation.ts', () => {
      // R-017 binary outcome: the dead export was deleted (never wired in). A
      // future re-add (with its misleading "single source of truth" comment)
      // resurrects the orphan. Source-scan proves it stays gone.
      expect(sunStatusSource).not.toMatch(/\btoSunStatusToken\b/);
    });

    it('has no lingering toSunStatusToken reference in its only former consumer (the unit test)', () => {
      // The test file was the sole importer; assert the import + describe block
      // stay removed so the export cannot quietly come back via a test edit.
      expect(sunStatusTestSource).not.toMatch(/\btoSunStatusToken\b/);
    });

    it('preserves the `never`-exhaustive guard via the surviving windowLabelTier switch', () => {
      // The compile-time "a new VenueSunStatus member breaks the build" property
      // that toSunStatusToken used to hold is inherited by windowLabelTier. If
      // its exhaustive `switch` + `never` default are removed, the guard AC2
      // relies on is gone even though the export deletion "passed".
      expect(sunStatusSource).toMatch(/export function windowLabelTier\s*\(/);
      const fn = sunStatusSource.match(
        /export function windowLabelTier[\s\S]*?\n\}/,
      );
      expect(fn, 'windowLabelTier function body').not.toBeNull();
      expect(fn![0]).toMatch(/switch\s*\(status\)/);
      expect(fn![0]).toMatch(/:\s*never\s*=\s*status/); // exhaustiveness guard
    });
  });
});
