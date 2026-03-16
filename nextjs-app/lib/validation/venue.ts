interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

export function validateCreateVenue(body: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.name = ['Name is required'];
  }

  if (body.latitude !== undefined) {
    const lat = Number(body.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitude = ['Latitude must be a number between -90 and 90'];
    }
  }

  if (body.longitude !== undefined) {
    const lng = Number(body.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.longitude = ['Longitude must be a number between -180 and 180'];
    }
  }

  if (body.type !== undefined && typeof body.type !== 'string') {
    errors.type = ['Type must be a string'];
  }

  if (body.neighborhood !== undefined && typeof body.neighborhood !== 'string') {
    errors.neighborhood = ['Neighborhood must be a string'];
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateCreatePatio(body: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.name = ['Name is required'];
  }

  if (!body.geometry) {
    errors.geometry = ['Geometry is required'];
  } else if (typeof body.geometry === 'object' && body.geometry !== null) {
    const geo = body.geometry as Record<string, unknown>;
    if (geo.type !== 'Polygon') {
      errors.geometry = ['Geometry must be a GeoJSON Polygon'];
    } else if (
      !Array.isArray(geo.coordinates) ||
      geo.coordinates.length === 0
    ) {
      errors.geometry = ['Geometry must have valid coordinates'];
    }
  } else {
    errors.geometry = ['Geometry must be a valid GeoJSON object'];
  }

  return { valid: Object.keys(errors).length === 0, errors };
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
