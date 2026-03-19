import { supabase } from './supabase';

/** Known test coordinates in Gothenburg (Linné area) */
const GOTHENBURG_LAT = 57.6969;
const GOTHENBURG_LNG = 11.9563;

interface TestVenueOptions {
  name?: string;
  slug?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  type?: string;
}

/**
 * Insert a test venue into the database and return its ID.
 */
export async function createTestVenue(options: TestVenueOptions = {}) {
  const name = options.name ?? `E2E Test Venue ${Date.now()}`;
  const slug = options.slug ?? `e2e-test-${Date.now()}`;

  const { data, error } = await supabase
    .from('venues')
    .insert({
      name,
      slug,
      neighborhood: options.neighborhood ?? 'Linné',
      latitude: options.latitude ?? GOTHENBURG_LAT,
      longitude: options.longitude ?? GOTHENBURG_LNG,
      type: options.type ?? 'restaurant',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create test venue: ${error.message}`);
  return { id: data.id, name, slug };
}

/**
 * Delete a test venue by ID.
 */
export async function deleteTestVenue(id: string) {
  const { error } = await supabase.from('venues').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete test venue: ${error.message}`);
}

/**
 * Clean up all E2E test venues (matching slug prefix).
 */
export async function cleanupTestVenues() {
  await supabase.from('venues').delete().like('slug', 'e2e-test-%');
}
