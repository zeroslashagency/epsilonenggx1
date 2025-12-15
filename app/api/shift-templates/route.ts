import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient()
    const body = await request.json()
    
    const { name, start_time, end_time, overnight, color, grace_minutes } = body
    
    // Validation
    if (!name || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Name, start time, and end time are required' },
        { status: 400 }
      )
    }
    
    // Insert new shift template
    const { data, error } = await supabase
      .from('shift_templates')
      .insert({
        name,
        start_time,
        end_time,
        overnight: overnight || false,
        color: color || '#DFF0D8',
        grace_minutes: grace_minutes || 10
      })
      .select()
      .single()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create shift template' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ data }, { status: 201 })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient()
    
    const { data, error } = await supabase
      .from('shift_templates')
      .select('*')
      .order('created_at')
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch shift templates' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ data }, { status: 200 })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
