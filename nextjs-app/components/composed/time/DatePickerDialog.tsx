'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import {
  isDateInCurrentSunSeason,
  isPlannerDateSelectable,
  isValidDateKey,
  stockholmDateKey,
  sunSeasonBounds,
} from '@/lib/utils/time-planner';
import { DURATION_FAST_S, DURATION_SLOW_S, EASE_ENTER, EASE_EXIT } from '@/lib/constants/animation';
import { cn } from '@/lib/utils';

export type DatePickerDialogLabels = {
  title: string;
  close: string;
  previousMonth: string;
  nextMonth: string;
  selectedDate: string;
  unavailableDate: string;
  pastDate: string;
  /**
   * Story 11.2 (AC3): disabled-label copy for a future date beyond the
   * today->today+3 planning window (in-season, so neither "past" nor
   * "out-of-season"). REQUIRED — a beyond-window in-season date must never fall
   * back to the wrong "Datum utanför säsong" copy, so the type system forces
   * every caller to wire it (un-regressable AC3 copy fix).
   */
  windowDate: string;
  selectDate: string;
};

export type DatePickerDialogProps = {
  open: boolean;
  selectedDate: string;
  now: Date;
  locale: string;
  labels: DatePickerDialogLabels;
  onOpenChange: (open: boolean) => void;
  onSelectDate: (date: string) => void;
  reducedMotion?: boolean;
};

export function DatePickerDialog({
  open,
  selectedDate,
  now,
  locale,
  labels,
  onOpenChange,
  onSelectDate,
  reducedMotion = false,
}: DatePickerDialogProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(selectedDate));
  const dialogRef = useRef<HTMLDivElement>(null);
  const monthDates = useMemo(() => datesInMonth(visibleMonth), [visibleMonth]);
  const localeTag = locale === 'sv' ? 'sv-SE' : 'en-US';
  const weekdayLabels = useMemo(() => formatWeekdayLabels(localeTag), [localeTag]);

  useEffect(() => {
    if (open) setVisibleMonth(monthStart(selectedDate));
  }, [open, selectedDate]);

  useEffect(() => {
    if (!open) return;
    const focusable = focusableElements(dialogRef.current);
    focusable[0]?.focus();
  }, [open, visibleMonth]);

  const close = () => onOpenChange(false);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-modal flex items-end justify-center bg-text-primary/30 backdrop-blur-standard lg:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : DURATION_FAST_S, ease: EASE_ENTER }}
          onPointerDown={close}
        >
          <m.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={labels.title}
            tabIndex={-1}
            className="max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-t-panel bg-surface-cream p-5 text-text-primary shadow-sheet-full-up outline-none lg:max-w-md lg:rounded-panel"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
            transition={{ duration: reducedMotion ? 0 : DURATION_SLOW_S, ease: EASE_EXIT }}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                close();
              }
              if (event.key === 'Tab') {
                trapFocus(event, dialogRef.current);
              }
            }}
          >
            <div className="mx-auto mb-4 h-drag-pill-h w-drag-pill-w-lg rounded-pill bg-drag-handle lg:hidden" />
            <div className="mb-4 flex items-center justify-between gap-3">
              <IconButton
                label={labels.previousMonth}
                onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </IconButton>
              <h2 className="text-heading-md text-text-primary">
                {formatMonth(visibleMonth, localeTag)}
              </h2>
              <div className="flex gap-2">
                <IconButton
                  label={labels.nextMonth}
                  onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </IconButton>
                <IconButton label={labels.close} onClick={close}>
                  <X aria-hidden="true" className="size-4" />
                </IconButton>
              </div>
            </div>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-label-xs-medium uppercase text-text-muted">
              {weekdayLabels.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: leadingBlankCount(visibleMonth) }, (_, index) => (
                <span key={`blank-${index}`} aria-hidden="true" />
              ))}
              {monthDates.map((date) => {
                const key = dateKey(date);
                const inSeason = isDateInCurrentSunSeason(key, now);
                const selectable = isPlannerDateSelectable(key, now);
                const selected = key === selectedDate;
                const formatted = formatDate(date, localeTag);
                const isPast = key < stockholmDateKey(now);
                // Story 11.2 (AC3): three disabled buckets — a past date, a
                // future date beyond the today->today+3 window (in-season), and
                // an out-of-season date — each get distinct copy so a "beyond
                // today+3" future date never reads "har passerat"/"out of season".
                const disabledLabel = isPast
                  ? labels.pastDate
                  : inSeason
                    ? labels.windowDate
                    : labels.unavailableDate;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!selectable}
                    aria-label={
                      selectable
                        ? labels.selectDate.replace('{date}', formatted)
                        : `${disabledLabel} ${formatted}`
                    }
                    aria-current={selected ? 'date' : undefined}
                    onClick={() => {
                      if (!selectable) return;
                      onSelectDate(key);
                      close();
                    }}
                    className={cn(
                      'flex aspect-square min-h-11 items-center justify-center rounded-card text-label-lg outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
                      selected
                        ? 'bg-text-primary text-surface-cream'
                        : 'bg-surface-muted text-text-primary',
                      !selectable && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    {date.getUTCDate()}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-body-sm text-text-muted">
              {labels.selectedDate}: {formatDate(parseDateKey(selectedDate), localeTag)}
            </p>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-pill text-text-body outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
    >
      {children}
    </button>
  );
}

function monthStart(dateKeyValue: string): Date {
  const parsed = isValidDateKey(dateKeyValue) ? parseDateKey(dateKeyValue) : parseDateKey(sunSeasonBounds().start);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1));
}

function datesInMonth(firstOfMonth: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(firstOfMonth);
  while (cursor.getUTCMonth() === firstOfMonth.getUTCMonth()) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function leadingBlankCount(firstOfMonth: Date): number {
  return (firstOfMonth.getUTCDay() + 6) % 7;
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function parseDateKey(value: string): Date {
  const [year = '1970', month = '01', day = '01'] = value.split('-');
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatMonth(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatWeekdayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  });
  const monday = new Date(Date.UTC(2026, 0, 5));
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + offset);
    return formatter.format(date);
  });
}

function focusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  );
}

function trapFocus(event: React.KeyboardEvent, root: HTMLElement | null) {
  const focusable = focusableElements(root);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
