import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'
import fs from 'fs'
import path from 'path'

/**
 * POST /api/admin/run-migration
 * Run the production/monitoring database migration
 * ADMIN ONLY
 */
export async function POST(request: NextRequest) {
  // Require admin permission
  const authResult = await requirePermission(request, 'manage_users')
  if (authResult instanceof NextResponse) return authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20251025_production_monitoring_tables.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Running migration...')
    
    // Execute the SQL
    // Note: This is a simplified version. In production, you'd want to:
    // 1. Split into individual statements
    // 2. Handle errors gracefully
    // 3. Track which migrations have been run
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('Migration error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    console.log('✅ Migration completed successfully!')
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully'
    })
    
  } catch (error) {
    console.error('Error running migration:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run migration'
    }, { status: 500 })
  }
}
