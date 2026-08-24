import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSerwist } from '@serwist/turbopack';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Hide the floating Next.js dev-tools indicator in `next dev`. The
  // visual validation gate (Story 1.5) screenshots the dev server and
  // compares against static design references, where the indicator is
  // an environmental artifact that masquerades as an implementation
  // defect. Production builds never render it regardless of this flag.
  //
  // Re-evaluated in Story 1.6 Task 12 against per-screenshot suppression
  // (Playwright `mask` / `addStyleTag`). The visual-validation gate at
  // `.claude/scripts/visual-validate.sh` uses `npx playwright screenshot`
  // (the CLI) which does not expose those options, so per-screenshot
  // suppression would require replacing the CLI invocation with a
  // bespoke Node script. The cost outweighs the benefit; the
  // project-wide override stays.
  devIndicators: false,
};

// Compose Serwist (Turbopack-native PWA integration — adds esbuild to
// `serverExternalPackages` for the SW route bundling) around the existing
// next-intl plugin; the optional bundle-analyzer still wraps the result below.
const config = withSerwist(withNextIntl(nextConfig));

export default process.env.ANALYZE === 'true'
  ? (async () => {
      const withBundleAnalyzer = (await import('@next/bundle-analyzer')).default(
        { enabled: true }
      );
      return withBundleAnalyzer(config);
    })()
  : config;
