// Vitest setup file for Next.js testing
import '@testing-library/jest-dom/vitest';

// Force Swedish locale for consistent i18n testing
// Must run before i18n module initializes
Object.defineProperty(navigator, 'language', { value: 'sv-SE', configurable: true });

// Mock window.matchMedia for components that use useReducedMotion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
