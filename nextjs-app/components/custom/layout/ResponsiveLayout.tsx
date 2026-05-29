import type { ReactNode } from 'react';
import { MobileNavBar } from './MobileNavBar';
import { DesktopNavBar } from './DesktopNavBar';

/**
 * Outer layout shell. Renders both navbars on every pass — Tailwind
 * responsive utilities (`hidden lg:flex` on desktop, `lg:hidden` on
 * mobile) select the right one based on viewport, with no hydration
 * flash. The `<main>` reserves padding for each fixed nav so page
 * content never slides underneath.
 *
 * Intentionally a Server Component — no hooks, no event handlers.
 * The navbars themselves are `'use client'` islands.
 */
export function ResponsiveLayout({ children }: { children: ReactNode }) {
  return (
    <div data-app-shell data-testid="responsive-layout">
      <DesktopNavBar />
      <main className="pt-0 lg:pt-[var(--size-desktop-nav-h)] pb-[var(--size-mobile-nav-h)] lg:pb-0">
        {children}
      </main>
      <MobileNavBar />
    </div>
  );
}
