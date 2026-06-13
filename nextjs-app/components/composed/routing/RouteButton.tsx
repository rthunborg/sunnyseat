'use client';

import { LoaderCircle, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RouteButtonProps = {
  label: string;
  loadingLabel: string;
  estimateLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  onClick: () => void;
};

export function RouteButton({
  label,
  loadingLabel,
  estimateLabel,
  isLoading = false,
  disabled = false,
  compact = false,
  className,
  onClick,
}: RouteButtonProps) {
  const accessibleLabel = isLoading
    ? loadingLabel
    : [label, estimateLabel].filter(Boolean).join(', ');

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      aria-busy={isLoading || undefined}
      disabled={disabled || isLoading}
      onClick={disabled || isLoading ? undefined : onClick}
      className={cn(
        'flex min-h-12 items-center justify-center rounded-pill gradient-route-button text-amber-cta-text shadow-route-button outline-none transition-opacity duration-default ease-default focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60',
        compact ? 'gap-1.5 px-3 py-2 text-label-md' : 'gap-2 px-5 py-2 text-label-lg',
        className,
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center',
          compact ? 'gap-1' : 'gap-1.5',
        )}
      >
        {isLoading ? (
          <LoaderCircle
            aria-hidden="true"
            className={cn(
              compact ? 'size-3.5' : 'size-5',
              'motion-safe:animate-spin',
            )}
          />
        ) : (
          <Navigation aria-hidden="true" className={compact ? 'size-3.5' : 'size-5'} />
        )}
        <span className="uppercase">{label}</span>
      </span>
      {estimateLabel && (
        <span
          className={cn(
            'text-label-xs-medium normal-case opacity-85',
            compact ? 'shrink-0 whitespace-nowrap' : 'truncate',
          )}
        >
          {estimateLabel}
        </span>
      )}
    </button>
  );
}
