export const COACH_TOUR_STEP_IDS = [
  'pin-legend',
  'time-slider',
  'date-planner',
  'tags',
  'venue-list',
  'favourites',
] as const;

export type CoachTourStepId = (typeof COACH_TOUR_STEP_IDS)[number];

export const COACH_TOUR_ANCHOR_ATTRIBUTE = 'data-tour-anchor';

export const COACH_TOUR_STEP_ANCHORS: Record<CoachTourStepId, string> = {
  'pin-legend': 'map-surface',
  'time-slider': 'time-slider',
  'date-planner': 'date-planner',
  tags: 'tag-chips',
  'venue-list': 'venue-list',
  favourites: 'favourites',
};

