// API Error Handling Utilities
// Provides consistent error response formatting

import { NextResponse } from 'next/server';
import type { ErrorResponse, ValidationErrorResponse } from '@/lib/types/api';

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  statusCode: number = 500,
  code?: string,
  detail?: string
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error,
      code,
      detail,
      statusCode,
    },
    { status: statusCode }
  );
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  title: string,
  detail: string,
  errors?: Record<string, string[]>
): NextResponse<ValidationErrorResponse> {
  return NextResponse.json(
    {
      title,
      detail,
      status: 400,
      errors,
    },
    { status: 400 }
  );
}

/**
 * Create a bad request error response
 */
export function badRequest(detail: string): NextResponse<ValidationErrorResponse> {
  return createValidationErrorResponse('Bad Request', detail);
}

/**
 * Create an unauthorized error response
 */
export function unauthorized(detail: string = 'Unauthorized'): NextResponse<ErrorResponse> {
  return createErrorResponse(detail, 401, 'UNAUTHORIZED');
}

/**
 * Create a not found error response
 */
export function notFound(resource: string): NextResponse<ErrorResponse> {
  return createErrorResponse(`${resource} not found`, 404, 'NOT_FOUND');
}

/**
 * Create an internal server error response
 */
export function internalServerError(
  detail: string = 'An internal server error occurred'
): NextResponse<ErrorResponse> {
  return createErrorResponse('Internal Server Error', 500, 'INTERNAL_ERROR', detail);
}

/**
 * Handle database errors
 */
export function handleDatabaseError(error: unknown): NextResponse<ErrorResponse> {
  console.error('Database error:', error);
  return internalServerError('Database operation failed');
}

/**
 * Handle validation errors
 */
export function handleValidationError(
  field: string,
  message: string
): NextResponse<ValidationErrorResponse> {
  return createValidationErrorResponse('Validation Error', message, {
    [field]: [message],
  });
}
