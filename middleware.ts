import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create an authenticated Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAdminApi = pathname.startsWith('/api/admin')

  // Defined Protected Routes
  const isProtectedRoute =
    pathname.startsWith('/tools') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/dashboard') ||
    isAdminApi

  // Auth Logic
  if (isProtectedRoute && !user) {
    // Admin API: reject with 401 JSON instead of redirecting
    if (isAdminApi) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Authentication required.' },
        { status: 401 }
      )
    }
    const redirectUrl = new URL('/auth', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Admin API: require an admin-level role at the edge (defense in depth;
  // per-route guards still enforce granular permissions)
  if (isAdminApi && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, role_badge')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    const badge = (profile?.role_badge || '').toString().toLowerCase().replace(/\s+/g, '_')
    const isAdminLevel =
      role === 'Super Admin' ||
      role === 'super_admin' ||
      role === 'Admin' ||
      role === 'Manager' ||
      badge === 'super_admin'

    if (!isAdminLevel) {
      return NextResponse.json(
        { success: false, error: 'Forbidden', message: 'Admin access required.' },
        { status: 403 }
      )
    }
  }

  // Redirect authenticated users away from Auth page
  if (request.nextUrl.pathname.startsWith('/auth') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
