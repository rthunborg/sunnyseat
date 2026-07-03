import { describe, expect, it } from 'vitest';
import {
  isObscuredSunStatus,
  skyConditionCopy,
  toSunStatusToken,
} from '@/lib/utils/sun-status-presentation';
import type { VenueSunStatus } from '@/lib/types/api';

const SKY_COPY = {
  clear: 'Klart',
  partlyCloudy: 'Delvis molnigt',
  overcast: 'Mulet',
};

describe('sun-status-presentation', () => {
  describe('toSunStatusToken', () => {
    it('maps each DTO status onto its presentational UI token', () => {
      expect(toSunStatusToken('Sunny')).toBe('sunny');
      expect(toSunStatusToken('Partial')).toBe('partial');
      expect(toSunStatusToken('CloudObscured')).toBe('obscured');
      expect(toSunStatusToken('Shaded')).toBe('shaded');
      expect(toSunStatusToken('NoSun')).toBe('shaded');
    });

    it('gives the obscured state a token distinct from sunny AND shaded', () => {
      // AC1: the fourth visual state must be unmistakable from both the amber
      // sunny path and the grey shaded path.
      const obscured = toSunStatusToken('CloudObscured');
      expect(obscured).not.toBe(toSunStatusToken('Sunny'));
      expect(obscured).not.toBe(toSunStatusToken('Partial'));
      expect(obscured).not.toBe(toSunStatusToken('Shaded'));
    });
  });

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
    });

    it('renders NOTHING for unavailable / undefined / unknown (never fabricate)', () => {
      expect(skyConditionCopy('unavailable', SKY_COPY)).toBeNull();
      expect(skyConditionCopy(undefined, SKY_COPY)).toBeNull();
      expect(skyConditionCopy('rain', SKY_COPY)).toBeNull();
      expect(skyConditionCopy('nonsense', SKY_COPY)).toBeNull();
    });
  });
});
