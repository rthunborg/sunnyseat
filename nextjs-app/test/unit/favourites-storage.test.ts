import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FAVOURITES_STORAGE_KEY,
  MAX_FAVOURITE_ID_LENGTH,
  MAX_FAVOURITE_IDS,
  addFavouriteId,
  readFavouriteIds,
  removeFavouriteId,
  sanitizeFavouriteIds,
  toggleFavouriteId,
  writeFavouriteIds,
} from '@/lib/services/favourites-storage';

describe('favourites-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty list when storage is empty', () => {
    expect(readFavouriteIds()).toEqual([]);
  });

  it('persists a de-duped string-only ID list in insertion order', () => {
    writeFavouriteIds(['venue-1', 'venue-1', '', 'venue-2', '  venue-3  ']);

    expect(JSON.parse(localStorage.getItem(FAVOURITES_STORAGE_KEY) ?? 'null')).toEqual([
      'venue-1',
      'venue-2',
      'venue-3',
    ]);
    expect(readFavouriteIds()).toEqual(['venue-1', 'venue-2', 'venue-3']);
  });

  it('ignores malformed JSON and non-string members', () => {
    localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(['venue-1', 2, null, 'venue-2']));
    expect(readFavouriteIds()).toEqual(['venue-1', 'venue-2']);

    localStorage.setItem(FAVOURITES_STORAGE_KEY, '{');
    expect(readFavouriteIds()).toEqual([]);
    expect(localStorage.getItem(FAVOURITES_STORAGE_KEY)).toBeNull();
  });

  it('drops unsafe IDs and caps persisted favourite IDs before URL/API use', () => {
    const manyIds = Array.from({ length: MAX_FAVOURITE_IDS + 5 }, (_, index) => `venue-${index}`);

    expect(sanitizeFavouriteIds(['venue-1', 'bad\nid', 'venue-2', 'bad\u007fid', 'foo,bar']))
      .toEqual(['venue-1', 'venue-2']);
    expect(sanitizeFavouriteIds(['x'.repeat(MAX_FAVOURITE_ID_LENGTH + 1), 'venue-3']))
      .toEqual(['venue-3']);
    expect(sanitizeFavouriteIds(manyIds)).toEqual(manyIds.slice(0, MAX_FAVOURITE_IDS));

    writeFavouriteIds([...manyIds, 'venue-over-cap']);
    expect(readFavouriteIds()).toHaveLength(MAX_FAVOURITE_IDS);
    expect(readFavouriteIds()).not.toContain('venue-over-cap');
  });

  it('adds, removes, and toggles IDs without duplicates', () => {
    expect(addFavouriteId(['venue-1'], 'venue-2')).toEqual(['venue-1', 'venue-2']);
    expect(addFavouriteId(['venue-1'], 'venue-1')).toEqual(['venue-1']);
    expect(removeFavouriteId(['venue-1', 'venue-2'], 'venue-1')).toEqual(['venue-2']);
    expect(toggleFavouriteId(['venue-1'], 'venue-1')).toEqual([]);
    expect(toggleFavouriteId(['venue-1'], 'venue-2')).toEqual(['venue-1', 'venue-2']);
  });

  it('does not create transient in-memory IDs beyond the storage cap', () => {
    const cappedIds = Array.from({ length: MAX_FAVOURITE_IDS }, (_, index) => `venue-${index}`);

    expect(toggleFavouriteId(cappedIds, 'venue-over-cap')).toEqual(cappedIds);
    expect(addFavouriteId(cappedIds, 'venue-over-cap')).toEqual(cappedIds);
  });

  it('does not crash when storage read or write throws', () => {
    const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(readFavouriteIds()).toEqual([]);
    getSpy.mockRestore();

    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(() => writeFavouriteIds(['venue-1'])).not.toThrow();
    setSpy.mockRestore();
  });

  it('does not crash when the browser blocks window.localStorage access itself', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });

    expect(() => readFavouriteIds()).not.toThrow();
    expect(readFavouriteIds()).toEqual([]);
    expect(() => writeFavouriteIds(['venue-1'])).not.toThrow();

    if (original) Object.defineProperty(window, 'localStorage', original);
  });
});
