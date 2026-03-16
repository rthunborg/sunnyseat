'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { usePremium, type UsePremiumReturn } from '@/lib/hooks/usePremium';

const PremiumContext = createContext<UsePremiumReturn | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const premium = usePremium();
  return <PremiumContext.Provider value={premium}>{children}</PremiumContext.Provider>;
}

export function usePremiumContext(): UsePremiumReturn {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error('usePremiumContext must be used within a PremiumProvider');
  }
  return ctx;
}
