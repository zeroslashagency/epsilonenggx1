"use client"

import { useState, useEffect } from 'react'
import { User, Mail, Shield, Calendar, Activity, Key } from 'lucide-react'
import { ZohoLayout } from '../components/zoho-ui'
import { useAuth } from '../lib/contexts/auth-context'

export default function AccountPage() {
  const { user, userPermissions } = useAuth()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch current user data
    const fetchUserData = async () => {
      try {
        // For now, use the auth context user data
        setUserData(user)
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user])

  if (loading) {
    return (
      <ZohoLayout breadcrumbs={[]}>
        <div className="flex items-center justify-center h-96">
          <p className="text-[#95AAC9]">Loading account details...</p>
        </div>
      </ZohoLayout>
    )
  }

  return (
    <ZohoLayout breadcrumbs={[]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-[#2C7BE5] to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {userData?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-[#12263F] dark:text-white mb-2">
                {userData?.user_metadata?.full_name || userData?.email || 'User Account'}
              </h1>
              <div className="flex items-center gap-4 text-sm text-[#95AAC9]">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {userData?.email || 'No email'}
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {userData?.user_metadata?.role || 'User'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Details */}
          <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
            <h2 className="text-lg font-semibold text-[#12263F] dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#95AAC9]">Full Name</label>
                <p className="text-[#12263F] dark:text-white">
                  {userData?.user_metadata?.full_name || 'Not set'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#95AAC9]">Email Address</label>
                <p className="text-[#12263F] dark:text-white">{userData?.email || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#95AAC9]">Employee Code</label>
                <p className="text-[#12263F] dark:text-white">
                  {userData?.user_metadata?.employee_code || 'Not set'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#95AAC9]">Role</label>
                <p className="text-[#12263F] dark:text-white">
                  {userData?.user_metadata?.role || 'User'}
                </p>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
            <h2 className="text-lg font-semibold text-[#12263F] dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Account Status
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#95AAC9]">Account ID</label>
                <p className="text-[#12263F] dark:text-white font-mono text-xs">
                  {userData?.id || 'Not available'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#95AAC9]">Created At</label>
                <p className="text-[#12263F] dark:text-white">
                  {userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : 'Not available'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#95AAC9]">Last Sign In</label>
                <p className="text-[#12263F] dark:text-white">
                  {userData?.last_sign_in_at ? new Date(userData.last_sign_in_at).toLocaleString() : 'Not available'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#95AAC9]">Email Verified</label>
                <p className="text-[#12263F] dark:text-white">
                  {userData?.email_confirmed_at ? (
                    <span className="text-green-600">✓ Verified</span>
                  ) : (
                    <span className="text-orange-600">Not verified</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
          <h2 className="text-lg font-semibold text-[#12263F] dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Your Permissions
          </h2>
          {userPermissions && userPermissions.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {userPermissions.map((permission: string) => (
                <div
                  key={permission}
                  className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-700 dark:text-blue-300"
                >
                  {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#95AAC9]">No permissions assigned</p>
          )}
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-gray-900 border border-[#E3E6F0] dark:border-gray-700 rounded p-6">
          <h2 className="text-lg font-semibold text-[#12263F] dark:text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5" />
            Security
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#12263F] dark:text-white">Password</p>
                <p className="text-sm text-[#95AAC9]">Last changed: Not available</p>
              </div>
              <button className="px-4 py-2 bg-[#2C7BE5] text-white text-sm rounded hover:bg-blue-600 transition-colors">
                Change Password
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#12263F] dark:text-white">Two-Factor Authentication</p>
                <p className="text-sm text-[#95AAC9]">Add an extra layer of security</p>
              </div>
              <button className="px-4 py-2 border border-[#E3E6F0] dark:border-gray-700 text-[#12263F] dark:text-white text-sm rounded hover:bg-[#F8F9FC] dark:hover:bg-gray-800 transition-colors">
                Enable 2FA
              </button>
            </div>
          </div>
        </div>
      </div>
    </ZohoLayout>
  )
}
