import { describe, expect, it } from 'vitest';
import {
  getPredictionUncertaintyDisplay,
  type PredictionUncertaintyDisplayLabels,
} from '@/lib/utils/prediction-uncertainty-display';
import type { PredictionUncertaintyDto } from '@/lib/types/api';

const SV_LABELS: PredictionUncertaintyDisplayLabels = {
  description:
    'Vi räknar på solens läge, byggnadsskuggor och väder. Träd, markiser, parasoller, broar och tillfälliga konstruktioner kan påverka platsen.',
  accessible: '{label}. {description}',
  levels: {
    low: 'Låg osäkerhet',
    medium: 'Osäker prognos',
    high: 'Mer osäker prognos',
  },
  short: {
    building_shadow_coverage: 'Byggnadsskuggor mer osäkra',
    obstruction: 'Lokala hinder kan påverka',
    weather: 'Vädret gör prognosen osäkrare',
    other: 'Lokala förhållanden kan påverka',
  },
  reasons: {
    building_shadow_coverage: 'Byggnadsskuggorna är beräknade med begränsad täckning här.',
    vegetation: 'Träd kan påverka platsen.',
    awning: 'Markiser kan påverka platsen.',
    umbrella: 'Parasoller kan påverka platsen.',
    bridge: 'Broar kan påverka platsen.',
    temporary_structure: 'Tillfälliga konstruktioner kan påverka platsen.',
    seasonal_furniture: 'Säsongsmöbler kan påverka platsen.',
    weather: 'Vädret gör prognosen mer osäker.',
    other: 'Lokala förhållanden kan påverka platsen.',
  },
};

const EN_LABELS: PredictionUncertaintyDisplayLabels = {
  description:
    'SunnySeat models sun position, building shadows, and weather. Trees, awnings, umbrellas, bridges, and temporary structures can affect conditions on site.',
  accessible: '{label}. {description}',
  levels: {
    low: 'Low uncertainty',
    medium: 'Prediction uncertainty',
    high: 'More uncertain forecast',
  },
  short: {
    building_shadow_coverage: 'Building shadows are less certain',
    obstruction: 'Local obstructions can affect conditions',
    weather: 'Weather makes the forecast less certain',
    other: 'Local conditions can affect this place',
  },
  reasons: {
    building_shadow_coverage: 'Building shadows are calculated with limited coverage here.',
    vegetation: 'Trees can affect this place.',
    awning: 'Awnings can affect this place.',
    umbrella: 'Umbrellas can affect this place.',
    bridge: 'Bridges can affect this place.',
    temporary_structure: 'Temporary structures can affect this place.',
    seasonal_furniture: 'Seasonal furniture can affect this place.',
    weather: 'Weather makes the forecast less certain.',
    other: 'Local conditions can affect this place.',
  },
};

describe('getPredictionUncertaintyDisplay', () => {
  it('returns null when uncertainty metadata is absent', () => {
    expect(getPredictionUncertaintyDisplay({ predictionUncertainty: undefined, labels: SV_LABELS }))
      .toBeNull();
  });

  it('formats low building-shadow coverage in Swedish', () => {
    expect(
      getPredictionUncertaintyDisplay({
        predictionUncertainty: {
          level: 'medium',
          reasons: ['building_shadow_coverage'],
        },
        labels: SV_LABELS,
      }),
    ).toEqual({
      visibleLabel: 'Osäker prognos',
      visibleSummary: 'Byggnadsskuggor mer osäkra',
      descriptionText:
        'Vi räknar på solens läge, byggnadsskuggor och väder. Träd, markiser, parasoller, broar och tillfälliga konstruktioner kan påverka platsen.',
      reasonText: ['Byggnadsskuggorna är beräknade med begränsad täckning här.'],
      accessibleText:
        'Osäker prognos. Vi räknar på solens läge, byggnadsskuggor och väder. Träd, markiser, parasoller, broar och tillfälliga konstruktioner kan påverka platsen. Byggnadsskuggor mer osäkra. Byggnadsskuggorna är beräknade med begränsad täckning här.',
    });
  });

  it('summarizes multiple obstruction reasons without losing detail', () => {
    const display = getPredictionUncertaintyDisplay({
      predictionUncertainty: {
        level: 'medium',
        reasons: ['vegetation', 'awning', 'seasonal_furniture'],
      },
      labels: SV_LABELS,
    });

    expect(display?.visibleSummary).toBe('Lokala hinder kan påverka');
    expect(display?.reasonText).toEqual([
      'Träd kan påverka platsen.',
      'Markiser kan påverka platsen.',
      'Säsongsmöbler kan påverka platsen.',
    ]);
    expect(display?.accessibleText).toContain('Träd kan påverka platsen.');
  });

  it('normalizes unknown, duplicate, and empty public reasons defensively', () => {
    const display = getPredictionUncertaintyDisplay({
      predictionUncertainty: {
        level: 'medium',
        reasons: ['vegetation', '', 'source_layer', 'vegetation'],
      } as unknown as PredictionUncertaintyDto,
      labels: SV_LABELS,
    });

    expect(display?.reasonText).toEqual([
      'Träd kan påverka platsen.',
      'Lokala förhållanden kan påverka platsen.',
    ]);
    expect(display?.accessibleText).not.toContain('source_layer');
  });

  it('returns null for malformed runtime metadata', () => {
    expect(
      getPredictionUncertaintyDisplay({
        predictionUncertainty: { level: 'medium' } as unknown as PredictionUncertaintyDto,
        labels: SV_LABELS,
      }),
    ).toBeNull();

    expect(
      getPredictionUncertaintyDisplay({
        predictionUncertainty: {
          level: 'source_layer',
          reasons: ['vegetation'],
        } as unknown as PredictionUncertaintyDto,
        labels: SV_LABELS,
      }),
    ).toBeNull();
  });

  it('uses English labels with the same reason semantics', () => {
    const display = getPredictionUncertaintyDisplay({
      predictionUncertainty: {
        level: 'medium',
        reasons: ['weather'],
      },
      labels: EN_LABELS,
    });

    expect(display?.visibleLabel).toBe('Prediction uncertainty');
    expect(display?.visibleSummary).toBe('Weather makes the forecast less certain');
    expect(display?.accessibleText).toContain('Weather makes the forecast less certain.');
  });
});
