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

export default function AdminVenueNewPage() {
  const { token } = useAuthContext();
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [type, setType] = useState('restaurant');
  const [neighborhood, setNeighborhood] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
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
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
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
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6">
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

        <p className="mt-4 text-sm text-muted-foreground">
          Efter att restaurangen skapats kan du rita uteplatser som polygoner på kartan, eller klistra in GeoJSON från{' '}
          <a
            href="https://geojson.io"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-2"
          >
            geojson.io
          </a>.
        </p>

        <div className="mt-4">
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Skapar...' : 'Skapa restaurang'}
          </Button>
        </div>
      </form>
    </>
  );
}
