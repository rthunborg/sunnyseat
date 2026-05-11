/**
 * `localStorage` key set by `OnboardingGate` on first dismissal and read
 * by `useGeolocation` to gate the silent re-acquire path for returning
 * users. Centralised so the key cannot drift across call sites.
 */
export const ONBOARDED_FLAG_KEY = 'sunnyseat_onboarded';
