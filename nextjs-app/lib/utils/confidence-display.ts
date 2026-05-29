import type { SunFreshnessMeta } from '@/lib/types/api';

const STALE_WEATHER_MS = 2 * 60 * 60 * 1000;

export type ConfidenceDisplayLabels = {
  confidence: string;
  approximate: string;
  unavailable: string;
};

export type ConfidenceDisplayState =
  | {
      kind: 'exact' | 'approximate';
      visibleText: string;
      accessibleText: string;
      value: number;
    }
  | {
      kind: 'hidden';
      visibleText: null;
      accessibleText: string;
    };

export function getConfidenceDisplayState({
  confidence,
  meta,
  now = new Date(),
  labels,
}: {
  confidence: number | null | undefined;
  meta?: SunFreshnessMeta;
  now?: Date;
  labels: ConfidenceDisplayLabels;
}): ConfidenceDisplayState {
  if (!Number.isFinite(confidence)) return hidden(labels);
  if (meta?.sunDataSource === 'geometry-only') return hidden(labels);

  const weatherUpdatedAt = parseTimestamp(meta?.weatherUpdatedAt);
  if (!weatherUpdatedAt) return hidden(labels);

  const value = clampPercent(confidence as number);
  const isApproximate = now.getTime() - weatherUpdatedAt.getTime() > STALE_WEATHER_MS;
  if (isApproximate) {
    return {
      kind: 'approximate',
      visibleText: `~${value}%`,
      accessibleText: `${labels.confidence} ${labels.approximate} ${value}%`,
      value,
    };
  }

  return {
    kind: 'exact',
    visibleText: `${value}%`,
    accessibleText: `${labels.confidence} ${value}%`,
    value,
  };
}

function hidden(labels: ConfidenceDisplayLabels): ConfidenceDisplayState {
  return {
    kind: 'hidden',
    visibleText: null,
    accessibleText: labels.unavailable,
  };
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseTimestamp(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed);
}
