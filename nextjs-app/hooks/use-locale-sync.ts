'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const STORAGE_KEY = 'sunnyseat:locale';

type SupportedLocale = (typeof routing.locales)[number];

function isSupportedLocale(candidate: string | undefined | null): candidate is SupportedLocale {
  return !!candidate && (routing.locales as readonly string[]).includes(candidate);
}

/**
 * Resolve the user's preferred locale per AC4 of Story 1.1:
 *   URL param → sessionStorage → navigator.language → default SV
 *
 * The URL-param step is handled by next-intl's proxy/middleware before this
 * hook ever runs. This hook implements the remaining steps: if the URL's
 * active locale differs from the user's stored or browser-stated preference,
 * rewrite the URL to match and persist the chosen locale to sessionStorage.
 */
function readStoredPreference(): SupportedLocale | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    // sessionStorage may be disabled (private mode, sandboxed iframe) — ignore.
  }

  const navTag = window.navigator.language?.split('-')[0]?.toLowerCase();
  if (isSupportedLocale(navTag)) return navTag;

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

export function useLocaleSync(): void {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const preferred = readStoredPreference() ?? routing.defaultLocale;

    // If the URL already matches the user's preference, persist the effective
    // locale so future visits remain stable and return.
    if (preferred === currentLocale) {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, currentLocale);
      } catch {
        // ignore storage write failures
      }
      return;
    }

    try {
      window.sessionStorage.setItem(STORAGE_KEY, preferred);
    } catch {
      // ignore
    }

    const base = stripLeadingLocale(pathname);
    const nextPath = buildLocalizedPath(preferred, base);
    router.replace(nextPath);
  }, [currentLocale, pathname, router]);
}
