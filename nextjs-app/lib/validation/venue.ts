interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

export function validateCreateVenue(body: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.name = ['Name is required'];
  }

  if (body.latitude !== undefined && body.latitude !== null) {
    const lat = Number(body.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitude = ['Latitude must be a number between -90 and 90'];
    }
  }

  if (body.longitude !== undefined && body.longitude !== null) {
    const lng = Number(body.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.longitude = ['Longitude must be a number between -180 and 180'];
    }
  }

  if (body.type !== undefined && body.type !== null && typeof body.type !== 'string') {
    errors.type = ['Type must be a string'];
  }

  if (body.neighborhood !== undefined && body.neighborhood !== null && typeof body.neighborhood !== 'string') {
    errors.neighborhood = ['Neighborhood must be a string'];
  }

  if (body.address !== undefined && body.address !== null && typeof body.address !== 'string') {
    errors.address = ['Address must be a string'];
  }

  if (body.phone !== undefined && body.phone !== null && typeof body.phone !== 'string') {
    errors.phone = ['Phone must be a string'];
  }

  if (body.website !== undefined && body.website !== null && typeof body.website !== 'string') {
    errors.website = ['Website must be a string'];
  }

  if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    errors.description = ['Description must be a string'];
  }

  // Validate geometry if provided (optional on venue create)
  if (body.geometry !== undefined && body.geometry !== null) {
    const geoErrors = validatePolygonGeometry(body.geometry);
    if (geoErrors.length > 0) {
      errors.geometry = geoErrors;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function validatePolygonGeometry(geometry: unknown): string[] {
  if (typeof geometry !== 'object' || geometry === null) {
    return ['Geometry must be a valid GeoJSON object'];
  }
  const geo = geometry as Record<string, unknown>;
  if (geo.type !== 'Polygon') {
    return ['Geometry must be a GeoJSON Polygon'];
  }
  if (!Array.isArray(geo.coordinates) || geo.coordinates.length === 0) {
    return ['Geometry must have valid coordinates'];
  }
  return [];
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[éè]/g, 'e')
    .replace(/[üú]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
