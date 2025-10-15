// constants/mapDefaults.ts
import { Coordinates } from '../types/location';

export const MAP_DEFAULTS = {
  center: {
    latitude: 57.7089,
    longitude: 11.9746,
  } as Coordinates,
  zoom: 13,
  minZoom: 10,
  maxZoom: 18,
  defaultRadiusKm: 1.5,
  maxRadiusKm: 3.0,
  minRadiusKm: 0.5,
  maxVisiblePatios: 50,
} as const;

export const MAPTILER_STYLE_URL = 'https://api.maptiler.com/maps/streets-v2/style.json';
