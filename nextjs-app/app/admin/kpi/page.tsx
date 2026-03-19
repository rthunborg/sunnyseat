'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/lib/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricsCard } from '@/components/admin/MetricsCard';
import {
  ShieldCheckIcon,
  UsersIcon,
  CrownIcon,
  MousePointerClickIcon,
  TargetIcon,
} from 'lucide-react';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

interface WeeklyTrend {
  week: string;
  newVenues: number;
  newVerified: number;
  newPurchases: number;
}

interface KpiData {
  totalVenues: number;
  verifiedVenues: number;
  verificationRate: number;
  totalFeedback: number;
  accuracyRate: number;
  totalPartners: number;
  partnerClicks: number;
  totalPurchases: number;
  premiumUsers: number;
  conversionRate: number;
  weeklyTrend: WeeklyTrend[];
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function TrendChart({ data }: { data: WeeklyTrend[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
        Ingen trenddata att visa
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.newVenues, d.newVerified, d.newPurchases]),
    1
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        Veckotrend (senaste 4 veckorna)
      </h3>
      <div className="space-y-3">
        {data.map((week) => (
          <div key={week.week} className="space-y-1">
            <p className="text-xs text-muted-foreground">v.{formatWeek(week.week)}</p>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                <div
                  className="h-5 rounded bg-blue-500 transition-all"
                  style={{ width: `${Math.max((week.newVenues / maxVal) * 100, 2)}%` }}
                  role="img"
                  aria-label={`Nya platser: ${week.newVenues}`}
                />
                <div
                  className="h-5 rounded bg-emerald-500 transition-all"
                  style={{ width: `${Math.max((week.newVerified / maxVal) * 100, 2)}%` }}
                  role="img"
                  aria-label={`Nya verifierade: ${week.newVerified}`}
                />
                <div
                  className="h-5 rounded bg-amber-500 transition-all"
                  style={{ width: `${Math.max((week.newPurchases / maxVal) * 100, 2)}%` }}
                  role="img"
                  aria-label={`Nya köp: ${week.newPurchases}`}
                />
              </div>
              <span className="min-w-[80px] text-right text-[10px] text-muted-foreground">
                {week.newVenues} / {week.newVerified} / {week.newPurchases}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded bg-blue-500" /> Nya platser
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded bg-emerald-500" /> Verifierade
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded bg-amber-500" /> Köp
        </span>
      </div>
    </div>
  );
}

function SkeletonCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="mb-3 h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </>
  );
}

export default function KpiDashboardPage() {
  const { token } = useAuthContext();
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/kpi', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const json: KpiData = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError('Kunde inte ladda KPI-data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-foreground" data-testid="kpi-heading">KPI Dashboard</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Nyckeltal för tillväxt och kvalitet
      </p>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Data Moat */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Data Moat
      </h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {loading ? (
          <SkeletonCards count={2} />
        ) : data ? (
          <>
            <MetricsCard
              label="Verifierade platser"
              value={`${data.verifiedVenues} / ${data.totalVenues}`}
              icon={<ShieldCheckIcon className="size-4" />}
              color="text-emerald-600"
              bgColor="bg-emerald-50 dark:bg-emerald-950/30"
              trendLabel={`${data.verificationRate}% verifierade`}
              trend={data.verificationRate >= 50 ? 'up' : 'down'}
            />
            <MetricsCard
              label="Noggrannhet"
              value={`${data.accuracyRate}%`}
              icon={<TargetIcon className="size-4" />}
              color={data.accuracyRate >= 80 ? 'text-emerald-600' : 'text-red-600'}
              bgColor={
                data.accuracyRate >= 80
                  ? 'bg-emerald-50 dark:bg-emerald-950/30'
                  : 'bg-red-50 dark:bg-red-950/30'
              }
              trendLabel={`${data.totalFeedback} feedback totalt`}
              trend={data.accuracyRate >= 80 ? 'up' : 'down'}
            />
          </>
        ) : null}
      </div>

      {/* B2B */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        B2B
      </h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {loading ? (
          <SkeletonCards count={2} />
        ) : data ? (
          <>
            <MetricsCard
              label="Aktiva partners"
              value={data.totalPartners}
              icon={<UsersIcon className="size-4" />}
              color="text-blue-600"
              bgColor="bg-blue-50 dark:bg-blue-950/30"
            />
            <MetricsCard
              label="Bokningsklick"
              value={data.partnerClicks}
              icon={<MousePointerClickIcon className="size-4" />}
              color="text-indigo-600"
              bgColor="bg-indigo-50 dark:bg-indigo-950/30"
            />
          </>
        ) : null}
      </div>

      {/* Premium */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Premium
      </h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {loading ? (
          <SkeletonCards count={2} />
        ) : data ? (
          <>
            <MetricsCard
              label="Premium-användare"
              value={data.premiumUsers}
              icon={<CrownIcon className="size-4" />}
              color="text-amber-600"
              bgColor="bg-amber-50 dark:bg-amber-950/30"
              trendLabel={`${data.conversionRate}% konvertering`}
              trend={data.conversionRate > 0 ? 'up' : 'neutral'}
            />
            <MetricsCard
              label="Totala köp"
              value={data.totalPurchases}
              icon={<CrownIcon className="size-4" />}
              color="text-purple-600"
              bgColor="bg-purple-50 dark:bg-purple-950/30"
            />
          </>
        ) : null}
      </div>

      {/* Kvalitet - Weekly trend */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Kvalitet
      </h2>
      {!loading && data && <TrendChart data={data.weeklyTrend} />}
      {loading && (
        <div className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="mb-4 h-4 w-40" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}
    </>
  );
}
