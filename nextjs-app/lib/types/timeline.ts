import type { SunStatus, SkyCondition } from './design-tokens';

export interface TimelineSegment {
  startMinute: number; // minutes from midnight (Stockholm time)
  endMinute: number;
  sunStatus: SunStatus;
  skyCondition: SkyCondition;
}

export type MiniTimelineVariant = 'card' | 'detail';
