import { type Page } from '@playwright/test';

export type VenuePhotoTestState = 'venue-photo-loaded' | 'venue-photo-fallback';

export async function arrangeVenuePhotoMedia(page: Page, state: VenuePhotoTestState) {
  if (state === 'venue-photo-loaded') {
    return;
  }

  await page.route('**/storage/v1/object/public/venue-media/**/*.webp', async (route) => {
    await route.abort('failed');
  });
}
