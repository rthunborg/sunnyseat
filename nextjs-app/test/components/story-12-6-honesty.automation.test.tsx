import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, test, vi } from 'vitest';
import { VenueQuickInfo } from '@/components/composed/venue/VenueQuickInfo';
import { VenueList } from '@/components/custom/venue/VenueList';
import venueMessages from '@/messages/sv/venue.json';
import type { VenueDataDto } from '@/lib/types/api';

vi.mock('motion/react', async () => {
  const React = await import('react');
  type MotionProps = React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
  const passthrough = ({ children, ...props }: MotionProps) => {
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      layout: _layout,
      ...rest
    } = props;
    return React.createElement('aside', rest, children);
  };
  return {
    motion: { aside: passthrough, div: passthrough },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => false,
  };
});

const quickInfoLabels = {
  route: 'Visa Rutt',
  moreInfo: 'Mer Info',
  close: 'Stäng platskort',
  photoPlaceholder: 'Platshållarbild',
  confidence: 'Säkerhet',
  confidenceApproximate: 'cirka',
  confidenceUnavailable: 'Säkerhet saknas',
  distance: 'Avstånd',
  loadingSun: 'Laddar soldata',
  routeLoading: 'Öppnar kartor',
  favouriteAdd: 'Spara som favorit',
  favouriteRemove: 'Ta bort favorit',
  obscuredHeadline: 'Sol bakom moln',
  sky: {
    clear: 'Klart',
    partlyCloudy: 'Delvis molnigt',
    overcast: 'Mulet',
    rain: 'Regn',
  },
};

function venue(overrides: Partial<VenueDataDto>): VenueDataDto {
  return {
    id: 'venue',
    venueId: 'venue',
    venueName: 'Venue',
    venueSlug: 'venue',
    slug: 'venue',
    neighborhood: 'Centrum',
    location: { lat: 57.7089, lng: 11.9746 },
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
    isPartner: false,
    confidence: 80,
    distanceMeters: 100,
    sunExposurePercent: 80,
    tags: [],
    sunWindow: { start: '13:00', end: '14:00' },
    ...overrides,
  };
}

function VenueListProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={{ venue: venueMessages }}>
      {children}
    </NextIntlClientProvider>
  );
}

function renderQuickInfo(props: {
  name: string;
  exposure: number;
  gate: VenueDataDto['weatherGateState'];
  status: VenueDataDto['currentSunStatus'];
}) {
  return render(
    <VenueQuickInfo
      mode="mobile"
      name={props.name}
      confidencePercent={40}
      confidenceMeta={{ sunDataSource: props.gate === 'unknown' ? 'geometry-only' : 'weather' }}
      sunExposurePercent={props.exposure}
      currentSunStatus={props.status}
      weatherGateState={props.gate}
      skyCondition={props.gate === 'unknown' ? 'unavailable' : 'clear'}
      distanceMeters={100}
      isLoadingSunData={false}
      onDismiss={() => {}}
      onOpenDetails={() => {}}
      onRoute={() => {}}
      labels={quickInfoLabels}
    />,
  );
}

describe('Story 12.6 automation - map-adjacent public verdict honesty', () => {
  test('[P0] list cards keep low, exact-50, and gated venues percentage-free', () => {
    render(
      <VenueList
        venues={[
          venue({ id: 'low', venueName: 'Fyrtio', sunExposurePercent: 40, currentSunStatus: 'Partial' }),
          venue({ id: 'fifty', venueName: 'Femtio', sunExposurePercent: 50, currentSunStatus: 'Partial' }),
          venue({
            id: 'gated',
            venueName: 'Gatad',
            sunExposurePercent: 95,
            currentSunStatus: 'CloudObscured',
            weatherGateState: 'gated',
          }),
        ]}
        mode="desktop"
        confidenceMeta={{ sunDataSource: 'weather' }}
        onSelectVenue={() => {}}
      />,
      { wrapper: VenueListProvider },
    );

    for (const name of ['Fyrtio', 'Femtio', 'Gatad']) {
      const card = screen.getByRole('button', { name: new RegExp(`Välj ${name}`, 'i') }).closest('article');
      expect(card).not.toBeNull();
      expect(card).not.toHaveTextContent(/\d+%\s*sol/i);
    }
  });

  test('[P0] an unknown-weather sunny card includes localized weather-unavailable meaning', () => {
    render(
      <VenueList
        venues={[
          venue({
            id: 'unknown',
            venueName: 'Okänt väder',
            sunExposurePercent: 80,
            weatherGateState: 'unknown',
          }),
        ]}
        mode="desktop"
        confidenceMeta={{ sunDataSource: 'geometry-only' }}
        onSelectVenue={() => {}}
      />,
      { wrapper: VenueListProvider },
    );

    const card = screen.getByTestId('venue-card');
    expect(card).toHaveTextContent(/FULL SOL/i);
    expect(card).toHaveTextContent(/Väder saknas vid vald tid/i);
  });

  test('[P0] low and exact-50 QuickInfo states expose a localized not-sunny verdict without a percentage', () => {
    const rendered = renderQuickInfo({
      name: 'Fyrtio',
      exposure: 40,
      gate: 'not_gated',
      status: 'Partial',
    });

    const observed: Array<{ hasPercent: boolean; hasNotSunnyVerdict: boolean }> = [];
    for (const scenario of [
      { name: 'Fyrtio', exposure: 40 },
      { name: 'Femtio', exposure: 50 },
    ]) {
      rendered.rerender(
        <VenueQuickInfo
          mode="mobile"
          name={scenario.name}
          confidencePercent={40}
          confidenceMeta={{ sunDataSource: 'weather' }}
          sunExposurePercent={scenario.exposure}
          currentSunStatus="Partial"
          weatherGateState="not_gated"
          skyCondition="clear"
          distanceMeters={100}
          isLoadingSunData={false}
          onDismiss={() => {}}
          onOpenDetails={() => {}}
          onRoute={() => {}}
          labels={quickInfoLabels}
        />,
      );
      const quickInfo = screen.getByTestId('venue-quick-info');
      observed.push({
        hasPercent: /\d+%\s*SOL/i.test(quickInfo.textContent ?? ''),
        hasNotSunnyVerdict: /Inte soligt vid vald tid/i.test(quickInfo.textContent ?? ''),
      });
    }

    expect(observed).toEqual([
      { hasPercent: false, hasNotSunnyVerdict: true },
      { hasPercent: false, hasNotSunnyVerdict: true },
    ]);
  });

  test('[P0] unknown-weather sunny QuickInfo includes localized weather-unavailable meaning', () => {
    renderQuickInfo({
      name: 'Okänt väder',
      exposure: 80,
      gate: 'unknown',
      status: 'Sunny',
    });

    const quickInfo = screen.getByTestId('venue-quick-info');
    expect(quickInfo).toHaveTextContent(/80%\s*SOL/i);
    expect(quickInfo).toHaveTextContent(/Väder saknas vid vald tid/i);
  });
});
