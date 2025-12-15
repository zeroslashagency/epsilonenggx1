export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const maskedUrl = url ? `${url.substring(0, 15)}...` : 'MISSING'
  return NextResponse.json({ url: maskedUrl })
}
