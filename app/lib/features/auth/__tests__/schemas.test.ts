/**
 * Security Validation Tests
 * Tests for input validation and sanitization
 */

import {
  emailSchema,
  passwordSchema,
  nameSchema,
  userIdSchema,
  roleSchema,
  createUserSchema,
  deleteUserSchema,
  sanitizeString,
  sanitizeObject,
  validateRequest,
} from '../schemas'

describe('Security Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should accept valid email', () => {
      const result = emailSchema.safeParse('test@example.com')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('test@example.com')
      }
    })

    it('should reject invalid email format', () => {
      const result = emailSchema.safeParse('invalid-email')
      expect(result.success).toBe(false)
    })

    it('should trim and lowercase email', () => {
      const result = emailSchema.safeParse('  TEST@EXAMPLE.COM  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('test@example.com')
      }
    })

    it('should reject email that is too short', () => {
      const result = emailSchema.safeParse('a@b')
      expect(result.success).toBe(false)
    })
  })

  describe('passwordSchema', () => {
    it('should accept strong password', () => {
      const result = passwordSchema.safeParse('StrongP@ss123')
      expect(result.success).toBe(true)
    })

    it('should reject password without uppercase', () => {
      const result = passwordSchema.safeParse('weakpass123!')
      expect(result.success).toBe(false)
    })

    it('should reject password without lowercase', () => {
      const result = passwordSchema.safeParse('WEAKPASS123!')
      expect(result.success).toBe(false)
    })

    it('should reject password without number', () => {
      const result = passwordSchema.safeParse('WeakPass!')
      expect(result.success).toBe(false)
    })

    it('should reject password without special character', () => {
      const result = passwordSchema.safeParse('WeakPass123')
      expect(result.success).toBe(false)
    })

    it('should reject password that is too short', () => {
      const result = passwordSchema.safeParse('Weak1!')
      expect(result.success).toBe(false)
    })
  })

  describe('nameSchema', () => {
    it('should accept valid name', () => {
      const result = nameSchema.safeParse('John Doe')
      expect(result.success).toBe(true)
    })

    it('should accept name with hyphen and apostrophe', () => {
      const result = nameSchema.safeParse("Mary-Jane O'Connor")
      expect(result.success).toBe(true)
    })

    it('should reject name with numbers', () => {
      const result = nameSchema.safeParse('John123')
      expect(result.success).toBe(false)
    })

    it('should reject name with special characters', () => {
      const result = nameSchema.safeParse('John<script>')
      expect(result.success).toBe(false)
    })

    it('should trim whitespace', () => {
      const result = nameSchema.safeParse('  John Doe  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('John Doe')
      }
    })
  })

  describe('userIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = userIdSchema.safeParse('123e4567-e89b-12d3-a456-426614174000')
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const result = userIdSchema.safeParse('not-a-uuid')
      expect(result.success).toBe(false)
    })
  })

  describe('roleSchema', () => {
    it('should accept valid role', () => {
      const result = roleSchema.safeParse('Admin')
      expect(result.success).toBe(true)
    })

    it('should reject invalid role', () => {
      const result = roleSchema.safeParse('InvalidRole')
      expect(result.success).toBe(false)
    })
  })

  describe('createUserSchema', () => {
    it('should accept valid user data', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        name: 'John Doe',
        role: 'Admin',
        password: 'StrongP@ss123',
      })
      expect(result.success).toBe(true)
    })

    it('should reject user with invalid email', () => {
      const result = createUserSchema.safeParse({
        email: 'invalid',
        name: 'John Doe',
        role: 'Admin',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('deleteUserSchema', () => {
    it('should accept valid delete request', () => {
      const result = deleteUserSchema.safeParse({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        userEmail: 'test@example.com',
      })
      expect(result.success).toBe(true)
    })

    it('should reject delete request with invalid UUID', () => {
      const result = deleteUserSchema.safeParse({
        userId: 'not-a-uuid',
        userEmail: 'test@example.com',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const result = sanitizeString('<script>alert("xss")</script>')
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
    })

    it('should remove javascript: protocol', () => {
      const result = sanitizeString('javascript:alert("xss")')
      expect(result).not.toContain('javascript:')
    })

    it('should remove event handlers', () => {
      const result = sanitizeString('onclick=alert("xss")')
      expect(result).not.toContain('onclick=')
    })

    it('should trim whitespace', () => {
      const result = sanitizeString('  test  ')
      expect(result).toBe('test')
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize all string values', () => {
      const result = sanitizeObject({
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
      })
      expect(result.name).not.toContain('<')
      expect(result.email).toBe('test@example.com')
    })

    it('should handle nested objects', () => {
      const result = sanitizeObject({
        user: {
          name: '<script>xss</script>',
        },
      })
      expect(result.user.name).not.toContain('<')
    })
  })

  describe('validateRequest', () => {
    it('should validate and return data on success', async () => {
      const data = await validateRequest(emailSchema, 'test@example.com')
      expect(data).toBe('test@example.com')
    })

    it('should throw error on validation failure', async () => {
      await expect(validateRequest(emailSchema, 'invalid')).rejects.toThrow('Validation failed')
    })
  })
})
