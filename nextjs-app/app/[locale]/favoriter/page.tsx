import { MapViewDynamic } from '@/components/custom/map/MapViewDynamic';
import { OnboardingGateWithSuspense } from '@/components/custom/onboarding/OnboardingGate';

export default function FavouritesPage() {
  return (
    <>
      <MapViewDynamic />
      <OnboardingGateWithSuspense />
    </>
  );
}
