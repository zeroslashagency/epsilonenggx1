# 🔧 COMPREHENSIVE REFACTORING PLAN

**Project:** Epsilon Scheduling  
**Goal:** Transform from prototype to production-ready enterprise application  
**Timeline:** 8-12 weeks  
**Priority:** 🔴 CRITICAL

---

## 📋 PHASE 1: CRITICAL SECURITY FIXES (Week 1)

### **Priority 1.1: Remove Hardcoded Secrets** ⚡ DO TODAY

**Files to Fix:**
- `app/api/admin/roles/route.ts`
- `app/api/admin/role-profiles/route.ts`
- Any other files with hardcoded credentials

**Action:**
1. Search all files for hardcoded keys
2. Replace with centralized client
3. Validate environment variables on startup
4. Remove secrets from Git history

**Implementation:**
```bash
# Find all hardcoded keys
grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" app/

# Remove from Git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch app/api/admin/roles/route.ts" \
  --prune-empty --tag-name-filter cat -- --all
```

---

### **Priority 1.2: Centralize Database Access**

**Create:** `app/lib/database/supabase.service.ts`

```typescript
/**
 * Centralized Supabase Service
 * Provides secure, consistent database access across the application
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

class SupabaseService {
  private static clientInstance: SupabaseClient | null = null
  private static adminInstance: SupabaseClient | null = null

  /**
   * Get client-side Supabase instance (anon key)
   * @throws {Error} If environment variables are missing
   */
  static getClient(): SupabaseClient {
    if (!this.clientInstance) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!url || !key) {
        throw new Error('Missing Supabase client credentials')
      }

      this.clientInstance = createClient(url, key, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          storageKey: 'epsilon-auth'
        }
      })
    }

    return this.clientInstance
  }

  /**
   * Get server-side Supabase instance (service role key)
   * @throws {Error} If environment variables are missing
   */
  static getAdminClient(): SupabaseClient {
    if (!this.adminInstance) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!url || !key) {
        throw new Error('Missing Supabase admin credentials')
      }

      this.adminInstance = createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    }

    return this.adminInstance
  }

  /**
   * Validate environment variables on startup
   */
  static validateConfig(): void {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]

    const missing = required.filter(key => !process.env[key])

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env.local file'
      )
    }
  }
}

export default SupabaseService
```

---

### **Priority 1.3: Add Environment Validation**

**Create:** `app/lib/config/env.validation.ts`

```typescript
/**
 * Environment Variable Validation
 * Ensures all required configuration is present at startup
 */
import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional: Redis (for caching)
  REDIS_URL: z.string().url().optional(),

  // Optional: Monitoring
  SENTRY_DSN: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validate and parse environment variables
 * @throws {ZodError} If validation fails
 */
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    console.error('❌ Environment validation failed:')
    console.error(error)
    process.exit(1)
  }
}

// Validate on module load
export const env = validateEnv()
```

---

## 📋 PHASE 2: ARCHITECTURE REFACTORING (Weeks 2-3)

### **Priority 2.1: Implement Clean Architecture**

**New Folder Structure:**
```
app/
  lib/
    core/                    # Core business logic
      entities/             # Domain entities
      use-cases/            # Business use cases
      interfaces/           # Contracts/interfaces
    infrastructure/         # External services
      database/
        repositories/       # Data access layer
        migrations/         # Database migrations
      cache/               # Caching layer
      external-apis/       # Third-party APIs
    application/           # Application services
      services/            # Business services
      dto/                 # Data Transfer Objects
      validators/          # Input validation
    presentation/          # API layer
      middleware/          # Request middleware
      controllers/         # Route controllers
      responses/           # Response formatters
```

---

### **Priority 2.2: Create Repository Pattern**

**Create:** `app/lib/infrastructure/database/repositories/base.repository.ts`

```typescript
/**
 * Base Repository
 * Provides common database operations with type safety
 */
import { SupabaseClient } from '@supabase/supabase-js'
import SupabaseService from '@/app/lib/database/supabase.service'

export abstract class BaseRepository<T> {
  protected supabase: SupabaseClient
  protected abstract tableName: string

  constructor() {
    this.supabase = SupabaseService.getAdminClient()
  }

  /**
   * Find record by ID
   */
  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw this.handleError(error)
    return data as T
  }

  /**
   * Find all records with optional filters
   */
  async findAll(filters?: Record<string, any>): Promise<T[]> {
    let query = this.supabase.from(this.tableName).select('*')

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { data, error } = await query
    if (error) throw this.handleError(error)
    return data as T[]
  }

  /**
   * Create new record
   */
  async create(data: Partial<T>): Promise<T> {
    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single()

    if (error) throw this.handleError(error)
    return created as T
  }

  /**
   * Update record by ID
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const { data: updated, error } = await this.supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw this.handleError(error)
    return updated as T
  }

  /**
   * Delete record by ID
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)

    if (error) throw this.handleError(error)
  }

  /**
   * Handle database errors
   */
  protected handleError(error: any): Error {
    // Transform Supabase errors to application errors
    return new Error(`Database error: ${error.message}`)
  }
}
```

**Create:** `app/lib/infrastructure/database/repositories/role.repository.ts`

```typescript
/**
 * Role Repository
 * Handles all role-related database operations
 */
import { BaseRepository } from './base.repository'

export interface Role {
  id: string
  name: string
  description: string
  is_manufacturing_role: boolean
  permissions_json: Record<string, any>
  created_at: string
  updated_at: string
}

export class RoleRepository extends BaseRepository<Role> {
  protected tableName = 'roles'

  /**
   * Find role with permissions
   */
  async findByIdWithPermissions(id: string): Promise<Role | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        role_permissions (
          permissions (*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw this.handleError(error)
    return data as Role
  }

  /**
   * Find all roles with permissions
   */
  async findAllWithPermissions(): Promise<Role[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        role_permissions (
          permissions (*)
        )
      `)
      .order('name')

    if (error) throw this.handleError(error)
    return data as Role[]
  }

  /**
   * Update role permissions
   */
  async updatePermissions(
    roleId: string,
    permissionIds: string[]
  ): Promise<void> {
    // Use transaction via RPC
    const { error } = await this.supabase.rpc('update_role_permissions', {
      p_role_id: roleId,
      p_permission_ids: permissionIds
    })

    if (error) throw this.handleError(error)
  }
}
```

---

### **Priority 2.3: Create Service Layer**

**Create:** `app/lib/application/services/role.service.ts`

```typescript
/**
 * Role Service
 * Business logic for role management
 */
import { RoleRepository, Role } from '@/app/lib/infrastructure/database/repositories/role.repository'
import { CreateRoleDTO, UpdateRoleDTO } from '../dto/role.dto'
import { AuditService } from './audit.service'

export class RoleService {
  private roleRepository: RoleRepository
  private auditService: AuditService

  constructor() {
    this.roleRepository = new RoleRepository()
    this.auditService = new AuditService()
  }

  /**
   * Get all roles
   */
  async getAllRoles(): Promise<Role[]> {
    return await this.roleRepository.findAllWithPermissions()
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: string): Promise<Role> {
    const role = await this.roleRepository.findByIdWithPermissions(id)
    
    if (!role) {
      throw new Error(`Role not found: ${id}`)
    }

    return role
  }

  /**
   * Create new role
   */
  async createRole(dto: CreateRoleDTO, actorId?: string): Promise<Role> {
    // Validate business rules
    await this.validateRoleName(dto.name)

    // Create role
    const role = await this.roleRepository.create({
      name: dto.name,
      description: dto.description,
      is_manufacturing_role: dto.isManufacturingRole,
      permissions_json: dto.permissions
    })

    // Log audit trail
    await this.auditService.log({
      actorId,
      action: 'role_created',
      resourceType: 'role',
      resourceId: role.id,
      metadata: { roleName: role.name }
    })

    return role
  }

  /**
   * Update role
   */
  async updateRole(
    id: string,
    dto: UpdateRoleDTO,
    actorId?: string
  ): Promise<Role> {
    // Check if role exists
    const existing = await this.getRoleById(id)

    // Validate business rules
    if (dto.name && dto.name !== existing.name) {
      await this.validateRoleName(dto.name)
    }

    // Update role
    const updated = await this.roleRepository.update(id, {
      name: dto.name,
      description: dto.description,
      is_manufacturing_role: dto.isManufacturingRole,
      permissions_json: dto.permissions,
      updated_at: new Date().toISOString()
    })

    // Update permissions if provided
    if (dto.permissionIds) {
      await this.roleRepository.updatePermissions(id, dto.permissionIds)
    }

    // Log audit trail
    await this.auditService.log({
      actorId,
      action: 'role_updated',
      resourceType: 'role',
      resourceId: id,
      metadata: { changes: dto }
    })

    return updated
  }

  /**
   * Delete role
   */
  async deleteRole(id: string, actorId?: string): Promise<void> {
    // Check if role exists
    const role = await this.getRoleById(id)

    // Check if role can be deleted (business rule)
    await this.validateRoleDeletion(id)

    // Delete role
    await this.roleRepository.delete(id)

    // Log audit trail
    await this.auditService.log({
      actorId,
      action: 'role_deleted',
      resourceType: 'role',
      resourceId: id,
      metadata: { roleName: role.name }
    })
  }

  /**
   * Validate role name is unique
   */
  private async validateRoleName(name: string): Promise<void> {
    const existing = await this.roleRepository.findAll({ name })
    
    if (existing.length > 0) {
      throw new Error(`Role name already exists: ${name}`)
    }
  }

  /**
   * Validate role can be deleted
   */
  private async validateRoleDeletion(roleId: string): Promise<void> {
    // Check if role is assigned to users
    // Implement this check based on your user-role relationship
    // throw new Error('Cannot delete role: assigned to users')
  }
}
```

---

### **Priority 2.4: Add Input Validation**

**Create:** `app/lib/application/dto/role.dto.ts`

```typescript
/**
 * Role Data Transfer Objects
 * Defines and validates data structures for role operations
 */
import { z } from 'zod'

// Permission schema
const PermissionModuleSchema = z.record(
  z.object({
    full: z.boolean().optional(),
    view: z.boolean().optional(),
    create: z.boolean().optional(),
    edit: z.boolean().optional(),
    delete: z.boolean().optional(),
    approve: z.boolean().optional()
  })
)

// Create role schema
export const CreateRoleSchema = z.object({
  name: z.string()
    .min(1, 'Role name is required')
    .max(100, 'Role name too long')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Invalid role name format'),
  
  description: z.string()
    .max(500, 'Description too long')
    .optional(),
  
  isManufacturingRole: z.boolean().default(false),
  
  permissions: z.record(PermissionModuleSchema).optional(),
  
  permissionIds: z.array(z.string().uuid()).optional()
})

export type CreateRoleDTO = z.infer<typeof CreateRoleSchema>

// Update role schema
export const UpdateRoleSchema = CreateRoleSchema.partial()

export type UpdateRoleDTO = z.infer<typeof UpdateRoleSchema>

// Query parameters schema
export const RoleQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isManufacturingRole: z.coerce.boolean().optional()
})

export type RoleQueryDTO = z.infer<typeof RoleQuerySchema>
```

---

## 📋 PHASE 3: API REFACTORING (Weeks 4-5)

### **Priority 3.1: Create Controller Layer**

**Create:** `app/lib/presentation/controllers/role.controller.ts`

```typescript
/**
 * Role Controller
 * Handles HTTP requests for role management
 */
import { NextRequest } from 'next/server'
import { RoleService } from '@/app/lib/application/services/role.service'
import { CreateRoleSchema, UpdateRoleSchema, RoleQuerySchema } from '@/app/lib/application/dto/role.dto'
import { SuccessResponse, ErrorResponse } from '../responses/api.response'
import { validateRequest } from '../middleware/validation.middleware'

export class RoleController {
  private roleService: RoleService

  constructor() {
    this.roleService = new RoleService()
  }

  /**
   * GET /api/roles
   * Get all roles with optional filtering
   */
  async getAllRoles(request: NextRequest) {
    try {
      // Parse and validate query parameters
      const searchParams = Object.fromEntries(request.nextUrl.searchParams)
      const query = RoleQuerySchema.parse(searchParams)

      // Get roles from service
      const roles = await this.roleService.getAllRoles()

      // Apply filtering
      let filtered = roles
      if (query.search) {
        filtered = filtered.filter(r => 
          r.name.toLowerCase().includes(query.search!.toLowerCase())
        )
      }
      if (query.isManufacturingRole !== undefined) {
        filtered = filtered.filter(r => 
          r.is_manufacturing_role === query.isManufacturingRole
        )
      }

      // Apply pagination
      const start = (query.page - 1) * query.limit
      const end = start + query.limit
      const paginated = filtered.slice(start, end)

      return SuccessResponse.ok({
        data: paginated,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / query.limit)
        }
      })

    } catch (error) {
      return ErrorResponse.fromError(error)
    }
  }

  /**
   * GET /api/roles/:id
   * Get role by ID
   */
  async getRoleById(request: NextRequest, id: string) {
    try {
      const role = await this.roleService.getRoleById(id)
      return SuccessResponse.ok({ data: role })
    } catch (error) {
      return ErrorResponse.fromError(error)
    }
  }

  /**
   * POST /api/roles
   * Create new role
   */
  async createRole(request: NextRequest) {
    try {
      // Parse and validate request body
      const body = await request.json()
      const dto = CreateRoleSchema.parse(body)

      // Get actor ID from auth (TODO: implement auth)
      const actorId = undefined // await getAuthUser(request)

      // Create role
      const role = await this.roleService.createRole(dto, actorId)

      return SuccessResponse.created({
        data: role,
        message: 'Role created successfully'
      })

    } catch (error) {
      return ErrorResponse.fromError(error)
    }
  }

  /**
   * PUT /api/roles/:id
   * Update role
   */
  async updateRole(request: NextRequest, id: string) {
    try {
      // Parse and validate request body
      const body = await request.json()
      const dto = UpdateRoleSchema.parse(body)

      // Get actor ID from auth
      const actorId = undefined // await getAuthUser(request)

      // Update role
      const role = await this.roleService.updateRole(id, dto, actorId)

      return SuccessResponse.ok({
        data: role,
        message: 'Role updated successfully'
      })

    } catch (error) {
      return ErrorResponse.fromError(error)
    }
  }

  /**
   * DELETE /api/roles/:id
   * Delete role
   */
  async deleteRole(request: NextRequest, id: string) {
    try {
      // Get actor ID from auth
      const actorId = undefined // await getAuthUser(request)

      // Delete role
      await this.roleService.deleteRole(id, actorId)

      return SuccessResponse.ok({
        message: 'Role deleted successfully'
      })

    } catch (error) {
      return ErrorResponse.fromError(error)
    }
  }
}
```

---

### **Priority 3.2: Create Response Formatters**

**Create:** `app/lib/presentation/responses/api.response.ts`

```typescript
/**
 * API Response Formatters
 * Provides consistent response structure across all endpoints
 */
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId?: string
  }
}

export class SuccessResponse {
  /**
   * 200 OK
   */
  static ok<T>(payload: { data?: T; message?: string; meta?: any }) {
    const response: ApiResponse<T> = {
      success: true,
      data: payload.data,
      meta: {
        timestamp: new Date().toISOString(),
        ...payload.meta
      }
    }

    return NextResponse.json(response, { status: 200 })
  }

  /**
   * 201 Created
   */
  static created<T>(payload: { data: T; message?: string }) {
    const response: ApiResponse<T> = {
      success: true,
      data: payload.data,
      meta: {
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json(response, { status: 201 })
  }

  /**
   * 204 No Content
   */
  static noContent() {
    return new NextResponse(null, { status: 204 })
  }
}

export class ErrorResponse {
  /**
   * 400 Bad Request
   */
  static badRequest(message: string, details?: any) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json(response, { status: 400 })
  }

  /**
   * 401 Unauthorized
   */
  static unauthorized(message = 'Unauthorized') {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json(response, { status: 401 })
  }

  /**
   * 403 Forbidden
   */
  static forbidden(message = 'Forbidden') {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json(response, { status: 403 })
  }

  /**
   * 404 Not Found
   */
  static notFound(message = 'Resource not found') {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json(response, { status: 404 })
  }

  /**
   * 500 Internal Server Error
   */
  static internalError(message = 'Internal server error', details?: any) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
        details: process.env.NODE_ENV === 'development' ? details : undefined
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }

  /**
   * Handle any error and return appropriate response
   */
  static fromError(error: unknown) {
    console.error('API Error:', error)

    // Zod validation error
    if (error instanceof ZodError) {
      return this.badRequest('Validation failed', error.errors)
    }

    // Application error
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('not found')) {
        return this.notFound(error.message)
      }
      if (error.message.includes('already exists')) {
        return this.badRequest(error.message)
      }
      if (error.message.includes('Unauthorized')) {
        return this.unauthorized(error.message)
      }
      if (error.message.includes('Forbidden')) {
        return this.forbidden(error.message)
      }

      return this.internalError(error.message)
    }

    // Unknown error
    return this.internalError('An unexpected error occurred')
  }
}
```

---

## 📋 IMPLEMENTATION TIMELINE

### **Week 1: Critical Security**
- [ ] Day 1-2: Remove hardcoded secrets
- [ ] Day 3-4: Centralize database access
- [ ] Day 5: Add environment validation

### **Week 2-3: Architecture**
- [ ] Week 2: Implement repository pattern
- [ ] Week 3: Create service layer
- [ ] Week 3: Add input validation

### **Week 4-5: API Refactoring**
- [ ] Week 4: Create controllers
- [ ] Week 4: Add response formatters
- [ ] Week 5: Refactor all 44 API routes

### **Week 6-7: Testing & Documentation**
- [ ] Week 6: Add unit tests
- [ ] Week 6: Add integration tests
- [ ] Week 7: API documentation
- [ ] Week 7: Code documentation

### **Week 8-12: Advanced Features**
- [ ] Week 8: Authentication/Authorization
- [ ] Week 9: Caching layer
- [ ] Week 10: Performance optimization
- [ ] Week 11: Monitoring/Logging
- [ ] Week 12: CI/CD pipeline

---

## 🎯 SUCCESS METRICS

- ✅ Zero hardcoded secrets
- ✅ 100% type safety
- ✅ 80%+ test coverage
- ✅ All API routes authenticated
- ✅ Response time < 200ms
- ✅ Zero security vulnerabilities
- ✅ Complete API documentation

---

**Next:** See `IMMEDIATE_FIXES.md` for code to implement today
