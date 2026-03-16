interface GeoJsonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties?: Record<string, unknown>;
}

export interface GeoJsonCollection {
  type: string;
  features: GeoJsonFeature[];
}

export interface BuildingRow {
  Geometry: string;
  Height: number;
  HeightM: number | null;
  HeightSource: number;
  Source: string;
  QualityScore: number;
  ExternalId: string | null;
  BuildingType: string | null;
  UpdatedBy: string;
}

export interface ParseResult {
  rows: BuildingRow[];
  skipped: number;
  errors: string[];
}

function polygonToWKT(coordinates: number[][][]): string {
  const rings = coordinates.map((ring) =>
    ring.map((coord) => `${coord[0]} ${coord[1]}`).join(', ')
  );
  return `SRID=4326;POLYGON((${rings.join('), (')}))`;
}

function extractHeight(properties: Record<string, unknown> | undefined): number {
  if (!properties) return 0;
  for (const key of ['height', 'Height', 'HEIGHT', 'building:height', 'rendered_height']) {
    const val = properties[key];
    if (val !== undefined && val !== null) {
      const num = Number(val);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return 0;
}

function extractBuildingType(properties: Record<string, unknown> | undefined): string | null {
  if (!properties) return null;
  for (const key of ['building', 'building:type', 'BuildingType', 'type']) {
    const val = properties[key];
    if (typeof val === 'string' && val.length > 0) return val;
  }
  return null;
}

function extractExternalId(properties: Record<string, unknown> | undefined): string | null {
  if (!properties) return null;
  for (const key of ['id', 'osm_id', 'ExternalId', 'fid', 'ogc_fid']) {
    const val = properties[key];
    if (val !== undefined && val !== null) return String(val);
  }
  return null;
}

export function parseGeoJson(geojson: GeoJsonCollection, username: string): ParseResult {
  let skipped = 0;
  const errors: string[] = [];
  const rows: BuildingRow[] = [];

  for (let i = 0; i < geojson.features.length; i++) {
    const feature = geojson.features[i];

    if (!feature.geometry || feature.geometry.type !== 'Polygon') {
      skipped++;
      if (errors.length < 50) {
        errors.push(`Feature ${i}: Not a Polygon (${feature.geometry?.type ?? 'no geometry'})`);
      }
      continue;
    }

    if (!feature.geometry.coordinates || feature.geometry.coordinates.length === 0) {
      skipped++;
      if (errors.length < 50) {
        errors.push(`Feature ${i}: Empty coordinates`);
      }
      continue;
    }

    const height = extractHeight(feature.properties);

    rows.push({
      Geometry: polygonToWKT(feature.geometry.coordinates),
      Height: height,
      HeightM: height > 0 ? height : null,
      HeightSource: height > 0 ? 1 : 0,
      Source: 'geojson-import',
      QualityScore: height > 0 ? 0.7 : 0.3,
      ExternalId: extractExternalId(feature.properties),
      BuildingType: extractBuildingType(feature.properties),
      UpdatedBy: username,
    });
  }

  return { rows, skipped, errors };
}

export function validateGeoJson(data: unknown): data is GeoJsonCollection {
  const obj = data as GeoJsonCollection;
  return obj?.type === 'FeatureCollection' && Array.isArray(obj?.features);
}
