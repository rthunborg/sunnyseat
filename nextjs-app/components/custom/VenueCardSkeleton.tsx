'use client';

import { useLanguage } from '@/lib/i18n';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

export function VenueCardSkeleton() {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  return (
    <div data-testid="venue-card-skeleton">
      <div
        className={cn(
          'flex flex-col justify-between p-4 rounded-card shadow-card',
          'h-[120px] bg-[var(--color-ambient-sunny)]',
          !reducedMotion && 'animate-warm-pulse'
        )}
        aria-hidden="true"
      >
        {/* Row 1: Dot + two short bars (status + distance) */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-border-default" />
          <div className="w-12 h-3 rounded bg-border-default" />
          <div className="w-8 h-3 rounded bg-border-default" />
        </div>

        {/* Row 2: Wide bar (venue name) */}
        <div className="w-3/4 h-4 rounded bg-border-default" />

        {/* Row 3: Thin wide bar (timeline) */}
        <div className="w-full h-2 rounded bg-border-default" />

        {/* Row 4: Medium bar + short bar (detail + button) */}
        <div className="flex items-center gap-2">
          <div className="w-1/2 h-3 rounded bg-border-default" />
          <div className="ml-auto w-16 h-8 rounded-button bg-border-default" />
        </div>
      </div>

      <p
        className="text-text-muted text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] text-center mt-2"
        role="status"
      >
        {t('home.loadingSunny')}
      </p>
    </div>
  );
}
