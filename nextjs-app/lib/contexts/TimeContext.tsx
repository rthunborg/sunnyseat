'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  formatPlannerTime,
  formatTimeInStockholm,
  generatePlannerTicks,
  isDateInCurrentSunSeason,
  isTodayInStockholm,
  isValidDateKey,
  parsePlannerTime,
  snapPlannerMinutes,
  stockholmDateKey,
  type PlannerTick,
} from '@/lib/utils/time-planner';

type TimeContextValue = {
  currentTime: Date;
  selectedDate: string;
  selectedTime: string;
  selectedMinutes: number;
  mode: 'today' | 'future';
  isLiveNow: boolean;
  plannerQuery: { date: string; time: string } | undefined;
  ticks: PlannerTick[];
  setCurrentTime: (t: Date) => void;
  setSelectedTime: (time: string) => void;
  setSelectedMinutes: (minutes: number) => void;
  snapSelectedMinutes: (minutes?: number) => void;
  selectDate: (date: string) => boolean;
  shiftSelectedDate: (days: number) => void;
  resetToNow: () => void;
};

const TimeContext = createContext<TimeContextValue | null>(null);
const HYDRATION_SAFE_NOW_ISO = '2026-05-20T10:00:00.000Z';
const LIVE_CLOCK_TICK_MS = 60 * 1000;
const DEFAULT_CLOCK = () => new Date();

type TimeState = {
  currentTime: Date;
  selectedDate: string;
  selectedTime: string;
  selectedMinutes: number;
};

type TimeProviderProps = {
  children: ReactNode;
  initialNowIso?: string;
  clock?: () => Date;
  forcedDate?: string;
  forcedTime?: string;
};

/**
 * Holds the active planner moment. The initial value comes from a stable ISO
 * seed so server and client render the same first markup; callers can then
 * reset to the client clock after hydration without exposing `new Date()` in
 * the render initializer.
 */
export function TimeProvider({
  children,
  initialNowIso = HYDRATION_SAFE_NOW_ISO,
  clock = DEFAULT_CLOCK,
  forcedDate,
  forcedTime,
}: TimeProviderProps) {
  const forcedInitialState = useMemo(
    () => stateFromForcedPlanner(parseInitialNow(initialNowIso), forcedDate, forcedTime),
    [forcedDate, forcedTime, initialNowIso],
  );
  const initialState = useMemo(
    () => forcedInitialState ?? stateFromNow(parseInitialNow(initialNowIso)),
    [forcedInitialState, initialNowIso],
  );
  const [state, setState] = useState<TimeState>(initialState);

  useEffect(() => {
    if (forcedTime) {
      const forcedState = stateFromForcedPlanner(clock(), forcedDate, forcedTime);
      if (forcedState) {
        setState(forcedState);
        return;
      }
    }
    setState((previous) => (
      isSameTimeState(previous, initialState) ? stateFromNow(clock()) : previous
    ));
  }, [clock, forcedDate, forcedTime, initialState]);

  useEffect(() => {
    if (forcedTime) return;
    const intervalId = window.setInterval(() => {
      setState((previous) => {
        const currentTime = clock();
        const wasLiveNow = isStateLiveNow(previous);
        return wasLiveNow
          ? stateFromNow(currentTime)
          : { ...previous, currentTime };
      });
    }, LIVE_CLOCK_TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [clock, forcedTime]);

  const setCurrentTime = useCallback((currentTime: Date) => {
    setState((previous) => ({
      ...previous,
      currentTime,
    }));
  }, []);

  const resetToNow = useCallback(() => {
    setState(stateFromNow(clock()));
  }, [clock]);

  const setSelectedTime = useCallback((time: string) => {
    const parsed = parsePlannerTime(time);
    if (parsed === null) return;
    const selectedMinutes = snapPlannerMinutes(parsed);
    setState((previous) => ({
      ...previous,
      selectedTime: formatPlannerTime(selectedMinutes),
      selectedMinutes,
    }));
  }, []);

  const setSelectedMinutes = useCallback((minutes: number) => {
    const selectedMinutes = snapPlannerMinutes(minutes);
    setState((previous) => ({
      ...previous,
      selectedTime: formatPlannerTime(selectedMinutes),
      selectedMinutes,
    }));
  }, []);

  const snapSelectedMinutes = useCallback((minutes?: number) => {
    setState((previous) => {
      const selectedMinutes = snapPlannerMinutes(minutes ?? previous.selectedMinutes);
      return {
        ...previous,
        selectedTime: formatPlannerTime(selectedMinutes),
        selectedMinutes,
      };
    });
  }, []);

  const selectDate = useCallback((date: string): boolean => {
    const now = clock();
    if (!isDateInCurrentSunSeason(date, now)) return false;
    if (isTodayInStockholm(date, now)) {
      setState(stateFromNow(now));
      return true;
    }
    setState((previous) => ({
      ...previous,
      selectedDate: date,
    }));
    return true;
  }, [clock]);

  const shiftSelectedDate = useCallback((days: number) => {
    setState((previous) => {
      const shifted = shiftDateKey(previous.selectedDate, days);
      const now = clock();
      if (!isDateInCurrentSunSeason(shifted, now)) return previous;
      if (isTodayInStockholm(shifted, now)) return stateFromNow(now);
      return { ...previous, selectedDate: shifted };
    });
  }, [clock]);

  const value = useMemo<TimeContextValue>(
    () => {
      const liveTime = formatTimeInStockholm(state.currentTime);
      const today = stockholmDateKey(state.currentTime);
      const mode = state.selectedDate === today ? 'today' : 'future';
      const isLiveNow = mode === 'today' && state.selectedTime === liveTime;
      return {
        currentTime: state.currentTime,
        selectedDate: state.selectedDate,
        selectedTime: state.selectedTime,
        selectedMinutes: state.selectedMinutes,
        mode,
        isLiveNow,
        plannerQuery: isLiveNow
          ? undefined
          : { date: state.selectedDate, time: state.selectedTime },
        ticks: generatePlannerTicks(),
        setCurrentTime,
        setSelectedTime,
        setSelectedMinutes,
        snapSelectedMinutes,
        selectDate,
        shiftSelectedDate,
        resetToNow,
      };
    },
    [
      resetToNow,
      selectDate,
      setCurrentTime,
      setSelectedMinutes,
      setSelectedTime,
      shiftSelectedDate,
      snapSelectedMinutes,
      state,
    ],
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

function stateFromNow(currentTime: Date): TimeState {
  const selectedTime = formatTimeInStockholm(currentTime);
  const selectedMinutes = parsePlannerTime(selectedTime) ?? 12 * 60;
  return {
    currentTime,
    selectedDate: stockholmDateKey(currentTime),
    selectedTime,
    selectedMinutes,
  };
}

function stateFromForcedPlanner(
  currentTime: Date,
  forcedDate: string | undefined,
  forcedTime: string | undefined,
): TimeState | null {
  if (!forcedTime) return null;
  const parsed = parsePlannerTime(forcedTime);
  if (parsed === null) return null;
  const selectedMinutes = snapPlannerMinutes(parsed);
  const selectedDate = forcedDate && isValidDateKey(forcedDate)
    ? forcedDate
    : stockholmDateKey(currentTime);
  return {
    currentTime,
    selectedDate,
    selectedTime: formatPlannerTime(selectedMinutes),
    selectedMinutes,
  };
}

function isSameTimeState(a: TimeState, b: TimeState): boolean {
  return a.currentTime.getTime() === b.currentTime.getTime() &&
    a.selectedDate === b.selectedDate &&
    a.selectedTime === b.selectedTime &&
    a.selectedMinutes === b.selectedMinutes;
}

function isStateLiveNow(state: TimeState): boolean {
  return state.selectedDate === stockholmDateKey(state.currentTime) &&
    state.selectedTime === formatTimeInStockholm(state.currentTime);
}

function parseInitialNow(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(HYDRATION_SAFE_NOW_ISO) : parsed;
}

function shiftDateKey(date: string, days: number): string {
  const [yearRaw = '', monthRaw = '', dayRaw = ''] = date.split('-');
  const shifted = new Date(Date.UTC(Number(yearRaw), Number(monthRaw) - 1, Number(dayRaw)));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}
