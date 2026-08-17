import { MapViewDynamic } from '@/components/custom/map/MapViewDynamic';

export default function FavouritesPage() {
  return (
    <MapViewDynamic
      devVenueEditorEnabled={
        process.env.NODE_ENV !== 'production' &&
        process.env.SUNNYSEAT_ADMIN === 'dev'
      }
    />
  );
}
