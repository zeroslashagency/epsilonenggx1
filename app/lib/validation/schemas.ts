/**
 * Validation Schemas
 * Zod schemas for request validation
 */

import { z } from 'zod'
import zxcvbn from 'zxcvbn'

// ============================================
// COMMON SCHEMAS
// ============================================

export const uuidSchema = z.string().uuid('Invalid UUID format')

export const emailSchema = z.string().email('Invalid email format')

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
})

// ============================================
// PASSWORD VALIDATION (zxcvbn)
// ============================================

/**
 * Strong password schema with zxcvbn validation
 * Requires minimum score of 3 (good) on scale of 0-4
 */
export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine(
    (password) => {
      const result = zxcvbn(password)
      return result.score >= 3 // 0=weak, 1=fair, 2=weak, 3=good, 4=strong
    },
    {
      message: 'Password is too weak. Use a mix of uppercase, lowercase, numbers, and symbols.',
    }
  )

/**
 * Get password strength feedback for UI
 */
export function getPasswordStrength(password: string): {
  score: number
  feedback: string[]
  isStrong: boolean
} {
  const result = zxcvbn(password)
  return {
    score: result.score,
    feedback: [
      ...(result.feedback.warning ? [result.feedback.warning] : []),
      ...result.feedback.suggestions,
    ],
    isStrong: result.score >= 3,
  }
}

// ============================================
// AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export const registerSchema = z.object({
  email: emailSchema,
  password: strongPasswordSchema, // ✅ SECURITY FIX: Now uses strong password validation
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.string().optional()
})

// ============================================
// ROLE SCHEMAS
// ============================================

export const createRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(100),
  description: z.string().optional(),
  is_manufacturing_role: z.boolean().optional().default(false),
  permissions: z.array(z.string()).optional().default([]),
  permissions_json: z.any().optional() // JSONB field for UI permission structure
})

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  is_manufacturing_role: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
  permissions_json: z.any().optional()
})

export const roleIdSchema = z.object({
  id: uuidSchema
})

// ============================================
// USER SCHEMAS
// ============================================

export const createUserSchema = z.object({
  email: emailSchema,
  password: strongPasswordSchema, // ✅ SECURITY FIX: Now uses strong password validation
  full_name: z.string().min(2, 'Full name required'),
  role: z.string().optional(),
  roleId: uuidSchema.optional(),
  employee_code: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  customPermissions: z.array(uuidSchema).optional()
})

export const updateUserSchema = z.object({
  full_name: z.string().min(2).optional(),
  role: z.string().optional(),
  employee_code: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  phone: z.string().optional(),
  standalone_attendance: z.enum(['YES', 'NO']).optional()
})

export const updateUserPermissionsSchema = z.object({
  userId: uuidSchema,
  role: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  standalone_attendance: z.enum(['YES', 'NO']).optional()
})

export const updateUserProfileSchema = z.object({
  userId: uuidSchema,
  field: z.enum(['phone', 'employee_code', 'department', 'designation']),
  value: z.string()
})

// ============================================
// AUDIT LOG SCHEMAS
// ============================================

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  action: z.string().optional(),
  userId: uuidSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

export const createAuditLogSchema = z.object({
  actor_id: uuidSchema.optional(),
  target_id: uuidSchema.optional(),
  action: z.string().min(1, 'Action is required'),
  meta_json: z.record(z.any()).optional().default({}),
  ip: z.string().optional()
})

// ============================================
// ATTENDANCE SCHEMAS
// ============================================

export const syncAttendanceSchema = z.object({
  action: z.enum(['trigger-sync']),
  syncType: z.enum(['realtime', 'historical']),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  requestedBy: z.string().optional()
})

// ============================================
// EMPLOYEE SCHEMAS
// ============================================

export const employeeQuerySchema = z.object({
  department: z.string().optional(),
  designation: z.string().optional(),
  search: z.string().optional()
})

// ============================================
// PERMISSION SCHEMAS
// ============================================

export const checkUserAccessSchema = z.object({
  userId: uuidSchema,
  permission: z.string().min(1, 'Permission is required')
})

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate request body
 */
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true
  data: T
} | {
  success: false
  errors: z.ZodError
} {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, params: Record<string, string>): {
  success: true
  data: T
} | {
  success: false
  errors: z.ZodError
} {
  try {
    const validated = schema.parse(params)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

/**
 * Format Zod errors for API response
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {}
  
  error.errors.forEach((err) => {
    const path = err.path.join('.')
    if (!formatted[path]) {
      formatted[path] = []
    }
    formatted[path].push(err.message)
  })
  
  return formatted
}
