// New user creation system - bypasses API key issues
export async function createUserRequest(userData: {
  full_name: string
  email: string
  password: string
  role: string
  employee_code?: string | null
  department?: string | null
  designation?: string | null
  notes?: string | null
  actorId?: string
}) {
  console.log('🚀 NEW USER CREATION SYSTEM ACTIVATED!')
  
  const response = await fetch('/api/admin/user-creation-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to submit user creation request')
  }

  return result
}
