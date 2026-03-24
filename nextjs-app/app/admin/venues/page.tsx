'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusIcon, SearchIcon } from 'lucide-react';

interface Venue {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
}

type FilterType = 'all' | 'restaurant' | 'cafe' | 'bar';
type FilterMapped = 'all' | 'mapped' | 'unmapped';

const typeFilters: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'restaurant', label: 'Restaurang' },
  { value: 'cafe', label: 'Café' },
  { value: 'bar', label: 'Bar' },
];

const mappedFilters: { value: FilterMapped; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'mapped', label: 'Kartlagda' },
  { value: 'unmapped', label: 'Ej kartlagda' },
];

export default function AdminVenuesPage() {
  const { token } = useAuthContext();
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [mappedCounts, setMappedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [mappedFilter, setMappedFilter] = useState<FilterMapped>('all');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchVenues = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (mappedFilter !== 'all') params.set('mapped', mappedFilter === 'mapped' ? 'true' : 'false');

      const res = await fetch(`/api/admin/venues?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data: Venue[] = await res.json();
      setVenues(data);
    } catch {
      setError('Kunde inte ladda restauranger');
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearch, typeFilter, mappedFilter]);

  // Fetch mapped venue counts once
  useEffect(() => {
    if (!token) return;
    // Mark venues as mapped/unmapped based on the mapped filter behavior
    const fetchMappedVenues = async () => {
      try {
        const res = await fetch('/api/admin/venues?mapped=true', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const mapped: Venue[] = await res.json();
          const counts: Record<string, number> = {};
          for (const v of mapped) {
            counts[v.id] = 1; // Venue is mapped
          }
          setMappedCounts(counts);
        }
      } catch {
        // ignore
      }
    };
    fetchMappedVenues();
  }, [token]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Restauranger</h1>
        <Button onClick={() => router.push('/admin/venues/new')} data-testid="add-venue-button">
          <PlusIcon data-icon="inline-start" />
          Lägg till restaurang
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Sök restauranger..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 pl-10"
            aria-label="Sök restauranger"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="self-center text-xs font-medium text-muted-foreground">Typ:</span>
          {typeFilters.map((f) => (
            <Button
              key={f.value}
              variant={typeFilter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
          <span className="ml-2 self-center text-xs font-medium text-muted-foreground">Status:</span>
          {mappedFilters.map((f) => (
            <Button
              key={f.value}
              variant={mappedFilter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMappedFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : venues.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-muted-foreground">Inga restauranger hittades</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border" data-testid="venue-table">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Namn
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  Typ
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  Område
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {venues.map((venue) => {
                const isMapped = Boolean(mappedCounts[venue.id]);
                return (
                  <tr
                    key={venue.id}
                    className="cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-muted/50"
                    onClick={() => router.push(`/admin/venues/${venue.id}`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/admin/venues/${venue.id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {venue.name}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground capitalize sm:table-cell">
                      {venue.type || '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {venue.neighborhood || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          isMapped
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                        }`}
                      >
                        {isMapped ? 'Kartlagd' : 'Ej kartlagd'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
