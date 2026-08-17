import type { VenueDataDto } from '@/lib/types/api';
import type { VenuePinData } from '@/lib/types/map';
import { normalizeWeatherGateState } from '@/lib/utils/public-sun';

export function mapVenueDtoToPinData(v: VenueDataDto): VenuePinData | null {
  if (!v.location || !Number.isFinite(v.location.lat) || !Number.isFinite(v.location.lng)) {
    return null;
  }
  return {
    id: v.id,
    slug: v.slug,
    name: v.venueName,
    lat: v.location.lat,
    lng: v.location.lng,
    sunStatus: v.currentSunStatus,
    sunExposurePercent: v.sunExposurePercent,
    weatherGateState: normalizeWeatherGateState(v.weatherGateState),
    isPartner: v.isPartner,
  };
}
