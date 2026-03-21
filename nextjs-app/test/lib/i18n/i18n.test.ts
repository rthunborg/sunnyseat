import { describe, it, expect } from 'vitest';
import { t } from '@/lib/i18n';

describe('i18n t() function', () => {
  describe('Swedish (default)', () => {
    it('returns Swedish string for known key', () => {
      expect(t('status.sunny')).toBe('Soligt');
    });

    it('returns Swedish app name', () => {
      expect(t('common.appName')).toBe('SunnySeat');
    });

    it('returns Swedish loading text', () => {
      expect(t('common.loading')).toBe('Laddar...');
    });

    it('returns Swedish sky conditions', () => {
      expect(t('sky.clear')).toBe('Klart');
      expect(t('sky.overcast')).toBe('Mulet');
      expect(t('sky.rain')).toBe('Regn');
      expect(t('sky.partlyCloudy')).toBe('Halvklart');
    });
  });

  describe('English', () => {
    it('returns English string when language is en', () => {
      expect(t('status.sunny', undefined, 'en')).toBe('Sunny');
    });

    it('returns English loading text', () => {
      expect(t('common.loading', undefined, 'en')).toBe('Loading...');
    });

    it('returns English sky conditions', () => {
      expect(t('sky.clear', undefined, 'en')).toBe('Clear');
      expect(t('sky.overcast', undefined, 'en')).toBe('Overcast');
    });
  });

  describe('unknown keys', () => {
    it('returns key string for unknown key', () => {
      expect(t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('returns key string for deeply nested unknown key', () => {
      expect(t('a.b.c.d')).toBe('a.b.c.d');
    });
  });

  describe('interpolation', () => {
    it('interpolates variables into template', () => {
      const result = t('venue.distance', { distance: '350' });
      expect(result).toBe('350 m');
    });

    it('interpolates venue name in directionsTo', () => {
      const result = t('venue.directionsTo', { name: 'Café Husaren' });
      expect(result).toBe('Vägbeskrivning till Café Husaren');
    });
  });

  describe('pluralization', () => {
    it('uses singular form when count is 1', () => {
      const result = t('home.foundPatios', { count: 1 });
      expect(result).toBe('Hittade 1 restaurang');
    });

    it('uses plural form when count is not 1', () => {
      const result = t('home.foundPatios', { count: 5 });
      expect(result).toBe('Hittade 5 restauranger');
    });

    it('uses English plural form', () => {
      const result = t('home.foundPatios', { count: 3 }, 'en');
      expect(result).toBe('Found 3 venues');
    });

    it('uses English singular form', () => {
      const result = t('home.foundPatios', { count: 1 }, 'en');
      expect(result).toBe('Found 1 venue');
    });
  });
});
