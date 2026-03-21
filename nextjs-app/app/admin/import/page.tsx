'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuthContext } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/button';
import { UploadIcon, FileIcon, CheckCircleIcon, AlertTriangleIcon, XIcon } from 'lucide-react';

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  total: number;
}

export default function AdminImportPage() {
  const { token } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith('.geojson') || dropped.name.endsWith('.json'))) {
      setFile(dropped);
      setResult(null);
      setError(null);
    } else {
      setError('Välj en .geojson-fil');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError(null);
    }
  }, []);

  async function handleUpload() {
    if (!file || !token) return;

    setUploading(true);
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress(30);

      const res = await fetch('/api/admin/buildings/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      setProgress(80);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `Import misslyckades (${res.status})`);
      }

      const data: ImportResult = await res.json();
      setResult(data);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import misslyckades');
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setShowErrors(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Importera byggnadsdata</h1>

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Släpp en GeoJSON-fil här eller klicka för att välja"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        }`}
      >
        <UploadIcon className="mb-3 size-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          Dra och släpp en GeoJSON-fil här
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          eller klicka för att välja fil (.geojson)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".geojson,.json"
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {/* Selected file */}
      {file && !result && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <FileIcon className="size-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); reset(); }}
            aria-label="Ta bort fil"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      )}

      {/* Upload button */}
      {file && !result && (
        <div className="mt-4">
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="min-h-[48px] w-full"
          >
            {uploading ? 'Importerar...' : 'Starta import'}
          </Button>
        </div>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            {progress < 100 ? 'Bearbetar...' : 'Klar!'}
          </p>
        </div>
      )}

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
              <p className="text-sm font-medium text-foreground">Import klar</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>Totalt i filen: <strong className="text-foreground">{result.total}</strong></li>
                <li>Importerade: <strong className="text-green-600">{result.imported}</strong></li>
                <li>Överhoppade: <strong className="text-amber-600">{result.skipped}</strong></li>
                {result.errors.length > 0 && (
                  <li>Fel: <strong className="text-destructive">{result.errors.length}</strong></li>
                )}
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

          <Button onClick={reset} variant="outline" className="min-h-[48px]">
            Importera en till fil
          </Button>
        </div>
      )}
    </div>
  );
}
