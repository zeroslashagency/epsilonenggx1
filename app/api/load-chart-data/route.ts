export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requirePermission } from '@/app/lib/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  // ✅ PERMISSION CHECK: Require dashboard.view permission
  const authResult = await requirePermission(request, 'dashboard.view')
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    
    // Generate sample chart data for the dashboard
    const chartData = {
      production: [
        { month: 'Jan', value: 85 },
        { month: 'Feb', value: 92 },
        { month: 'Mar', value: 78 },
        { month: 'Apr', value: 95 },
        { month: 'May', value: 88 },
        { month: 'Jun', value: 91 }
      ],
      efficiency: [
        { date: '2024-01-01', efficiency: 87 },
        { date: '2024-01-02', efficiency: 91 },
        { date: '2024-01-03', efficiency: 89 },
        { date: '2024-01-04', efficiency: 93 },
        { date: '2024-01-05', efficiency: 85 },
        { date: '2024-01-06', efficiency: 88 },
        { date: '2024-01-07', efficiency: 92 }
      ],
      machines: [
        { name: 'Machine A', status: 'running', utilization: 95 },
        { name: 'Machine B', status: 'running', utilization: 87 },
        { name: 'Machine C', status: 'maintenance', utilization: 0 },
        { name: 'Machine D', status: 'running', utilization: 92 },
        { name: 'Machine E', status: 'idle', utilization: 45 }
      ]
    }

    return NextResponse.json({
      success: true,
      data: chartData
    })

  } catch (error: any) {
    console.error('Error loading chart data:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to load chart data'
    }, { status: 500 })
  }
}
