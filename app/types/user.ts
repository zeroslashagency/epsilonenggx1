export interface UserData {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'operator' | 'viewer' | string
  employee_code?: string
  department?: string
  designation?: string
  phone?: string
  created_at: string
  last_login?: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  standalone_attendance?: 'YES' | 'NO'
  status?: 'active' | 'pending' | 'inactive'
  user_metadata?: {
    full_name?: string
    role?: string
  }
  profile?: any
}

export interface UserPermissions {
  dashboard?: boolean
  schedule_generator?: boolean
  schedule_generator_dashboard?: boolean
  chart?: boolean
  analytics?: boolean
  attendance?: boolean
  standalone_attendance?: boolean
  production?: boolean
  monitoring?: boolean
  manage_users?: boolean
}

export interface AuthUser {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
    role?: string
  }
}
