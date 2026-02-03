export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireGranularPermission } from '@/app/lib/features/auth/auth.middleware'

/**
 * GET /api/monitoring/reports
 * Retrieve aggregated monitoring reports
 */
export async function GET(request: NextRequest) {
  // ✅ Check: monitoring.Reports.view permission
  const authResult = await requireGranularPermission(request, 'monitoring', 'Reports', 'view')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    
    const period = searchParams.get('period') || 'today'
    
    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'today':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
    }
    
    // Fetch production orders summary
    const { data: orders, error: ordersError } = await supabase
      .from('production_orders')
      .select('id, status, priority, created_at')
      .gte('created_at', startDate.toISOString())
    
    if (ordersError) throw ordersError
    
    // Fetch machines summary
    const { data: machines, error: machinesError } = await supabase
      .from('machines')
      .select('id, status, efficiency, type')
    
    if (machinesError) throw machinesError
    
    // Fetch quality checks summary
    const { data: qualityChecks, error: qualityError } = await supabase
      .from('quality_checks')
      .select('id, result, defects, created_at')
      .gte('created_at', startDate.toISOString())
    
    if (qualityError) throw qualityError
    
    // Fetch personnel summary
    const { data: personnel, error: personnelError } = await supabase
      .from('production_personnel')
      .select('id, status, efficiency_score, shift')
    
    if (personnelError) throw personnelError
    
    // Aggregate data into reports
    const reports = [
      {
        id: 'production',
        type: 'production',
        title: 'Production Summary',
        description: 'Overall production metrics and KPIs',
        color: 'bg-blue-100 text-blue-600',
        lastGenerated: new Date().toISOString(),
        metrics: {
          total: orders?.length || 0,
          pending: orders?.filter(o => o.status === 'pending').length || 0,
          inProgress: orders?.filter(o => o.status === 'in_progress').length || 0,
          completed: orders?.filter(o => o.status === 'completed').length || 0,
          highPriority: orders?.filter(o => o.priority === 'high' || o.priority === 'urgent').length || 0
        }
      },
      {
        id: 'machine',
        type: 'machine',
        title: 'Machine Performance',
        description: 'Machine utilization and efficiency metrics',
        color: 'bg-green-100 text-green-600',
        lastGenerated: new Date().toISOString(),
        metrics: {
          total: machines?.length || 0,
          running: machines?.filter(m => m.status === 'running').length || 0,
          idle: machines?.filter(m => m.status === 'idle').length || 0,
          maintenance: machines?.filter(m => m.status === 'maintenance').length || 0,
          offline: machines?.filter(m => m.status === 'offline').length || 0,
          avgEfficiency: machines?.length 
            ? Math.round(machines.reduce((sum, m) => sum + (m.efficiency || 0), 0) / machines.length)
            : 0
        }
      },
      {
        id: 'quality',
        type: 'quality',
        title: 'Quality Control',
        description: 'Quality inspection results and defect tracking',
        color: 'bg-purple-100 text-purple-600',
        lastGenerated: new Date().toISOString(),
        metrics: {
          total: qualityChecks?.length || 0,
          passed: qualityChecks?.filter(q => q.result === 'passed').length || 0,
          failed: qualityChecks?.filter(q => q.result === 'failed').length || 0,
          pending: qualityChecks?.filter(q => q.result === 'pending').length || 0,
          totalDefects: qualityChecks?.reduce((sum, q) => sum + (q.defects || 0), 0) || 0
        }
      },
      {
        id: 'personnel',
        type: 'personnel',
        title: 'Personnel Overview',
        description: 'Workforce status and efficiency metrics',
        color: 'bg-orange-100 text-orange-600',
        lastGenerated: new Date().toISOString(),
        metrics: {
          total: personnel?.length || 0,
          active: personnel?.filter(p => p.status === 'active').length || 0,
          onLeave: personnel?.filter(p => p.status === 'on_leave').length || 0,
          absent: personnel?.filter(p => p.status === 'absent').length || 0,
          avgEfficiency: personnel?.length
            ? Math.round(personnel.reduce((sum, p) => sum + (p.efficiency_score || 0), 0) / personnel.length)
            : 0,
          byShift: {
            morning: personnel?.filter(p => p.shift === 'morning').length || 0,
            afternoon: personnel?.filter(p => p.shift === 'afternoon').length || 0,
            night: personnel?.filter(p => p.shift === 'night').length || 0
          }
        }
      }
    ]
    
    return NextResponse.json({
      success: true,
      data: reports,
      period,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch reports'
    }, { status: 500 })
  }
}
