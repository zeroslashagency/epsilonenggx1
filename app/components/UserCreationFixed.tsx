'use client'

import { useState } from 'react'

interface UserData {
  full_name: string
  email: string
  password: string
  role: string
  employee_code?: string
  department?: string
  designation?: string
}

export function UserCreationFixed({ userData }: { userData: UserData }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      console.log('🚀 USING FIXED USER CREATION SYSTEM')
      
      const response = await fetch('/api/admin/user-creation-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: userData.full_name,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          employee_code: userData.employee_code || null,
          department: userData.department || null,
          designation: userData.designation || null,
          actorId: 'admin'
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        alert(`✅ SUCCESS! User creation request submitted for ${userData.full_name}!

Request ID: ${result.request_id}

An administrator will process this request and create the user account. You will be notified once the account is ready.`)
        
        // Reload the page to reset the form
        window.location.reload()
      } else {
        throw new Error(result.error || 'Failed to submit user creation request')
      }
    } catch (error) {
      console.error('User creation request failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`❌ Failed to submit user creation request: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <button
      onClick={handleSubmit}
      disabled={isSubmitting}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
    >
      {isSubmitting ? 'Submitting...' : '🚀 Create User Account (FIXED)'}
    </button>
  )
}
