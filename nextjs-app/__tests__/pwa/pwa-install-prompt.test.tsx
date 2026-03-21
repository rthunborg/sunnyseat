import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PwaInstallPrompt } from '@/components/composed/PwaInstallPrompt';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockReturnValue({ matches: false }),
});

function fireInstallPrompt() {
  const event = new Event('beforeinstallprompt');
  Object.assign(event, {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
  });
  (event as Event).preventDefault = vi.fn();
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe('PwaInstallPrompt', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('renders nothing by default (no beforeinstallprompt fired)', () => {
    const { container } = render(<PwaInstallPrompt />);
    expect(container.innerHTML).toBe('');
  });

  it('shows prompt when beforeinstallprompt fires', () => {
    render(<PwaInstallPrompt />);
    fireInstallPrompt();
    expect(screen.getByText(/Installera SunnySeat/)).toBeDefined();
  });

  it('dismisses and saves to localStorage', () => {
    render(<PwaInstallPrompt />);
    fireInstallPrompt();
    fireEvent.click(screen.getByText('Nej tack'));
    expect(localStorageMock.setItem).toHaveBeenCalledWith('sunnyseat-pwa-dismissed', '1');
  });

  it('does not show if previously dismissed', () => {
    localStorageMock.getItem.mockReturnValueOnce('1');
    const { container } = render(<PwaInstallPrompt />);
    expect(container.innerHTML).toBe('');
  });

  it('has accessible dismiss button with aria-label', () => {
    render(<PwaInstallPrompt />);
    fireInstallPrompt();
    const dismissBtn = screen.getByLabelText('Avvisa installationserbjudande');
    expect(dismissBtn).toBeDefined();
  });
});
