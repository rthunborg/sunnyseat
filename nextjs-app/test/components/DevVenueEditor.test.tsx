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

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsMock.value,
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
  useMapInstance: () => ({ mapInstance: null }),
}));

vi.mock('@/hooks/queries/useDevVenueEditor', () => ({
  useDevVenueEditorVenues: hooksMock.venues,
  usePatchDevVenueEditorVenue: hooksMock.patch,
}));

describe('<DevVenueEditor />', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('SUNNYSEAT_ADMIN', 'dev');
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
  });

  it('renders no editor chrome without the explicit dev-editor query parameter', () => {
    render(<DevVenueEditor />);

    expect(screen.queryByText('Redigera plats')).not.toBeInTheDocument();
  });

  it('renders no editor chrome when the server-side dev admin gate is not enabled', () => {
    vi.stubEnv('SUNNYSEAT_ADMIN', '');
    searchParamsMock.value = new URLSearchParams('_editor=venues');

    render(<DevVenueEditor />);

    expect(screen.queryByText('Redigera plats')).not.toBeInTheDocument();
    expect(hooksMock.venues).toHaveBeenCalledWith(false);
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

    render(<DevVenueEditor />);

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

    render(<DevVenueEditor />);

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

    render(<DevVenueEditor />);

    fireEvent.change(await screen.findByLabelText('Visningslatitud'), {
      target: { value: 'inte ett tal' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Spara' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Kontrollera fälten');
    expect(mutateMock).not.toHaveBeenCalled();
  });
});
