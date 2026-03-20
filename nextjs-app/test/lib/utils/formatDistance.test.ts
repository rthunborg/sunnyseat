import { describe, it, expect } from 'vitest';
import { formatDistance } from '@/lib/utils/formatDistance';

describe('formatDistance', () => {
  describe('meters (below 900m)', () => {
    it('rounds to nearest 100m', () => {
      expect(formatDistance(456)).toBe('500 m');
      expect(formatDistance(123)).toBe('100 m');
      expect(formatDistance(850)).toBe('900 m');
      expect(formatDistance(749)).toBe('700 m');
      expect(formatDistance(750)).toBe('800 m');
    });

    it('shows minimum 100m', () => {
      expect(formatDistance(0)).toBe('100 m');
      expect(formatDistance(10)).toBe('100 m');
      expect(formatDistance(49)).toBe('100 m');
    });

    it('handles negative values', () => {
      expect(formatDistance(-50)).toBe('100 m');
    });
  });

  describe('kilometers (900m and above)', () => {
    it('shows km with 1 decimal using Swedish comma', () => {
      expect(formatDistance(900, 'sv')).toBe('0,9 km');
      expect(formatDistance(1200, 'sv')).toBe('1,2 km');
      expect(formatDistance(2500, 'sv')).toBe('2,5 km');
      expect(formatDistance(1000, 'sv')).toBe('1,0 km');
    });

    it('shows km with 1 decimal using English period', () => {
      expect(formatDistance(900, 'en')).toBe('0.9 km');
      expect(formatDistance(1200, 'en')).toBe('1.2 km');
      expect(formatDistance(2500, 'en')).toBe('2.5 km');
    });

    it('defaults to Swedish locale', () => {
      expect(formatDistance(1200)).toBe('1,2 km');
    });
  });

  describe('boundary at 900m', () => {
    it('899m shows meters', () => {
      expect(formatDistance(899)).toBe('900 m');
    });

    it('900m shows kilometers', () => {
      expect(formatDistance(900)).toBe('0,9 km');
    });
  });
});
