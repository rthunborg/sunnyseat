'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useCardTray } from '@/lib/context/CardTrayContext';
import { searchVenues, type SearchResult } from '@/lib/utils/searchVenues';
import type { SunStatus } from '@/lib/types/design-tokens';

const STATUS_DOT_COLORS: Record<SunStatus, string> = {
  sunny: 'bg-[var(--color-sun-sunny)]',
  partial: 'bg-[var(--color-sun-partial)]',
  shaded: 'bg-[var(--color-sun-shaded)]',
  upcoming: 'bg-[var(--color-sun-upcoming)]',
};

interface SearchBarProps {
  className?: string;
  onVenueSelect?: (venueId: string, coords: { lat: number; lng: number }) => void;
}

export function SearchBar({ className, onVenueSelect }: SearchBarProps) {
  const { t } = useLanguage();
  const { venues, selectVenue } = useCardTray();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const filterVenues = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setResults([]);
        setIsOpen(false);
        setShowEmpty(false);
        return;
      }
      const filtered = searchVenues(venues, q);
      setResults(filtered);
      setIsOpen(filtered.length > 0);
      setShowEmpty(filtered.length === 0);
      setActiveIndex(-1);
    },
    [venues]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => filterVenues(value), 200);
    },
    [filterVenues]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      setShowEmpty(false);
      setQuery('');
      selectVenue(result.venueId);
      onVenueSelect?.(result.venueId, { lat: result.lat, lng: result.lng });
    },
    [selectVenue, onVenueSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen && !showEmpty) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setShowEmpty(false);
      }
    },
    [isOpen, showEmpty, activeIndex, results, handleSelect]
  );

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setShowEmpty(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const dropdownOpen = isOpen || showEmpty;

  const emptyMessage = useMemo(() => {
    if (!showEmpty) return null;
    return t('home.noSearchResults', { query: query.trim() });
  }, [showEmpty, query, t]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className ?? ''}`}
      role="combobox"
      aria-expanded={dropdownOpen}
      aria-controls="search-suggestions"
      aria-haspopup="listbox"
      data-testid="search-bar"
    >
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query.trim()) {
            if (results.length > 0) setIsOpen(true);
            else setShowEmpty(true);
          }
        }}
        placeholder={t('home.searchPlaceholder')}
        aria-label={t('home.searchPlaceholder')}
        aria-controls="search-suggestions"
        aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
        autoComplete="off"
        className="w-full h-[var(--spacing-touch-min)] px-4 bg-surface-primary border border-border-default rounded-button text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-primary placeholder:text-text-muted shadow-card focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {dropdownOpen && (
        <ul
          ref={listRef}
          id="search-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-surface-primary border border-border-default rounded-button shadow-card z-50 overflow-hidden"
        >
          {showEmpty ? (
            <li className="px-4 py-3 text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-muted" role="option" aria-selected={false}>
              <div>{emptyMessage}</div>
              <div className="text-[length:var(--font-size-caption)] mt-1">
                {t('home.noSearchResultsHint')}
              </div>
            </li>
          ) : (
            results.map((result, i) => (
              <li
                key={result.venueId}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={`px-4 min-h-[var(--spacing-touch-min)] flex items-center gap-2 text-[length:var(--font-size-body)] leading-[var(--line-height-body)] cursor-pointer transition-colors ${
                  i === activeIndex
                    ? 'bg-surface-secondary text-text-primary'
                    : 'text-text-secondary hover:bg-surface-secondary'
                }`}
                onMouseDown={() => handleSelect(result)}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT_COLORS[result.currentStatus]}`}
                  aria-hidden="true"
                />
                <span className="truncate">{result.name}</span>
                <span className="ml-auto text-[length:var(--font-size-caption)] text-text-muted truncate">
                  {result.neighborhood}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
