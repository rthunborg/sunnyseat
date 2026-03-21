'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircleIcon, XCircleIcon, PencilIcon, SaveIcon, XIcon } from 'lucide-react';

interface VenueRow {
  id: string;
  name: string;
  VerificationStatus: number;
  latitude: number | null;
  longitude: number | null;
  lat: number | null;
  lng: number | null;
}

type FilterStatus = 'all' | 'candidate' | 'verified';

const statusFilters: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'candidate', label: 'Kandidater' },
  { value: 'verified', label: 'Verifierade' },
];

export default function AdminVerificationPage() {
  const { token, user } = useAuthContext();
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [confirmCounts, setConfirmCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const fetchVenues = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/venues', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data: VenueRow[] = await res.json();
      setVenues(data);
    } catch {
      setError('Kunde inte ladda restauranger');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  // Fetch confirmation counts for all venues
  useEffect(() => {
    if (!token || venues.length === 0) return;

    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      // Batch fetch - get all confirmations grouped
      // Since we don't have a bulk endpoint, fetch for candidate venues only
      const candidates = venues.filter((v) => v.VerificationStatus === 0);
      await Promise.all(
        candidates.map(async (v) => {
          try {
            const res = await fetch(`/api/venues/${v.id}/confirm`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              counts[v.id] = data.totalConfirmations ?? 0;
            }
          } catch {
            // skip
          }
        })
      );
      setConfirmCounts(counts);
    };

    fetchCounts();
  }, [token, venues]);

  const filteredVenues = venues.filter((v) => {
    if (filter === 'candidate') return v.VerificationStatus === 0;
    if (filter === 'verified') return v.VerificationStatus === 1;
    return true;
  });

  async function logAudit(action: string, venueId: string, details: Record<string, unknown>) {
    if (!token || !user) return;
    try {
      await fetch('/api/admin/audit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_user: user.username,
          action,
          venue_id: venueId,
          details,
        }),
      });
    } catch {
      // Audit log failure should not block the main action
    }
  }

  async function toggleVerification(venue: VenueRow) {
    if (!token) return;
    const newStatus = venue.VerificationStatus === 1 ? 0 : 1;
    setSaving(venue.id);

    try {
      const res = await fetch(`/api/admin/venues/${venue.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ VerificationStatus: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update');

      await logAudit(
        newStatus === 1 ? 'verify_venue' : 'unverify_venue',
        venue.id,
        { previous_status: venue.VerificationStatus, new_status: newStatus }
      );

      setVenues((prev) =>
        prev.map((v) =>
          v.id === venue.id ? { ...v, VerificationStatus: newStatus } : v
        )
      );
    } catch {
      setError('Kunde inte uppdatera status');
    } finally {
      setSaving(null);
    }
  }

  function startEdit(venue: VenueRow) {
    setEditingId(venue.id);
    setEditLat(String(venue.lat ?? venue.latitude ?? ''));
    setEditLng(String(venue.lng ?? venue.longitude ?? ''));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditLat('');
    setEditLng('');
  }

  async function saveCoords(venue: VenueRow) {
    if (!token) return;
    const lat = parseFloat(editLat);
    const lng = parseFloat(editLng);

    if (isNaN(lat) || isNaN(lng)) {
      setError('Ogiltiga koordinater');
      return;
    }

    setSaving(venue.id);
    try {
      const res = await fetch(`/api/admin/venues/${venue.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lat, lng, latitude: lat, longitude: lng }),
      });

      if (!res.ok) throw new Error('Failed to update');

      await logAudit('edit_coordinates', venue.id, {
        previous: { lat: venue.lat, lng: venue.lng },
        new: { lat, lng },
      });

      setVenues((prev) =>
        prev.map((v) =>
          v.id === venue.id ? { ...v, lat, lng, latitude: lat, longitude: lng } : v
        )
      );
      setEditingId(null);
    } catch {
      setError('Kunde inte spara koordinater');
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Verifiering</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Granska och verifiera restauranger. Kandidater kommer från OSM-import.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="self-center text-xs font-medium text-muted-foreground">Status:</span>
        {statusFilters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => setError(null)}
            aria-label="Stäng felmeddelande"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredVenues.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-muted-foreground">Inga restauranger hittades</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Namn</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="hidden px-4 py-3 text-center font-medium text-muted-foreground sm:table-cell">
                  Bekräftelser
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  Lat
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  Lng
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {filteredVenues.map((venue) => {
                const isVerified = venue.VerificationStatus === 1;
                const isEditing = editingId === venue.id;
                const isSaving = saving === venue.id;
                const count = confirmCounts[venue.id] ?? 0;

                return (
                  <tr
                    key={venue.id}
                    className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{venue.name}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={isVerified ? 'default' : 'secondary'}>
                        {isVerified ? 'Verifierad' : 'Kandidat'}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-center sm:table-cell">
                      <span className="tabular-nums">{count}</span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {isEditing ? (
                        <Input
                          value={editLat}
                          onChange={(e) => setEditLat(e.target.value)}
                          className="h-8 w-28"
                          aria-label="Latitud"
                          type="number"
                          step="any"
                        />
                      ) : (
                        <span className="tabular-nums text-muted-foreground">
                          {(venue.lat ?? venue.latitude)?.toFixed(6) ?? '—'}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {isEditing ? (
                        <Input
                          value={editLng}
                          onChange={(e) => setEditLng(e.target.value)}
                          className="h-8 w-28"
                          aria-label="Longitud"
                          type="number"
                          step="any"
                        />
                      ) : (
                        <span className="tabular-nums text-muted-foreground">
                          {(venue.lng ?? venue.longitude)?.toFixed(6) ?? '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => saveCoords(venue)}
                              disabled={isSaving}
                              aria-label="Spara koordinater"
                            >
                              <SaveIcon className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={cancelEdit}
                              aria-label="Avbryt redigering"
                            >
                              <XIcon className="size-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => toggleVerification(venue)}
                              disabled={isSaving}
                              aria-label={isVerified ? 'Avverifiera' : 'Verifiera'}
                            >
                              {isVerified ? (
                                <XCircleIcon className="size-4 text-destructive" />
                              ) : (
                                <CheckCircleIcon className="size-4 text-emerald-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => startEdit(venue)}
                              aria-label="Redigera koordinater"
                            >
                              <PencilIcon className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
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
