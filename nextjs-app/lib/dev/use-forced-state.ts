'use client';

import { useSearchParams } from 'next/navigation';

/**
 * Dev-only escape hatch for driving a component into a specific UI state
 * by URL. Returns the raw value of `?_state=<id>` in development, or `null`
 * if the parameter is absent.
 *
 * In production builds (`NODE_ENV === 'production'`) this hook returns `null`
 * unconditionally — the `useSearchParams` call below is dead-code-eliminated.
 *
 * See `docs/dev/state-forcing.md` for the convention and valid screen IDs.
 */
export function useForcedState(): string | null {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  // The rules-of-hooks violation is intentional: `process.env.NODE_ENV` is a
  // build-time constant, so the early-return branch is statically determined
  // per build. Next.js bundler DCE strips the useSearchParams call entirely
  // from production bundles — the zero-production-footprint contract this
  // hook exists to uphold (see docs/dev/state-forcing.md).
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSearchParams().get('_state');
}
