// Venue Service
// Handles venue data access and spatial queries using Supabase

import { supabaseAdmin } from '@/lib/supabase/server';

export interface VenueRow {
  Id: number;
  Name: string;
  Geometry: string; // PostGIS geography as text
  HeightM?: number;
  HeightSource: number;
  PolygonQuality: number;
  Orientation?: string;
  Notes?: string;
  ReviewNeeded: boolean;
  VenueLocation?: string; // From RPC function
  DistanceMeters?: number; // From RPC function
}

/**
 * Get venues near a point using PostGIS spatial query
 * Uses RPC function get_venues_near_point for optimized spatial queries
 * The RPC function uses PostGIS ST_DWithin with GIST index support
 */
export async function getVenuesNearPoint(
  latitude: number,
  longitude: number,
  radiusKm: number
): Promise<VenueRow[]> {
  // Convert radius from km to meters for PostGIS ST_DWithin
  const radiusMeters = radiusKm * 1000;

  // Call PostGIS RPC function for optimized spatial query
  // The function uses ST_DWithin which leverages GIST spatial indexes
  const { data, error } = await supabaseAdmin.rpc('get_venues_near_point', {
    search_lat: latitude,
    search_lng: longitude,
    radius_meters: radiusMeters,
  });

  if (error) {
    console.error('Spatial query error:', error);
    // Return empty array if RPC function fails
    // In production, this should be logged and monitored
    return [];
  }

  return (data || []) as VenueRow[];
}

/**
 * Get venue by ID with geometry information
 */
export async function getVenueById(id: number): Promise<VenueRow | null> {
  const { data, error } = await supabaseAdmin
    .from('venues')
    .select('Id, Geometry, Name, Location')
    .eq('Id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as VenueRow;
}
