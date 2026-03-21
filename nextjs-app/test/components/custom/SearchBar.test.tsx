import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchBar } from '@/components/custom/SearchBar';
import type { SunExposureResult } from '@/lib/types/venue';

// ─── Mocks ───────────────────────────────────────────────────────────────

const mockSelectVenue = vi.fn();
const mockVenues: SunExposureResult[] = [
  {
    venue: { id: 'v1', name: 'Café Husaren', slug: 'cafe-husaren', neighborhood: 'Haga', lat: 57.7, lng: 11.97 },
    current_status: 'sunny',
    sun_exposure_percent: 90,
    confidence: 0.9,
    windows: [],
  },
  {
    venue: { id: 'v2', name: 'Sjöbaren', slug: 'sjobaren', neighborhood: 'Majorna', lat: 57.69, lng: 11.93 },
    current_status: 'partial',
    sun_exposure_percent: 50,
    confidence: 0.8,
    windows: [],
  },
  {
    venue: { id: 'v3', name: 'Bar Centro', slug: 'bar-centro', neighborhood: 'Linné', lat: 57.7, lng: 11.96 },
    current_status: 'shaded',
    sun_exposure_percent: 10,
    confidence: 0.85,
    windows: [],
  },
  {
    venue: { id: 'v4', name: 'Hagabion Café', slug: 'hagabion-cafe', neighborhood: 'Haga', lat: 57.71, lng: 11.95 },
    current_status: 'upcoming',
    sun_exposure_percent: 0,
    confidence: 0.7,
    windows: [],
  },
];

vi.mock('@/lib/context/CardTrayContext', () => ({
  useCardTray: () => ({
    venues: mockVenues,
    selectVenue: mockSelectVenue,
    selectedVenueId: null,
    trayState: 'peeking',
    setTrayState: vi.fn(),
    isLoading: false,
    setLoading: vi.fn(),
    setVenues: vi.fn(),
    emptyReason: null,
    setEmptyReason: vi.fn(),
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'home.searchPlaceholder': 'Sök restauranger...',
        'home.noSearchResults': `Inga resultat för '${params?.query ?? ''}'`,
        'home.noSearchResultsHint': 'Prova att flytta kartan för att hitta fler restauranger',
      };
      return translations[key] ?? key;
    },
    language: 'sv' as const,
    setLanguage: vi.fn(),
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────

function renderSearchBar(onVenueSelect?: (id: string, coords: { lat: number; lng: number }) => void) {
  return render(<SearchBar onVenueSelect={onVenueSelect} />);
}

function typeAndWait(input: HTMLElement, text: string) {
  fireEvent.change(input, { target: { value: text } });
  act(() => {
    vi.advanceTimersByTime(200);
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it('renders search input with correct placeholder', () => {
    renderSearchBar();
    expect(screen.getByPlaceholderText('Sök restauranger...')).toBeInTheDocument();
  });

  it('has combobox aria pattern', () => {
    renderSearchBar();
    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('filters venues by name with 200ms debounce', () => {
    renderSearchBar();
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'café' } });
    // Before debounce: no results yet
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Café Husaren');
    expect(options[1]).toHaveTextContent('Hagabion Café');
  });

  it('filters venues by neighborhood', () => {
    renderSearchBar();
    const input = screen.getByRole('searchbox');
    typeAndWait(input, 'Haga');

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Café Husaren');
    expect(options[1]).toHaveTextContent('Hagabion Café');
  });

  it('shows colored status dot for each result', () => {
    renderSearchBar();
    const input = screen.getByRole('searchbox');
    typeAndWait(input, 'café');

    const options = screen.getAllByRole('option');
    // Each option should have a status dot span
    options.forEach((option) => {
      const dot = option.querySelector('span[aria-hidden="true"]');
      expect(dot).toBeInTheDocument();
      expect(dot?.className).toContain('rounded-full');
    });
  });

  it('shows neighborhood in results', () => {
    renderSearchBar();
    const input = screen.getByRole('searchbox');
    typeAndWait(input, 'sjö');

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Majorna');
  });

  it('shows empty state when no results match', () => {
    renderSearchBar();
    const input = screen.getByRole('searchbox');
    typeAndWait(input, 'nonexistent');

    expect(screen.getByText("Inga resultat för 'nonexistent'")).toBeInTheDocument();
    expect(screen.getByText('Prova att flytta kartan för att hitta fler restauranger')).toBeInTheDocument();
  });

  it('selects venue on click and calls callbacks', () => {
    const onVenueSelect = vi.fn();
    renderSearchBar(onVenueSelect);
    const input = screen.getByRole('searchbox');
    typeAndWait(input, 'sjö');

    const option = screen.getByRole('option');
    fireEvent.mouseDown(option);

    expect(mockSelectVenue).toHaveBeenCalledWith('v2');
    expect(onVenueSelect).toHaveBeenCalledWith('v2', { lat: 57.69, lng: 11.93 });
    // Dropdown should close
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('clears query after selection', () => {
    renderSearchBar();
    const input = screen.getByRole('searchbox') as HTMLInputElement;
    typeAndWait(input, 'sjö');

    const option = screen.getByRole('option');
    fireEvent.mouseDown(option);

    expect(input.value).toBe('');
  });

  it('supports keyboard navigation — ArrowDown/ArrowUp', () => {
    renderSearchBar();
    const input = screen.getByRole('searchbox');
    typeAndWait(input, 'café');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'false');

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('supports keyboard selection with Enter', () => {
    const onVenueSelect = vi.fn();
    renderSearchBar(onVenueSelect);
    const input = screen.getByRole('searchbox');
    typeAndWait(input, 'café');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockSelectVenue).toHaveBeenCalledWith('v1');
    expect(onVenueSelect).toHaveBeenCalledWith('v1', { lat: 57.7, lng: 11.97 });
  });

  it('closes dropdown on Escape', () => {
    renderSearchBar();
    const input = screen.getByRole('searchbox');
    typeAndWait(input, 'café');

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown on outside click', () => {
    renderSearchBar();
    const input = screen.getByRole('searchbox');
    typeAndWait(input, 'café');

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('clears results when query is emptied', () => {
    renderSearchBar();
    const input = screen.getByRole('searchbox');
    typeAndWait(input, 'café');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    typeAndWait(input, '');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not contain MOCK_VENUES', () => {
    // Verify MOCK_VENUES constant is completely removed — searching for a
    // name that was in the old mock list produces the empty-state message,
    // not a selectable venue option.
    renderSearchBar();
    const input = screen.getByRole('searchbox');
    typeAndWait(input, 'Familjen');
    // Should show empty state, not a venue match
    expect(screen.getByText("Inga resultat för 'Familjen'")).toBeInTheDocument();
  });
});
