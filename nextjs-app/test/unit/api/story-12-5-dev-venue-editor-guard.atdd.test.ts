import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/dev/venues/route';
import { PATCH } from '@/app/api/dev/venues/[identifier]/route';
import {
  listDevEditorVenues,
  patchDevEditorVenue,
} from '@/lib/services/dev-venue-editor-store';

vi.mock('@/lib/services/dev-venue-editor-store', () => ({
  listDevEditorVenues: vi.fn(),
  patchDevEditorVenue: vi.fn(),
}));

const listDevEditorVenuesMock = vi.mocked(listDevEditorVenues);
const patchDevEditorVenueMock = vi.mocked(patchDevEditorVenue);

function request(
  url: string,
  init?: {
    method?: string;
    body?: BodyInit | null;
    headers?: HeadersInit;
    includeOrigin?: boolean;
  },
): NextRequest {
  const headers = new Headers(init?.headers);
  if (!headers.has('host')) headers.set('host', 'localhost:3000');
  if (init?.includeOrigin !== false && !headers.has('origin')) {
    headers.set('origin', 'http://localhost:3000');
  }
  return new NextRequest(url, {
    method: init?.method,
    body: init?.body,
    headers,
  });
}

function patchContext(identifier = 'test-venue-sunny') {
  return { params: Promise.resolve({ identifier }) };
}

describe('Story 12.5 dev venue editor guard', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'development');
    listDevEditorVenuesMock.mockReset();
    patchDevEditorVenueMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('denies production before touching the editor service, even when the dev flag is set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SUNNYSEAT_ADMIN', 'dev');

    const res = await GET(request('http://localhost/api/dev/venues'));

    expect(res.status).toBe(404);
    expect(listDevEditorVenuesMock).not.toHaveBeenCalled();
  });

  it('denies non-production requests when SUNNYSEAT_ADMIN is unset before parsing the request body', async () => {
    const res = await PATCH(
      request('http://localhost/api/dev/venues/test-venue-sunny', {
        method: 'PATCH',
        body: '{not-json',
      }),
      patchContext(),
    );

    expect(res.status).toBe(403);
    expect(patchDevEditorVenueMock).not.toHaveBeenCalled();
  });

  it('fails closed for non-loopback hosts and forwarded-host/proto ambiguity', async () => {
    vi.stubEnv('SUNNYSEAT_ADMIN', 'dev');

    const remote = await GET(
      request('https://sunnyseat.example/api/dev/venues', {
        headers: {
          host: 'sunnyseat.example',
          origin: 'https://sunnyseat.example',
        },
      }),
    );
    const forwarded = await GET(
      request('http://localhost/api/dev/venues', {
        headers: {
          'x-forwarded-host': 'sunnyseat.example',
        },
      }),
    );
    const forwardedProto = await GET(
      request('http://localhost/api/dev/venues', {
        headers: {
          'x-forwarded-proto': 'https',
        },
      }),
    );
    const forwardedFor = await GET(
      request('http://localhost/api/dev/venues', {
        headers: {
          'x-forwarded-for': '203.0.113.10',
        },
      }),
    );
    const spoofedHost = await GET(
      request('https://sunnyseat.example/api/dev/venues', {
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
        },
      }),
    );

    expect(remote.status).toBe(403);
    expect(forwarded.status).toBe(403);
    expect(forwardedProto.status).toBe(403);
    expect(forwardedFor.status).toBe(403);
    expect(spoofedHost.status).toBe(403);
    expect(listDevEditorVenuesMock).not.toHaveBeenCalled();
  });

  it('allows browser-realistic loopback GET requests without an Origin header', async () => {
    vi.stubEnv('SUNNYSEAT_ADMIN', 'dev');
    listDevEditorVenuesMock.mockResolvedValue([]);

    const read = await GET(
      request('http://localhost:3000/api/dev/venues', {
        includeOrigin: false,
      }),
    );

    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ venues: [] });
    expect(listDevEditorVenuesMock).toHaveBeenCalledOnce();
  });

  it('denies loopback writes without an Origin header before touching the editor service', async () => {
    vi.stubEnv('SUNNYSEAT_ADMIN', 'dev');

    const write = await PATCH(
      request('http://localhost:3000/api/dev/venues/test-venue-sunny', {
        method: 'PATCH',
        body: JSON.stringify({ hidden: true }),
        includeOrigin: false,
      }),
      patchContext(),
    );

    expect(write.status).toBe(403);
    expect(patchDevEditorVenueMock).not.toHaveBeenCalled();
  });

  it('allows loopback dev reads and writes through the guarded editor service only when explicitly enabled', async () => {
    vi.stubEnv('SUNNYSEAT_ADMIN', 'dev');
    listDevEditorVenuesMock.mockResolvedValue([
      {
        id: '1',
        slug: 'test-venue-sunny',
        venueName: 'Kafé Magasinet',
        hidden: false,
        displayLocation: { lat: 57.706, lng: 11.971 },
        engineLocation: { lat: 57.705, lng: 11.97 },
        tags: ['Innergård'],
      },
      {
        id: '2',
        slug: 'test-venue-hidden',
        venueName: 'Dold testplats',
        hidden: true,
        displayLocation: { lat: 57.707, lng: 11.972 },
        engineLocation: { lat: 57.707, lng: 11.972 },
        tags: [],
      },
    ]);
    patchDevEditorVenueMock.mockResolvedValue({
      id: '1',
      slug: 'test-venue-sunny',
      venueName: 'Kafé Magasinet',
      hidden: true,
      displayLocation: { lat: 57.706, lng: 11.971 },
      engineLocation: { lat: 57.705, lng: 11.97 },
      tags: ['Innergård'],
    });

    const read = await GET(request('http://localhost:3000/api/dev/venues'));
    const write = await PATCH(
      request('http://localhost:3000/api/dev/venues/test-venue-sunny', {
        method: 'PATCH',
        body: JSON.stringify({ hidden: true }),
      }),
      patchContext(),
    );

    expect(read.status).toBe(200);
    expect(read.headers.get('Cache-Control')).toBe('no-store');
    expect(await read.json()).toMatchObject({
      venues: [
        { slug: 'test-venue-sunny', hidden: false },
        { slug: 'test-venue-hidden', hidden: true },
      ],
    });
    expect(write.status).toBe(200);
    expect(await write.json()).toMatchObject({
      venue: { slug: 'test-venue-sunny', hidden: true },
    });
    expect(patchDevEditorVenueMock).toHaveBeenCalledWith(
      'test-venue-sunny',
      { hidden: true },
    );
  });
});
