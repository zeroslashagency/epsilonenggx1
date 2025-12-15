export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export async function GET() {
  const supabase = getSupabaseAdminClient()
  
  // List last 5 users
  const { data: { users }, error } = await supabase.auth.admin.listUsers({
    perPage: 5,
    page: 1
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Map to show relevant details
  const debugData = users.map(u => ({
    email: u.email,
    id: u.id,
    created_at: u.created_at,
    metadata: u.user_metadata, // This is where force_password_reset should be
    force_password_reset_flag: u.user_metadata?.force_password_reset
  }))

  return NextResponse.json({
    count: users.length,
    recent_users: debugData
  })
}
