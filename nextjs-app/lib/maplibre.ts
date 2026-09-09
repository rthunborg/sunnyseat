import { version } from './maplibre-version.json';

type MapLibre = Pick<typeof import('maplibre-gl'), 'Map' | 'Marker'>;
let loaded: MapLibre | undefined;
let pending: Promise<MapLibre> | undefined;

/** Load the pinned, same-origin ESM distribution without duplicating its shared
 * module inside both Next's bundle and the module worker. Called only by the
 * client-side map/editor dynamic boundaries before mounting their components. */
export function loadMapLibre(): Promise<MapLibre> {
  const url = `/vendor/maplibre/${version}/maplibre-gl.mjs`;
  pending ??= import(/* webpackIgnore: true */ url).then((module: MapLibre) => {
    loaded = module;
    return module;
  }).catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}

export function getMapLibre(): MapLibre {
  if (!loaded) throw new Error('MapLibre must load before the map is mounted.');
  return loaded;
}
