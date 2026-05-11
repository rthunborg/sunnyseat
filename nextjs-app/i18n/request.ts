import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

const SCOPES = ['common', 'map', 'onboarding', 'venue', 'premium', 'feedback', 'about'] as const;
type Scope = (typeof SCOPES)[number];

async function loadScope(locale: string, scope: Scope): Promise<Record<string, unknown>> {
  try {
    const mod = await import(`../messages/${locale}/${scope}.json`);
    return (mod.default ?? {}) as Record<string, unknown>;
  } catch {
    // Fallback to defaultLocale if the requested locale file is missing or malformed.
    if (locale !== routing.defaultLocale) {
      try {
        const fallback = await import(`../messages/${routing.defaultLocale}/${scope}.json`);
        return (fallback.default ?? {}) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    return {};
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const entries = await Promise.all(
    SCOPES.map(async (scope) => [scope, await loadScope(locale, scope)] as const),
  );
  const messages = Object.fromEntries(entries) as Record<Scope, Record<string, unknown>>;

  return {
    locale,
    messages,
    // Render missing-key path rather than throwing, so empty stub scopes stay visible
    // during development without crashing the whole page.
    getMessageFallback: ({ namespace, key }) =>
      namespace ? `${namespace}.${key}` : key,
  };
});
