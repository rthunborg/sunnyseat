import type { ObstructionRiskClass } from './types';

export const OBSTRUCTION_RISK_CLASSES: readonly ObstructionRiskClass[] = [
  'tree',
  'awning',
  'umbrella',
  'bridge',
  'temporary_structure',
  'seasonal_furniture',
  'other',
] as const;

const RISK_SET = new Set<string>(OBSTRUCTION_RISK_CLASSES);

const RISK_CAPS: Record<ObstructionRiskClass, number> = {
  tree: 0.68,
  awning: 0.65,
  umbrella: 0.65,
  bridge: 0.6,
  temporary_structure: 0.62,
  seasonal_furniture: 0.68,
  other: 0.69,
};

export function getObstructionRiskConfidenceCap(
  risks: readonly ObstructionRiskClass[] | undefined
): number {
  if (!risks || risks.length === 0) return 1;
  return Math.min(...risks.map((risk) => RISK_CAPS[risk] ?? RISK_CAPS.other));
}

export function extractObstructionRiskClasses(...values: unknown[]): ObstructionRiskClass[] {
  const risks = new Set<ObstructionRiskClass>();

  for (const value of values) {
    collectRisks(value, risks);
  }

  return [...risks].sort();
}

function collectRisks(value: unknown, risks: Set<ObstructionRiskClass>): void {
  if (typeof value === 'string') {
    const risk = normalizeRisk(value);
    if (risk) risks.add(risk);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectRisks(item, risks);
    return;
  }

  if (isRecord(value)) {
    for (const key of [
      'obstructionRisks',
      'obstruction_risks',
      'uncertaintyCauses',
      'uncertainty_causes',
      'knownObstructions',
      'known_obstructions',
    ]) {
      collectRisks(value[key], risks);
    }

    for (const [key, raw] of Object.entries(value)) {
      if (raw === true) {
        const risk = normalizeRisk(key);
        if (risk) risks.add(risk);
      }
    }
  }
}

function normalizeRisk(value: string): ObstructionRiskClass | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^obstruction[:_-]/, '')
    .replace(/^uncertainty[:_-]/, '')
    .replace(/[\s-]+/g, '_');

  const aliases: Record<string, ObstructionRiskClass> = {
    trees: 'tree',
    vegetation: 'tree',
    temp_structure: 'temporary_structure',
    temporary: 'temporary_structure',
    seasonal: 'seasonal_furniture',
    seasonal_furnishing: 'seasonal_furniture',
  };

  const candidate = aliases[normalized] ?? normalized;
  return RISK_SET.has(candidate) ? candidate as ObstructionRiskClass : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
