import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/app/lib/middleware/rate-limiter'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Get IP address for rate limiting
  const ipAddress = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
  
  // Rate limit page requests
  const rateLimitKey = getRateLimitKey(ipAddress, undefined, req.nextUrl.pathname)
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.page)
  
  if (!rateLimit.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
      },
    })
  }

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes that require authentication
  const protectedPaths = [
    '/settings',
    '/attendance',
    '/analytics',
    '/schedule-generator',
    '/chart',
    '/production',
    '/monitoring',
  ]

  // Admin-only routes
  const adminOnlyPaths = [
    '/settings/users',
    '/settings/roles',
    '/settings/activity-logs',
    '/settings/users/add',
  ]

  const pathname = req.nextUrl.pathname

  // Check if current path is protected
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  const isAdminOnlyPath = adminOnlyPaths.some(path => pathname.startsWith(path))

  // Redirect to auth if accessing protected route without session
  if (isProtectedPath && !session) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/auth'
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Check admin-only routes
  if (isAdminOnlyPath && session) {
    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const userRole = profile?.role || 'Operator'
    
    // Only Super Admin and Admin can access these routes
    if (userRole !== 'Super Admin' && userRole !== 'Admin') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
}
