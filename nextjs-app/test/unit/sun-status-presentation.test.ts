import { describe, expect, it } from 'vitest';
import {
  isObscuredSunStatus,
  skyConditionCopy,
} from '@/lib/utils/sun-status-presentation';
import type { VenueSunStatus } from '@/lib/types/api';

const SKY_COPY = {
  clear: 'Klart',
  partlyCloudy: 'Delvis molnigt',
  overcast: 'Mulet',
  rain: 'Regn',
};

describe('sun-status-presentation', () => {
  describe('isObscuredSunStatus', () => {
    it('is true only for CloudObscured', () => {
      expect(isObscuredSunStatus('CloudObscured')).toBe(true);
      const nonObscured: VenueSunStatus[] = ['Sunny', 'Partial', 'Shaded', 'NoSun'];
      for (const status of nonObscured) {
        expect(isObscuredSunStatus(status)).toBe(false);
      }
    });

    it('is false for undefined (never fabricate the gated state)', () => {
      expect(isObscuredSunStatus(undefined)).toBe(false);
    });
  });

  describe('skyConditionCopy (AC3)', () => {
    it('maps each known sky condition to plain-language copy', () => {
      expect(skyConditionCopy('clear', SKY_COPY)).toBe('Klart');
      expect(skyConditionCopy('partly-cloudy', SKY_COPY)).toBe('Delvis molnigt');
      expect(skyConditionCopy('overcast', SKY_COPY)).toBe('Mulet');
      // Story 10.4 (AC2): 'rain' now renders the plain-language rain copy (it was
      // an anticipatory null placeholder before this story realised it).
      expect(skyConditionCopy('rain', SKY_COPY)).toBe('Regn');
    });

    it('renders NOTHING for unavailable / undefined / unknown (never fabricate)', () => {
      expect(skyConditionCopy('unavailable', SKY_COPY)).toBeNull();
      expect(skyConditionCopy(undefined, SKY_COPY)).toBeNull();
      expect(skyConditionCopy('nonsense', SKY_COPY)).toBeNull();
    });
  });
});
