import { MapViewDynamic } from '@/components/custom/map/MapViewDynamic';

export default function Home() {
  return (
    <MapViewDynamic
      devVenueEditorEnabled={
        process.env.NODE_ENV !== 'production' &&
        process.env.SUNNYSEAT_ADMIN === 'dev'
      }
    />
  );
}
