'use client';

import { useState } from 'react';
import { useAuthContext } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/button';
import { CheckCircleIcon, AlertTriangleIcon, DownloadIcon, LoaderIcon } from 'lucide-react';

interface OsmImportResult {
  success: boolean;
  city: string;
  totalFromOsm: number;
  imported: number;
  skipped: number;
  errors: string[];
  duration: number;
}

export default function AdminOsmImportPage() {
  const { token } = useAuthContext();
  const [city, setCity] = useState('gothenburg');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OsmImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  async function handleImport() {
    if (!token) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/admin/osm/ingest', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ city }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `Import misslyckades (${res.status})`);
      }

      const data: OsmImportResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import misslyckades');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">OSM-import</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Importera restauranger, caféer och barer med uteservering från OpenStreetMap.
        Nya ställen läggs till som kandidater (overifierade).
      </p>

      {/* City selector */}
      <div className="mb-4">
        <label htmlFor="city-select" className="mb-1 block text-sm font-medium text-foreground">
          Stad
        </label>
        <select
          id="city-select"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="min-h-[48px] w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground md:w-64"
        >
          <option value="gothenburg">Göteborg</option>
        </select>
      </div>

      {/* Import button */}
      <Button
        onClick={handleImport}
        disabled={loading}
        className="min-h-[48px]"
      >
        {loading ? (
          <>
            <LoaderIcon className="mr-2 size-4 animate-spin" />
            Importerar från OSM...
          </>
        ) : (
          <>
            <DownloadIcon className="mr-2 size-4" />
            Kör OSM-import
          </>
        )}
      </Button>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4" role="alert">
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Import misslyckades</p>
            <p className="mt-1 text-xs text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      {/* Result summary */}
      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
            <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-medium text-foreground">OSM-import klar</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>Hämtade från OSM: <strong className="text-foreground">{result.totalFromOsm}</strong></li>
                <li>Importerade: <strong className="text-green-600">{result.imported}</strong></li>
                <li>Överhoppade (duplicerade): <strong className="text-amber-600">{result.skipped}</strong></li>
                {result.errors.length > 0 && (
                  <li>Fel: <strong className="text-destructive">{result.errors.length}</strong></li>
                )}
                <li>Tid: <strong className="text-foreground">{(result.duration / 1000).toFixed(1)}s</strong></li>
              </ul>
            </div>
          </div>

          {/* Error details */}
          {result.errors.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowErrors(!showErrors)}
                className="min-h-[48px] text-sm font-medium text-primary hover:underline"
              >
                {showErrors ? 'Dölj feldetaljer' : 'Visa feldetaljer'}
              </button>
              {showErrors && (
                <ul className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  {result.errors.map((err, i) => (
                    <li key={i} className="py-0.5">{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <Button
            onClick={() => { setResult(null); setError(null); }}
            variant="outline"
            className="min-h-[48px]"
          >
            Kör igen
          </Button>
        </div>
      )}
    </div>
  );
}
