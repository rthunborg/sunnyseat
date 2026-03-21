import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-auth';
import type { AuthUser } from '@/lib/middleware/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { handleDatabaseError } from '@/lib/utils/api-errors';

async function handleGet(_request: NextRequest, _user: AuthUser) {
  const { data: buildings, error } = await supabaseAdmin
    .from('buildings')
    .select('"Id","Height","HeightM","AdminHeightOverride"');

  if (error) {
    return handleDatabaseError(error);
  }

  const all = buildings ?? [];
  const totalBuildings = all.length;

  const heights = all.map((b) => {
    const h = b.AdminHeightOverride ?? b.HeightM ?? Number(b.Height);
    return typeof h === 'number' ? h : 0;
  });

  const withHeight = heights.filter((h) => h > 0).length;
  const withoutHeight = totalBuildings - withHeight;
  const avgHeight = withHeight > 0
    ? heights.filter((h) => h > 0).reduce((s, h) => s + h, 0) / withHeight
    : 0;

  const buckets = [
    { range: '0-5m', min: 0, max: 5 },
    { range: '5-10m', min: 5, max: 10 },
    { range: '10-15m', min: 10, max: 15 },
    { range: '15-20m', min: 15, max: 20 },
    { range: '20-30m', min: 20, max: 30 },
    { range: '30m+', min: 30, max: Infinity },
  ];

  const heightBuckets = buckets.map(({ range, min, max }) => ({
    range,
    count: heights.filter((h) => h > 0 && h >= min && h < max).length,
  }));

  return NextResponse.json({
    totalBuildings,
    avgHeight: Math.round(avgHeight * 100) / 100,
    withHeight,
    withoutHeight,
    heightBuckets,
  });
}

export const GET = withAdminAuth(handleGet);
