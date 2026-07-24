'use client';

import { useCallback, useRef, useState, type Ref } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'motion/react';
import { DatePickerDialog } from '@/components/composed/time/DatePickerDialog';
import { TimeSlider } from '@/components/composed/time/TimeSlider';
import { DURATION_SLOW_S, EASE_ENTER } from '@/lib/constants/animation';
import { useTimeContext } from '@/lib/contexts/TimeContext';
import { addDaysToDateKey, isPlannerDateSelectable, isTodayInStockholm } from '@/lib/utils/time-planner';
import { cn } from '@/lib/utils';

export type TimeSliderPanelProps = {
  variant: 'mobile' | 'desktop';
  reducedMotion?: boolean;
  className?: string;
  panelRef?: Ref<HTMLElement>;
};

export function TimeSliderPanel({
  variant,
  reducedMotion,
  className,
  panelRef,
}: TimeSliderPanelProps) {
  const t = useTranslations('venue.planner');
  const locale = useLocale();
  const time = useTimeContext();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const shouldReduceMotion = reducedMotion ?? prefersReducedMotion;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarTriggerRef = useRef<HTMLButtonElement>(null);
  const handleCalendarOpenChange = useCallback((open: boolean) => {
    setCalendarOpen(open);
    if (!open) {
      window.requestAnimationFrame(() => {
        calendarTriggerRef.current?.focus();
      });
    }
  }, []);
  const dateLabel = formatPanelDate(time.selectedDate, time.currentTime, locale, t('today'));
  const desktop = variant === 'desktop';
  // External-review fix: at the today+3 window end `shiftSelectedDate(1)` is a
  // silent no-op (the context clamps to the selectable window), leaving the
  // "next day" control a dead button for keyboard/SR users. Disable it when the
  // next date is not selectable so its state is honest. From today (and today+1,
  // +2) the next date is in-window → the control stays enabled, so the
  // epic-11-scrub-zero-fetch e2e (which clicks it from today) is unaffected.
  const canGoNextDay = isPlannerDateSelectable(
    addDaysToDateKey(time.selectedDate, 1),
    time.currentTime,
  );

  return (
    <>
      <motion.section
        ref={panelRef}
        data-testid="time-slider-panel"
        data-reduced-motion={String(shouldReduceMotion)}
        aria-label={t('panelLabel')}
        className={cn(
          'z-glass-panel bg-glass-slider text-text-primary backdrop-blur-heavy',
          desktop
            ? 'hidden rounded-panel px-6 py-3 shadow-card-up lg:flex lg:items-center lg:gap-5'
            : 'rounded-panel px-4 py-3 shadow-card-up lg:hidden',
          className,
        )}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : DURATION_SLOW_S, ease: EASE_ENTER }}
      >
        {desktop ? (
          <>
            <CalendarButton
              ref={calendarTriggerRef}
              label={t('openCalendar')}
              dateLabel={dateLabel}
              onClick={() => setCalendarOpen(true)}
              layoutPart="date"
              open={calendarOpen}
            />
            <NextDayButton
              label={t('nextDay')}
              onClick={() => time.shiftSelectedDate(1)}
              disabled={!canGoNextDay}
            />
            <div className="min-w-0 flex-1" data-planner-layout-part="slider">
              <TimeSlider
                ariaLabel={t('sliderLabel')}
                selectedMinutes={time.selectedMinutes}
                minMinutes={time.minMinutes}
                ticks={time.ticks}
                onMinutesChange={time.setSelectedMinutes}
                onSnap={time.snapSelectedMinutes}
                reducedMotion={shouldReduceMotion}
              />
            </div>
            <div
              data-testid="planner-time-label"
              data-planner-layout-part="time"
              className="min-w-16 rounded-pill bg-text-primary px-3 py-1 text-center text-time text-white"
            >
              {time.selectedTime}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <TimeSlider
              ariaLabel={t('sliderLabel')}
              selectedMinutes={time.selectedMinutes}
              minMinutes={time.minMinutes}
              ticks={time.ticks}
              onMinutesChange={time.setSelectedMinutes}
              onSnap={time.snapSelectedMinutes}
              reducedMotion={shouldReduceMotion}
              variant="topPanel"
              className="min-w-0 flex-1"
            />
            <CalendarButton
              ref={calendarTriggerRef}
              label={t('openCalendar')}
              dateLabel={dateLabel}
              onClick={() => setCalendarOpen(true)}
              compact
              open={calendarOpen}
            />
          </div>
        )}
      </motion.section>
      <DatePickerDialog
        open={calendarOpen}
        selectedDate={time.selectedDate}
        now={time.currentTime}
        locale={locale}
        reducedMotion={shouldReduceMotion}
        labels={{
          title: t('calendarTitle'),
          close: t('closeCalendar'),
          previousMonth: t('previousMonth'),
          nextMonth: t('nextMonth'),
          selectedDate: t('selectedDate'),
          unavailableDate: t('unavailableDate'),
          pastDate: t('pastDate'),
          windowDate: t('windowDate'),
          selectDate: t('selectDate', { date: '{date}' }),
        }}
        onOpenChange={handleCalendarOpenChange}
        onSelectDate={time.selectDate}
      />
    </>
  );
}

/**
 * Story 11.1: a one-click "next day" control. Advances the planner date by one
 * day via `shiftSelectedDate(1)` (clamped to the selectable season by the
 * context), which is exactly the DATE change AC3 permits — it flips the query key
 * and fires the single new-day request while markers persist under the overlay.
 * Carries the `planner-date-next` testid the request-count e2e drives.
 *
 * External-review fix: `disabled` when the next date is beyond the today+3 window
 * (`shiftSelectedDate(1)` would silently no-op). Native `disabled` removes it from
 * the tab order + announces the state to AT; `aria-disabled` is added for parity
 * with engines that under-announce native `disabled` on non-form controls, and the
 * dimmed style makes the dead state visible.
 */
function NextDayButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-testid="planner-date-next"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={cn(
        'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-pill text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <ChevronRight aria-hidden="true" className="size-4 text-amber-dark" />
    </button>
  );
}

function CalendarButton({
  ref,
  label,
  dateLabel,
  onClick,
  layoutPart,
  compact = false,
  open = false,
}: {
  ref?: Ref<HTMLButtonElement>;
  label: string;
  dateLabel: string;
  onClick: () => void;
  layoutPart?: string;
  compact?: boolean;
  open?: boolean;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={`${label}: ${dateLabel}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onClick}
      data-testid="planner-date-trigger"
      data-planner-layout-part={layoutPart}
      className={cn(
        'flex min-h-11 items-center justify-center rounded-pill text-amber-dark outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary',
        compact
          ? 'min-w-11 shrink-0 gap-1.5 border border-divider bg-surface-cream/70 px-3 shadow-subtle hover:bg-surface-sand active:bg-amber-pale/40'
          : 'min-w-32 gap-2 bg-surface-cream/70 px-3 shadow-subtle hover:bg-surface-sand active:bg-amber-pale/40',
      )}
    >
      <Calendar aria-hidden="true" className="size-4 shrink-0 text-amber-dark" />
      <span
        data-testid="planner-date-label"
        className={cn('max-w-28 truncate text-date text-text-body', compact && 'max-w-20')}
      >
        {dateLabel}
      </span>
    </button>
  );
}

function formatPanelDate(
  date: string,
  now: Date,
  locale: string,
  todayLabel: string,
): string {
  if (isTodayInStockholm(date, now)) return todayLabel;
  const [year = '1970', month = '01', day = '01'] = date.split('-');
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
}
