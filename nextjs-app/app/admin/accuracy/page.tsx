'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/lib/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AccuracyChart } from '@/components/admin/AccuracyChart';
import { MetricsCard } from '@/components/admin/MetricsCard';
import Link from 'next/link';
import {
  TargetIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
} from 'lucide-react';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface DailyAccuracy {
  date: string;
  accuracy: number;
  feedbackCount: number;
}

interface ProblematicVenue {
  venueId: number;
  venueName: string;
  accuracy: number;
  feedbackCount: number;
}

interface AccuracyData {
  totalFeedback: number;
  accurateCount: number;
  inaccurateCount: number;
  accuracyPercentage: number;
  averageConfidence: number;
  dailyAccuracy: DailyAccuracy[];
  problematicVenues: ProblematicVenue[];
  alertActive: boolean;
  alertMessage: string | null;
}

export default function AccuracyDashboardPage() {
  const { token } = useAuthContext();
  const [data, setData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/accuracy', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const json: AccuracyData = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError('Kunde inte ladda precisionsdata');
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
      <h1 className="mb-1 text-2xl font-bold text-foreground">Precision</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Rullande 14-dagars precisionsöversikt
      </p>

      {/* Alert banner */}
      {data?.alertActive && (
        <div
          className="mb-6 flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          <AlertTriangleIcon className="size-5 shrink-0" />
          <span>{data.alertMessage}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Metrics cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <Skeleton className="mb-3 h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))
        ) : data ? (
          <>
            <MetricsCard
              label="Precision"
              value={`${data.accuracyPercentage}%`}
              icon={<TargetIcon className="size-4" />}
              color={data.accuracyPercentage >= 80 ? 'text-emerald-600' : 'text-red-600'}
              bgColor={
                data.accuracyPercentage >= 80
                  ? 'bg-emerald-50 dark:bg-emerald-950/30'
                  : 'bg-red-50 dark:bg-red-950/30'
              }
            />
            <MetricsCard
              label="Totalt feedback"
              value={data.totalFeedback}
              icon={<MessageSquareIcon className="size-4" />}
              color="text-blue-600"
              bgColor="bg-blue-50 dark:bg-blue-950/30"
            />
            <MetricsCard
              label="Snitt konfidens"
              value={`${data.averageConfidence}%`}
              icon={<ShieldCheckIcon className="size-4" />}
              color="text-purple-600"
              bgColor="bg-purple-50 dark:bg-purple-950/30"
            />
            <MetricsCard
              label="Korrekt / Felaktigt"
              value={`${data.accurateCount} / ${data.inaccurateCount}`}
              icon={<TargetIcon className="size-4" />}
              color="text-amber-600"
              bgColor="bg-amber-50 dark:bg-amber-950/30"
            />
          </>
        ) : null}
      </div>

      {/* Accuracy trend chart */}
      {!loading && data && (
        <div className="mb-6">
          <AccuracyChart
            data={data.dailyAccuracy.map((d) => ({
              date: d.date,
              value: d.accuracy,
              count: d.feedbackCount,
            }))}
          />
        </div>
      )}

      {/* Feedback breakdown donut */}
      {!loading && data && data.totalFeedback > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Fördelning: korrekt vs felaktigt
          </h3>
          <div className="flex items-center gap-6">
            <div
              className="relative size-24 shrink-0"
              role="img"
              aria-label={`${data.accurateCount} korrekta, ${data.inaccurateCount} felaktiga`}
            >
              <svg viewBox="0 0 36 36" className="size-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-red-200 dark:text-red-900"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${data.accuracyPercentage} ${100 - data.accuracyPercentage}`}
                  className="text-emerald-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                {data.accuracyPercentage}%
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">
                  Korrekt: {data.accurateCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-red-300 dark:bg-red-800" />
                <span className="text-muted-foreground">
                  Felaktigt: {data.inaccurateCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Problematic venues table */}
      {!loading && data && data.problematicVenues.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Problematiska restauranger (precision &lt; 80%)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Restaurang</th>
                  <th className="px-4 py-3 font-medium">Precision</th>
                  <th className="px-4 py-3 font-medium">Antal feedback</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.problematicVenues.map((venue) => (
                  <tr
                    key={venue.venueId}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {venue.venueName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          venue.accuracy < 60
                            ? 'font-semibold text-red-600'
                            : 'text-amber-600'
                        }
                      >
                        {venue.accuracy}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {venue.feedbackCount}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/accuracy/venues/${venue.venueId}`}
                        className="min-h-[48px] inline-flex items-center rounded-lg px-3 py-2 text-xs font-medium text-primary hover:underline"
                      >
                        Visa detaljer
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && data && data.problematicVenues.length === 0 && data.totalFeedback > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
          Inga problematiska restauranger — alla har precision ≥ 80%
        </div>
      )}

      {!loading && data && data.totalFeedback === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Ingen feedback har mottagits de senaste 14 dagarna.
        </div>
      )}
    </>
  );
}
