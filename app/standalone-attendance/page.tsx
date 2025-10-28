"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StandaloneAttendancePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main attendance page
    router.push('/attendance')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to attendance page...</p>
    </div>
  )
}
