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
  clampPlannerMinutes,
  formatPlannerTime,
  formatTimeInStockholm,
  generatePlannerTicks,
  isPlannerDateSelectable,
  isTodayInStockholm,
  parsePlannerTime,
  PLANNER_END_MINUTES,
  PLANNER_START_MINUTES,
  PLANNER_STEP_MINUTES,
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
  /**
   * Story 11.2 (AC4): the effective slider minimum. On `today` this is the
   * current wall-clock Stockholm time snapped up to the planner step (clamped to
   * the planner range); for a future date it is the planner start (full range).
   * The value advances as the live clock ticks. Derived — never `new Date()` in a
   * consumer's render.
   */
  minMinutes: number;
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
  const [hasResolvedInitialClock, setHasResolvedInitialClock] = useState(false);

  useEffect(() => {
    if (forcedTime) {
      const forcedState = stateFromForcedPlanner(clock(), forcedDate, forcedTime);
      if (forcedState) {
        setState(forcedState);
        setHasResolvedInitialClock(true);
        return;
      }
    }
    setState((previous) => (
      isSameTimeState(previous, initialState) ? stateFromNow(clock()) : previous
    ));
    setHasResolvedInitialClock(true);
  }, [clock, forcedDate, forcedTime, initialState]);

  useEffect(() => {
    if (forcedTime) return;
    const intervalId = window.setInterval(() => {
      setState((previous) => {
        const currentTime = clock();
        if (!isPlannerDateSelectable(previous.selectedDate, currentTime)) {
          return stateFromNow(currentTime);
        }
        const wasLiveNow = isStateLiveNow(previous);
        if (wasLiveNow) {
          return stateFromNow(currentTime);
        }
        // Story 11.2 (AC4): on `today`, the effective slider minimum = the
        // snapped current wall-clock time and ADVANCES as the clock ticks. If an
        // explicit (non-live) selection now falls below the advanced minimum,
        // push it up to the min so earlier positions stay unreachable. On a
        // future date the full range holds (min = planner start), so the clamp
        // is a no-op. The tick advances `currentTime`/the min — NEVER the date —
        // so the date-only query key (Story 11.1) does not thrash.
        const onToday = previous.selectedDate === stockholmDateKey(currentTime);
        if (onToday) {
          const min = todayMinMinutes(currentTime);
          if (previous.selectedMinutes < min) {
            return {
              ...previous,
              currentTime,
              selectedMinutes: min,
              selectedTime: formatPlannerTime(min),
            };
          }
        }
        return { ...previous, currentTime };
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
    setState((previous) => {
      // Story 11.2 (AC4): "earlier positions are unreachable … enforced in state
      // too". The component clamps the UI, but the state layer is the invariant —
      // a direct `setSelectedMinutes(below-min)` on live-today floors to the
      // effective min. Forced sessions / future dates leave the floor at the
      // planner start (a no-op), so a forced time still commits verbatim and the
      // live "now" moment (which sits at/above the floored min) stays reachable.
      const selectedMinutes = clampBelowStateMin(snapPlannerMinutes(minutes), previous, forcedTime);
      return {
        ...previous,
        selectedTime: formatPlannerTime(selectedMinutes),
        selectedMinutes,
      };
    });
  }, [forcedTime]);

  const snapSelectedMinutes = useCallback((minutes?: number) => {
    setState((previous) => {
      const selectedMinutes = clampBelowStateMin(
        snapPlannerMinutes(minutes ?? previous.selectedMinutes),
        previous,
        forcedTime,
      );
      return {
        ...previous,
        selectedTime: formatPlannerTime(selectedMinutes),
        selectedMinutes,
      };
    });
  }, [forcedTime]);

  const selectDate = useCallback((date: string): boolean => {
    const now = clock();
    if (!isPlannerDateSelectable(date, now)) return false;
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
      if (!isPlannerDateSelectable(shifted, now)) return previous;
      if (isTodayInStockholm(shifted, now)) return stateFromNow(now);
      return { ...previous, selectedDate: shifted };
    });
  }, [clock]);

  const value = useMemo<TimeContextValue>(
    () => {
      const liveTime = formatTimeInStockholm(state.currentTime);
      const livePlannerTime = formatLivePlannerTime(state.currentTime);
      const liveMinutes = parsePlannerTime(liveTime);
      const isLiveWithinPlannerHours =
        liveMinutes !== null &&
        liveMinutes >= PLANNER_START_MINUTES &&
        liveMinutes <= PLANNER_END_MINUTES;
      const today = stockholmDateKey(state.currentTime);
      const mode = state.selectedDate === today ? 'today' : 'future';
      const isPlannerDateValid = isPlannerDateSelectable(state.selectedDate, state.currentTime);
      const isLiveNow =
        mode === 'today' &&
        isLiveWithinPlannerHours &&
        state.selectedTime === livePlannerTime;
      // Story 11.2 (AC4): the today-minimum tracks the LIVE wall clock. A forced
      // planner session (`?_time=`/`?_date=`) pins a deterministic moment and
      // disables the live clock (the tick effect early-returns), so the "can't
      // pick earlier than now" affordance does not apply — the full range stays
      // reachable so a forced time (e.g. `?_time=13:00`) renders verbatim
      // regardless of the machine wall clock. Live sessions on `today` clamp.
      const minMinutes = mode === 'today' && !forcedTime
        ? todayMinMinutes(state.currentTime)
        : PLANNER_START_MINUTES;
      // Dev/preview `?_time=` routes render from a stable server seed before the
      // client clock resolves. Suppress that seed's query so data hooks do not
      // briefly fetch a stale planner date from the hydration-safe ISO.
      const suppressForcedSeedPlannerQuery = Boolean(forcedTime && !hasResolvedInitialClock);
      return {
        currentTime: state.currentTime,
        selectedDate: state.selectedDate,
        selectedTime: state.selectedTime,
        selectedMinutes: state.selectedMinutes,
        mode,
        isLiveNow,
        minMinutes,
        plannerQuery: suppressForcedSeedPlannerQuery || isLiveNow || !isPlannerDateValid
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
      forcedTime,
      hasResolvedInitialClock,
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
  const selectedTime = formatLivePlannerTime(currentTime);
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
  // Story 11.2 (AC3): a forced/URL date outside the today->today+3 window must
  // NOT render an out-of-range planner — clamp back to today (the nearest
  // in-window date), mirroring the live-clock tick's `!isPlannerDateSelectable ->
  // stateFromNow` reset. Only an in-window forced date is preserved.
  const selectedDate = forcedDate && isPlannerDateSelectable(forcedDate, currentTime)
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
    state.selectedTime === formatLivePlannerTime(state.currentTime);
}

function formatLivePlannerTime(currentTime: Date): string {
  const liveMinutes = parsePlannerTime(formatTimeInStockholm(currentTime)) ?? 12 * 60;
  return formatPlannerTime(liveMinutes);
}

/**
 * Story 11.2 (AC4): the effective slider minimum on `today` = the current
 * wall-clock Stockholm time snapped to the step at or just below now (floor),
 * clamped into the planner range. Floor — not ceiling/nearest — so the live
 * "now" moment itself is always REACHABLE (it sits between the min step and the
 * next), which keeps `isLiveNow` intact (the live selection is never pushed below
 * the min, so the query key never thrashes) while still making every EARLIER
 * step unreachable. The min advances one step at each step boundary as the clock
 * ticks. Derived purely from `currentTime` (hydration-safe) — no `new Date()` in
 * a consumer's render.
 */
function todayMinMinutes(currentTime: Date): number {
  const liveMinutes = parsePlannerTime(formatTimeInStockholm(currentTime));
  if (liveMinutes === null) return PLANNER_START_MINUTES;
  const floored = Math.floor(liveMinutes / PLANNER_STEP_MINUTES) * PLANNER_STEP_MINUTES;
  return clampPlannerMinutes(floored);
}

/**
 * Story 11.2 (AC4): the state-layer floor. The effective slider minimum lives in
 * the derived `minMinutes` (used by the component to clamp the UI), but AC4 says
 * earlier positions must be "unreachable … enforced in state too" — so a direct
 * `setSelectedMinutes`/`snapSelectedMinutes` below the today-min is floored HERE,
 * making it a real state invariant rather than a component-only guard. The min is
 * the live today-min ONLY on `today` in a non-forced (live-clock) session — a
 * forced `?_time=` session or a future date keeps the floor at the planner start
 * (a no-op), so a forced time still commits verbatim and the reachable "now"
 * moment (which sits at/above the floored min) is never pushed off.
 */
function stateEffectiveMin(state: TimeState, forcedTime: string | undefined): number {
  if (forcedTime) return PLANNER_START_MINUTES;
  const onToday = state.selectedDate === stockholmDateKey(state.currentTime);
  return onToday ? todayMinMinutes(state.currentTime) : PLANNER_START_MINUTES;
}

function clampBelowStateMin(
  minutes: number,
  state: TimeState,
  forcedTime: string | undefined,
): number {
  return Math.max(minutes, stateEffectiveMin(state, forcedTime));
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
