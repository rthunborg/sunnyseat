import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocationPermissionPrompt } from '@/components/custom/LocationPermissionPrompt';
import { LanguageProvider } from '@/lib/i18n';

// Mock useReducedMotion
vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

function renderPrompt(overrides: Partial<{
  permissionStatus: 'granted' | 'denied' | 'prompt' | null;
  onRequestLocation: () => void;
  onDismiss: () => void;
}> = {}) {
  return render(
    <LanguageProvider>
      <LocationPermissionPrompt
        permissionStatus={overrides.permissionStatus ?? null}
        onRequestLocation={overrides.onRequestLocation ?? vi.fn()}
        onDismiss={overrides.onDismiss ?? vi.fn()}
      />
    </LanguageProvider>
  );
}

describe('LocationPermissionPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
  });

  it('renders when permission status is null and not previously prompted', () => {
    renderPrompt({ permissionStatus: null });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Tillåt plats')).toBeInTheDocument();
  });

  it('shows "Tillåt plats" button with Swedish text', () => {
    renderPrompt({ permissionStatus: null });
    expect(screen.getByText('Tillåt plats')).toBeInTheDocument();
  });

  it('shows "Eller välj på kartan" link', () => {
    renderPrompt({ permissionStatus: null });
    expect(screen.getByText('Eller välj på kartan')).toBeInTheDocument();
  });

  it('calls onRequestLocation when allow button is clicked', () => {
    const onRequestLocation = vi.fn();
    renderPrompt({ permissionStatus: null, onRequestLocation });
    fireEvent.click(screen.getByText('Tillåt plats'));
    expect(onRequestLocation).toHaveBeenCalledOnce();
  });

  it('calls onDismiss when "choose on map" is clicked', () => {
    const onDismiss = vi.fn();
    renderPrompt({ permissionStatus: null, onDismiss });
    fireEvent.click(screen.getByText('Eller välj på kartan'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not render when permission is granted', () => {
    renderPrompt({ permissionStatus: 'granted' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not render when permission is denied', () => {
    renderPrompt({ permissionStatus: 'denied' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has dialog role and aria-labelledby for accessibility', () => {
    renderPrompt({ permissionStatus: null });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'location-prompt-title');
  });

  it('sets sessionStorage when allow button is clicked', () => {
    renderPrompt({ permissionStatus: null });
    fireEvent.click(screen.getByText('Tillåt plats'));
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('sunnyseat-location-prompted', 'true');
  });
});
