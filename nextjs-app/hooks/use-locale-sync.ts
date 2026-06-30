'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/**
 * sessionStorage key holding the user's EXPLICIT language choice (set by the
 * in-app `LanguageSwitcher`). Exported so the switcher writes the same key the
 * sync hook reads.
 */
export const LOCALE_PREFERENCE_STORAGE_KEY = 'sunnyseat:locale';

type SupportedLocale = (typeof routing.locales)[number];

function isSupportedLocale(candidate: string | undefined | null): candidate is SupportedLocale {
  return !!candidate && (routing.locales as readonly string[]).includes(candidate);
}

/**
 * Read the user's EXPLICIT stored locale preference — the one the in-app
 * language switcher persists. Returns null when the user has never chosen.
 *
 * BUGFIX: this previously also fell back to `navigator.language`, which is why
 * an English-configured browser visiting `/sv` was bounced to `/en` a moment
 * after the Swedish page rendered. Browser-language negotiation for first-time
 * visitors is already handled server-side by the next-intl middleware
 * (Accept-Language → `NEXT_LOCALE` cookie). The client now only enforces an
 * EXPLICIT stored choice, so explicit URLs and the switcher always win and
 * there is no surprise client-side redirect.
 */
function readStoredPreference(): SupportedLocale | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.sessionStorage.getItem(LOCALE_PREFERENCE_STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    // sessionStorage may be disabled (private mode, sandboxed iframe) — ignore.
  }

  return null;
}

function stripLeadingLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (isSupportedLocale(segments[0])) {
    segments.shift();
  }
  return '/' + segments.join('/');
}

function buildLocalizedPath(targetLocale: SupportedLocale, basePath: string): string {
  // localePrefix: 'as-needed' — default locale stays unprefixed.
  if (targetLocale === routing.defaultLocale) {
    return basePath === '' ? '/' : basePath;
  }
  const base = basePath === '/' ? '' : basePath;
  return `/${targetLocale}${base}`;
}

/**
 * Enforce the user's EXPLICIT stored language preference on the client.
 *
 * When the user has chosen a language via the switcher and lands on a URL in a
 * different locale, redirect to honor that choice. When there is no stored
 * choice (or the URL already matches it), do nothing — the server-resolved
 * locale stands. This is intentionally NOT a browser-language auto-redirector;
 * that job belongs to the next-intl middleware, and conflating the two caused
 * the `/sv` → `/en` bounce.
 */
export function useLocaleSync(): void {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const preferred = readStoredPreference();

    if (!preferred || preferred === currentLocale) return;

    const base = stripLeadingLocale(pathname);
    router.replace(buildLocalizedPath(preferred, base));
  }, [currentLocale, pathname, router]);
}
