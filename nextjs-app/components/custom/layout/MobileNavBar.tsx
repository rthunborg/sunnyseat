'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Heart, Info, MapPin, type LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';

type TabKey = 'karta' | 'favoriter' | 'om';

type TabDefinition = {
  key: TabKey;
  href: string;
  icon: LucideIcon;
};

const TABS: readonly TabDefinition[] = [
  { key: 'karta', href: '/', icon: MapPin },
  { key: 'favoriter', href: '/favoriter', icon: Heart },
  { key: 'om', href: '/about', icon: Info },
];

/**
 * Mobile bottom navigation (viewport < 1024 px). Visible height is the
 * `--size-mobile-nav-h` token (40 px), but each tab's hit area expands
 * to the WCAG 2.1 AA 44×44 px minimum via `min-h-11` + `py-2`,
 * overflowing the visible strip.
 *
 * Visibility is controlled by the `lg:hidden` Tailwind utility so the
 * correct navbar renders from the first SSR paint without a hydration
 * flash — see the story Dev Notes §"Critical constraints" #1.
 *
 * The border-color token is referenced via the Tailwind v4 custom-property
 * shortcut instead of the arbitrary-value syntax with a var() call — the
 * Oxide scanner mis-parses certain patterns inside brackets and emits
 * invalid CSS at build time.
 */
export function MobileNavBar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('common');

  // Strip the `/sv` or `/en` prefix that next-intl middleware adds when the
  // active locale isn't the default. `/en/favoriter` → `/favoriter`, `/en` → `/`.
  // Tab hrefs are locale-less so the comparison must ignore the prefix.
  const localeStripper = new RegExp(`^/${locale}(?=/|$)`);
  const normalizedPath = pathname.replace(localeStripper, '') || '/';

  return (
    <nav
      aria-label={t('nav.barLabel')}
      data-testid="mobile-nav-bar"
      className="fixed bottom-0 inset-x-0 h-[var(--size-mobile-nav-h)] bg-surface-cream border-t border-[var(--color-border-nav)] shadow-nav-up z-40 lg:hidden flex items-center justify-around px-12 pt-1"
    >
      {TABS.map(({ key, href, icon: Icon }) => {
        const isActive = normalizedPath === href;
        return (
          <Link
            key={key}
            href={href}
            data-testid={`mobile-nav-tab-${key}`}
            data-active={isActive ? 'true' : 'false'}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'flex-1 flex flex-col items-center justify-center min-h-11 py-2 gap-1',
              'transition-colors duration-fast ease-default motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-primary focus-visible:rounded-sm',
              isActive ? 'text-tab-active' : 'text-tab-inactive',
            ].join(' ')}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="text-label-sm">{t(`nav.${key}`)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
