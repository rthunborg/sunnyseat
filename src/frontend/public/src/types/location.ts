// types/location.ts
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationState {
  coordinates: Coordinates | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: 'granted' | 'denied' | 'prompt' | null;
}
