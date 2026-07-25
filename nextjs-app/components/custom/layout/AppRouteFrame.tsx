import type { ReactNode } from 'react';
import { AppRouteOnboardingGate } from '@/components/custom/onboarding/OnboardingGate';
import { ResponsiveLayout } from './ResponsiveLayout';

/**
 * Production route frame for localized app pages.
 *
 * `ResponsiveLayout` owns the `[data-app-shell]` subtree. The onboarding gate is
 * a stable sibling inside the same provider tree, so shell inerting cannot make
 * the onboarding dialog non-interactive.
 */
export function AppRouteFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <ResponsiveLayout>{children}</ResponsiveLayout>
      <AppRouteOnboardingGate />
    </>
  );
}
