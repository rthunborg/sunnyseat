/**
 * `localStorage` key set by `OnboardingGate` on first dismissal and read
 * by `useGeolocation` to gate the silent re-acquire path for returning
 * users. Centralised so the key cannot drift across call sites.
 */
export const ONBOARDED_FLAG_KEY = 'sunnyseat_onboarded';

/**
 * `localStorage` key set after the post-onboarding first-run coach-mark guide
 * is dismissed. Kept near the onboarding flag because the guide is sequenced
 * after onboarding, but must persist independently from it.
 */
export const FIRST_RUN_GUIDE_SEEN_KEY = 'sunnyseat_first_run_guide_seen';
