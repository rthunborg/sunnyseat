import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatePickerDialog } from '@/components/composed/time/DatePickerDialog';

const LABELS = {
  title: 'Välj datum',
  close: 'Stäng kalender',
  previousMonth: 'Föregående månad',
  nextMonth: 'Nästa månad',
  selectedDate: 'Valt datum',
  unavailableDate: 'Datum utanför säsong',
  pastDate: 'Datum har passerat',
  windowDate: 'Datum utanför planeringsfönstret',
  selectDate: 'Välj {date}',
};

describe('<DatePickerDialog />', () => {
  it('renders an accessible calendar dialog and selects an in-season date', () => {
    const onSelectDate = vi.fn();
    render(
      <DatePickerDialog
        open
        selectedDate="2026-05-20"
        now={new Date('2026-05-20T10:15:00.000Z')}
        locale="sv"
        labels={LABELS}
        onOpenChange={() => {}}
        onSelectDate={onSelectDate}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Välj datum' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Välj 21 maj 2026' }));
    expect(onSelectDate).toHaveBeenCalledWith('2026-05-21');
  });

  it('disables out-of-season dates and closes on Escape', () => {
    const onOpenChange = vi.fn();
    render(
      <DatePickerDialog
        open
        selectedDate="2026-10-31"
        now={new Date('2026-05-20T10:15:00.000Z')}
        locale="sv"
        labels={LABELS}
        onOpenChange={onOpenChange}
        onSelectDate={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nästa månad' }));
    expect(screen.getByRole('button', { name: 'Datum utanför säsong 1 november 2026' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Välj datum' }), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('marks a future in-season date beyond the today->today+3 window with the window label', () => {
    render(
      <DatePickerDialog
        open
        selectedDate="2026-05-20"
        now={new Date('2026-05-20T10:15:00.000Z')}
        locale="sv"
        labels={LABELS}
        onOpenChange={() => {}}
        onSelectDate={() => {}}
      />,
    );

    // 2026-05-23 = today+3 is the last selectable day.
    expect(screen.getByRole('button', { name: 'Välj 23 maj 2026' })).toBeEnabled();
    // 2026-05-24 = today+4 is in-season but beyond the window → disabled with the
    // window-specific copy (NOT "har passerat" and NOT "utanför säsong").
    const beyondWindow = screen.getByRole('button', {
      name: 'Datum utanför planeringsfönstret 24 maj 2026',
    });
    expect(beyondWindow).toBeDisabled();
  });

  it('announces past in-season dates separately from out-of-season dates', () => {
    render(
      <DatePickerDialog
        open
        selectedDate="2026-05-20"
        now={new Date('2026-05-20T10:15:00.000Z')}
        locale="sv"
        labels={LABELS}
        onOpenChange={() => {}}
        onSelectDate={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Datum har passerat 19 maj 2026' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Datum utanför säsong 19 maj 2026' })).toBeNull();
  });

  it('localizes weekday and date labels for English', () => {
    render(
      <DatePickerDialog
        open
        selectedDate="2026-05-20"
        now={new Date('2026-05-20T10:15:00.000Z')}
        locale="en"
        labels={{
          title: 'Select date',
          close: 'Close calendar',
          previousMonth: 'Previous month',
          nextMonth: 'Next month',
          selectedDate: 'Selected date',
          unavailableDate: 'Date outside season',
          pastDate: 'Date has passed',
          selectDate: 'Select {date}',
        }}
        onOpenChange={() => {}}
        onSelectDate={() => {}}
      />,
    );

    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select May 21, 2026' })).toBeInTheDocument();
  });
});
