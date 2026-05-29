import type { ReactNode } from 'react';
import { MobileNavBar } from './MobileNavBar';
import { DesktopNavBar } from './DesktopNavBar';

/**
 * Outer layout shell. Renders both navbars on every pass — Tailwind
 * responsive utilities (`hidden lg:flex` on desktop, `lg:hidden` on
 * mobile) select the right one based on viewport, with no hydration
 * flash. Current routes are full-bleed map surfaces that own their
 * bottom-nav avoidance internally, so the shell only reserves desktop
 * header space.
 *
 * Intentionally a Server Component — no hooks, no event handlers.
 * The navbars themselves are `'use client'` islands.
 */
export function ResponsiveLayout({ children }: { children: ReactNode }) {
  return (
    <div data-app-shell data-testid="responsive-layout">
      <DesktopNavBar />
      <main className="pt-0 lg:pt-[var(--size-desktop-nav-h)]">
        {children}
      </main>
      <MobileNavBar />
    </div>
  );
}
