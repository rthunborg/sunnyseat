'use client';

import { useEffect, useState } from 'react';

export const DESKTOP_BREAKPOINT_MEDIA_QUERY = '(min-width: 1024px)';

/**
 * SSR-safe matchMedia hook.
 *
 * Returns `false` on the server and during the first client render so SSR
 * output is deterministic. Updates to the live `matchMedia.matches` value
 * after `useEffect` runs, and stays in sync via the `change` event.
 *
 * Use this for JS-conditional behaviour at a breakpoint (e.g., lazy-loading
 * a heavyweight component only on desktop). For plain layout visibility
 * prefer Tailwind's `lg:` responsive utilities to avoid the SSR / first-paint
 * flash.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
