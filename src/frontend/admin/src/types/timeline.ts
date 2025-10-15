// Timeline-specific types for mini timeline visualization
// Story 4.2: Patio Information Cards & Results

export interface TimelineSlot {
  timestamp: Date;
  sunStatus: 'Sunny' | 'Partial' | 'Shaded';
  sunExposure: number; // 0-100
  confidence: number; // 0-100
}

export interface MiniTimelineData {
  patioId: string;
  slots: TimelineSlot[]; // 12 slots for 2 hours
  generatedAt: Date;
}

export interface NextSunWindow {
  startTime: Date;
  duration: number; // minutes
}

export interface PatioData {
  id: string;
  venueId: number;
  venueName: string;
  address: string;
  coordinates: [number, number]; // [lng, lat]
  distanceMeters: number;
  currentSunStatus: 'Sunny' | 'Partial' | 'Shaded';
  currentSunExposure: number; // 0-100
  confidence: number; // 0-100
  miniTimeline?: MiniTimelineData;
  nextSunWindow?: NextSunWindow;
  isWithinGeofence: boolean; // true if <= 10km
  createdAt: string;
  updatedAt: string;
}

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
// High: ≥70, Medium: 40-69, Low: <40
// Cap at 60% for estimated values
