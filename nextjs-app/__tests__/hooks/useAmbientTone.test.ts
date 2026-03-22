import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAmbientTone, getAmbientToneClass } from '@/lib/hooks/useAmbientTone';

// Mock CardTrayContext
const mockUseCardTray = vi.fn();
vi.mock('@/lib/context/CardTrayContext', () => ({
  useCardTray: () => mockUseCardTray(),
}));

function makeVenue(status: 'sunny' | 'partial' | 'shaded' | 'upcoming') {
  return {
    venue: { id: status, name: status, slug: status, neighborhood: '', lat: 0, lng: 0 },
    current_status: status,
    sun_exposure_percent: 0,
    confidence: 0,
    windows: [],
  };
}

describe('useAmbientTone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns winter tone in November', () => {
    mockUseCardTray.mockReturnValue({ venues: [], isLoading: false });
    const nov = new Date(2026, 10, 15); // month 10 = November
    const { result } = renderHook(() => useAmbientTone(nov));
    expect(result.current.mode).toBe('winter');
    expect(result.current.className).toBe('ambient-winter');
  });

  it('returns winter tone in December', () => {
    mockUseCardTray.mockReturnValue({ venues: [], isLoading: false });
    const dec = new Date(2026, 11, 1);
    const { result } = renderHook(() => useAmbientTone(dec));
    expect(result.current.mode).toBe('winter');
    expect(result.current.className).toBe('ambient-winter');
  });

  it('returns winter tone in January', () => {
    mockUseCardTray.mockReturnValue({ venues: [], isLoading: false });
    const jan = new Date(2027, 0, 15);
    const { result } = renderHook(() => useAmbientTone(jan));
    expect(result.current.mode).toBe('winter');
    expect(result.current.className).toBe('ambient-winter');
  });

  it('returns winter tone in February', () => {
    mockUseCardTray.mockReturnValue({ venues: [], isLoading: false });
    const feb = new Date(2027, 1, 10);
    const { result } = renderHook(() => useAmbientTone(feb));
    expect(result.current.mode).toBe('winter');
    expect(result.current.className).toBe('ambient-winter');
  });

  it('returns neutral when loading', () => {
    mockUseCardTray.mockReturnValue({ venues: [], isLoading: true });
    const june = new Date(2026, 5, 15);
    const { result } = renderHook(() => useAmbientTone(june));
    expect(result.current.mode).toBeNull();
    expect(result.current.className).toBe('');
  });

  it('returns neutral when no venues', () => {
    mockUseCardTray.mockReturnValue({ venues: [], isLoading: false });
    const june = new Date(2026, 5, 15);
    const { result } = renderHook(() => useAmbientTone(june));
    expect(result.current.mode).toBeNull();
    expect(result.current.className).toBe('');
  });

  it('returns sunny when majority sunny+partial', () => {
    mockUseCardTray.mockReturnValue({
      venues: [makeVenue('sunny'), makeVenue('partial'), makeVenue('shaded')],
      isLoading: false,
    });
    const june = new Date(2026, 5, 15);
    const { result } = renderHook(() => useAmbientTone(june));
    expect(result.current.mode).toBe('sunny');
    expect(result.current.className).toBe('ambient-sunny');
  });

  it('returns sunny when tied (sunny count >= cloudy count)', () => {
    mockUseCardTray.mockReturnValue({
      venues: [makeVenue('sunny'), makeVenue('shaded')],
      isLoading: false,
    });
    const june = new Date(2026, 5, 15);
    const { result } = renderHook(() => useAmbientTone(june));
    expect(result.current.mode).toBe('sunny');
    expect(result.current.className).toBe('ambient-sunny');
  });

  it('returns cloudy when majority shaded', () => {
    mockUseCardTray.mockReturnValue({
      venues: [makeVenue('shaded'), makeVenue('shaded'), makeVenue('sunny')],
      isLoading: false,
    });
    const june = new Date(2026, 5, 15);
    const { result } = renderHook(() => useAmbientTone(june));
    expect(result.current.mode).toBe('cloudy');
    expect(result.current.className).toBe('ambient-cloudy');
  });

  it('returns cloudy when all upcoming', () => {
    mockUseCardTray.mockReturnValue({
      venues: [makeVenue('upcoming'), makeVenue('upcoming')],
      isLoading: false,
    });
    const june = new Date(2026, 5, 15);
    const { result } = renderHook(() => useAmbientTone(june));
    expect(result.current.mode).toBe('cloudy');
    expect(result.current.className).toBe('ambient-cloudy');
  });

  it('winter overrides venue data even with sunny venues', () => {
    mockUseCardTray.mockReturnValue({
      venues: [makeVenue('sunny'), makeVenue('sunny'), makeVenue('sunny')],
      isLoading: false,
    });
    const jan = new Date(2027, 0, 15);
    const { result } = renderHook(() => useAmbientTone(jan));
    expect(result.current.mode).toBe('winter');
    expect(result.current.className).toBe('ambient-winter');
  });

  it('returns sunny for non-winter month with all sunny venues', () => {
    mockUseCardTray.mockReturnValue({
      venues: [makeVenue('sunny'), makeVenue('sunny')],
      isLoading: false,
    });
    const july = new Date(2026, 6, 15);
    const { result } = renderHook(() => useAmbientTone(july));
    expect(result.current.mode).toBe('sunny');
    expect(result.current.className).toBe('ambient-sunny');
  });
});

describe('getAmbientToneClass', () => {
  it('returns ambient-winter in winter months', () => {
    expect(getAmbientToneClass('sunny', new Date(2027, 0, 15))).toBe('ambient-winter');
  });

  it('returns ambient-sunny for sunny status in summer', () => {
    expect(getAmbientToneClass('sunny', new Date(2026, 6, 15))).toBe('ambient-sunny');
  });

  it('returns ambient-sunny for partial status in summer', () => {
    expect(getAmbientToneClass('partial', new Date(2026, 6, 15))).toBe('ambient-sunny');
  });

  it('returns ambient-cloudy for shaded status in summer', () => {
    expect(getAmbientToneClass('shaded', new Date(2026, 6, 15))).toBe('ambient-cloudy');
  });

  it('returns ambient-cloudy for upcoming status in summer', () => {
    expect(getAmbientToneClass('upcoming', new Date(2026, 6, 15))).toBe('ambient-cloudy');
  });
});
