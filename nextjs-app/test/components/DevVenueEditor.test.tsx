import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevVenueEditor } from '@/components/custom/dev/DevVenueEditor';

const searchParamsMock = vi.hoisted(() => ({
  value: new URLSearchParams(),
}));

const hooksMock = vi.hoisted(() => ({
  venues: vi.fn(),
  patch: vi.fn(),
}));

const mutateMock = vi.hoisted(() => vi.fn());

type MockLngLat = { lat: number; lng: number };
type MockMarkerEvent = 'dragend';

const mapInstanceMock = vi.hoisted(() => vi.fn());
const markerMock = vi.hoisted(() => {
  class MockMarker {
    static instances: MockMarker[] = [];

    element: HTMLElement;
    lngLat: MockLngLat = { lat: 0, lng: 0 };
    listeners = new Map<MockMarkerEvent, () => void>();

    constructor(options: { element: HTMLElement }) {
      this.element = options.element;
      MockMarker.instances.push(this);
    }

    setLngLat(value: [number, number]) {
      this.lngLat = { lng: value[0], lat: value[1] };
      return this;
    }

    getLngLat() {
      return this.lngLat;
    }

    addTo() {
      document.body.appendChild(this.element);
      return this;
    }

    on(event: MockMarkerEvent, listener: () => void) {
      this.listeners.set(event, listener);
      return this;
    }

    off(event: MockMarkerEvent, listener: () => void) {
      if (this.listeners.get(event) === listener) {
        this.listeners.delete(event);
      }
      return this;
    }

    remove() {
      this.element.remove();
      return this;
    }
  }

  return { Marker: MockMarker };
});

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsMock.value,
}));

vi.mock('maplibre-gl', () => ({
  default: {
    Marker: markerMock.Marker,
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) => {
    const labels: Record<string, string> = {
      title: 'Redigera plats',
      venue: 'Plats',
      hidden: 'Dold',
      displayLat: 'Visningslatitud',
      displayLng: 'Visningslongitud',
      engineLat: 'Motorlatitud',
      engineLng: 'Motorlongitud',
      seatingArea: 'Uteservering',
      tags: 'Taggar',
      description: 'Beskrivning',
      thumbnailAlt: 'Bildtext',
      thumbnailInitials: 'Initialer',
      thumbnailCard: 'Kortbild',
      thumbnailHero: 'Hero-bild',
      save: 'Spara',
      saving: 'Sparar',
      reset: 'Återställ',
      saved: 'Sparat',
      empty: 'Ingen plats vald',
      validationFailed: 'Kontrollera fälten',
      dragPinAria: `Visningsnål för ${values?.name ?? ''}`,
    };
    return labels[key] ?? key;
  },
}));

vi.mock('@/lib/contexts/MapInstanceContext', () => ({
  useMapInstance: () => ({ mapInstance: mapInstanceMock() }),
}));

vi.mock('@/hooks/queries/useDevVenueEditor', () => ({
  useDevVenueEditorVenues: hooksMock.venues,
  usePatchDevVenueEditorVenue: hooksMock.patch,
}));

describe('<DevVenueEditor />', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    searchParamsMock.value = new URLSearchParams();
    mutateMock.mockReset();
    hooksMock.venues.mockReset();
    hooksMock.patch.mockReset();
    hooksMock.venues.mockReturnValue({
      data: undefined,
      isError: false,
    });
    hooksMock.patch.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
      isError: false,
    });
    mapInstanceMock.mockReset();
    mapInstanceMock.mockReturnValue(null);
    markerMock.Marker.instances.length = 0;
  });

  it('renders no editor chrome without the explicit dev-editor query parameter', () => {
    render(<DevVenueEditor adminEnabled />);

    expect(screen.queryByText('Redigera plats')).not.toBeInTheDocument();
  });

  it('keeps the guarded query disabled when the server-computed admin gate is false', () => {
    searchParamsMock.value = new URLSearchParams('_editor=venues');

    render(<DevVenueEditor />);

    expect(screen.queryByText('Redigera plats')).not.toBeInTheDocument();
    expect(hooksMock.venues).toHaveBeenCalledWith(false);
  });

  it('uses the server-computed admin prop instead of reading private server env in the browser', () => {
    vi.stubEnv('SUNNYSEAT_ADMIN', '');
    searchParamsMock.value = new URLSearchParams('_editor=venues');

    render(<DevVenueEditor adminEnabled />);

    expect(screen.queryByText('Redigera plats')).not.toBeInTheDocument();
    expect(hooksMock.venues).toHaveBeenCalledWith(true);
  });

  it('renders the editor after a successful guarded query and patches display coordinates', async () => {
    searchParamsMock.value = new URLSearchParams('_editor=venues');
    hooksMock.venues.mockReturnValue({
      isError: false,
      data: {
        venues: [
          {
            id: '1',
            slug: 'test-venue-sunny',
            venueName: 'Kafé Magasinet',
            hidden: false,
            displayLocation: { lat: 57.705, lng: 11.97 },
            engineLocation: { lat: 57.705, lng: 11.97 },
            tags: ['Innergård'],
            description: 'Solig gård.',
            thumbnail: { alt: 'Bild', initials: 'KM' },
          },
        ],
        timestamp: '2026-07-27T15:00:00.000Z',
      },
    });

    render(<DevVenueEditor adminEnabled />);

    fireEvent.change(await screen.findByLabelText('Visningslatitud'), {
      target: { value: '57.706100' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Spara' }));

    expect(mutateMock).toHaveBeenCalledWith(
      {
        identifier: 'test-venue-sunny',
        patch: {
          displayLocation: { lat: 57.7061, lng: 11.97 },
        },
      },
      expect.any(Object),
    );
  });

  it('exposes hidden, polygon, tags, description, and thumbnail controls in Swedish and saves inline changes', async () => {
    searchParamsMock.value = new URLSearchParams('_editor=venues');
    hooksMock.venues.mockReturnValue({
      isError: false,
      data: {
        venues: [
          {
            id: '1',
            slug: 'test-venue-sunny',
            venueName: 'Kafé Magasinet',
            hidden: false,
            displayLocation: { lat: 57.705, lng: 11.97 },
            engineLocation: { lat: 57.7048, lng: 11.9698 },
            tags: ['Innergård'],
            description: 'Solig gård.',
            thumbnail: { alt: 'Bild', initials: 'KM' },
          },
        ],
        timestamp: '2026-07-27T15:00:00.000Z',
      },
    });

    render(<DevVenueEditor adminEnabled />);

    fireEvent.click(await screen.findByLabelText('Dold'));
    fireEvent.change(screen.getByLabelText('Uteservering'), {
      target: { value: '[[11.97,57.705],[11.971,57.705],[11.971,57.706],[11.97,57.705]]' },
    });
    fireEvent.change(screen.getByLabelText('Taggar'), {
      target: { value: 'Innergård, Kvällssol' },
    });
    fireEvent.change(screen.getByLabelText('Beskrivning'), {
      target: { value: ' Uppdaterad beskrivning. ' },
    });
    fireEvent.change(screen.getByLabelText('Bildtext'), {
      target: { value: 'Ny bildtext' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Spara' }));

    expect(mutateMock).toHaveBeenCalledWith(
      {
        identifier: 'test-venue-sunny',
        patch: expect.objectContaining({
          hidden: true,
          seatingAreaText: '[[11.97,57.705],[11.971,57.705],[11.971,57.706],[11.97,57.705]]',
          tags: ['Innergård', 'Kvällssol'],
          description: 'Uppdaterad beskrivning.',
          thumbnail: {
            alt: 'Ny bildtext',
            initials: 'KM',
          },
        }),
      },
      expect.any(Object),
    );
  });

  it('shows a non-destructive validation alert before mutating invalid display coordinates', async () => {
    searchParamsMock.value = new URLSearchParams('_editor=venues');
    hooksMock.venues.mockReturnValue({
      isError: false,
      data: {
        venues: [
          {
            id: '1',
            slug: 'test-venue-sunny',
            venueName: 'Kafé Magasinet',
            hidden: false,
            displayLocation: { lat: 57.705, lng: 11.97 },
            engineLocation: { lat: 57.7048, lng: 11.9698 },
            tags: [],
            description: null,
            thumbnail: null,
          },
        ],
        timestamp: '2026-07-27T15:00:00.000Z',
      },
    });

    render(<DevVenueEditor adminEnabled />);

    fireEvent.change(await screen.findByLabelText('Visningslatitud'), {
      target: { value: 'inte ett tal' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Spara' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Kontrollera fälten');
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('keeps keyboard focus on the display pin across consecutive arrow nudges', async () => {
    searchParamsMock.value = new URLSearchParams('_editor=venues');
    mapInstanceMock.mockReturnValue({});
    hooksMock.venues.mockReturnValue({
      isError: false,
      data: {
        venues: [
          {
            id: '1',
            slug: 'test-venue-sunny',
            venueName: 'Kafé Magasinet',
            hidden: false,
            displayLocation: { lat: 57.705, lng: 11.97 },
            engineLocation: { lat: 57.7048, lng: 11.9698 },
            tags: [],
            description: null,
            thumbnail: null,
          },
        ],
        timestamp: '2026-07-27T15:00:00.000Z',
      },
    });

    render(<DevVenueEditor adminEnabled />);

    const pin = await screen.findByTestId('dev-venue-editor-display-pin');
    pin.focus();

    fireEvent.keyDown(pin, { key: 'ArrowUp' });
    fireEvent.keyDown(pin, { key: 'ArrowUp' });

    expect(markerMock.Marker.instances).toHaveLength(1);
    expect(document.activeElement).toBe(pin);
    expect(screen.getByLabelText('Visningslatitud')).toHaveValue('57.705200');
  });
});
