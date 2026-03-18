'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PencilIcon, TrashIcon, PlusIcon, UploadIcon, ClipboardPasteIcon } from 'lucide-react';
import { useState } from 'react';

interface PatioItem {
  id: string;
  name: string;
  geometry: GeoJSON.Polygon | null;
  height_source: string | null;
}

interface PatioListProps {
  patios: PatioItem[];
  selectedPatioId: string | null;
  onSelect: (patioId: string) => void;
  onEdit: (patioId: string) => void;
  onDelete: (patioId: string) => void;
  onNewPatio: () => void;
  onImportGeoJSON: (features: GeoJSON.Feature[]) => void;
  deleting?: boolean;
}

function vertexCount(geometry: GeoJSON.Polygon | null): number {
  if (!geometry || !geometry.coordinates || !geometry.coordinates[0]) return 0;
  // GeoJSON polygon ring has first==last, so subtract 1
  return Math.max(0, geometry.coordinates[0].length - 1);
}

export default function PatioList({
  patios,
  selectedPatioId,
  onSelect,
  onEdit,
  onDelete,
  onNewPatio,
  onImportGeoJSON,
  deleting = false,
}: PatioListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patioToDelete = patios.find((p) => p.id === deleteId);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const geojson = JSON.parse(event.target?.result as string);
        const features: GeoJSON.Feature[] = [];

        if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
          for (const f of geojson.features) {
            if (f.geometry?.type === 'Polygon') {
              features.push(f);
            }
          }
        } else if (geojson.type === 'Feature' && geojson.geometry?.type === 'Polygon') {
          features.push(geojson);
        } else if (geojson.type === 'Polygon') {
          features.push({ type: 'Feature', properties: {}, geometry: geojson });
        }

        if (features.length > 0) {
          onImportGeoJSON(features);
        }
      } catch {
        // Invalid JSON — ignore
      }
    };
    reader.readAsText(file);
    // Reset so re-uploading same file works
    e.target.value = '';
  }

  function handlePasteImport() {
    setPasteError(null);
    try {
      const geojson = JSON.parse(pasteValue);
      const features: GeoJSON.Feature[] = [];

      if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
        for (const f of geojson.features) {
          if (f.geometry?.type === 'Polygon') {
            features.push(f);
          }
        }
      } else if (geojson.type === 'Feature' && geojson.geometry?.type === 'Polygon') {
        features.push(geojson);
      } else if (geojson.type === 'Polygon') {
        features.push({ type: 'Feature', properties: {}, geometry: geojson });
      } else if (Array.isArray(geojson)) {
        // Support pasting a raw coordinates ring: [[lng,lat], ...] or [[[lng,lat], ...]]
        const ring = Array.isArray(geojson[0]?.[0]) ? geojson[0] : geojson;
        if (ring.length >= 3 && Array.isArray(ring[0]) && ring[0].length === 2) {
          // Ensure ring is closed (first == last)
          const coords = [...ring];
          const first = coords[0];
          const last = coords[coords.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            coords.push([...first]);
          }
          features.push({
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [coords] },
          });
        }
      }

      if (features.length === 0) {
        setPasteError('Ingen polygon hittades. Klistra in GeoJSON från geojson.io, eller en koordinat-array som [[lng,lat], ...].');
        return;
      }

      onImportGeoJSON(features);
      setPasteOpen(false);
      setPasteValue('');
    } catch {
      setPasteError('Ogiltig JSON. Kopiera hela GeoJSON-utdatan från geojson.io.');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Uteplatser ({patios.length})
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPasteValue('');
              setPasteError(null);
              setPasteOpen(true);
            }}
            className="min-h-[48px] gap-1.5"
          >
            <ClipboardPasteIcon className="size-4" />
            Klistra in
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[48px] gap-1.5"
          >
            <UploadIcon className="size-4" />
            Importera
          </Button>
          <Button size="sm" onClick={onNewPatio} className="min-h-[48px] gap-1.5">
            <PlusIcon className="size-4" />
            Ny uteplats
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Importera GeoJSON-fil"
      />

      {patios.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Inga uteplatser. Klicka &ldquo;Ny uteplats&rdquo; för att rita en polygon på kartan.
        </p>
      ) : (
        <ul className="space-y-2">
          {patios.map((patio) => (
            <li
              key={patio.id}
              className={`flex items-center justify-between rounded-lg border p-3 text-sm transition-colors ${
                patio.id === selectedPatioId
                  ? 'border-ring bg-accent'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(patio.id)}
                className="min-h-[48px] flex-1 text-left"
              >
                <span className="font-medium text-foreground">{patio.name}</span>
                <span className="ml-2 text-muted-foreground">
                  {vertexCount(patio.geometry)} hörn
                </span>
              </button>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(patio.id)}
                  className="size-12"
                  aria-label={`Redigera ${patio.name}`}
                >
                  <PencilIcon className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteId(patio.id)}
                  className="size-12 text-destructive hover:text-destructive"
                  aria-label={`Ta bort ${patio.name}`}
                >
                  <TrashIcon className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

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
              och klistra in nedan. Rita en polygon på kartan där, kopiera JSON-panelens innehåll.
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

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ta bort uteplats</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill ta bort &ldquo;{patioToDelete?.name}&rdquo;?
              Polygondata raderas permanent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Avbryt
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              {deleting ? 'Tar bort...' : 'Ta bort'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
