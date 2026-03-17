'use client';

import { useEffect, useState, use } from 'react';
import { useAuthContext } from '@/lib/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';

interface VenueFeedbackEntry {
  date: string;
  predictedState: string;
  wasSunny: boolean;
  confidenceAtPrediction: number | null;
}

interface VenueAccuracyData {
  venueId: number;
  venueName: string;
  accuracyPercentage: number;
  totalFeedback: number;
  accurateCount: number;
  feedback: VenueFeedbackEntry[];
}

function isAccurate(predictedState: string, wasSunny: boolean): boolean {
  return (
    (wasSunny && predictedState === 'Sunny') ||
    (!wasSunny && predictedState !== 'Sunny')
  );
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Stockholm',
  });
}

export default function VenueAccuracyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuthContext();
  const [data, setData] = useState<VenueAccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/admin/accuracy/venues/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load');
        const json: VenueAccuracyData = await res.json();
        setData(json);
      })
      .catch(() => setError('Kunde inte ladda precision för denna restaurang'))
      .finally(() => setLoading(false));
  }, [token, id]);

  return (
    <>
      <Link
        href="/admin/accuracy"
        className="mb-4 inline-flex min-h-[48px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeftIcon className="size-4" />
        Tillbaka till precision
      </Link>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          <h1 className="mb-1 text-2xl font-bold text-foreground">
            {data.venueName}
          </h1>
          <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>
              Precision:{' '}
              <strong
                className={
                  data.accuracyPercentage >= 80
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }
              >
                {data.accuracyPercentage}%
              </strong>
            </span>
            <span>
              Feedback: <strong>{data.totalFeedback}</strong>
            </span>
            <span>
              Korrekt: <strong>{data.accurateCount}</strong>
            </span>
          </div>

          {data.feedback.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Ingen feedback för denna restaurang.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Feedback-historik (senaste 30 dagarna)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Datum</th>
                      <th className="px-4 py-3 font-medium">Prediktion</th>
                      <th className="px-4 py-3 font-medium">Var soligt?</th>
                      <th className="px-4 py-3 font-medium">Konfidens</th>
                      <th className="px-4 py-3 font-medium">Resultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.feedback.map((entry, i) => {
                      const accurate = isAccurate(
                        entry.predictedState,
                        entry.wasSunny
                      );
                      return (
                        <tr
                          key={i}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-4 py-3 text-foreground">
                            {formatDateTime(entry.date)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {entry.predictedState}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {entry.wasSunny ? 'Ja' : 'Nej'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {entry.confidenceAtPrediction != null
                              ? `${entry.confidenceAtPrediction}%`
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {accurate ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircleIcon className="size-4" />
                                Korrekt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <XCircleIcon className="size-4" />
                                Fel
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
