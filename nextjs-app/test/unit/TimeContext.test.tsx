import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { TimeProvider, useTimeContext } from '@/lib/contexts/TimeContext';

const NOW_ISO = '2026-05-20T10:15:00.000Z';
const NOW = new Date(NOW_ISO);

function makeWrapper(clock = () => NOW) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TimeProvider initialNowIso={NOW_ISO} clock={clock}>
        {children}
      </TimeProvider>
    );
  };
}

describe('TimeContext', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders from a deterministic initial ISO seed for SSR/CSR safety', () => {
    function Probe() {
      const time = useTimeContext();
      return <span>{`${time.selectedDate} ${time.selectedTime}`}</span>;
    }

    expect(
      renderToString(
        <TimeProvider initialNowIso={NOW_ISO} clock={() => NOW}>
          <Probe />
        </TimeProvider>,
      ),
    ).toContain('2026-05-20 12:15');
  });

  it('hydrates from the deterministic seed to the provided client clock after mount', () => {
    const { result } = renderHook(() => useTimeContext(), {
      wrapper: function Wrapper({ children }: { children: ReactNode }) {
        return (
          <TimeProvider initialNowIso="2026-05-20T06:00:00.000Z" clock={() => NOW}>
            {children}
          </TimeProvider>
        );
      },
    });

    expect(result.current.selectedDate).toBe('2026-05-20');
    expect(result.current.selectedTime).toBe('12:15');
    expect(result.current.isLiveNow).toBe(true);
  });

  it('starts in live-today mode and omits planner query params for the live path', () => {
    const { result } = renderHook(() => useTimeContext(), { wrapper: makeWrapper() });

    expect(result.current.mode).toBe('today');
    expect(result.current.selectedDate).toBe('2026-05-20');
    expect(result.current.selectedTime).toBe('12:15');
    expect(result.current.isLiveNow).toBe(true);
    expect(result.current.plannerQuery).toBeUndefined();
  });

  it('keeps live-today selected time aligned with the clock tick', () => {
    vi.useFakeTimers();
    const clock = vi.fn()
      .mockReturnValueOnce(NOW)
      .mockReturnValueOnce(new Date('2026-05-20T10:16:00.000Z'));

    const { result } = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(clock),
    });

    expect(result.current.selectedTime).toBe('12:15');

    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(result.current.selectedTime).toBe('12:16');
    expect(result.current.isLiveNow).toBe(true);
    expect(result.current.plannerQuery).toBeUndefined();
  });

  it('does not overwrite an explicit today planner time on the clock tick', () => {
    vi.useFakeTimers();
    const clock = vi.fn()
      .mockReturnValueOnce(NOW)
      .mockReturnValueOnce(new Date('2026-05-20T10:16:00.000Z'));

    const { result } = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(clock),
    });

    act(() => result.current.setSelectedTime('14:00'));
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(result.current.selectedTime).toBe('14:00');
    expect(result.current.isLiveNow).toBe(false);
    expect(result.current.plannerQuery).toEqual({ date: '2026-05-20', time: '14:00' });
  });

  it('scrubbing today produces explicit date/time query params until reset-to-now', () => {
    const { result } = renderHook(() => useTimeContext(), { wrapper: makeWrapper() });

    act(() => result.current.setSelectedTime('14:00'));
    expect(result.current.mode).toBe('today');
    expect(result.current.isLiveNow).toBe(false);
    expect(result.current.plannerQuery).toEqual({ date: '2026-05-20', time: '14:00' });

    act(() => result.current.resetToNow());
    expect(result.current.selectedTime).toBe('12:15');
    expect(result.current.isLiveNow).toBe(true);
    expect(result.current.plannerQuery).toBeUndefined();
  });

  it('supports dev-forced planner time for deterministic visual references', () => {
    const { result } = renderHook(() => useTimeContext(), {
      wrapper: function Wrapper({ children }: { children: ReactNode }) {
        return (
          <TimeProvider
            initialNowIso="2026-05-20T06:00:00.000Z"
            clock={() => NOW}
            forcedTime="14:00"
          >
            {children}
          </TimeProvider>
        );
      },
    });

    expect(result.current.selectedDate).toBe('2026-05-20');
    expect(result.current.selectedTime).toBe('14:00');
    expect(result.current.isLiveNow).toBe(false);
    expect(result.current.plannerQuery).toEqual({ date: '2026-05-20', time: '14:00' });
  });

  it('clamps live clock values before and after planner hours into explicit planner queries', () => {
    const early = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(() => new Date('2026-05-20T01:30:00.000Z')),
    });
    expect(early.result.current.selectedTime).toBe('06:00');
    expect(early.result.current.selectedMinutes).toBe(6 * 60);
    expect(early.result.current.isLiveNow).toBe(false);
    expect(early.result.current.plannerQuery).toEqual({ date: '2026-05-20', time: '06:00' });
    early.unmount();

    const late = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(() => new Date('2026-05-20T21:45:00.000Z')),
    });
    expect(late.result.current.selectedTime).toBe('21:00');
    expect(late.result.current.selectedMinutes).toBe(21 * 60);
    expect(late.result.current.isLiveNow).toBe(false);
    expect(late.result.current.plannerQuery).toEqual({ date: '2026-05-20', time: '21:00' });
  });

  it('future dates preserve selected time and expose future planner mode', () => {
    const { result } = renderHook(() => useTimeContext(), { wrapper: makeWrapper() });

    // Story 11.2 (AC3): only today->today+3 is selectable; 2026-05-22 is today+2.
    act(() => result.current.setSelectedTime('15:30'));
    act(() => {
      expect(result.current.selectDate('2026-05-22')).toBe(true);
    });

    expect(result.current.mode).toBe('future');
    expect(result.current.selectedDate).toBe('2026-05-22');
    expect(result.current.selectedTime).toBe('15:30');
    expect(result.current.plannerQuery).toEqual({ date: '2026-05-22', time: '15:30' });
  });

  it('resets a future planner date when the live clock rolls past it', () => {
    vi.useFakeTimers();
    let now = NOW;
    const clock = () => now;
    const { result } = renderHook(() => useTimeContext(), { wrapper: makeWrapper(clock) });

    // Story 11.2 (AC3): pick an in-window future date (2026-05-22 = today+2),
    // then roll the clock past it so the tick effect resets to the new today.
    act(() => result.current.setSelectedTime('15:30'));
    act(() => {
      expect(result.current.selectDate('2026-05-22')).toBe(true);
    });
    expect(result.current.plannerQuery).toEqual({ date: '2026-05-22', time: '15:30' });

    now = new Date('2026-05-23T10:16:00.000Z');
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(result.current.selectedDate).toBe('2026-05-23');
    expect(result.current.selectedTime).toBe('12:16');
    expect(result.current.isLiveNow).toBe(true);
    expect(result.current.plannerQuery).toBeUndefined();
  });

  it('does not emit planner query params for current days outside the sun season', () => {
    const { result } = renderHook(() => useTimeContext(), {
      wrapper: makeWrapper(() => new Date('2026-11-15T20:30:00.000Z')),
    });

    expect(result.current.selectedDate).toBe('2026-11-15');
    expect(result.current.selectedTime).toBe('21:00');
    expect(result.current.isLiveNow).toBe(false);
    expect(result.current.plannerQuery).toBeUndefined();
  });

  it('rejects out-of-season dates and selecting today resets to current time', () => {
    const { result } = renderHook(() => useTimeContext(), { wrapper: makeWrapper() });

    act(() => result.current.setSelectedTime('15:30'));
    act(() => {
      expect(result.current.selectDate('2026-11-01')).toBe(false);
    });
    expect(result.current.selectedDate).toBe('2026-05-20');
    expect(result.current.selectedTime).toBe('15:30');

    act(() => {
      expect(result.current.selectDate('2026-05-20')).toBe(true);
    });
    expect(result.current.selectedTime).toBe('12:15');
    expect(result.current.isLiveNow).toBe(true);
  });
});
