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
import { ArrowLeftIcon, TrashIcon, Undo2Icon, Redo2Icon, PencilIcon, ClipboardPasteIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { usePolygonEditor } from '@/lib/hooks/usePolygonEditor';

const PolygonEditor = dynamic(() => import('@/components/admin/PolygonEditor'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full rounded-xl" />,
});

interface VenueData {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  is_partner: boolean;
  booking_url: string | null;
  website_url: string | null;
  geometry: GeoJSON.Polygon | null;
  height_source: string | number | null;
}

const venueTypes = ['restaurant', 'cafe', 'bar'] as const;

function parseGeoJSON(raw: string): GeoJSON.Polygon | null {
  try {
    const geojson = JSON.parse(raw);

    if (geojson.type === 'Polygon') return geojson;

    if (geojson.type === 'Feature' && geojson.geometry?.type === 'Polygon') {
      return geojson.geometry;
    }

    if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
      const poly = geojson.features.find(
        (f: GeoJSON.Feature) => f.geometry?.type === 'Polygon'
      );
      if (poly) return poly.geometry as GeoJSON.Polygon;
    }

    if (Array.isArray(geojson)) {
      const ring = Array.isArray(geojson[0]?.[0]) ? geojson[0] : geojson;
      if (ring.length >= 3 && Array.isArray(ring[0]) && ring[0].length === 2) {
        const coords = [...ring];
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coords.push([...first]);
        }
        return { type: 'Polygon', coordinates: [coords] };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export default function AdminVenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuthContext();
  const router = useRouter();

  const [venue, setVenue] = useState<VenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isPartner, setIsPartner] = useState(false);
  const [bookingUrl, setBookingUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Polygon state — the venue's outdoor seating area geometry
  const [currentGeometry, setCurrentGeometry] = useState<GeoJSON.Polygon | null>(null);

  const editor = usePolygonEditor();

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    fetch(`/api/admin/venues/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Venue not found');
        const data: VenueData = await res.json();
        setVenue(data);
        setName(data.name);
        setSlug(data.slug || '');
        setType(data.type || '');
        setNeighborhood(data.neighborhood || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setWebsite(data.website || '');
        setDescription(data.description || '');
        setLatitude(data.latitude?.toString() || '');
        setLongitude(data.longitude?.toString() || '');
        setIsPartner(data.is_partner ?? false);
        setBookingUrl(data.booking_url ?? '');
        setWebsiteUrl(data.website_url ?? '');
        setCurrentGeometry(data.geometry ?? null);
      })
      .catch(() => setError('Kunde inte ladda restaurangen'))
      .finally(() => setLoading(false));
  }, [token, id]);

  // Build venues array for PolygonEditor (single venue polygon)
  const venuesForEditor = currentGeometry
    ? [{ id: 'main', name: name || 'Uteplats', geometry: currentGeometry }]
    : [];

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    // Build geometry from editor if user drew/edited a polygon
    let geometryToSave: GeoJSON.Polygon | null | undefined = undefined;

    if (editor.mode === 'idle' && editor.vertices.length >= 3) {
      // User just closed a drawn polygon
      geometryToSave = {
        type: 'Polygon',
        coordinates: [[...editor.vertices, editor.vertices[0]]],
      };
    } else if (editor.mode === 'editing' && editor.vertices.length >= 3) {
      // User is editing vertices
      geometryToSave = {
        type: 'Polygon',
        coordinates: [[...editor.vertices, editor.vertices[0]]],
      };
    } else if (editor.mode === 'selected' && editor.vertices.length >= 3) {
      // Selected polygon with possibly moved vertices
      geometryToSave = {
        type: 'Polygon',
        coordinates: [[...editor.vertices, editor.vertices[0]]],
      };
    }

    // If no editor changes, use current geometry (may have been set via paste)
    if (geometryToSave === undefined) {
      geometryToSave = currentGeometry;
    }

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
          address: address.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          description: description.trim() || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          is_partner: isPartner,
          booking_url: bookingUrl.trim() || null,
          website_url: websiteUrl.trim() || null,
          geometry: geometryToSave,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sparning misslyckades');
      }

      const updated: VenueData = await res.json();
      setVenue(updated);
      setCurrentGeometry(updated.geometry ?? null);
      editor.deselect();
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
        setCurrentGeometry(geometry);
      }
    }
  }, [editor]);

  const handleVenueClick = useCallback(
    (venueId: string) => {
      if (venueId === 'main' && currentGeometry) {
        const ring = currentGeometry.coordinates[0];
        const verts = ring.slice(0, -1) as [number, number][];
        editor.selectVenue(venueId, verts);
      }
    },
    [currentGeometry, editor]
  );

  const handleStartDrawing = useCallback(() => {
    editor.startDrawing();
  }, [editor]);

  const handleStartEditing = useCallback(() => {
    if (currentGeometry) {
      const ring = currentGeometry.coordinates[0];
      const verts = ring.slice(0, -1) as [number, number][];
      editor.selectVenue('main', verts);
      editor.startEditing();
    }
  }, [currentGeometry, editor]);

  const handleRemovePolygon = useCallback(() => {
    setCurrentGeometry(null);
    editor.deselect();
  }, [editor]);

  const handlePasteImport = useCallback(() => {
    setPasteError(null);
    const geometry = parseGeoJSON(pasteValue);
    if (!geometry) {
      setPasteError('Ingen polygon hittades. Klistra in GeoJSON från geojson.io, eller en koordinat-array.');
      return;
    }
    setCurrentGeometry(geometry);
    editor.deselect();
    setPasteOpen(false);
    setPasteValue('');
    setSuccessMsg('Polygon importerad — spara för att behålla');
    setTimeout(() => setSuccessMsg(null), 3000);
  }, [pasteValue, editor]);

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
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" data-testid="venue-error">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" data-testid="venue-success">
          {successMsg}
        </div>
      )}

      {/* Venue details form */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Grunduppgifter
        </h2>
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

          <div className="sm:col-span-2">
            <label htmlFor="venue-address" className="mb-1.5 block text-sm font-medium text-foreground">
              Adress
            </label>
            <Input
              id="venue-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-12"
              placeholder="T.ex. Haga Nygata 24, Göteborg"
            />
          </div>

          <div>
            <label htmlFor="venue-phone" className="mb-1.5 block text-sm font-medium text-foreground">
              Telefon
            </label>
            <Input
              id="venue-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12"
              placeholder="031-123 45 67"
            />
          </div>

          <div>
            <label htmlFor="venue-website" className="mb-1.5 block text-sm font-medium text-foreground">
              Hemsida
            </label>
            <Input
              id="venue-website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="h-12"
              placeholder="https://..."
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="venue-description" className="mb-1.5 block text-sm font-medium text-foreground">
              Beskrivning
            </label>
            <textarea
              id="venue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Kort beskrivning av uteplatsen..."
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
              data-testid="partner-checkbox"
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
                Partner hemsida
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
      </div>

      {/* Polygon editor — the venue's outdoor seating area */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Uteplatsens polygon</h2>
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

        <div className="overflow-hidden rounded-xl border border-border" style={{ height: '500px' }}>
          <PolygonEditor
            venueLatitude={venue?.latitude ?? null}
            venueLongitude={venue?.longitude ?? null}
            venues={venuesForEditor}
            mode={editor.mode}
            vertices={editor.vertices}
            selectedVenueId={editor.selectedVenueId}
            onMapClick={handleMapClick}
            onMapDblClick={handleMapDblClick}
            onVenueClick={handleVenueClick}
            onVertexDrag={editor.moveVertex}
          />
        </div>

        {/* Polygon actions */}
        <div className="flex flex-wrap gap-2">
          {!currentGeometry && editor.mode === 'idle' && (
            <Button size="sm" onClick={handleStartDrawing} className="min-h-[48px] gap-1.5">
              <PencilIcon className="size-4" />
              Rita polygon
            </Button>
          )}
          {currentGeometry && editor.mode === 'idle' && (
            <Button size="sm" variant="outline" onClick={handleStartEditing} className="min-h-[48px] gap-1.5">
              <PencilIcon className="size-4" />
              Redigera polygon
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setPasteValue(''); setPasteError(null); setPasteOpen(true); }}
            className="min-h-[48px] gap-1.5"
          >
            <ClipboardPasteIcon className="size-4" />
            Klistra in GeoJSON
          </Button>
          {currentGeometry && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemovePolygon}
              className="min-h-[48px] gap-1.5 text-destructive hover:text-destructive"
            >
              <TrashIcon className="size-4" />
              Ta bort polygon
            </Button>
          )}
        </div>

        {currentGeometry && (
          <p className="text-sm text-muted-foreground">
            {currentGeometry.coordinates[0].length - 1} hörn i polygonen
          </p>
        )}
      </div>

      {/* Save / delete actions */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={saving || !name.trim()} data-testid="save-venue-button">
          {saving ? 'Sparar...' : 'Spara'}
        </Button>
        <Button
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
          disabled={deleting}
          data-testid="delete-venue-button"
        >
          <TrashIcon data-icon="inline-start" />
          Ta bort
        </Button>
      </div>

      {/* Paste GeoJSON dialog */}
      <Dialog open={pasteOpen} onOpenChange={(open) => { if (!open) setPasteOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klistra in GeoJSON</DialogTitle>
            <DialogDescription>
              Kopiera GeoJSON-datan från{' '}
              <a
                href="https://geojson.io"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-2"
              >
                geojson.io
              </a>{' '}
              och klistra in nedan.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={pasteValue}
            onChange={(e) => { setPasteValue(e.target.value); setPasteError(null); }}
            placeholder='{"type":"FeatureCollection","features":[...]}'
            className="min-h-[160px] w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="GeoJSON-data"
          />
          {pasteError && (
            <p className="text-sm text-destructive">{pasteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasteOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handlePasteImport} disabled={!pasteValue.trim()}>
              Importera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete venue confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ta bort restaurang</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill ta bort &ldquo;{venue?.name}&rdquo;? Polygondata
              tas också bort. Detta kan inte ångras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} data-testid="confirm-delete-button">
              {deleting ? 'Tar bort...' : 'Ta bort'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
