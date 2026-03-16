'use client';

interface SunnyNowBadgeProps {
  size?: 'sm' | 'md';
}

function SunBadgeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="12" y1="1" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="23" />
        <line x1="1" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
        <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
        <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
      </g>
    </svg>
  );
}

export function SunnyNowBadge({ size = 'sm' }: SunnyNowBadgeProps) {
  const isSmall = size === 'sm';
  const iconSize = isSmall ? 12 : 14;

  return (
    <span
      className={`
        animate-sunny-now-pulse
        inline-flex items-center gap-0.5
        rounded-full
        border border-[var(--color-partner-gold-dark)]
        bg-[var(--color-partner-gold)]
        text-[var(--color-text-primary)]
        shadow-sm
        ${isSmall ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}
        font-semibold leading-none
      `}
      role="status"
      aria-label="Sol nu"
    >
      <SunBadgeIcon size={iconSize} />
      <span>Sol nu</span>
    </span>
  );
}
