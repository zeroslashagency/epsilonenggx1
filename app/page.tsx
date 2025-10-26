"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./lib/contexts/auth-context"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Redirect to NEW Zoho UI dashboard
        router.replace('/dashboard')
      } else {
        // Redirect to login
        router.replace('/auth')
      }
    }
  }, [isAuthenticated, isLoading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#2C7BE5] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-[#95AAC9]">Loading...</p>
      </div>
    </div>
  )
}
