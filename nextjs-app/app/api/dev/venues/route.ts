import { NextRequest, NextResponse } from 'next/server';
import { devVenueEditorDeniedResponse } from '@/lib/services/dev-venue-editor-guard';
import {
  DevVenueEditorError,
  listDevEditorVenues,
} from '@/lib/services/dev-venue-editor-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = devVenueEditorDeniedResponse(request);
  if (denied) return denied;

  try {
    const venues = await listDevEditorVenues();
    return NextResponse.json(
      {
        venues,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    if (error instanceof DevVenueEditorError) {
      return editorError(error);
    }
    return NextResponse.json(
      { detail: 'Dev venue editor unavailable', status: 503 },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}

function editorError(error: DevVenueEditorError) {
  return NextResponse.json(
    {
      detail: error.message,
      status: error.status,
      ...(error.errors ? { errors: error.errors } : {}),
    },
    {
      status: error.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
