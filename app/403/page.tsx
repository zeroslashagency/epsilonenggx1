"use client"

import { useRouter } from 'next/navigation'
import { ZohoButton } from '../components/zoho-ui'
import { Shield, Home, ArrowLeft } from 'lucide-react'

export default function ForbiddenPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
            <Shield className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-2">403</h1>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
        </div>

        <div className="space-y-3">
          <ZohoButton 
            variant="primary" 
            className="w-full"
            icon={<Home className="w-4 h-4" />}
            onClick={() => router.push('/dashboard')}
          >
            Go to Dashboard
          </ZohoButton>
          
          <ZohoButton 
            variant="ghost" 
            className="w-full"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.back()}
          >
            Go Back
          </ZohoButton>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need access? Contact your system administrator to request permissions.
          </p>
        </div>
      </div>
    </div>
  )
}
