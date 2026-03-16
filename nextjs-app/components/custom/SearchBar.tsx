'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

const MOCK_VENUES = [
  { name: 'Café Husaren', slug: 'cafe-husaren' },
  { name: 'Sjöbaren', slug: 'sjobaren' },
  { name: 'Puta Madre', slug: 'puta-madre' },
  { name: 'Bar Centro', slug: 'bar-centro' },
  { name: 'Hagabion Café', slug: 'hagabion-cafe' },
  { name: 'Familjen', slug: 'familjen' },
  { name: 'Folk', slug: 'folk' },
  { name: 'Kafferosten', slug: 'kafferosten' },
  { name: 'Linnéterrassen', slug: 'linneterrassen' },
  { name: 'Dubbel Dubbel', slug: 'dubbel-dubbel' },
];

export function SearchBar({ className }: { className?: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<typeof MOCK_VENUES>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const filterVenues = useCallback((q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    const lower = q.toLowerCase();
    const filtered = MOCK_VENUES.filter((v) =>
      v.name.toLowerCase().includes(lower)
    ).slice(0, 5);
    setSuggestions(filtered);
    setIsOpen(filtered.length > 0);
    setActiveIndex(-1);
  }, []);

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
    (slug: string) => {
      setIsOpen(false);
      setQuery('');
      router.push(`/v/${slug}`);
    },
    [router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[activeIndex].slug);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [isOpen, activeIndex, suggestions, handleSelect]
  );

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={`relative ${className ?? ''}`} role="combobox" aria-expanded={isOpen} aria-haspopup="listbox">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => query.trim() && suggestions.length > 0 && setIsOpen(true)}
        placeholder={t('home.searchPlaceholder')}
        aria-label={t('home.searchPlaceholder')}
        aria-controls="search-suggestions"
        aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
        autoComplete="off"
        className="w-full h-[var(--spacing-touch-min)] px-4 bg-surface-primary border border-border-default rounded-button text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-primary placeholder:text-text-muted shadow-card focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {isOpen && (
        <ul
          ref={listRef}
          id="search-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-surface-primary border border-border-default rounded-button shadow-card z-50 overflow-hidden"
        >
          {suggestions.map((venue, i) => (
            <li
              key={venue.slug}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`px-4 min-h-[var(--spacing-touch-min)] flex items-center text-[length:var(--font-size-body)] leading-[var(--line-height-body)] cursor-pointer transition-colors ${
                i === activeIndex
                  ? 'bg-surface-secondary text-text-primary'
                  : 'text-text-secondary hover:bg-surface-secondary'
              }`}
              onMouseDown={() => handleSelect(venue.slug)}
            >
              {venue.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
