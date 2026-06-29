import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['sv', 'en'],
  defaultLocale: 'sv',
  localePrefix: 'as-needed',
  // Swedish is the default for everyone. Disabling locale detection stops the
  // middleware from auto-switching English-configured browsers to /en via the
  // Accept-Language header (and the NEXT_LOCALE cookie). English remains fully
  // available via the explicit `/en` prefix, which the manual language switcher
  // navigates to; explicit URL prefixes are never gated by localeDetection.
  localeDetection: false,
});
