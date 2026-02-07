import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'

export const dynamic = 'force-dynamic'

type CallLogUserRow = {
    user_id: string
    last_call_at: string | null
}

type ProfileRow = {
    id: string
    full_name: string | null
    employee_code: string | null
}

export async function GET() {
    try {
        const supabase = getSupabaseAdminClient()

        const { data: usersData, error: usersError } = await supabase.rpc('call_recordings_users')

        if (usersError) {
            console.error('Supabase RPC error:', usersError)
            throw usersError
        }

        const users = (usersData as CallLogUserRow[] | null) || []
        const userIds = users.map(user => user.user_id).filter(Boolean)

        let profiles: ProfileRow[] = []
        if (userIds.length > 0) {
            const { data: profileRows, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, employee_code')
                .in('id', userIds)

            if (profileError) {
                console.error('Supabase profiles error:', profileError)
            }

            profiles = profileRows || []
        }

        const profileMap = new Map(profiles.map(profile => [profile.id, profile]))

        const results = users.map(user => {
            const profile = profileMap.get(user.user_id)
            return {
                user_id: user.user_id,
                last_call_at: user.last_call_at,
                full_name: profile?.full_name || null,
                employee_code: profile?.employee_code || null
            }
        })

        return NextResponse.json({
            success: true,
            users: results
        })
    } catch (error) {
        console.error('Call Log Users API Error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch call log users' },
            { status: 500 }
        )
    }
}
