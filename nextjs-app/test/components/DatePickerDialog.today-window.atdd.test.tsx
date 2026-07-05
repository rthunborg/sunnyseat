/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.2 (AC3, render/interaction side)
 * "DatePickerDialog: today+3 pickable, today+4 disabled + unpickable"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The dialog-level acceptance facts for the today→today+3 window: the last in-window
 * day (today+3) renders as a selectable button that fires `onSelectDate`; the first
 * out-of-window day (today+4) renders `disabled` + unpickable with the disabled
 * aria-label; a past date stays disabled. This is the render/interaction complement to
 * the pure-helper unit contract in `time-planner.today-window.atdd.test.ts`
 * (test-design dedup: window MATH at unit, window RENDER here).
 *
 * =========================================================================
 * RED PHASE — why every block is `.skip`-ed
 * =========================================================================
 * Against the current tree these FAIL: `DatePickerDialog` renders `today+4` as an
 * ENABLED, pickable button because `isPlannerDateSelectable` is still season-based (a
 * mid-June today+4 is in-season). Un-skip when Task 3 lands.
 *
 * DETERMINISM: a fixed `now` (2026-06-14, deep in-season so the season bound never
 * masks the window edge) is injected; the dialog renders that month, so today+3 and
 * today+4 are both visible without a month-nav click. Labels mirror the existing
 * `DatePickerDialog.test.tsx` fixture. The disabled aria-label copy may be `unavailableDate`
 * reused OR a new window-specific key (Task 3's call, sv/en parity kept); this spec
 * asserts the button is DISABLED + not pickable, tolerant of either label string.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatePickerDialog } from '@/components/composed/time/DatePickerDialog';

// 2026-06-14 → today=14th, +3=17th, +4=18th, all within June (no month-nav needed).
const NOW = new Date('2026-06-14T10:15:00.000Z');

const LABELS = {
  title: 'Välj datum',
  close: 'Stäng kalender',
  previousMonth: 'Föregående månad',
  nextMonth: 'Nästa månad',
  selectedDate: 'Valt datum',
  unavailableDate: 'Datum utanför säsong',
  windowDate: 'Datum utanför planeringsfönstret',
  pastDate: 'Datum har passerat',
  selectDate: 'Välj {date}',
};

function renderDialog() {
  render(
    <DatePickerDialog
      open
      selectedDate="2026-06-14"
      now={NOW}
      locale="sv"
      labels={LABELS}
      onOpenChange={() => {}}
      onSelectDate={vi.fn()}
    />,
  );
}

describe('[11.2 AC3] DatePickerDialog today→today+3 window', () => {
  it('renders today+3 (17 June) as a selectable, pickable button that fires onSelectDate', () => {
    const onSelectDate = vi.fn();
    render(
      <DatePickerDialog
        open
        selectedDate="2026-06-14"
        now={NOW}
        locale="sv"
        labels={LABELS}
        onOpenChange={() => {}}
        onSelectDate={onSelectDate}
      />,
    );

    const plus3 = screen.getByRole('button', { name: 'Välj 17 juni 2026' });
    expect(plus3).toBeEnabled();
    fireEvent.click(plus3);
    expect(onSelectDate).toHaveBeenCalledWith('2026-06-17');
  });

  it('renders today+4 (18 June) disabled + unpickable with the disabled aria-label', () => {
    const onSelectDate = vi.fn();
    render(
      <DatePickerDialog
        open
        selectedDate="2026-06-14"
        now={NOW}
        locale="sv"
        labels={LABELS}
        onOpenChange={() => {}}
        onSelectDate={onSelectDate}
      />,
    );

    // Beyond the today→today+3 window: disabled + carries a disabled-prefixed aria-label
    // (the exact prefix is Task 3's call — `unavailableDate` reused or a window-specific
    // key). Match "…18 juni 2026" with any disabled prefix so the copy choice is free.
    const plus4 = screen.getByRole('button', { name: /18 juni 2026$/ });
    expect(plus4).toBeDisabled();
    // Its accessible name is NOT the bare "Välj …" pick label (it is a disabled label).
    expect(plus4).not.toHaveAccessibleName('Välj 18 juni 2026');

    fireEvent.click(plus4);
    expect(onSelectDate, 'a disabled out-of-window day must not be pickable').not.toHaveBeenCalled();
  });

  it('keeps a past date disabled', () => {
    renderDialog();
    // 13 June (yesterday) stays disabled with the past-date label.
    const yesterday = screen.getByRole('button', { name: 'Datum har passerat 13 juni 2026' });
    expect(yesterday).toBeDisabled();
  });
});
