import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { OnboardingScreen } from '@/components/custom/onboarding/OnboardingScreen';
import { TestProviders } from '@/test/setup/test-utils';

function withoutDocument<T>(fn: () => T): T {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: undefined,
  });
  try {
    return fn();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'document', descriptor);
    }
  }
}

function subject() {
  return (
    <TestProviders>
      <OnboardingScreen interactive={false} onDismiss={() => {}} />
    </TestProviders>
  );
}

describe('<OnboardingScreen /> hydration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hydrates its first-visit motion markup without React attribute mismatch warnings', async () => {
    const html = withoutDocument(() => renderToString(subject()));
    const rootElement = document.createElement('div');
    rootElement.innerHTML = html;
    document.body.appendChild(rootElement);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;

    try {
      await act(async () => {
        root = hydrateRoot(rootElement, subject());
      });

      await waitFor(() => {
        expect(rootElement.querySelector('[data-testid="onboarding-screen"]')).not.toBeNull();
      });

      expect(consoleError.mock.calls.map((call) => call.join(' ')).join('\n')).not.toContain(
        'A tree hydrated but some attributes of the server rendered HTML',
      );
    } finally {
      if (root) {
        const mountedRoot = root;
        await act(async () => {
          mountedRoot.unmount();
        });
      }
      rootElement.remove();
    }
  });
});
