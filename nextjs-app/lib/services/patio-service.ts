// Patio Service
// Handles patio data access and spatial queries using Supabase

import { supabaseAdmin } from '@/lib/supabase/server';

export interface Patio {
  Id: number;
  VenueId: number;
  Name: string;
  Geometry: string; // PostGIS geography as text
  HeightM?: number;
  HeightSource: number;
  PolygonQuality: number;
  Orientation?: string;
  Notes?: string;
  ReviewNeeded: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  VenueName?: string; // From RPC function
  VenueLocation?: string; // From RPC function
  DistanceMeters?: number; // From RPC function
  Venue?: {
    Id: number;
    Name: string;
    Location: string; // PostGIS geography as text
  };
}

/**
 * Get patios near a point using PostGIS spatial query
 * Uses RPC function get_patios_near_point for optimized spatial queries
 * The RPC function uses PostGIS ST_DWithin with GIST index support
 */
export async function getPatiosNearPoint(
  latitude: number,
  longitude: number,
  radiusKm: number
): Promise<Patio[]> {
  // Convert radius from km to meters for PostGIS ST_DWithin
  const radiusMeters = radiusKm * 1000;

  // Call PostGIS RPC function for optimized spatial query
  // The function uses ST_DWithin which leverages GIST spatial indexes
  const { data, error } = await supabaseAdmin.rpc('get_patios_near_point', {
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

  return (data || []) as Patio[];
}

/**
 * Get patio by ID with venue information
 */
export async function getPatioById(id: number): Promise<Patio | null> {
  const { data, error } = await supabaseAdmin
    .from('patios')
    .select(
      `
      *,
      venues:VenueId (
        Id,
        Name,
        Location
      )
    `
    )
    .eq('Id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Patio;
}
