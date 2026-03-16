'use client';

import { useState, useCallback } from 'react';
import { usePremiumContext } from '@/lib/context/PremiumContext';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { PaywallPrompt } from '@/components/composed/PaywallPrompt';
import type { TimeOffsetHours } from '@/lib/hooks/useTimeOffset';

interface TimeSliderProps {
  value: TimeOffsetHours;
  onChange: (offset: TimeOffsetHours) => void;
  isLoading?: boolean;
}

const MARKS: { value: TimeOffsetHours; label: string }[] = [
  { value: 0, label: 'Nu' },
  { value: 1, label: '+1 tim' },
  { value: 2, label: '+2 tim' },
  { value: 3, label: '+3 tim' },
];

export function TimeSlider({ value, onChange, isLoading }: TimeSliderProps) {
  const { isPremium } = usePremiumContext();
  const reducedMotion = useReducedMotion();
  const [showPaywall, setShowPaywall] = useState(false);

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
        className={`flex flex-col gap-1 rounded-2xl bg-surface-primary/95 backdrop-blur-sm px-4 py-2 shadow-lg border border-border-subtle ${transitionClass}`}
        role="group"
        aria-label="Tidsförskjutning för solprognos"
      >
        <div className="flex items-center justify-between">
          <span className="text-[length:var(--font-size-caption)] font-[number:var(--font-weight-caption)] text-text-secondary">
            Tidsprognos
          </span>
          {isLoading && (
            <span
              className={`inline-block h-3 w-3 rounded-full border-2 border-brand-primary border-t-transparent ${reducedMotion ? '' : 'animate-spin'}`}
              role="status"
              aria-label="Laddar soldata"
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
          className="time-slider-input w-full h-[48px] cursor-pointer accent-brand-primary"
          aria-label="Välj tidsförskjutning"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={value}
          aria-valuetext={MARKS[value].label}
        />

        <div className="flex justify-between px-0.5 -mt-1">
          {MARKS.map((mark) => (
            <button
              key={mark.value}
              type="button"
              onClick={() => handleMarkClick(mark.value)}
              className={`text-[length:var(--font-size-micro)] min-w-[40px] min-h-[28px] rounded-lg px-1 ${transitionClass} ${
                value === mark.value
                  ? 'font-bold text-brand-primary'
                  : 'font-medium text-text-muted hover:text-text-secondary'
              } ${!isPremium && mark.value > 0 ? 'opacity-50' : ''}`}
              aria-label={`Ställ in ${mark.label}`}
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
