'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type PremiumContextValue = {
  isPremium: boolean;
  setIsPremium: (v: boolean) => void;
};

const PremiumContext = createContext<PremiumContextValue | null>(null);

/**
 * Story 1.3 stub — full population in Story 4.4 (premium activation).
 * Holds the current `isPremium` flag. Downstream gating components should
 * read through `usePremiumStatus()` so Story 4.4 can swap in the real
 * JWT-backed implementation without touching callers.
 */
export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState<boolean>(false);

  const value = useMemo<PremiumContextValue>(
    () => ({ isPremium, setIsPremium }),
    [isPremium],
  );

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
}

export function usePremiumStatus(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error('usePremiumStatus must be used within <PremiumProvider>');
  }
  return ctx;
}
