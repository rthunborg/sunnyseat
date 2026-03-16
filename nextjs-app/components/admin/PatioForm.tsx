'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PatioFormProps {
  initialName?: string;
  initialHeightSource?: string | null;
  vertexCount: number;
  onSave: (data: { name: string; height_source: string | null }) => void;
  onCancel: () => void;
  saving?: boolean;
}

const heightSourceOptions = [
  { value: '', label: '— Välj —' },
  { value: 'manual', label: 'Manuell' },
  { value: 'lidar', label: 'LiDAR' },
  { value: 'estimated', label: 'Uppskattad' },
];

export default function PatioForm({
  initialName = '',
  initialHeightSource = null,
  vertexCount,
  onSave,
  onCancel,
  saving = false,
}: PatioFormProps) {
  const [name, setName] = useState(initialName);
  const [heightSource, setHeightSource] = useState(initialHeightSource || '');

  useEffect(() => {
    setName(initialName);
    setHeightSource(initialHeightSource || '');
  }, [initialName, initialHeightSource]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      height_source: heightSource || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="patio-name" className="mb-1.5 block text-sm font-medium text-foreground">
          Namn
        </label>
        <Input
          id="patio-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="t.ex. Framsida, Bakgård"
          className="h-12"
          required
        />
      </div>

      <div>
        <label htmlFor="patio-height-source" className="mb-1.5 block text-sm font-medium text-foreground">
          Höjdkälla
        </label>
        <select
          id="patio-height-source"
          value={heightSource}
          onChange={(e) => setHeightSource(e.target.value)}
          className="h-12 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {heightSourceOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
        <span className="font-medium">{vertexCount}</span> hörn i polygonen
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving || !name.trim()} className="min-h-[48px]">
          {saving ? 'Sparar...' : 'Spara'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="min-h-[48px]">
          Avbryt
        </Button>
      </div>
    </form>
  );
}
