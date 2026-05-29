import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { FavouritesProvider } from '@/lib/contexts/FavouritesContext';
import { FAVOURITES_STORAGE_KEY } from '@/lib/services/favourites-storage';
import { useFavourites } from '@/hooks/useFavourites';

function wrapper({ children }: { children: ReactNode }) {
  return <FavouritesProvider>{children}</FavouritesProvider>;
}

describe('useFavourites', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hydrates from localStorage after mount and persists changes', async () => {
    localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(['venue-1']));

    const { renderHook } = await import('@testing-library/react');
    const { result } = renderHook(() => useFavourites(), { wrapper });

    await expect.poll(() => result.current.favouriteIds).toEqual(['venue-1']);
    expect(result.current.isHydrated).toBe(true);
    expect(result.current.isFavourite('venue-1')).toBe(true);

    act(() => result.current.toggleFavourite('venue-2'));

    expect(result.current.favouriteIds).toEqual(['venue-1', 'venue-2']);
    expect(JSON.parse(localStorage.getItem(FAVOURITES_STORAGE_KEY) ?? 'null')).toEqual([
      'venue-1',
      'venue-2',
    ]);
  });

  it('merges a pre-hydration toggle with the persisted storage snapshot', async () => {
    localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(['venue-1']));

    const { renderHook } = await import('@testing-library/react');
    const { result } = renderHook(() => useFavourites(), { wrapper });

    act(() => result.current.toggleFavourite('venue-2'));

    await expect.poll(() => result.current.favouriteIds).toEqual(['venue-1', 'venue-2']);
    expect(JSON.parse(localStorage.getItem(FAVOURITES_STORAGE_KEY) ?? 'null')).toEqual([
      'venue-1',
      'venue-2',
    ]);
  });

  it('shares same-session state across consumers', async () => {
    function FirstConsumer() {
      const favourites = useFavourites();
      return (
        <button type="button" onClick={() => favourites.addFavourite('venue-1')}>
          first {String(favourites.isFavourite('venue-1'))}
        </button>
      );
    }
    function SecondConsumer() {
      const favourites = useFavourites();
      return (
        <button type="button" onClick={() => favourites.removeFavourite('venue-1')}>
          second {String(favourites.isFavourite('venue-1'))}
        </button>
      );
    }

    render(
      <FavouritesProvider>
        <FirstConsumer />
        <SecondConsumer />
      </FavouritesProvider>,
    );

    await act(async () => screen.getByRole('button', { name: 'first false' }).click());
    expect(screen.getByRole('button', { name: 'second true' })).toBeInTheDocument();

    await act(async () => screen.getByRole('button', { name: 'second true' }).click());
    expect(screen.getByRole('button', { name: 'first false' })).toBeInTheDocument();
  });
});
