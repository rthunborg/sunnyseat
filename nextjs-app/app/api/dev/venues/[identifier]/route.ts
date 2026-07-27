import { NextRequest, NextResponse } from 'next/server';
import { devVenueEditorDeniedResponse } from '@/lib/services/dev-venue-editor-guard';
import {
  DevVenueEditorError,
  patchDevEditorVenue,
} from '@/lib/services/dev-venue-editor-store';

type RouteContext = {
  params: Promise<{ identifier: string }>;
};

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, context: RouteContext) {
  const denied = devVenueEditorDeniedResponse(request);
  if (denied) return denied;

  let identifier: string;
  try {
    identifier = decodeURIComponent((await context.params).identifier);
  } catch {
    return editorError(new DevVenueEditorError('Invalid venue identifier', 400));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return editorError(new DevVenueEditorError('Request body must be valid JSON', 400));
  }

  try {
    const venue = await patchDevEditorVenue(identifier, body);
    return NextResponse.json(
      {
        venue,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    if (error instanceof DevVenueEditorError) return editorError(error);
    return editorError(new DevVenueEditorError('Dev venue editor unavailable', 503));
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
