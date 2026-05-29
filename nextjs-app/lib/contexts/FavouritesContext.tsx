'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  addFavouriteId,
  readFavouriteIds,
  removeFavouriteId,
  toggleFavouriteId,
  writeFavouriteIds,
} from '@/lib/services/favourites-storage';

type FavouritesContextValue = {
  favouriteIds: string[];
  isHydrated: boolean;
  isFavourite: (id: string) => boolean;
  toggleFavourite: (id: string) => void;
  addFavourite: (id: string) => void;
  removeFavourite: (id: string) => void;
};

const FALLBACK_FAVOURITES: FavouritesContextValue = {
  favouriteIds: [],
  isHydrated: false,
  isFavourite: () => false,
  toggleFavourite: () => {},
  addFavourite: () => {},
  removeFavourite: () => {},
};

const FavouritesContext = createContext<FavouritesContextValue>(FALLBACK_FAVOURITES);

export function FavouritesProvider({ children }: { children: ReactNode }) {
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setFavouriteIds(readFavouriteIds());
    setIsHydrated(true);
  }, []);

  const updateFavouriteIds = useCallback((next: (current: string[]) => string[]) => {
    setFavouriteIds((current) => {
      const base = isHydrated ? current : readFavouriteIds();
      const updated = next(base);
      writeFavouriteIds(updated);
      return updated;
    });
    setIsHydrated(true);
  }, [isHydrated]);

  const value = useMemo<FavouritesContextValue>(() => ({
    favouriteIds,
    isHydrated,
    isFavourite: (id) => favouriteIds.includes(id),
    toggleFavourite: (id) => updateFavouriteIds((current) => toggleFavouriteId(current, id)),
    addFavourite: (id) => updateFavouriteIds((current) => addFavouriteId(current, id)),
    removeFavourite: (id) => updateFavouriteIds((current) => removeFavouriteId(current, id)),
  }), [favouriteIds, isHydrated, updateFavouriteIds]);

  return (
    <FavouritesContext.Provider value={value}>
      {children}
    </FavouritesContext.Provider>
  );
}

export function useFavouritesContext(): FavouritesContextValue {
  return useContext(FavouritesContext);
}
