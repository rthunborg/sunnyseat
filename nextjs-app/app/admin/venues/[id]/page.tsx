'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { ArrowLeftIcon, TrashIcon, Undo2Icon, Redo2Icon } from 'lucide-react';
import dynamic from 'next/dynamic';
import PatioList from '@/components/admin/PatioList';
import PatioForm from '@/components/admin/PatioForm';
import { usePolygonEditor } from '@/lib/hooks/usePolygonEditor';

const PolygonEditor = dynamic(() => import('@/components/admin/PolygonEditor'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full rounded-xl" />,
});

interface Venue {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  website: string | null;
  is_partner: boolean;
  booking_url: string | null;
  website_url: string | null;
}

interface PatioData {
  id: string;
  name: string;
  venue_id: string;
  orientation: string | null;
  has_awning: boolean;
  geometry: GeoJSON.Polygon | null;
  height_source: string | null;
}

const venueTypes = ['restaurant', 'cafe', 'bar'] as const;

export default function AdminVenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuthContext();
  const router = useRouter();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [patios, setPatios] = useState<PatioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [patioSaving, setPatioSaving] = useState(false);
  const [patioDeleting, setPatioDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatio, setEditingPatio] = useState<PatioData | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isPartner, setIsPartner] = useState(false);
  const [bookingUrl, setBookingUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const editor = usePolygonEditor();

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/admin/venues/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/admin/venues/${id}/patios`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([venueRes, patioRes]) => {
        if (!venueRes.ok) throw new Error('Venue not found');
        const venueData: Venue = await venueRes.json();
        setVenue(venueData);
        setName(venueData.name);
        setSlug(venueData.slug || '');
        setType(venueData.type || '');
        setNeighborhood(venueData.neighborhood || '');
        setLatitude(venueData.latitude?.toString() || '');
        setLongitude(venueData.longitude?.toString() || '');
        setIsPartner(venueData.is_partner ?? false);
        setBookingUrl(venueData.booking_url ?? '');
        setWebsiteUrl(venueData.website_url ?? '');

        if (patioRes.ok) {
          const patioData: PatioData[] = await patioRes.json();
          setPatios(patioData);
        }
      })
      .catch(() => setError('Kunde inte ladda restaurangen'))
      .finally(() => setLoading(false));
  }, [token, id]);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/admin/venues/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          type: type || null,
          neighborhood: neighborhood.trim() || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          is_partner: isPartner,
          booking_url: bookingUrl.trim() || null,
          website_url: websiteUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sparning misslyckades');
      }

      const updated: Venue = await res.json();
      setVenue(updated);
      setSuccessMsg('Restaurang sparad');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sparning misslyckades');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/venues/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Borttagning misslyckades');
      router.push('/admin/venues');
    } catch {
      setError('Kunde inte ta bort restaurangen');
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  // Polygon editor handlers
  const handleMapClick = useCallback(
    (lngLat: [number, number]) => {
      if (editor.mode === 'drawing') {
        editor.addVertex(lngLat);
      }
    },
    [editor]
  );

  const handleMapDblClick = useCallback(() => {
    if (editor.mode === 'drawing') {
      const geometry = editor.closePolygon();
      if (geometry) {
        // Open form to save new patio
        setEditingPatio(null);
        setFormOpen(true);
      }
    }
  }, [editor]);

  const handlePatioClick = useCallback(
    (patioId: string) => {
      const patio = patios.find((p) => p.id === patioId);
      if (patio?.geometry) {
        const ring = patio.geometry.coordinates[0];
        // Remove closing vertex (last == first)
        const verts = ring.slice(0, -1) as [number, number][];
        editor.selectPatio(patioId, verts);
      }
    },
    [patios, editor]
  );

  const handlePatioSelect = useCallback(
    (patioId: string) => {
      handlePatioClick(patioId);
    },
    [handlePatioClick]
  );

  const handlePatioEdit = useCallback(
    (patioId: string) => {
      const patio = patios.find((p) => p.id === patioId);
      if (!patio) return;
      handlePatioClick(patioId);
      editor.startEditing();
      setEditingPatio(patio);
      setFormOpen(true);
    },
    [patios, handlePatioClick, editor]
  );

  const handlePatioDelete = useCallback(
    async (patioId: string) => {
      if (!token) return;
      setPatioDeleting(true);

      try {
        const res = await fetch(`/api/admin/venues/${id}/patios/${patioId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Borttagning misslyckades');

        setPatios((prev) => prev.filter((p) => p.id !== patioId));
        editor.deleteSelected();
        setSuccessMsg('Uteplats borttagen');
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch {
        setError('Kunde inte ta bort uteplatsen');
      } finally {
        setPatioDeleting(false);
      }
    },
    [token, id, editor]
  );

  const handleNewPatio = useCallback(() => {
    editor.startDrawing();
  }, [editor]);

  const handleFormSave = useCallback(
    async (data: { name: string; height_source: string | null }) => {
      if (!token) return;
      setPatioSaving(true);

      try {
        if (editingPatio) {
          // Update existing patio
          const geometry: GeoJSON.Polygon = {
            type: 'Polygon',
            coordinates: [[...editor.vertices, editor.vertices[0]]],
          };

          const res = await fetch(
            `/api/admin/venues/${id}/patios/${editingPatio.id}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ ...data, geometry }),
            }
          );

          if (!res.ok) throw new Error('Uppdatering misslyckades');
          const updated: PatioData = await res.json();
          setPatios((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        } else {
          // Create new patio
          const geometry: GeoJSON.Polygon = {
            type: 'Polygon',
            coordinates: [[...editor.vertices, editor.vertices[0]]],
          };

          const res = await fetch(`/api/admin/venues/${id}/patios`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ...data, geometry }),
          });

          if (!res.ok) throw new Error('Skapande misslyckades');
          const created: PatioData = await res.json();
          setPatios((prev) => [...prev, created]);
        }

        setFormOpen(false);
        setEditingPatio(null);
        editor.deselect();
        setSuccessMsg(editingPatio ? 'Uteplats uppdaterad' : 'Uteplats skapad');
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sparning misslyckades');
      } finally {
        setPatioSaving(false);
      }
    },
    [token, id, editingPatio, editor]
  );

  const handleFormCancel = useCallback(() => {
    setFormOpen(false);
    setEditingPatio(null);
    editor.deselect();
  }, [editor]);

  const handleImportGeoJSON = useCallback(
    async (features: GeoJSON.Feature[]) => {
      if (!token) return;
      setPatioSaving(true);

      try {
        const created: PatioData[] = [];
        for (let i = 0; i < features.length; i++) {
          const f = features[i];
          const featureName =
            (f.properties?.name as string) || `Importerad ${i + 1}`;

          const res = await fetch(`/api/admin/venues/${id}/patios`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: featureName,
              geometry: f.geometry,
              height_source: (f.properties?.height_source as string) || null,
            }),
          });

          if (res.ok) {
            const data: PatioData = await res.json();
            created.push(data);
          }
        }

        setPatios((prev) => [...prev, ...created]);
        setSuccessMsg(`${created.length} uteplats(er) importerade`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch {
        setError('Import misslyckades');
      } finally {
        setPatioSaving(false);
      }
    },
    [token, id]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error && !venue) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Link
          href="/admin/venues"
          className="mb-4 inline-flex min-h-[48px] items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Tillbaka till restauranger
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          {venue?.name || 'Redigera restaurang'}
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
          {successMsg}
        </div>
      )}

      {/* Edit form */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="venue-name" className="mb-1.5 block text-sm font-medium text-foreground">
              Namn
            </label>
            <Input
              id="venue-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
            />
          </div>

          <div>
            <label htmlFor="venue-slug" className="mb-1.5 block text-sm font-medium text-foreground">
              Slug
            </label>
            <Input
              id="venue-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="h-12"
            />
          </div>

          <div>
            <label htmlFor="venue-type" className="mb-1.5 block text-sm font-medium text-foreground">
              Typ
            </label>
            <select
              id="venue-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-12 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">—</option>
              {venueTypes.map((t) => (
                <option key={t} value={t}>
                  {t === 'restaurant' ? 'Restaurang' : t === 'cafe' ? 'Café' : 'Bar'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="venue-neighborhood" className="mb-1.5 block text-sm font-medium text-foreground">
              Område
            </label>
            <Input
              id="venue-neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="h-12"
            />
          </div>

          <div>
            <label htmlFor="venue-lat" className="mb-1.5 block text-sm font-medium text-foreground">
              Latitud
            </label>
            <Input
              id="venue-lat"
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="h-12"
            />
          </div>

          <div>
            <label htmlFor="venue-lng" className="mb-1.5 block text-sm font-medium text-foreground">
              Longitud
            </label>
            <Input
              id="venue-lng"
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="h-12"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <label htmlFor="venue-partner" className="flex min-h-[48px] cursor-pointer items-center gap-3">
            <input
              id="venue-partner"
              type="checkbox"
              checked={isPartner}
              onChange={(e) => setIsPartner(e.target.checked)}
              className="size-5 rounded border-input accent-amber-500"
            />
            <span className="text-sm font-medium text-foreground">
              Partner (Gyllene markör)
            </span>
          </label>
        </div>

        {isPartner && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="venue-booking-url" className="mb-1.5 block text-sm font-medium text-foreground">
                Boknings-URL
              </label>
              <Input
                id="venue-booking-url"
                type="url"
                placeholder="https://..."
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                className="h-12"
              />
            </div>
            <div>
              <label htmlFor="venue-website-url" className="mb-1.5 block text-sm font-medium text-foreground">
                Hemsida-URL
              </label>
              <Input
                id="venue-website-url"
                type="url"
                placeholder="https://..."
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="h-12"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Sparar...' : 'Spara'}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={deleting}
          >
            <TrashIcon data-icon="inline-start" />
            Ta bort
          </Button>
        </div>
      </div>

      {/* Patio polygon editor */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Polygoneditor</h2>
          <div className="flex gap-2">
            {editor.mode === 'drawing' && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                Ritläge — klicka för hörn, dubbelklicka för att stänga
              </span>
            )}
            {editor.mode === 'editing' && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Redigeringsläge — dra hörn för att flytta
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={editor.undo}
              disabled={!editor.canUndo}
              className="min-h-[48px]"
              aria-label="Ångra"
            >
              <Undo2Icon className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={editor.redo}
              disabled={!editor.canRedo}
              className="min-h-[48px]"
              aria-label="Gör om"
            >
              <Redo2Icon className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-xl border border-border" style={{ height: '500px' }}>
            <PolygonEditor
              venueLatitude={venue?.latitude ?? null}
              venueLongitude={venue?.longitude ?? null}
              patios={patios}
              mode={editor.mode}
              vertices={editor.vertices}
              selectedPatioId={editor.selectedPatioId}
              onMapClick={handleMapClick}
              onMapDblClick={handleMapDblClick}
              onPatioClick={handlePatioClick}
              onVertexDrag={editor.moveVertex}
            />
          </div>

          <div className="space-y-4">
            <PatioList
              patios={patios}
              selectedPatioId={editor.selectedPatioId}
              onSelect={handlePatioSelect}
              onEdit={handlePatioEdit}
              onDelete={handlePatioDelete}
              onNewPatio={handleNewPatio}
              onImportGeoJSON={handleImportGeoJSON}
              deleting={patioDeleting}
            />
          </div>
        </div>
      </div>

      {/* Patio metadata form dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && handleFormCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPatio ? 'Redigera uteplats' : 'Ny uteplats'}
            </DialogTitle>
          </DialogHeader>
          <PatioForm
            initialName={editingPatio?.name || ''}
            initialHeightSource={editingPatio?.height_source || null}
            vertexCount={editor.vertices.length}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
            saving={patioSaving}
          />
        </DialogContent>
      </Dialog>

      {/* Delete venue confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ta bort restaurang</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill ta bort &ldquo;{venue?.name}&rdquo;? Alla tillhörande
              uteplatser tas också bort. Detta kan inte ångras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Tar bort...' : 'Ta bort'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
