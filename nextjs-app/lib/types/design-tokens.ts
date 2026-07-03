// Presentational UI-token vocabulary (lowercase) — SEPARATE from the DTO
// `VenueSunStatus` union in `lib/types/api.ts`. Story 10.2 adds `'obscured'`
// (the muted "Sol bakom moln" state, mapped from DTO `'CloudObscured'`).
export type SunStatus = 'sunny' | 'partial' | 'shaded' | 'upcoming' | 'obscured';

export type SkyCondition = 'clear' | 'partly-cloudy' | 'overcast' | 'rain' | 'unavailable';
