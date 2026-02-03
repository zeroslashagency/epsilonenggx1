import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from './services/supabase-server'
import { hasPermission } from './features/auth/auth.middleware'
import { UserRole } from './features/auth/types'

type ApiHandler = (request: NextRequest, user: any) => Promise<NextResponse>

interface AuthOptions {
  requiredPermission?: string
  requiredRole?: UserRole
}

export function withAuth(handler: ApiHandler, options?: AuthOptions) {
  return async (request: NextRequest) => {
    try {
      const supabase = await getSupabaseServerClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Fetch Profile for Role Check
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const userWithRole = { ...user, role: profile?.role || 'Employee' }

      // Check Role
      if (options?.requiredRole && userWithRole.role !== options.requiredRole && userWithRole.role !== 'Super Admin') {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient Role' },
          { status: 403 }
        )
      }

      // Check Permission
      if (options?.requiredPermission) {
        // We reuse the existing logic, but adapted for Server Client context if needed
        // For now, using the middleware helper which uses Admin client (safe in API context)
        const hasAccess = await hasPermission(userWithRole as any, options.requiredPermission)
        if (!hasAccess) {
          return NextResponse.json(
            { success: false, error: `Forbidden: Missing permission ${options.requiredPermission}` },
            { status: 403 }
          )
        }
      }

      return handler(request, userWithRole)

    } catch (error: any) {
      console.error('API Error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
      )
    }
  }
}
