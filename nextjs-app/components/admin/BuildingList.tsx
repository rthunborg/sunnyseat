'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/lib/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, CheckIcon, XIcon, Trash2Icon } from 'lucide-react';

interface Building {
  Id: number;
  Height: number;
  HeightM: number | null;
  HeightSource: number;
  Source: string;
  QualityScore: number;
  ExternalId: string | null;
  BuildingType: string | null;
  AdminHeightOverride: number | null;
  UpdatedBy: string | null;
}

export default function BuildingList() {
  const { token } = useAuthContext();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const limit = 20;

  const fetchBuildings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/buildings?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Kunde inte ladda byggnader');
      const data = await res.json();
      setBuildings(data.buildings);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fel vid laddning');
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  function effectiveHeight(b: Building): number {
    return b.AdminHeightOverride ?? b.HeightM ?? Number(b.Height);
  }

  function startEdit(b: Building) {
    setEditingId(b.Id);
    setEditValue(String(effectiveHeight(b)));
  }

  async function saveHeight(id: number) {
    if (!token) return;
    const h = parseFloat(editValue);
    if (isNaN(h) || h < 0) return;

    try {
      const res = await fetch(`/api/admin/buildings/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ height: h }),
      });
      if (!res.ok) throw new Error('Kunde inte spara');
      const updated = await res.json();
      setBuildings((prev) => prev.map((b) => (b.Id === id ? updated : b)));
    } catch {
      // keep editing state on error
    }
    setEditingId(null);
  }

  async function deleteBuilding(id: number) {
    if (!token) return;
    if (!confirm('Ta bort byggnad?')) return;

    try {
      await fetch(`/api/admin/buildings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setBuildings((prev) => prev.filter((b) => b.Id !== id));
      setTotal((t) => t - 1);
    } catch {
      // silent
    }
  }

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Höjd (m)</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Källa</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Typ</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Kvalitet</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((b) => (
              <tr key={b.Id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 tabular-nums text-foreground">{b.Id}</td>
                <td className="px-3 py-2">
                  {editingId === b.Id ? (
                    <span className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveHeight(b.Id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="h-8 w-20"
                        min={0}
                        step={0.1}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => saveHeight(b.Id)}
                        className="min-h-[32px] min-w-[32px] rounded p-1 text-green-600 hover:bg-green-50"
                        aria-label="Spara"
                      >
                        <CheckIcon className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="min-h-[32px] min-w-[32px] rounded p-1 text-muted-foreground hover:bg-muted"
                        aria-label="Avbryt"
                      >
                        <XIcon className="size-4" />
                      </button>
                    </span>
                  ) : (
                    <span className="tabular-nums text-foreground">
                      {effectiveHeight(b).toFixed(1)}
                      {b.AdminHeightOverride !== null && (
                        <span className="ml-1 text-xs text-amber-600" title="Manuellt överskridande">*</span>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{b.Source}</td>
                <td className="px-3 py-2 text-muted-foreground">{b.BuildingType ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">
                  {(Number(b.QualityScore) * 100).toFixed(0)}%
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(b)}
                      className="min-h-[32px] min-w-[32px] rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Ändra höjd för byggnad ${b.Id}`}
                    >
                      <PencilIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBuilding(b.Id)}
                      className="min-h-[32px] min-w-[32px] rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Ta bort byggnad ${b.Id}`}
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {buildings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Inga byggnader hittades
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Visar {(page - 1) * limit + 1}–{Math.min(page * limit, total)} av {total}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Föregående sida"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Nästa sida"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
