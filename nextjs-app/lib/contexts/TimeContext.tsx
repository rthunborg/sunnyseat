'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type TimeContextValue = {
  currentTime: Date;
  setCurrentTime: (t: Date) => void;
};

const TimeContext = createContext<TimeContextValue | null>(null);

/**
 * Story 1.3 stub — full population in Story 2.5 (time slider).
 * Holds a `currentTime` Date so downstream UI can derive the active
 * moment for sun/shadow predictions and time-slider controls.
 */
export function TimeProvider({ children }: { children: ReactNode }) {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  const value = useMemo<TimeContextValue>(
    () => ({ currentTime, setCurrentTime }),
    [currentTime],
  );

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
}

export function useTimeContext(): TimeContextValue {
  const ctx = useContext(TimeContext);
  if (!ctx) {
    throw new Error('useTimeContext must be used within <TimeProvider>');
  }
  return ctx;
}
