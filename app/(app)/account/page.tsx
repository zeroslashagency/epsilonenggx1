"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { User, Mail, Shield, Calendar, Settings, Save, X, Edit2, Lock, Key, Activity } from 'lucide-react'
import { useAuth } from '@/app/lib/contexts/auth-context'
import { apiGet, apiPatch, apiPost } from '@/app/lib/utils/api-client'
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'
import { ProtectedPage } from '@/components/auth/ProtectedPage'
import { UserData } from '@/app/types'

function AccountPageContent() {
  const auth = useAuth()
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    // Fetch current user data from Supabase
    const fetchUserData = async () => {
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()

        if (error) {
          return
        }

        if (currentUser) {
          // Fetch additional user profile data from profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()

          if (profileError) {
          }

          setUserData({
            id: currentUser.id,
            email: currentUser.email || '',
            full_name: currentUser.user_metadata?.full_name || currentUser.email || '',
            role: currentUser.user_metadata?.role || 'viewer',
            created_at: currentUser.created_at || new Date().toISOString(),
            last_sign_in_at: currentUser.last_sign_in_at,
            email_confirmed_at: currentUser.email_confirmed_at,
            user_metadata: currentUser.user_metadata,
            profile: profileData
          })
        }
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const handlePasswordReset = async () => {
    if (!userData?.email) {
      alert('No email address found')
      return
    }

    setResetting(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userData.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        alert('Failed to send password reset email: ' + error.message)
      } else {
        alert('Password reset email sent! Check your inbox.')
      }
    } catch (error) {
      alert('Failed to send password reset email')
    } finally {
      setResetting(false)
    }
  }

  const handleEmailChange = async () => {
    if (newEmail !== confirmEmail) {
      alert('❌ Emails do not match')
      return
    }

    if (!newEmail) {
      alert('❌ Please enter a new email')
      return
    }

    try {
      const result = await apiPost('/api/user/update-email', {
        newEmail: newEmail
      })

      if (result.success) {
        alert('✅ ' + result.message)
        setIsEditingEmail(false)
        setNewEmail('')
        setConfirmEmail('')
      } else {
        alert('❌ Error: ' + result.error)
      }
    } catch (error: any) {
      alert('❌ Failed to change email: ' + error.message)
    }
  }

  const handleCancelEmailChange = () => {
    setIsEditingEmail(false)
    setNewEmail('')
    setConfirmEmail('')
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-96">
          <p className="text-[#95AAC9]">Loading account details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Hero Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-700 dark:text-gray-300 text-3xl font-semibold">
            {(userData?.profile?.full_name || userData?.email)?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              {userData?.profile?.full_name || userData?.user_metadata?.full_name || userData?.email || 'User Account'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4" />
                <span>{userData?.email || 'No email'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Shield className="w-4 h-4" />
                <span>{userData?.profile?.role || userData?.user_metadata?.role || 'User'}</span>
              </div>
              {userData?.email_confirmed_at && (
                <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <span>✓ Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Account Status</div>
          </div>
          <div className="text-xl font-semibold text-gray-900 dark:text-white">Active</div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Member Since</div>
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Login</div>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {userData?.last_sign_in_at ? new Date(userData.last_sign_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Security</div>
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">Protected</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Details - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            Profile Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Full Name</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {userData?.profile?.full_name || userData?.user_metadata?.full_name || 'Not set'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email Address</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1 break-all">{userData?.email || 'Not set'}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Employee Code</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {userData?.profile?.employee_code || userData?.employee_code || 'Not assigned'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Role</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {userData?.profile?.role || userData?.user_metadata?.role || 'User'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Account ID</label>
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300 mt-1 break-all">
                {userData?.id || 'Not available'}
              </p>
            </div>
          </div>
        </div>

        {/* Account Activity - Takes 1 column */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            Activity
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-2 border-gray-300 dark:border-gray-600">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not available'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-2 border-gray-300 dark:border-gray-600">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last Sign In</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                {userData?.last_sign_in_at ? new Date(userData.last_sign_in_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not available'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-2 border-gray-300 dark:border-gray-600">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email Status</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                {userData?.email_confirmed_at ? (
                  <span className="text-green-600 dark:text-green-400 font-semibold">✓ Verified</span>
                ) : (
                  <span className="text-orange-600 dark:text-orange-400 font-semibold">Not verified</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          Security & Settings
        </h2>

        <div className="space-y-4">
          {/* Change Password */}
          <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Password</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Reset your password via email</p>
              </div>
            </div>
            <button
              onClick={handlePasswordReset}
              disabled={resetting}
              className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetting ? 'Sending...' : 'Change Password'}
            </button>
          </div>

          {/* Change Email */}
          <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Email Address</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Update your email address</p>
                </div>
              </div>
              {!isEditingEmail && (
                <button
                  onClick={() => setIsEditingEmail(true)}
                  className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                  Change Email
                </button>
              )}
            </div>

            {isEditingEmail && (
              <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                <div className="flex items-start gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-700 dark:text-gray-300">
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>You will receive confirmation emails at both your old and new email addresses. You must confirm from both to complete the change.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    New Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Confirm New Email
                  </label>
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Confirm new email"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleEmailChange}
                    disabled={!newEmail || !confirmEmail || newEmail !== confirmEmail}
                    className="flex-1 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update Email
                  </button>
                  <button
                    onClick={handleCancelEmailChange}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div >
  )
}

export default function AccountPage() {
  return (
    <ProtectedPage module="system_administration" item="Account" permission="view">
      <AccountPageContent />
    </ProtectedPage>
  )
}
