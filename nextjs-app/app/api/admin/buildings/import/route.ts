import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest } from '@/lib/utils/api-errors';
import { parseGeoJson, validateGeoJson } from '@/lib/buildings/import-geojson';

const BATCH_SIZE = 100;

async function handlePost(request: NextRequest, user: AuthUser) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest('Request must be multipart/form-data');
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return badRequest('No file provided');
  }

  if (!file.name.endsWith('.geojson') && !file.name.endsWith('.json')) {
    return badRequest('File must be .geojson or .json');
  }

  let geojson: unknown;
  try {
    const text = await file.text();
    geojson = JSON.parse(text);
  } catch {
    return badRequest('Invalid JSON file');
  }

  if (!validateGeoJson(geojson)) {
    return badRequest('File must be a GeoJSON FeatureCollection');
  }

  const parsed = parseGeoJson(geojson, user.username);
  let imported = 0;
  let skipped = parsed.skipped;
  const errors = [...parsed.errors];

  for (let i = 0; i < parsed.rows.length; i += BATCH_SIZE) {
    const batch = parsed.rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin.from('buildings').insert(batch);

    if (error) {
      errors.push(`Batch insert error at offset ${i}: ${error.message}`);
      skipped += batch.length;
    } else {
      imported += batch.length;
    }
  }

  return NextResponse.json({
    imported,
    skipped,
    errors,
    total: geojson.features.length,
  });
}

export const POST = withAdminAuth(handlePost);
