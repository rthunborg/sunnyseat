'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'motion/react';
import { DatePickerDialog } from '@/components/composed/time/DatePickerDialog';
import { TimeSlider } from '@/components/composed/time/TimeSlider';
import { DURATION_SLOW_S, EASE_ENTER } from '@/lib/constants/animation';
import { useTimeContext } from '@/lib/contexts/TimeContext';
import { isTodayInStockholm } from '@/lib/utils/time-planner';
import { cn } from '@/lib/utils';

export type TimeSliderPanelProps = {
  variant: 'mobile' | 'desktop';
  reducedMotion?: boolean;
  className?: string;
};

export function TimeSliderPanel({
  variant,
  reducedMotion,
  className,
}: TimeSliderPanelProps) {
  const t = useTranslations('venue.planner');
  const locale = useLocale();
  const time = useTimeContext();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const shouldReduceMotion = reducedMotion ?? prefersReducedMotion;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateLabel = formatPanelDate(time.selectedDate, time.currentTime, locale, t('today'));
  const desktop = variant === 'desktop';

  return (
    <>
      <motion.section
        data-testid="time-slider-panel"
        data-reduced-motion={String(shouldReduceMotion)}
        aria-label={t('panelLabel')}
        className={cn(
          'z-glass-panel bg-glass-slider text-text-primary backdrop-blur-[var(--blur-heavy)]',
          desktop
            ? 'hidden rounded-panel px-6 py-3 shadow-card-up lg:flex lg:items-center lg:gap-5'
            : 'rounded-panel px-4 pt-5 pb-2 shadow-card lg:hidden',
          className,
        )}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : DURATION_SLOW_S, ease: EASE_ENTER }}
      >
        {desktop ? (
          <>
            <div className="min-w-16 rounded-pill bg-text-primary px-3 py-1 text-center text-time text-white">
              {time.selectedTime}
            </div>
            <div className="min-w-0 flex-1">
              <TimeSlider
                ariaLabel={t('sliderLabel')}
                selectedMinutes={time.selectedMinutes}
                ticks={time.ticks}
                onMinutesChange={time.setSelectedMinutes}
                onSnap={time.snapSelectedMinutes}
                reducedMotion={shouldReduceMotion}
              />
            </div>
            <CalendarButton
              label={t('openCalendar')}
              dateLabel={dateLabel}
              onClick={() => setCalendarOpen(true)}
            />
          </>
        ) : (
          <div className="flex items-start gap-2">
            <TimeSlider
              ariaLabel={t('sliderLabel')}
              selectedMinutes={time.selectedMinutes}
              ticks={time.ticks}
              onMinutesChange={time.setSelectedMinutes}
              onSnap={time.snapSelectedMinutes}
              reducedMotion={shouldReduceMotion}
              variant="topPanel"
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              aria-label={t('openCalendar')}
              onClick={() => setCalendarOpen(true)}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-pill text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
            >
              <span className="sr-only">{dateLabel}</span>
              <Calendar aria-hidden="true" className="size-5" />
            </button>
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
          selectDate: t('selectDate', { date: '{date}' }),
        }}
        onOpenChange={setCalendarOpen}
        onSelectDate={time.selectDate}
      />
    </>
  );
}

function CalendarButton({
  label,
  dateLabel,
  onClick,
}: {
  label: string;
  dateLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-pill text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
    >
      <span className="sr-only">{dateLabel}</span>
      <Calendar aria-hidden="true" className="size-4 text-amber-dark" />
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
