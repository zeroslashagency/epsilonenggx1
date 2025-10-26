/**
 * API Response Utilities
 * Standardized response formats for API routes
 */

import { NextResponse } from 'next/server'

export interface ApiSuccessResponse<T = any> {
  success: true
  data?: T
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiErrorResponse {
  success: false
  error: string
  message?: string
  details?: any
  code?: string
}

/**
 * Success response
 */
export function successResponse<T>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: ApiSuccessResponse<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message })
  }

  return NextResponse.json(response, { status })
}

/**
 * Created response (201)
 */
export function createdResponse<T>(
  data: T,
  message: string = 'Resource created successfully'
): NextResponse {
  return successResponse(data, message, 201)
}

/**
 * No content response (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/**
 * Error response
 */
export function errorResponse(
  error: string,
  message?: string,
  status: number = 500,
  details?: any
): NextResponse {
  const response: ApiErrorResponse = {
    success: false,
    error,
    ...(message && { message }),
    ...(details && { details })
  }

  return NextResponse.json(response, { status })
}

/**
 * Bad request response (400)
 */
export function badRequestResponse(
  message: string = 'Bad request',
  details?: any
): NextResponse {
  return errorResponse('Bad Request', message, 400, details)
}

/**
 * Unauthorized response (401)
 */
export function unauthorizedResponse(
  message: string = 'Authentication required'
): NextResponse {
  return errorResponse('Unauthorized', message, 401)
}

/**
 * Forbidden response (403)
 */
export function forbiddenResponse(
  message: string = 'Access denied'
): NextResponse {
  return errorResponse('Forbidden', message, 403)
}

/**
 * Not found response (404)
 */
export function notFoundResponse(
  resource: string = 'Resource'
): NextResponse {
  return errorResponse('Not Found', `${resource} not found`, 404)
}

/**
 * Conflict response (409)
 */
export function conflictResponse(
  message: string = 'Resource already exists'
): NextResponse {
  return errorResponse('Conflict', message, 409)
}

/**
 * Validation error response (422)
 */
export function validationErrorResponse(
  errors: any
): NextResponse {
  return errorResponse(
    'Validation Error',
    'Request validation failed',
    422,
    errors
  )
}

/**
 * Internal server error response (500)
 */
export function serverErrorResponse(
  message: string = 'Internal server error',
  error?: any
): NextResponse {
  // Log error for debugging
  if (error) {
    console.error('Server error:', error)
  }

  return errorResponse(
    'Internal Server Error',
    message,
    500,
    process.env.NODE_ENV === 'development' ? error : undefined
  )
}

/**
 * Paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): NextResponse {
  const response: ApiSuccessResponse<T[]> = {
    success: true,
    data,
    ...(message && { message }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }

  return NextResponse.json(response)
}

/**
 * Handle async route with error catching
 */
export async function handleRoute<T>(
  handler: () => Promise<T>
): Promise<NextResponse> {
  try {
    const result = await handler()
    return successResponse(result)
  } catch (error: any) {
    console.error('Route error:', error)
    return serverErrorResponse(error.message, error)
  }
}
