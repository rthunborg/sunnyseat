'use client';

import { useFavouritesContext } from '@/lib/contexts/FavouritesContext';

export function useFavourites() {
  return useFavouritesContext();
}
