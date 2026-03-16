import type { SunStatus, SkyCondition } from './design-tokens';
import type { SunWindow } from './venue';

export type VenueCardVariant = SunStatus;

export type CardTrayState = 'peeking' | 'half-expanded' | 'collapsed';

export interface VenueCardProps {
  venueId: string;
  venueName: string;
  neighborhood: string;
  variant: VenueCardVariant;
  sunExposurePercent: number;
  distanceMeters: number;
  skyCondition: SkyCondition;
  confidence: number;
  sunWindowStart?: string;
  sunWindowEnd?: string;
  slug: string;
  lat: number;
  lng: number;
  highlighted?: boolean;
  sunWindows: SunWindow[];
  isPartner?: boolean;
  onClick?: () => void;
}
