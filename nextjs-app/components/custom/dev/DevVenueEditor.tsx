'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import maplibregl from 'maplibre-gl';
import { Eye, EyeOff, LoaderCircle, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useDevVenueEditorVenues,
  usePatchDevVenueEditorVenue,
} from '@/hooks/queries/useDevVenueEditor';
import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
import type {
  DevEditorVenueDto,
  DevVenueEditorPatchRequest,
} from '@/lib/types/dev-venue-editor';
import { cn } from '@/lib/utils';

type Draft = {
  hidden: boolean;
  displayLat: string;
  displayLng: string;
  seatingAreaText: string;
  tags: string;
  description: string;
  thumbnailAlt: string;
  thumbnailInitials: string;
  thumbnailCardUrl: string;
  thumbnailHeroUrl: string;
};

type Coordinate = { lat: number; lng: number };

export function DevVenueEditor() {
  const searchParams = useSearchParams();
  const t = useTranslations('map.devEditor');
  const enabled =
    process.env.NODE_ENV !== 'production' &&
    searchParams.get('_editor') === 'venues';
  const venuesQuery = useDevVenueEditorVenues(enabled);
  const patchMutation = usePatchDevVenueEditorVenue();
  const [selectedId, setSelectedId] = useState<string>('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const venues = venuesQuery.data?.venues ?? [];

  useEffect(() => {
    if (!enabled || venues.length === 0) return;
    if (!selectedId || !venues.some((venue) => venue.id === selectedId)) {
      setSelectedId(venues[0].id);
    }
  }, [enabled, selectedId, venues]);

  const selected = useMemo(
    () => venues.find((venue) => venue.id === selectedId) ?? null,
    [selectedId, venues],
  );
  const initialDraft = useMemo(
    () => selected ? draftFromVenue(selected) : null,
    [selected],
  );

  useEffect(() => {
    setDraft(initialDraft);
    setClientError(null);
    setSaved(false);
  }, [initialDraft]);

  const handlePinMove = useCallback((coordinate: Coordinate) => {
    setDraft((current) => current
      ? {
          ...current,
          displayLat: formatCoordinate(coordinate.lat),
          displayLng: formatCoordinate(coordinate.lng),
        }
      : current);
    setSaved(false);
  }, []);

  const isDirty = Boolean(draft && initialDraft && !draftsEqual(draft, initialDraft));
  const currentLocation = useMemo(
    () => draft
      ? parseDraftLocation(draft) ?? selected?.displayLocation ?? null
      : selected?.displayLocation ?? null,
    [draft, selected],
  );

  const handleReset = () => {
    setDraft(initialDraft);
    setClientError(null);
    setSaved(false);
  };

  const handleSave = () => {
    if (!selected || !draft || !initialDraft) return;
    const patch = patchFromDraft(draft, initialDraft);
    if (!patch.ok) {
      setClientError(t('validationFailed'));
      return;
    }
    if (Object.keys(patch.value).length === 0) return;
    setClientError(null);
    patchMutation.mutate(
      { identifier: selected.slug, patch: patch.value },
      {
        onSuccess: () => {
          setSaved(true);
        },
      },
    );
  };

  if (!enabled || venuesQuery.isError || !venuesQuery.data) return null;

  return (
    <>
      <DevVenueDisplayPinLayer
        venue={selected}
        location={currentLocation}
        label={selected ? t('dragPinAria', { name: selected.venueName }) : ''}
        onMove={handlePinMove}
      />
      <aside
        data-testid="dev-venue-editor"
        className="fixed bottom-[calc(var(--size-mobile-nav-h)+var(--spacing)*3)] left-4 right-4 z-modal max-h-[min(42rem,calc(100dvh-var(--size-mobile-nav-h)-2rem))] overflow-y-auto rounded-card border border-divider bg-surface-cream p-4 text-text-primary shadow-card lg:bottom-6 lg:left-auto lg:right-6 lg:top-[calc(var(--size-desktop-nav-h)+var(--spacing)*3)] lg:w-[28rem]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-label-lg text-text-primary">{t('title')}</h2>
          {selected && (
            <span className="inline-flex min-h-8 items-center gap-1 rounded-pill bg-surface-muted px-3 text-label-xs text-text-body">
              {draft?.hidden ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              {draft?.hidden ? t('hidden') : selected.slug}
            </span>
          )}
        </div>

        {selected && draft ? (
          <div className="mt-4 space-y-4">
            <LabeledSelect
              label={t('venue')}
              value={selectedId}
              onChange={setSelectedId}
              options={venues.map((venue) => ({
                value: venue.id,
                label: venue.venueName,
              }))}
            />

            <label className="flex min-h-11 items-center gap-3 rounded-card bg-surface-muted px-3 text-body-sm text-text-body">
              <input
                type="checkbox"
                className="size-5 accent-text-primary"
                checked={draft.hidden}
                onChange={(event) => {
                  setDraft({ ...draft, hidden: event.target.checked });
                  setSaved(false);
                }}
              />
              {t('hidden')}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <LabeledInput
                label={t('displayLat')}
                inputMode="decimal"
                value={draft.displayLat}
                onChange={(value) => {
                  setDraft({ ...draft, displayLat: value });
                  setSaved(false);
                }}
              />
              <LabeledInput
                label={t('displayLng')}
                inputMode="decimal"
                value={draft.displayLng}
                onChange={(value) => {
                  setDraft({ ...draft, displayLng: value });
                  setSaved(false);
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyMetric label={t('engineLat')} value={formatCoordinate(selected.engineLocation.lat)} />
              <ReadOnlyMetric label={t('engineLng')} value={formatCoordinate(selected.engineLocation.lng)} />
            </div>

            <LabeledTextarea
              label={t('seatingArea')}
              rows={5}
              value={draft.seatingAreaText}
              onChange={(value) => {
                setDraft({ ...draft, seatingAreaText: value });
                setSaved(false);
              }}
            />
            <LabeledInput
              label={t('tags')}
              value={draft.tags}
              onChange={(value) => {
                setDraft({ ...draft, tags: value });
                setSaved(false);
              }}
            />
            <LabeledTextarea
              label={t('description')}
              rows={3}
              value={draft.description}
              onChange={(value) => {
                setDraft({ ...draft, description: value });
                setSaved(false);
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <LabeledInput
                label={t('thumbnailAlt')}
                value={draft.thumbnailAlt}
                onChange={(value) => {
                  setDraft({ ...draft, thumbnailAlt: value });
                  setSaved(false);
                }}
              />
              <LabeledInput
                label={t('thumbnailInitials')}
                value={draft.thumbnailInitials}
                onChange={(value) => {
                  setDraft({ ...draft, thumbnailInitials: value });
                  setSaved(false);
                }}
              />
            </div>
            <LabeledInput
              label={t('thumbnailCard')}
              value={draft.thumbnailCardUrl}
              onChange={(value) => {
                setDraft({ ...draft, thumbnailCardUrl: value });
                setSaved(false);
              }}
            />
            <LabeledInput
              label={t('thumbnailHero')}
              value={draft.thumbnailHeroUrl}
              onChange={(value) => {
                setDraft({ ...draft, thumbnailHeroUrl: value });
                setSaved(false);
              }}
            />

            {(clientError || patchMutation.isError) && (
              <p role="alert" className="rounded-card bg-surface-muted px-3 py-2 text-body-sm text-error">
                {clientError ?? t('validationFailed')}
              </p>
            )}
            {saved && !isDirty && (
              <p role="status" className="rounded-card bg-surface-muted px-3 py-2 text-body-sm text-text-body">
                {t('saved')}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleReset}
                disabled={!isDirty || patchMutation.isPending}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                {t('reset')}
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={handleSave}
                disabled={!isDirty || patchMutation.isPending}
              >
                {patchMutation.isPending ? (
                  <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                {patchMutation.isPending ? t('saving') : t('save')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-card bg-surface-muted px-3 py-2 text-body-sm text-text-body">
            {t('empty')}
          </p>
        )}
      </aside>
    </>
  );
}

function DevVenueDisplayPinLayer({
  venue,
  location,
  label,
  onMove,
}: {
  venue: DevEditorVenueDto | null;
  location: Coordinate | null;
  label: string;
  onMove: (coordinate: Coordinate) => void;
}) {
  const { mapInstance } = useMapInstance();
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapInstance || !venue || !location) return;
    const element = document.createElement('div');
    element.className = cn(
      'flex size-11 cursor-grab items-center justify-center rounded-pill border-2',
      'border-surface-cream bg-text-primary text-surface-cream shadow-card outline-none',
      'focus-visible:ring-2 focus-visible:ring-amber-primary active:cursor-grabbing',
    );
    element.setAttribute('tabindex', '0');
    element.setAttribute('role', 'button');
    element.dataset.testid = 'dev-venue-editor-display-pin';
    element.setAttribute('aria-label', label);
    element.innerHTML = '<span aria-hidden="true" class="block size-3 rounded-pill bg-amber-primary"></span>';

    const marker = new maplibregl.Marker({
      element,
      anchor: 'center',
      draggable: true,
    })
      .setLngLat([location.lng, location.lat])
      .addTo(mapInstance);

    const handleDragEnd = () => {
      const lngLat = marker.getLngLat();
      onMove({
        lat: roundCoordinate(lngLat.lat),
        lng: roundCoordinate(lngLat.lng),
      });
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const delta = event.shiftKey ? 0.001 : 0.0001;
      const current = marker.getLngLat();
      let next: Coordinate | null = null;
      if (event.key === 'ArrowUp') next = { lat: current.lat + delta, lng: current.lng };
      if (event.key === 'ArrowDown') next = { lat: current.lat - delta, lng: current.lng };
      if (event.key === 'ArrowRight') next = { lat: current.lat, lng: current.lng + delta };
      if (event.key === 'ArrowLeft') next = { lat: current.lat, lng: current.lng - delta };
      if (!next) return;
      event.preventDefault();
      const rounded = {
        lat: roundCoordinate(next.lat),
        lng: roundCoordinate(next.lng),
      };
      marker.setLngLat([rounded.lng, rounded.lat]);
      onMove(rounded);
    };

    marker.on('dragend', handleDragEnd);
    element.addEventListener('keydown', handleKeyDown);
    markerRef.current = marker;
    elementRef.current = element;
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
      marker.off('dragend', handleDragEnd);
      marker.remove();
      markerRef.current = null;
      elementRef.current = null;
    };
  }, [label, location, mapInstance, onMove, venue]);

  useEffect(() => {
    if (!markerRef.current || !location) return;
    markerRef.current.setLngLat([location.lng, location.lat]);
  }, [location]);

  useEffect(() => {
    if (elementRef.current) elementRef.current.setAttribute('aria-label', label);
  }, [label]);

  return null;
}

function LabeledInput({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: 'decimal' | 'text';
}) {
  return (
    <label className="block text-label-xs text-text-muted">
      <span>{label}</span>
      <Input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 rounded-card border-divider bg-surface-muted text-body-sm text-text-primary"
      />
    </label>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block text-label-xs text-text-muted">
      <span>{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full resize-y rounded-card border border-divider bg-surface-muted px-3 py-2 text-body-sm text-text-primary outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary"
      />
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-label-xs text-text-muted">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-card border border-divider bg-surface-muted px-3 py-2 text-body-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadOnlyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-surface-muted px-3 py-2">
      <p className="text-label-xs text-text-muted">{label}</p>
      <p className="mt-1 text-body-sm text-text-primary">{value}</p>
    </div>
  );
}

function draftFromVenue(venue: DevEditorVenueDto): Draft {
  return {
    hidden: venue.hidden,
    displayLat: formatCoordinate(venue.displayLocation.lat),
    displayLng: formatCoordinate(venue.displayLocation.lng),
    seatingAreaText: venue.seatingArea ? JSON.stringify(venue.seatingArea, null, 2) : '',
    tags: venue.tags.join(', '),
    description: venue.description ?? '',
    thumbnailAlt: venue.thumbnail?.alt ?? '',
    thumbnailInitials: venue.thumbnail?.initials ?? '',
    thumbnailCardUrl: venue.thumbnail?.cardUrl ?? '',
    thumbnailHeroUrl: venue.thumbnail?.heroUrl ?? '',
  };
}

function draftsEqual(left: Draft, right: Draft): boolean {
  return Object.keys(left).every((key) => (
    left[key as keyof Draft] === right[key as keyof Draft]
  ));
}

function patchFromDraft(
  draft: Draft,
  initial: Draft,
): { ok: true; value: DevVenueEditorPatchRequest } | { ok: false } {
  const patch: DevVenueEditorPatchRequest = {};
  if (draft.hidden !== initial.hidden) patch.hidden = draft.hidden;

  if (draft.displayLat !== initial.displayLat || draft.displayLng !== initial.displayLng) {
    const location = parseDraftLocation(draft);
    if (!location) return { ok: false };
    patch.displayLocation = location;
  }
  if (draft.seatingAreaText !== initial.seatingAreaText) {
    patch.seatingAreaText = draft.seatingAreaText;
  }
  if (draft.tags !== initial.tags) {
    patch.tags = draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  if (draft.description !== initial.description) {
    patch.description = draft.description.trim() || null;
  }
  if (
    draft.thumbnailAlt !== initial.thumbnailAlt ||
    draft.thumbnailInitials !== initial.thumbnailInitials ||
    draft.thumbnailCardUrl !== initial.thumbnailCardUrl ||
    draft.thumbnailHeroUrl !== initial.thumbnailHeroUrl
  ) {
    const thumbnail = {
      alt: draft.thumbnailAlt.trim(),
      initials: draft.thumbnailInitials.trim(),
      ...(draft.thumbnailCardUrl.trim() ? { cardUrl: draft.thumbnailCardUrl.trim() } : {}),
      ...(draft.thumbnailHeroUrl.trim() ? { heroUrl: draft.thumbnailHeroUrl.trim() } : {}),
    };
    patch.thumbnail =
      thumbnail.alt || thumbnail.initials || thumbnail.cardUrl || thumbnail.heroUrl
        ? thumbnail
        : null;
  }
  return { ok: true, value: patch };
}

function parseDraftLocation(draft: Draft): Coordinate | null {
  const lat = Number(draft.displayLat);
  const lng = Number(draft.displayLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function formatCoordinate(value: number): string {
  return roundCoordinate(value).toFixed(6);
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
