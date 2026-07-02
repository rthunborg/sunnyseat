'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { LOCALE_PREFERENCE_STORAGE_KEY } from '@/hooks/use-locale-sync';
import { cn } from '@/lib/utils';

type SupportedLocale = (typeof routing.locales)[number];

/**
 * Desktop language switcher (SV / EN flag toggle) for the top nav.
 *
 * Switching navigates the same page in the target locale via next-intl's
 * locale-aware router, which sets the `NEXT_LOCALE` cookie so the choice
 * persists across sessions server-side. It also records the choice in
 * sessionStorage under {@link LOCALE_PREFERENCE_STORAGE_KEY} so `useLocaleSync`
 * keeps the active URL aligned within the session.
 *
 * Flag glyphs use official national flag colours. Flags are brand/content
 * assets (like the wordmark), not part of the DESIGN.md token palette, so their
 * hex values are intentionally literal here.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('common.nav');

  const switchTo = (next: SupportedLocale) => {
    if (next === locale) return;
    try {
      window.sessionStorage.setItem(LOCALE_PREFERENCE_STORAGE_KEY, next);
    } catch {
      // sessionStorage unavailable (private mode) — the cookie still persists.
    }
    const search =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const query = Object.fromEntries(search.entries());
    router.replace({ pathname, query }, { locale: next });
  };

  return (
    <div
      role="group"
      aria-label={t('language')}
      data-testid="language-switcher"
      className="flex items-center gap-0.5 rounded-pill border border-divider bg-white p-0.5 shadow-subtle"
    >
      {routing.locales.map((loc) => {
        const active = loc === locale;
        const Flag = loc === 'sv' ? SwedenFlag : UnionJackFlag;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => switchTo(loc as SupportedLocale)}
            aria-pressed={active}
            aria-label={t(loc === 'sv' ? 'switchToSwedish' : 'switchToEnglish')}
            data-testid={`language-switch-${loc}`}
            className={cn(
              'flex items-center gap-1.5 rounded-pill px-2 py-1 text-label-sm font-semibold uppercase outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-amber-primary',
              // Inactive state uses text-body, not text-muted: muted is 60%
              // alpha (≈3.18:1 on this white pill) and fails the axe WCAG AA
              // color-contrast gate at this 11px label size.
              active ? 'bg-surface-cream text-amber-dark' : 'text-text-body hover:text-text-primary',
            )}
          >
            <span className="block overflow-hidden rounded-[2px] leading-none ring-1 ring-black/5">
              <Flag />
            </span>
            {loc}
          </button>
        );
      })}
    </div>
  );
}

function SwedenFlag() {
  return (
    <svg viewBox="0 0 16 11" width={18} height={12} aria-hidden="true" className="block">
      <rect width="16" height="11" fill="#006AA7" />
      <rect x="5" width="2" height="11" fill="#FECC00" />
      <rect y="4.5" width="16" height="2" fill="#FECC00" />
    </svg>
  );
}

function UnionJackFlag() {
  return (
    <svg viewBox="0 0 16 11" width={18} height={12} aria-hidden="true" className="block">
      <rect width="16" height="11" fill="#012169" />
      <path d="M0,0 L16,11 M16,0 L0,11" stroke="#ffffff" strokeWidth="2.2" />
      <path d="M0,0 L16,11 M16,0 L0,11" stroke="#C8102E" strokeWidth="1" />
      <path d="M8,0 V11 M0,5.5 H16" stroke="#ffffff" strokeWidth="3.2" />
      <path d="M8,0 V11 M0,5.5 H16" stroke="#C8102E" strokeWidth="1.8" />
    </svg>
  );
}
