export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/middleware/auth.middleware'

// ✅ SECURITY FIX: Diagnostic route now requires Super Admin
export async function GET(request: NextRequest) {
  // Require Super Admin for diagnostic endpoints
  const authResult = await requireRole(request, ['Super Admin'])
  if (authResult instanceof NextResponse) return authResult

  const checks: any = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  }

  try {
    const supabase = getSupabaseAdminClient()
    checks.clientInit = true
    
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    if (bucketError) {
        checks.storage = { error: bucketError.message }
    } else {
        checks.storage = { 
            connected: true, 
            buckets: buckets.map(b => b.name),
            avatarsExists: buckets.some(b => b.name === 'avatars') 
        }
    }
  } catch (err: any) {
    checks.error = err.message
  }

  return NextResponse.json(checks)
}

