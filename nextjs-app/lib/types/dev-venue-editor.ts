import type { VenueThumbnailDto } from '@/lib/types/api';

export type DevEditorVenueDto = {
  id: string;
  slug: string;
  venueName: string;
  hidden: boolean;
  displayLocation: { lat: number; lng: number };
  engineLocation: { lat: number; lng: number };
  persistedLocation?: { lat: number; lng: number };
  seatingArea?: GeoJSON.Polygon;
  tags: string[];
  description?: string | null;
  thumbnail?: VenueThumbnailDto | null;
};

export type DevVenueEditorPatchRequest = {
  displayLocation?: { lat: number; lng: number } | null;
  hidden?: boolean;
  seatingAreaText?: string;
  seatingArea?: GeoJSON.Polygon;
  tags?: string[] | string;
  description?: string | null;
  thumbnail?: VenueThumbnailDto | null;
};

export type DevVenueEditorListResponse = {
  venues: DevEditorVenueDto[];
  timestamp: string;
};

export type DevVenueEditorMutationResponse = {
  venue: DevEditorVenueDto;
  timestamp: string;
};
