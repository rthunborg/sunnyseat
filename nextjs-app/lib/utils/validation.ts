// Request Validation Utilities
// Provides validation functions for API requests

/**
 * Validate latitude value
 */
export function validateLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

/**
 * Validate longitude value
 */
export function validateLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

/**
 * Validate radius in kilometers
 */
export function validateRadius(radiusKm: number, maxRadiusKm: number = 3.0): boolean {
  return radiusKm > 0 && radiusKm <= maxRadiusKm;
}

/**
 * Parse and validate query parameter as number
 */
export function parseNumberQuery(
  value: string | null | undefined,
  paramName: string
): { success: true; value: number } | { success: false; error: string } {
  if (!value) {
    return { success: false, error: `Missing ${paramName} parameter` };
  }

  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    return { success: false, error: `Invalid ${paramName}: must be a number` };
  }

  return { success: true, value: parsed };
}

/**
 * Parse and validate date query parameter
 */
export function parseDateQuery(
  value: string | null | undefined,
  paramName: string
): { success: true; value: Date } | { success: false; error: string } {
  if (!value) {
    return { success: false, error: `Missing ${paramName} parameter` };
  }

  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return { success: false, error: `Invalid ${paramName}: must be a valid date` };
  }

  return { success: true, value: parsed };
}

/**
 * Parse and validate optional date query parameter
 */
export function parseOptionalDateQuery(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Validate required string field
 */
export function validateRequiredString(
  value: string | null | undefined,
  fieldName: string,
  minLength: number = 1
): { success: true } | { success: false; error: string } {
  if (!value || value.trim().length === 0) {
    return { success: false, error: `${fieldName} is required` };
  }

  if (value.length < minLength) {
    return {
      success: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  return { success: true };
}
