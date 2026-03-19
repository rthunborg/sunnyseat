'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

const venueTypes = ['restaurant', 'cafe', 'bar'] as const;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

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

    // Support raw coordinate ring: [[lng,lat], ...]
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

export default function AdminVenueNewPage() {
  const { token } = useAuthContext();
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [type, setType] = useState('restaurant');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [geojsonText, setGeojsonText] = useState('');
  const [geojsonError, setGeojsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (autoSlug) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value);
    setAutoSlug(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !name.trim()) return;

    // Parse GeoJSON if provided
    let geometry: GeoJSON.Polygon | null = null;
    if (geojsonText.trim()) {
      geometry = parseGeoJSON(geojsonText);
      if (!geometry) {
        setGeojsonError('Ogiltig GeoJSON. Klistra in en Polygon från geojson.io eller en koordinat-array.');
        return;
      }
    }
    setGeojsonError(null);

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/venues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || slugify(name),
          type: type || null,
          neighborhood: neighborhood.trim() || null,
          address: address.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          description: description.trim() || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          geometry,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.detail || 'Skapandet misslyckades');
      }

      const created = await res.json();
      router.push(`/admin/venues/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Skapandet misslyckades');
    } finally {
      setSaving(false);
    }
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
        <h1 className="text-2xl font-bold text-foreground">Lägg till restaurang</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" data-testid="venue-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Grunduppgifter
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-venue-name" className="mb-1.5 block text-sm font-medium text-foreground">
                Namn *
              </label>
              <Input
                id="new-venue-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="h-12"
                placeholder="T.ex. Café Husaren"
              />
            </div>

            <div>
              <label htmlFor="new-venue-slug" className="mb-1.5 block text-sm font-medium text-foreground">
                Slug
              </label>
              <Input
                id="new-venue-slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="h-12"
                placeholder="cafe-husaren"
              />
            </div>

            <div>
              <label htmlFor="new-venue-type" className="mb-1.5 block text-sm font-medium text-foreground">
                Typ
              </label>
              <select
                id="new-venue-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-12 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {venueTypes.map((t) => (
                  <option key={t} value={t}>
                    {t === 'restaurant' ? 'Restaurang' : t === 'cafe' ? 'Café' : 'Bar'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="new-venue-neighborhood" className="mb-1.5 block text-sm font-medium text-foreground">
                Område
              </label>
              <Input
                id="new-venue-neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="h-12"
                placeholder="T.ex. Haga"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="new-venue-address" className="mb-1.5 block text-sm font-medium text-foreground">
                Adress
              </label>
              <Input
                id="new-venue-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-12"
                placeholder="T.ex. Haga Nygata 24, Göteborg"
              />
            </div>

            <div>
              <label htmlFor="new-venue-phone" className="mb-1.5 block text-sm font-medium text-foreground">
                Telefon
              </label>
              <Input
                id="new-venue-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12"
                placeholder="031-123 45 67"
              />
            </div>

            <div>
              <label htmlFor="new-venue-website" className="mb-1.5 block text-sm font-medium text-foreground">
                Hemsida
              </label>
              <Input
                id="new-venue-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="h-12"
                placeholder="https://..."
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="new-venue-description" className="mb-1.5 block text-sm font-medium text-foreground">
                Beskrivning
              </label>
              <textarea
                id="new-venue-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Kort beskrivning av uteplatsen..."
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Plats
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-venue-lat" className="mb-1.5 block text-sm font-medium text-foreground">
                Latitud
              </label>
              <Input
                id="new-venue-lat"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="h-12"
                placeholder="57.7089"
              />
            </div>

            <div>
              <label htmlFor="new-venue-lng" className="mb-1.5 block text-sm font-medium text-foreground">
                Longitud
              </label>
              <Input
                id="new-venue-lng"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="h-12"
                placeholder="11.9746"
              />
            </div>
          </div>
        </div>

        {/* Polygon (GeoJSON paste) */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Polygon (uteplatsens yta)
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Klistra in GeoJSON för uteplatsens polygon. Du kan rita en polygon på{' '}
            <a
              href="https://geojson.io"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-2"
            >
              geojson.io
            </a>{' '}
            och kopiera JSON-datan hit. Stöder FeatureCollection, Feature, Polygon, eller en ren koordinat-array.
          </p>
          <textarea
            id="new-venue-geojson"
            value={geojsonText}
            onChange={(e) => { setGeojsonText(e.target.value); setGeojsonError(null); }}
            rows={5}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder='{"type":"FeatureCollection","features":[...]}'
            aria-label="GeoJSON-data"
          />
          {geojsonError && (
            <p className="mt-2 text-sm text-destructive">{geojsonError}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Valfritt — du kan lägga till/ändra polygonen efter att restaurangen skapats.
          </p>
        </div>

        <div>
          <Button type="submit" disabled={saving || !name.trim()} data-testid="create-venue-button">
            {saving ? 'Skapar...' : 'Skapa restaurang'}
          </Button>
        </div>
      </form>
    </>
  );
}
