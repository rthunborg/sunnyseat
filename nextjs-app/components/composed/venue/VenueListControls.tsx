'use client';

import { Clock, Coffee, Heart, Navigation, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type VenueListSortMode = 'sun' | 'distance';

export type VenueListControlsLabels = {
  nearTab: string;
  favouritesTab: string;
  topPicks: string;
  sortBySun: string;
  sortByDistance: string;
  categoryCafe: string;
  openNow: string;
  unavailable: string;
};

export type VenueListControlsProps = {
  mode: 'mobile' | 'desktop';
  sortMode: VenueListSortMode;
  onSortModeChange: (mode: VenueListSortMode) => void;
  labels: VenueListControlsLabels;
};

export function VenueListControls({
  mode,
  sortMode,
  onSortModeChange,
  labels,
}: VenueListControlsProps) {
  if (mode === 'desktop') {
    return (
      <div className="space-y-3 border-b border-divider px-3 pb-3">
        <div className="flex gap-1" aria-label={labels.topPicks}>
          <SegmentButton active icon={<Navigation aria-hidden="true" className="size-4" />}>
            {labels.nearTab}
          </SegmentButton>
          <SegmentButton
            disabled
            icon={<Heart aria-hidden="true" className="size-4" />}
            unavailable={labels.unavailable}
          >
            {labels.favouritesTab}
          </SegmentButton>
        </div>
        <div className="flex flex-wrap gap-2">
          <SortButton
            active={sortMode === 'sun'}
            onClick={() => onSortModeChange('sun')}
            icon={<Sun aria-hidden="true" className="size-4" />}
          >
            {labels.sortBySun}
          </SortButton>
          <SortButton
            active={sortMode === 'distance'}
            onClick={() => onSortModeChange('distance')}
            icon={<Navigation aria-hidden="true" className="size-4" />}
          >
            {labels.sortByDistance}
          </SortButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-3" aria-label={labels.topPicks}>
      <SortButton
        active={sortMode === 'sun'}
        onClick={() => onSortModeChange('sun')}
        compact
      >
        {labels.sortBySun}
      </SortButton>
      <SortButton
        active={sortMode === 'distance'}
        onClick={() => onSortModeChange('distance')}
        compact
      >
        {labels.nearTab}
      </SortButton>
      <SortButton
        disabled
        unavailable={labels.unavailable}
        icon={<Coffee aria-hidden="true" className="size-4" />}
        compact
      >
        {labels.categoryCafe}
      </SortButton>
      <SortButton
        disabled
        unavailable={labels.unavailable}
        icon={<Clock aria-hidden="true" className="size-4" />}
        compact
      >
        {labels.openNow}
      </SortButton>
    </div>
  );
}

function SortButton({
  active = false,
  disabled = false,
  unavailable,
  onClick,
  icon,
  compact = false,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  unavailable?: string;
  onClick?: () => void;
  icon?: ReactNode;
  compact?: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={disabled ? undefined : active}
      aria-label={unavailable ? `${children}, ${unavailable}` : children}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-11 shrink-0 items-center rounded-pill outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary',
        compact ? 'gap-1.5 px-2 text-label-md' : 'gap-2 px-4 text-label-lg',
        active
          ? 'bg-text-primary text-surface-cream'
          : 'border border-divider bg-surface-cream text-text-body hover:bg-surface-muted',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-surface-cream',
      )}
    >
      {icon && (
        <span className={active ? 'text-amber-primary' : 'text-amber-dark'}>
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}

function SegmentButton({
  active = false,
  disabled = false,
  unavailable,
  icon,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  unavailable?: string;
  icon: ReactNode;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={disabled ? undefined : active}
      aria-label={unavailable ? `${children}, ${unavailable}` : children}
      disabled={disabled}
      className={cn(
        'flex min-h-11 flex-1 items-center justify-center gap-2 border-b-2 px-2 text-label-lg outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
        active
          ? 'border-amber-gold text-text-primary'
          : 'border-transparent text-text-muted',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
