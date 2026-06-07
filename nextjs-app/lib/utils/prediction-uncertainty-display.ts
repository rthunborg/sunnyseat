import type {
  PredictionUncertaintyDto,
  PredictionUncertaintyLevel,
  PredictionUncertaintyReason,
} from '@/lib/types/api';

const VALID_REASONS: ReadonlySet<PredictionUncertaintyReason> = new Set([
  'building_shadow_coverage',
  'vegetation',
  'awning',
  'umbrella',
  'bridge',
  'temporary_structure',
  'seasonal_furniture',
  'weather',
  'other',
]);

const OBSTRUCTION_REASONS: ReadonlySet<PredictionUncertaintyReason> = new Set([
  'vegetation',
  'awning',
  'umbrella',
  'bridge',
  'temporary_structure',
  'seasonal_furniture',
]);

const VALID_LEVELS: ReadonlySet<PredictionUncertaintyLevel> = new Set([
  'low',
  'medium',
  'high',
]);

export type PredictionUncertaintyDisplayLabels = {
  description: string;
  accessible: string;
  levels: Record<PredictionUncertaintyLevel, string>;
  short: {
    building_shadow_coverage: string;
    obstruction: string;
    weather: string;
    other: string;
  };
  reasons: Record<PredictionUncertaintyReason, string>;
};

export type PredictionUncertaintyDisplayState = {
  visibleLabel: string;
  visibleSummary: string;
  descriptionText: string;
  reasonText: string[];
  accessibleText: string;
};

export function getPredictionUncertaintyDisplay({
  predictionUncertainty,
  labels,
}: {
  predictionUncertainty: PredictionUncertaintyDto | null | undefined;
  labels: PredictionUncertaintyDisplayLabels;
}): PredictionUncertaintyDisplayState | null {
  if (!predictionUncertainty) return null;
  if (!Array.isArray(predictionUncertainty.reasons)) return null;
  if (!isDisplayLevel(predictionUncertainty.level, labels)) return null;

  const reasons = normalizeReasons(predictionUncertainty.reasons);
  if (reasons.length === 0) return null;

  const visibleLabel = labels.levels[predictionUncertainty.level];
  const visibleSummary = summaryForReasons(reasons, labels);
  const descriptionText = labels.description.trim();
  const reasonText = reasons.map((reason) => labels.reasons[reason]);
  const description = formatSentences([descriptionText, visibleSummary, ...reasonText]);

  return {
    visibleLabel,
    visibleSummary,
    descriptionText,
    reasonText,
    accessibleText: formatLabel(labels.accessible, {
      label: visibleLabel,
      description,
    }),
  };
}

function isDisplayLevel(
  value: unknown,
  labels: PredictionUncertaintyDisplayLabels,
): value is PredictionUncertaintyLevel {
  if (typeof value !== 'string') return false;
  if (!VALID_LEVELS.has(value as PredictionUncertaintyLevel)) return false;
  return Boolean(labels.levels[value as PredictionUncertaintyLevel]?.trim());
}

function normalizeReasons(values: readonly unknown[]): PredictionUncertaintyReason[] {
  const reasons: PredictionUncertaintyReason[] = [];
  const seen = new Set<PredictionUncertaintyReason>();
  for (const value of values) {
    const reason = normalizeReason(value);
    if (!reason || seen.has(reason)) continue;
    reasons.push(reason);
    seen.add(reason);
  }
  return reasons;
}

function formatSentences(values: string[]): string {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      if (/[.!?]$/.test(value)) return value;
      return `${value}.`;
    })
    .join(' ');
}

function normalizeReason(value: unknown): PredictionUncertaintyReason | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (VALID_REASONS.has(trimmed as PredictionUncertaintyReason)) {
    return trimmed as PredictionUncertaintyReason;
  }
  return 'other';
}

function summaryForReasons(
  reasons: PredictionUncertaintyReason[],
  labels: PredictionUncertaintyDisplayLabels,
): string {
  if (reasons.some((reason) => OBSTRUCTION_REASONS.has(reason))) {
    return labels.short.obstruction;
  }
  if (reasons.includes('building_shadow_coverage')) {
    return labels.short.building_shadow_coverage;
  }
  if (reasons.includes('weather')) {
    return labels.short.weather;
  }
  return labels.short.other;
}

function formatLabel(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (label, [key, value]) => label.replaceAll(`{${key}}`, value),
    template,
  );
}
