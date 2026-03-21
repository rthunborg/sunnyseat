import type { SupabaseClient } from '@supabase/supabase-js';
import { slugify } from '@/lib/validation/venue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export const CITY_BBOXES: Record<string, BoundingBox> = {
  gothenburg: { south: 57.65, west: 11.85, north: 57.78, east: 12.10 },
};

export interface OsmElement {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

export interface OsmVenueCandidate {
  name: string;
  slug: string;
  lat: number;
  lng: number;
  osm_node_id: number;
  venue_type: string;
  address?: string;
  website?: string;
  verification_status: 0;
}

export interface IngestionResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Overpass API
// ---------------------------------------------------------------------------

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const RATE_LIMIT_MS = 5_000;
const MAX_RETRIES = 3;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Query Overpass API for amenities with outdoor seating in a bounding box.
 * Queries restaurants, cafes, and bars in a single request.
 */
export async function queryOverpassApi(bbox: BoundingBox): Promise<OsmElement[]> {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;

  const query = `
[out:json][timeout:60];
(
  node["amenity"="restaurant"]["outdoor_seating"="yes"](${bboxStr});
  node["amenity"="cafe"]["outdoor_seating"="yes"](${bboxStr});
  node["amenity"="bar"]["outdoor_seating"="yes"](${bboxStr});
);
out body;
`.trim();

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 1) {
      const backoffMs = RATE_LIMIT_MS * Math.pow(2, attempt - 1);
      console.log(`[OSM Ingestion] Retry ${attempt}/${MAX_RETRIES} after ${backoffMs}ms`);
      await sleep(backoffMs);
    }

    try {
      const res = await fetch(OVERPASS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (res.status === 429 || res.status === 503) {
        lastError = new Error(`Overpass API returned ${res.status}`);
        console.warn(`[OSM Ingestion] ${lastError.message}, will retry`);
        continue;
      }

      if (!res.ok) {
        throw new Error(`Overpass API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      return (data.elements ?? []) as OsmElement[];
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === MAX_RETRIES) break;
      console.warn(`[OSM Ingestion] Request failed: ${lastError.message}`);
    }
  }

  throw lastError ?? new Error('Overpass API request failed after retries');
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

/**
 * Convert raw OSM elements to venue candidates.
 * Elements without a name are skipped.
 */
export function transformOsmData(elements: OsmElement[]): OsmVenueCandidate[] {
  const candidates: OsmVenueCandidate[] = [];

  for (const el of elements) {
    const name = el.tags?.name;
    if (!name) continue;

    const streetParts: string[] = [];
    if (el.tags['addr:street']) streetParts.push(el.tags['addr:street']);
    if (el.tags['addr:housenumber']) streetParts.push(el.tags['addr:housenumber']);
    const address = streetParts.length > 0 ? streetParts.join(' ') : undefined;

    candidates.push({
      name,
      slug: slugify(name),
      lat: el.lat,
      lng: el.lon,
      osm_node_id: el.id,
      venue_type: el.tags.amenity ?? 'restaurant',
      address,
      website: el.tags.website ?? el.tags['contact:website'] ?? undefined,
      verification_status: 0,
    });
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Ingest (upsert into Supabase)
// ---------------------------------------------------------------------------

/**
 * Upsert OSM venue candidates into the database.
 * Uses ON CONFLICT(OsmNodeId) DO NOTHING for idempotent duplicate handling.
 */
export async function ingestVenues(
  venues: OsmVenueCandidate[],
  supabase: SupabaseClient
): Promise<IngestionResult> {
  const result: IngestionResult = { imported: 0, skipped: 0, errors: [] };

  if (venues.length === 0) return result;

  // Process in batches to avoid payload limits
  const BATCH_SIZE = 50;

  for (let i = 0; i < venues.length; i += BATCH_SIZE) {
    const batch = venues.slice(i, i + BATCH_SIZE);

    const rows = batch.map((v) => ({
      Name: v.name,
      Address: v.address ?? '',
      Type: venueTypeToInt(v.venue_type),
      Location: `POINT(${v.lng} ${v.lat})`,
      IsActive: true,
      IsMapped: false,
      VerificationStatus: 0,
      OsmNodeId: v.osm_node_id,
    }));

    const { data, error } = await supabase
      .from('venues')
      .upsert(rows, {
        onConflict: 'OsmNodeId',
        ignoreDuplicates: true,
      })
      .select('Id');

    if (error) {
      console.error(`[OSM Ingestion] Batch insert error:`, error.message);
      result.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      continue;
    }

    const insertedCount = data?.length ?? 0;
    result.imported += insertedCount;
    result.skipped += batch.length - insertedCount;
  }

  return result;
}

function venueTypeToInt(type: string): number {
  switch (type) {
    case 'restaurant': return 0;
    case 'cafe': return 1;
    case 'bar': return 2;
    default: return 0;
  }
}

// ---------------------------------------------------------------------------
// Full pipeline
// ---------------------------------------------------------------------------

export async function runOsmIngestion(
  cityKey: string,
  supabase: SupabaseClient
): Promise<IngestionResult & { totalFromOsm: number; duration: number }> {
  const bbox = CITY_BBOXES[cityKey];
  if (!bbox) {
    throw new Error(`Unknown city: ${cityKey}. Available: ${Object.keys(CITY_BBOXES).join(', ')}`);
  }

  const startTime = Date.now();
  console.log(`[OSM Ingestion] Starting ingestion for ${cityKey}`);

  const elements = await queryOverpassApi(bbox);
  console.log(`[OSM Ingestion] Fetched ${elements.length} elements from Overpass`);

  const candidates = transformOsmData(elements);
  console.log(`[OSM Ingestion] Transformed ${candidates.length} venue candidates (${elements.length - candidates.length} skipped - no name)`);

  const result = await ingestVenues(candidates, supabase);
  const duration = Date.now() - startTime;

  console.log(`[OSM Ingestion] Complete: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors in ${duration}ms`);

  return { ...result, totalFromOsm: elements.length, duration };
}
