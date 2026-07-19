import { type Page, type Route } from '@playwright/test';

export const STORY_12_12_WEBP_PIXEL = Buffer.from(
  [
    'UklGRuwDAABXRUJQVlA4WAoAAAAgAAAAPwAAJwAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABh',
    'Y3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJD',
    'AAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZ',
    'WiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAAN',
    'WQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAx',
    'ADZWUDgg/gEAANAMAJ0BKkAAKAA+KQ6FQiGGVyWZBgChLEAXDITPuPXvxV5yWN2T/WHO9gdQBvH/lAFMewmYTlzx',
    'qy3qBedOVExPELKw4XTa1nghzhSQwXSN9Gsxz5/ooIcFEm5UTnHKv9/9G4KhIHV8NTSx/jaQgAD+',
    '/b8R8MBs8SxR89h/i93d9VcfMLykhKJVxLzes6H+zrv99Q1yn/95P0dsEY9xFde///GL9VHhsc',
    'fa7H/7g+NK46lzuemQ7xz3bEPV9xK2Rt6Lcfv+a1ukvzbHMy3vfCx9ACAKy/RxjknbYPnenOc',
    '1sIcjn1UBoHn/kZWD9ZSasswGgzeyCTQFb9UFZX2kkbIMbeJeEVhfe6JTEuxHt0GLn0oPDDBdtvuyke',
    'FM/Kx/Fe/u3uqv75Fte5vDUG/wsvp10Vg9ip6/uefk3rSL7/wlVpy5o5zi/CIAUTXDmsM5/uv8q',
    'LX+pufP/DHf+7fwvgXI31W49Hl8IOr5OLMrafcpj3WN60p9s/9MxKf0v8rllIYEjzw//yK',
    'DPf9HbbfgrXTh7AsqOXrHfv3+z0sAZjV7HNC2uYAm+u9TawjPei7uP2VW7OqrIFCjPaFve',
    'KFeGaaUPXvdJGx2EB6YqBPZPwNTriMTeIJEihmQK+O8didoSbDVyCjiaXaPf1gjiPO0Vj5xOS',
    'NhSJwcB6wLwOoAAA==',
  ].join(''),
  'base64',
);

export type VenuePhotoTestState = 'venue-photo-loaded' | 'venue-photo-fallback';

export async function arrangeVenuePhotoMedia(page: Page, state: VenuePhotoTestState) {
  await page.route('**/storage/v1/object/public/venue-media/**/*.webp', async (route: Route) => {
    if (state === 'venue-photo-fallback') {
      await route.abort('failed');
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'image/webp',
      body: STORY_12_12_WEBP_PIXEL,
    });
  });
}
