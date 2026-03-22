'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePremiumContext } from '@/lib/context/PremiumContext';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { useLanguage } from '@/lib/i18n';
import { PaywallPrompt } from '@/components/composed/PaywallPrompt';
import type { TimeOffsetHours } from '@/lib/hooks/useTimeOffset';

interface TimeSliderProps {
  value: TimeOffsetHours;
  onChange: (offset: TimeOffsetHours) => void;
  isLoading?: boolean;
}

const MARK_KEYS: { value: TimeOffsetHours; i18nKey: string }[] = [
  { value: 0, i18nKey: 'timeSlider.now' },
  { value: 1, i18nKey: 'timeSlider.plusHours1' },
  { value: 2, i18nKey: 'timeSlider.plusHours2' },
  { value: 3, i18nKey: 'timeSlider.plusHours3' },
];

export function TimeSlider({ value, onChange, isLoading }: TimeSliderProps) {
  const { isPremium } = usePremiumContext();
  const reducedMotion = useReducedMotion();
  const { t } = useLanguage();
  const [showPaywall, setShowPaywall] = useState(false);

  const marks = useMemo(
    () => MARK_KEYS.map((mk) => ({ value: mk.value, label: t(mk.i18nKey) })),
    [t]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(e.target.value, 10) as TimeOffsetHours;
      if (!isPremium && newValue > 0) {
        setShowPaywall(true);
        return;
      }
      onChange(newValue);
    },
    [isPremium, onChange]
  );

  const handleMarkClick = useCallback(
    (markValue: TimeOffsetHours) => {
      if (!isPremium && markValue > 0) {
        setShowPaywall(true);
        return;
      }
      onChange(markValue);
    },
    [isPremium, onChange]
  );

  const transitionClass = reducedMotion ? '' : 'transition-all duration-150';

  return (
    <>
      <div
        className={`flex flex-col gap-1 rounded-[24px] bg-surface-primary/90 backdrop-blur-md px-4 py-2 shadow-lg border border-border-subtle ${transitionClass}`}
        role="group"
        aria-label={t('timeSlider.ariaGroupLabel')}
        data-testid="time-slider"
      >
        <div className="flex items-center justify-between">
          <span className="text-[length:var(--font-size-caption)] font-[number:var(--font-weight-caption)] text-text-secondary">
            {t('timeSlider.label')}
          </span>
          {isLoading && (
            <span
              className={`inline-block h-3 w-3 rounded-full border-2 border-brand-primary border-t-transparent ${reducedMotion ? '' : 'animate-spin'}`}
              role="status"
              aria-label={t('timeSlider.loadingSunData')}
            />
          )}
        </div>

        <input
          type="range"
          min={0}
          max={3}
          step={1}
          value={value}
          onChange={handleChange}
          className="time-slider-input w-full h-[var(--spacing-touch-min)] cursor-pointer accent-brand-primary"
          aria-label={t('timeSlider.ariaInputLabel')}
          data-testid="time-slider-input"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={value}
          aria-valuetext={marks[value].label}
        />

        <div className="flex justify-between px-0.5 -mt-1">
          {marks.map((mark) => (
            <button
              key={mark.value}
              type="button"
              onClick={() => handleMarkClick(mark.value)}
              className={`text-[length:var(--font-size-micro)] min-w-[40px] min-h-[28px] rounded-lg px-1 ${transitionClass} ${
                value === mark.value
                  ? 'font-bold text-brand-primary'
                  : 'font-medium text-text-muted hover:text-text-secondary'
              } ${!isPremium && mark.value > 0 ? 'opacity-50' : ''}`}
              aria-label={t('timeSlider.setMark', { label: mark.label })}
              aria-pressed={value === mark.value}
            >
              {mark.label}
              {!isPremium && mark.value > 0 && (
                <span className="block text-[8px] text-text-muted" aria-hidden="true">
                  Premium
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {showPaywall && <PaywallPrompt onDismiss={() => setShowPaywall(false)} />}
    </>
  );
}
