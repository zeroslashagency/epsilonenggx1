/**
 * Security Validation Schemas
 * Using Zod for runtime type validation and input sanitization
 * Prevents SQL Injection, XSS, and other injection attacks
 */

import { z } from 'zod'

// ============================================
// USER VALIDATION SCHEMAS
// ============================================

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .min(5, 'Email too short')
  .max(255, 'Email too long')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name too long')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters')
  .trim()

export const userIdSchema = z
  .string()
  .uuid('Invalid user ID format')

export const roleSchema = z.enum([
  'Super Admin',
  'Admin',
  'Operator',
  'Monitor',
  'Attendance'
], {
  errorMap: () => ({ message: 'Invalid role' })
})

// ============================================
// API REQUEST SCHEMAS
// ============================================

export const createUserSchema = z.object({
  email: emailSchema,
  name: nameSchema.optional(),
  full_name: nameSchema.optional(),
  role: roleSchema.optional(),
  roleId: z.string().uuid().optional(),
  password: passwordSchema.optional(),
  permissions: z.record(z.any()).optional(),
  customPermissions: z.record(z.any()).optional()
}).passthrough()

export const updateUserSchema = z.object({
  userId: userIdSchema,
  email: emailSchema.optional(),
  name: nameSchema.optional(),
  role: roleSchema.optional(),
  permissions: z.record(z.any()).optional()
})

export const deleteUserSchema = z.object({
  userId: userIdSchema,
  userEmail: emailSchema
})

// ============================================
// ATTENDANCE VALIDATION
// ============================================

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
  .refine((date) => {
    const d = new Date(date)
    return d instanceof Date && !isNaN(d.getTime())
  }, 'Invalid date')

export const employeeCodeSchema = z
  .string()
  .min(1, 'Employee code required')
  .max(50, 'Employee code too long')
  .regex(/^[A-Za-z0-9-_]+$/, 'Employee code contains invalid characters')

export const attendanceQuerySchema = z.object({
  fromDate: dateSchema,
  toDate: dateSchema,
  employeeCode: employeeCodeSchema.optional()
}).refine((data) => {
  const from = new Date(data.fromDate)
  const to = new Date(data.toDate)
  return from <= to
}, {
  message: 'fromDate must be before or equal to toDate'
})

// ============================================
// PERMISSION VALIDATION
// ============================================

export const permissionCodeSchema = z
  .string()
  .min(3, 'Permission code too short')
  .max(100, 'Permission code too long')
  .regex(/^[a-z0-9._-]+$/, 'Permission code must be lowercase with dots, dashes, or underscores')

export const permissionActionSchema = z.enum(['view', 'create', 'edit', 'delete', 'export'], {
  errorMap: () => ({ message: 'Invalid permission action' })
})

// ============================================
// PAGINATION & FILTERING
// ============================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
})

export const searchSchema = z
  .string()
  .max(255, 'Search query too long')
  .trim()
  .optional()

// ============================================
// SANITIZATION HELPERS
// ============================================

/**
 * Sanitize string to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeString(value) as T[keyof T]
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value) as T[keyof T]
    } else {
      sanitized[key as keyof T] = value
    }
  }

  return sanitized
}

// ============================================
// VALIDATION MIDDLEWARE HELPER
// ============================================

/**
 * Validate request body against schema
 * Returns validated data or throws error
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<T> {
  try {
    return await schema.parseAsync(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      throw new Error(`Validation failed: ${messages}`)
    }
    throw error
  }
}

// ============================================
// EXPORT TYPES
// ============================================

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type DeleteUserInput = z.infer<typeof deleteUserSchema>
export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>

// ============================================
// LOGIN SCHEMA
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

// ============================================
// ROLE MANAGEMENT SCHEMAS
// ============================================

export const createRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(50, 'Role name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  permissions: z.union([z.array(z.any()), z.record(z.any())]).optional(),
  permissions_json: z.record(z.any()).optional(),
  is_manufacturing_role: z.boolean().optional()
}).passthrough()

export const updateRoleSchema = createRoleSchema.partial().extend({
  id: z.string().uuid().optional()
})

// ============================================
// AUDIT LOG SCHEMA
// ============================================

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.string().optional(),
  actor_id: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  from_date: dateSchema.optional(),
  to_date: dateSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional()
}).passthrough()

// ============================================
// USER PERMISSIONS SCHEMA
// ============================================

export const updateUserPermissionsSchema = z.object({
  userId: userIdSchema,
  permissions: z.record(z.any()).optional(),
  role: z.string().optional(),
  standalone_attendance: z.string().optional()
}).passthrough()

export const updateUserProfileSchema = z.object({
  userId: userIdSchema,
  full_name: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: z.string().max(20).optional(),
  employee_code: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  field: z.string().optional(),
  value: z.any().optional()
}).passthrough()

// ============================================
// ERROR FORMATTING
// ============================================

export function formatZodErrors(error: z.ZodError): string {
  return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
}

