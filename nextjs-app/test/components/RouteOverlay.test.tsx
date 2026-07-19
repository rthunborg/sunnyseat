import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RouteOverlay } from '@/components/custom/routing/RouteOverlay';

const labels = {
  title: 'Rutt till Kafé Magasinet',
  walk: 'ca 11 min promenad',
  bike: 'ca 4 min cykel',
  direction: 'sydväst',
  close: 'Stäng rutt',
  fallback: 'ÖPPNA I KARTOR',
  unavailable: 'Öppna kartor för vägbeskrivning',
};

describe('<RouteOverlay />', () => {
  it('shows walk, bike, direction, fallback link, and an accessible dismiss control', () => {
    const onDismiss = vi.fn();
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();

    render(
      <RouteOverlay
        labels={labels}
        fallbackHref="https://www.google.com/maps/search/?api=1&query=57.705%2C11.97"
        onDismiss={onDismiss}
      />,
    );

    const overlay = screen.getByRole('dialog', { name: 'Rutt till Kafé Magasinet' });
    expect(overlay).toHaveTextContent('ca 11 min promenad');
    expect(overlay).toHaveTextContent('ca 4 min cykel');
    expect(overlay).toHaveTextContent('sydväst');
    expect(screen.getByRole('button', { name: 'Stäng rutt' })).toHaveFocus();
    expect(screen.getByRole('link', { name: 'ÖPPNA I KARTOR' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Stäng rutt' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    opener.remove();
  });

  it('dismisses with Escape when keyboard focus is inside the overlay', () => {
    const onDismiss = vi.fn();
    render(
      <RouteOverlay
        labels={labels}
        fallbackHref="https://www.google.com/maps/dir/?api=1&destination=57.705%2C11.97&travelmode=walking&dir_action=navigate"
        onDismiss={onDismiss}
      />,
    );

    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Rutt till Kafé Magasinet' }), {
      key: 'Escape',
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders the public uncertainty row when provided, without confidence text (Story 12.13)', () => {
    render(
      <RouteOverlay
        labels={{
          ...labels,
          uncertainty: {
            visible: 'Osäker prognos',
            accessible: 'Osäker prognos. Lokala hinder kan påverka platsen.',
          },
        }}
        fallbackHref="https://www.google.com/maps/dir/?api=1&destination=57.705%2C11.97&travelmode=walking&dir_action=navigate"
        onDismiss={() => undefined}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Rutt till Kafé Magasinet' });
    expect(dialog).toHaveTextContent('Osäker prognos');
    expect(dialog).not.toHaveTextContent('Säkerhet');
    expect(screen.getByText('Osäker prognos')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByText('Osäker prognos. Lokala hinder kan påverka platsen.')).toHaveClass('sr-only');
  });

  it('omits the uncertainty row entirely when uncertainty is unavailable', () => {
    render(
      <RouteOverlay
        labels={{ ...labels, uncertainty: null }}
        fallbackHref="https://www.google.com/maps/dir/?api=1&destination=57.705%2C11.97&travelmode=walking&dir_action=navigate"
        onDismiss={() => undefined}
      />,
    );

    expect(
      screen.getByRole('dialog', { name: 'Rutt till Kafé Magasinet' }),
    ).not.toHaveTextContent('Säkerhet');
  });

  it('keeps an unavailable route state useful without numeric leakage', () => {
    render(
      <RouteOverlay
        labels={{
          ...labels,
          walk: null,
          bike: null,
          direction: null,
        }}
        fallbackHref="https://www.google.com/maps/search/?api=1&query=Kaf%C3%A9%20Magasinet"
        onDismiss={() => undefined}
      />,
    );

    const overlay = screen.getByRole('dialog', { name: 'Rutt till Kafé Magasinet' });
    expect(overlay).toHaveTextContent('Öppna kartor för vägbeskrivning');
    expect(overlay).not.toHaveTextContent('NaN');
    expect(overlay).not.toHaveTextContent('Infinity');
  });
});
