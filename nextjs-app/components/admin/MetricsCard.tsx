'use client';

import type { ReactNode } from 'react';

interface MetricsCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  color?: string;
  bgColor?: string;
}

export function MetricsCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  color = 'text-blue-600',
  bgColor = 'bg-blue-50 dark:bg-blue-950/30',
}: MetricsCardProps) {
  const trendArrow =
    trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'neutral' ? '→' : null;
  const trendColor =
    trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground';

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex size-8 items-center justify-center rounded-lg ${bgColor}`}>
          <span className={`size-4 ${color}`}>{icon}</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {trendArrow && trendLabel && (
        <p className={`mt-1 text-xs font-medium ${trendColor}`}>
          {trendArrow} {trendLabel}
        </p>
      )}
    </div>
  );
}
