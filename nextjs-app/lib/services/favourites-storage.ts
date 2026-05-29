export const FAVOURITES_STORAGE_KEY = 'sunnyseat_favourite_ids';
export const MAX_FAVOURITE_IDS = 50;
export const MAX_FAVOURITE_ID_LENGTH = 80;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/u;
const IDS_DELIMITER = ',';

export function readFavouriteIds(storage: Storage | undefined = getBrowserStorage()): string[] {
  if (!storage) return [];
  try {
    return sanitizeFavouriteIds(JSON.parse(storage.getItem(FAVOURITES_STORAGE_KEY) ?? '[]'));
  } catch {
    resetFavouriteStorage(storage);
    return [];
  }
}

export function writeFavouriteIds(
  ids: readonly string[],
  storage: Storage | undefined = getBrowserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(sanitizeFavouriteIds(ids)));
  } catch {
    // localStorage can be blocked or full; favourite UI should degrade silently.
  }
}

export function addFavouriteId(ids: readonly string[], id: string): string[] {
  return sanitizeFavouriteIds([...ids, id]);
}

export function removeFavouriteId(ids: readonly string[], id: string): string[] {
  const normalized = normalizeFavouriteId(id);
  if (!normalized) return sanitizeFavouriteIds(ids);
  return sanitizeFavouriteIds(ids).filter((candidate) => candidate !== normalized);
}

export function toggleFavouriteId(ids: readonly string[], id: string): string[] {
  const normalized = normalizeFavouriteId(id);
  if (!normalized) return sanitizeFavouriteIds(ids);
  const current = sanitizeFavouriteIds(ids);
  return current.includes(normalized)
    ? current.filter((candidate) => candidate !== normalized)
    : sanitizeFavouriteIds([...current, normalized]);
}

export function sanitizeFavouriteIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of value) {
    const id = typeof item === 'string' ? normalizeFavouriteId(item) : undefined;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= MAX_FAVOURITE_IDS) break;
  }
  return ids;
}

function normalizeFavouriteId(value: string): string | undefined {
  const trimmed = value.trim();
  if (CONTROL_CHARACTER_PATTERN.test(trimmed)) return undefined;
  if (trimmed.includes(IDS_DELIMITER)) return undefined;
  if (Array.from(trimmed).length > MAX_FAVOURITE_ID_LENGTH) return undefined;
  return trimmed ? trimmed : undefined;
}

function getBrowserStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function resetFavouriteStorage(storage: Storage): void {
  try {
    storage.removeItem(FAVOURITES_STORAGE_KEY);
  } catch {
    // Same degraded mode as writes: blocked storage must not crash the UI.
  }
}
