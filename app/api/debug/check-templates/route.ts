export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient()
    const { data: templates, error } = await supabase
      .from('shift_templates')
      .select('*')
    
    console.log('Template check:', { count: templates?.length, error })

    if (error) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }

    return NextResponse.json({
      count: templates?.length || 0,
      templates
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
