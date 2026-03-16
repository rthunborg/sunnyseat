'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/lib/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { UtensilsIcon, MapPinIcon, BarChart3Icon, SunIcon } from 'lucide-react';

interface QualityOverview {
  totalVenues: number;
  mappedVenues: number;
  mappedPercentage: number;
  avgPatiosPerVenue: number;
  totalPatios: number;
}

export default function AdminDashboardPage() {
  const { token, user } = useAuthContext();
  const [overview, setOverview] = useState<QualityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/admin/venues/quality/overview', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load');
        const data: QualityOverview = await res.json();
        setOverview(data);
      })
      .catch(() => setError('Kunde inte ladda dashboard-data'))
      .finally(() => setLoading(false));
  }, [token]);

  const cards = overview
    ? [
        {
          label: 'Totalt restauranger',
          value: overview.totalVenues,
          icon: UtensilsIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        },
        {
          label: 'Kartlagda',
          value: `${overview.mappedVenues} (${overview.mappedPercentage}%)`,
          icon: MapPinIcon,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
        },
        {
          label: 'Totalt uteplatser',
          value: overview.totalPatios,
          icon: SunIcon,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        },
        {
          label: 'Snitt uteplatser/restaurang',
          value: overview.avgPatiosPerVenue,
          icon: BarChart3Icon,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50 dark:bg-purple-950/30',
        },
      ]
    : [];

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Välkommen, {user?.username}!
      </p>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-5"
              >
                <Skeleton className="mb-3 h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))
          : cards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className={`flex size-8 items-center justify-center rounded-lg ${card.bgColor}`}
                    >
                      <Icon className={`size-4 ${card.color}`} />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {card.label}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {card.value}
                  </p>
                </div>
              );
            })}
      </div>

      {/* Quick links */}
      <h2 className="mb-4 text-lg font-semibold text-foreground">Snabblänkar</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: 'Restauranger',
            description: 'Hantera restauranger och uteplatser',
            href: '/admin/venues',
          },
          {
            title: 'Import',
            description: 'Importera byggnads- och venuedata',
            href: '/admin/import',
          },
          {
            title: 'Precision',
            description: 'Visa precisionsstatistik',
            href: '/admin/accuracy',
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:bg-muted/50"
          >
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {card.title}
            </h3>
            <p className="text-sm text-muted-foreground">{card.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
