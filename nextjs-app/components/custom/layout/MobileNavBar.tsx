'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Heart, Navigation, type LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';

type TabKey = 'naraMig' | 'favoriter';

type TabDefinition = {
  key: TabKey;
  href: string;
  icon: LucideIcon;
};

const TABS: readonly TabDefinition[] = [
  { key: 'naraMig', href: '/', icon: Navigation },
  { key: 'favoriter', href: '/favoriter', icon: Heart },
];

/**
 * Mobile bottom navigation (viewport < 1024 px). The tab row keeps the
 * `--size-mobile-nav-h` token height (52 px), matching the current MVP visual
 * reference while keeping each tab's hit area above the WCAG 2.1 AA
 * 44×44 px minimum.
 *
 * Story 7.3 Task 8.1: the bar also reserves `env(safe-area-inset-bottom)` of
 * padding (and grows by the same amount) so on iPhone home-indicator devices
 * running as an installed PWA the tappable tabs sit fully above the home
 * indicator instead of partly underneath it. On viewports without a bottom
 * inset (and in the visual-gate capture, which does not simulate insets) the
 * inset resolves to 0, so the bar stays exactly 52 px and the reference is
 * unchanged.
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
      className="fixed bottom-0 inset-x-0 h-[calc(var(--size-mobile-nav-h)+env(safe-area-inset-bottom))] bg-surface-cream border-t border-[var(--color-border-nav)] shadow-nav-up z-40 lg:hidden flex items-center justify-around px-8 pt-1 pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map(({ key, href, icon: Icon }) => {
        const isActive = href === '/'
          ? normalizedPath === '/'
          : normalizedPath === href || normalizedPath.startsWith(`${href}/`);
        return (
          <Link
            key={key}
            href={href}
            data-testid={`mobile-nav-tab-${key}`}
            data-tour-anchor={key === 'favoriter' ? 'favourites' : undefined}
            data-active={isActive ? 'true' : 'false'}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'flex-1 flex flex-col items-center justify-center min-h-11 py-2 gap-1',
              'transition-colors duration-fast ease-default motion-reduce:transition-none',
              'focus:outline-none focus:ring-2 focus:ring-amber-primary focus:rounded-sm',
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
