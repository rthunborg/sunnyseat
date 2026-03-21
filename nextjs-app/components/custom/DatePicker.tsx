'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePremiumContext } from '@/lib/context/PremiumContext';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { useLanguage } from '@/lib/i18n';
import { PaywallPrompt } from '@/components/composed/PaywallPrompt';

interface DatePickerProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  isLoading?: boolean;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  // Monday = 0, Sunday = 6 (ISO week)
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];

  // Leading blanks
  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  // Trailing blanks to fill last week
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  // Split into weeks
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
}

export function DatePicker({ selectedDate, onDateSelect, isLoading }: DatePickerProps) {
  const { isPremium } = usePremiumContext();
  const reducedMotion = useReducedMotion();
  const { t } = useLanguage();
  const [showPaywall, setShowPaywall] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const monthNames = useMemo(() => t('datePicker.months').split(','), [t]);
  const dayHeaders = useMemo(() => t('datePicker.dayHeaders').split(','), [t]);

  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }, [today]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const weeks = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const transitionClass = reducedMotion ? '' : 'transition-all duration-150';

  const handleToggle = useCallback(() => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    setIsOpen((prev) => !prev);
  }, [isPremium]);

  const handlePrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const handleDateClick = useCallback(
    (date: Date) => {
      if (isSameDay(date, today)) {
        onDateSelect(null); // Reset to live mode
      } else {
        onDateSelect(date);
      }
      setIsOpen(false);
    },
    [onDateSelect, today]
  );

  const handleReset = useCallback(() => {
    onDateSelect(null);
    setIsOpen(false);
  }, [onDateSelect]);

  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());
  const canGoNext = viewYear < maxDate.getFullYear() || (viewYear === maxDate.getFullYear() && viewMonth < maxDate.getMonth());

  const isSelected = selectedDate && !isSameDay(selectedDate, today);

  const buttonLabel = isSelected
    ? `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()].slice(0, 3)}`
    : t('datePicker.label');

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className={`min-h-[var(--spacing-touch-min)] min-w-[var(--spacing-touch-min)] flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-[length:var(--font-size-caption)] font-[number:var(--font-weight-caption)] shadow-lg border border-border-subtle ${transitionClass} ${
          isSelected
            ? 'bg-brand-primary text-white'
            : 'bg-surface-primary/95 backdrop-blur-sm text-text-secondary'
        } ${!isPremium ? 'opacity-70' : ''}`}
        aria-label={isSelected ? t('datePicker.selectedDate', { date: `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]}` }) : t('datePicker.chooseDate')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        data-testid="date-picker-toggle"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
          <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>{buttonLabel}</span>
        {!isPremium && (
          <span className="text-[8px] text-text-muted" aria-hidden="true">Premium</span>
        )}
        {isLoading && (
          <span
            className={`inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent ${reducedMotion ? '' : 'animate-spin'}`}
            role="status"
            aria-label={t('datePicker.loadingDateData')}
          />
        )}
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full mb-2 right-0 z-50 w-[280px] max-w-[calc(100vw-2rem)] rounded-2xl bg-surface-primary shadow-xl border border-border-subtle p-3"
          role="dialog"
          aria-modal="false"
          aria-label={t('datePicker.chooseDate')}
          data-testid="date-picker-dialog"
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={!canGoPrev}
              className="min-h-[var(--spacing-touch-min)] min-w-[var(--spacing-touch-min)] flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={t('datePicker.prevMonth')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <span className="text-sm font-semibold text-text-primary">
              {monthNames[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={!canGoNext}
              className="min-h-[var(--spacing-touch-min)] min-w-[var(--spacing-touch-min)] flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={t('datePicker.nextMonth')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0 mb-1" role="row">
            {dayHeaders.map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-medium text-text-muted py-1"
                role="columnheader"
                aria-label={day}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div role="grid" aria-label={`${monthNames[viewMonth]} ${viewYear}`}>
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-0" role="row">
                {week.map((date, di) => {
                  if (!date) {
                    return <div key={`empty-${di}`} className="h-[36px]" role="gridcell" />;
                  }

                  const isToday = isSameDay(date, today);
                  const isDateSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                  const isPast = date < today && !isToday;
                  const isBeyondMax = date > maxDate;
                  const disabled = isPast || isBeyondMax;

                  return (
                    <button
                      key={date.getDate()}
                      type="button"
                      role="gridcell"
                      disabled={disabled}
                      onClick={() => handleDateClick(date)}
                      aria-selected={isDateSelected || (isToday && !selectedDate)}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={`${date.getDate()} ${monthNames[date.getMonth()]}`}
                      className={`h-[36px] w-full flex items-center justify-center rounded-lg text-xs font-medium ${transitionClass} ${
                        disabled
                          ? 'text-text-muted/40 cursor-not-allowed'
                          : isDateSelected
                          ? 'bg-brand-primary text-white font-bold'
                          : isToday
                          ? 'ring-2 ring-brand-primary text-brand-primary font-bold hover:bg-brand-primary-light/30'
                          : 'text-text-primary hover:bg-surface-secondary'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Reset to today */}
          {isSelected && (
            <button
              type="button"
              onClick={handleReset}
              className="mt-2 w-full min-h-[40px] rounded-xl bg-surface-secondary text-text-secondary text-xs font-medium hover:bg-surface-tertiary"
            >
              {t('datePicker.showToday')}
            </button>
          )}
        </div>
      )}

      {showPaywall && <PaywallPrompt onDismiss={() => setShowPaywall(false)} />}
    </>
  );
}
