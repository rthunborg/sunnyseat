'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { CoachTourStepId } from '@/lib/constants/coach-tour';
import { FIRST_RUN_GUIDE_SEEN_KEY } from '@/lib/constants/onboarding';

const FIRST_RUN_GUIDE_STORAGE_EVENT = 'sunnyseat:first-run-guide-seen-change';
const isDev = process.env.NODE_ENV !== 'production';

export type FirstRunGuideSource = 'auto' | 'settings' | 'forced';

export type FirstRunGuideStartOptions = {
  source?: FirstRunGuideSource;
  initialStepId?: CoachTourStepId;
  persistOnDismiss?: boolean;
  restoreFocusElement?: HTMLElement | null;
};

export type FirstRunGuideLaunch = {
  id: number;
  source: FirstRunGuideSource;
  initialStepId: CoachTourStepId;
  persistOnDismiss: boolean;
  restoreFocusElement: HTMLElement | null;
};

type FirstRunGuideContextValue = {
  launch: FirstRunGuideLaunch | null;
  startGuide: (options?: FirstRunGuideStartOptions) => void;
  endGuide: () => void;
  hasSeenGuide: boolean;
  markGuideSeen: () => void;
};

const FirstRunGuideContext = createContext<FirstRunGuideContextValue>({
  launch: null,
  startGuide: () => {},
  endGuide: () => {},
  hasSeenGuide: false,
  markGuideSeen: () => {},
});

export function readFirstRunGuideSeen(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(FIRST_RUN_GUIDE_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeFirstRunGuideSeen(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(FIRST_RUN_GUIDE_SEEN_KEY, '1');
    window.dispatchEvent(new Event(FIRST_RUN_GUIDE_STORAGE_EVENT));
  } catch (error) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn('[FirstRunGuide] failed to write seen flag:', error);
    }
  }
}

export function subscribeToFirstRunGuideSeen(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== FIRST_RUN_GUIDE_SEEN_KEY) return;
    onStoreChange();
  };
  const onSameTab = () => onStoreChange();
  window.addEventListener('storage', onStorage);
  window.addEventListener(FIRST_RUN_GUIDE_STORAGE_EVENT, onSameTab);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(FIRST_RUN_GUIDE_STORAGE_EVENT, onSameTab);
  };
}

export function getServerFirstRunGuideSeenSnapshot(): boolean {
  return false;
}

export function useFirstRunGuideSeen(): boolean {
  return useSyncExternalStore(
    subscribeToFirstRunGuideSeen,
    readFirstRunGuideSeen,
    getServerFirstRunGuideSeenSnapshot,
  );
}

export function FirstRunGuideProvider({ children }: { children: ReactNode }) {
  const [launch, setLaunch] = useState<FirstRunGuideLaunch | null>(null);
  const hasSeenGuide = useFirstRunGuideSeen();

  const startGuide = useCallback((options: FirstRunGuideStartOptions = {}) => {
    setLaunch((previous) => ({
      id: (previous?.id ?? 0) + 1,
      source: options.source ?? 'settings',
      initialStepId: options.initialStepId ?? 'pin-legend',
      persistOnDismiss: options.persistOnDismiss ?? false,
      restoreFocusElement: options.restoreFocusElement ?? null,
    }));
  }, []);

  const endGuide = useCallback(() => {
    setLaunch(null);
  }, []);

  const value = useMemo<FirstRunGuideContextValue>(
    () => ({
      launch,
      startGuide,
      endGuide,
      hasSeenGuide,
      markGuideSeen: writeFirstRunGuideSeen,
    }),
    [endGuide, hasSeenGuide, launch, startGuide],
  );

  return (
    <FirstRunGuideContext.Provider value={value}>
      {children}
    </FirstRunGuideContext.Provider>
  );
}

export function useFirstRunGuide(): FirstRunGuideContextValue {
  return useContext(FirstRunGuideContext);
}

