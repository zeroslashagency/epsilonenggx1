export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export async function GET() {
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
