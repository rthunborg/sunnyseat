'use client';

import { Coffee, Heart, Navigation, PersonStanding, Sun, UsersRound } from 'lucide-react';
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
      <div className="space-y-3 border-b border-divider px-3 pb-3 pt-3">
        <div className="flex gap-1 border-b border-divider/70" aria-label={labels.topPicks}>
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
        <div className="flex justify-center gap-2">
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
    <div className="flex gap-1 overflow-x-auto pb-3 [scrollbar-width:none]" aria-label={labels.topPicks}>
      <SortButton
        active={sortMode === 'sun'}
        onClick={() => onSortModeChange('sun')}
        icon={<Sun aria-hidden="true" className="size-4 fill-current" />}
        compact
      >
        {labels.sortBySun}
      </SortButton>
      <SortButton
        active={sortMode === 'distance'}
        onClick={() => onSortModeChange('distance')}
        icon={<PersonStanding aria-hidden="true" className="size-4" />}
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
        icon={<UsersRound aria-hidden="true" className="size-4" />}
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
        compact ? 'h-11 gap-0.5 px-1 text-label-md' : 'h-7 gap-1.5 px-3 text-label-md',
        active
          ? 'border border-text-primary bg-text-primary text-surface-cream'
          : 'border border-divider bg-white text-text-body hover:bg-surface-muted',
        disabled && 'cursor-not-allowed hover:bg-white',
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
