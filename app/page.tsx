'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/contexts/auth-context'
import { RefreshCw } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading) {
      if (auth.isAuthenticated) {
        router.push('/dashboard')
      } else {
        router.push('/auth')
      }
    }
  }, [auth.isAuthenticated, auth.isLoading, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}
