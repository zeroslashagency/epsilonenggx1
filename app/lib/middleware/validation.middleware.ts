/**
 * Validation Middleware
 * Validates request data using Zod schemas
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validationErrorResponse } from '@/app/lib/utils/api-response'
import { formatZodErrors } from '@/app/lib/validation/schemas'

/**
 * Validate request body
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json()
    const validated = schema.parse(body)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = formatZodErrors(error)
      return {
        success: false,
        response: validationErrorResponse(errors)
      }
    }
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 400 }
      )
    }
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const { searchParams } = new URL(request.url)
    const params: Record<string, string> = {}
    
    searchParams.forEach((value, key) => {
      params[key] = value
    })
    
    const validated = schema.parse(params)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = formatZodErrors(error)
      return {
        success: false,
        response: validationErrorResponse(errors)
      }
    }
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 400 }
      )
    }
  }
}

/**
 * Validate route parameters
 */
export function validateParams<T>(
  params: Record<string, string>,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const validated = schema.parse(params)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = formatZodErrors(error)
      return {
        success: false,
        response: validationErrorResponse(errors)
      }
    }
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Invalid parameters',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 400 }
      )
    }
  }
}
