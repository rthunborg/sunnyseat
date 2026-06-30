'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type SettingsModalView = 'settings' | 'feedback' | null;

export type SettingsContextValue = {
  activeView: SettingsModalView;
  openSettings: () => void;
  openFeedback: () => void;
  close: () => void;
};

const noop = () => {};

/**
 * Default value is a no-op (not a throw) so trigger components — the desktop
 * nav settings button, the mobile map settings button — keep working in unit
 * tests that render them without the provider. The real provider is mounted in
 * AppContextProviders.
 */
const SettingsContext = createContext<SettingsContextValue>({
  activeView: null,
  openSettings: noop,
  openFeedback: noop,
  close: noop,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveView] = useState<SettingsModalView>(null);

  const openSettings = useCallback(() => setActiveView('settings'), []);
  const openFeedback = useCallback(() => setActiveView('feedback'), []);
  const close = useCallback(() => setActiveView(null), []);

  const value = useMemo<SettingsContextValue>(
    () => ({ activeView, openSettings, openFeedback, close }),
    [activeView, openSettings, openFeedback, close],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
