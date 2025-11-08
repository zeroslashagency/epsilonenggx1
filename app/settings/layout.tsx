"use client"

import { User, UserPlus, Shield, Zap } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ZohoLayout } from '../components/zoho-ui/ZohoLayout'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <ZohoLayout breadcrumbs={[]}>
      {/* Persistent Tab Navigation */}
      <div className="bg-white dark:bg-gray-900 border-b border-[#E3E6F0] dark:border-gray-700 -mx-6 -mt-6 mb-6 overflow-x-auto">
        <div className="flex items-center gap-2 px-4 sm:px-6 min-w-max">
          <Link 
            href="/settings/users" 
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm transition-colors border-b-2 whitespace-nowrap ${
              isActive('/settings/users')
                ? 'text-white bg-[#00A651] rounded-t border-[#00A651]'
                : 'text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] border-transparent'
            }`}
          >
            <User className="w-4 h-4 flex-shrink-0" />
            User Management
          </Link>
          <Link 
            href="/settings/add-users" 
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm transition-colors border-b-2 whitespace-nowrap ${
              isActive('/settings/add-users')
                ? 'text-white bg-[#00A651] rounded-t border-[#00A651]'
                : 'text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] border-transparent'
            }`}
          >
            <UserPlus className="w-4 h-4 flex-shrink-0" />
            Add Users
          </Link>
          <Link 
            href="/settings/roles" 
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm transition-colors border-b-2 whitespace-nowrap ${
              isActive('/settings/roles')
                ? 'text-white bg-[#00A651] rounded-t border-[#00A651]'
                : 'text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] border-transparent'
            }`}
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            Role Profiles
          </Link>
          <Link 
            href="/settings/activity-logs" 
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm transition-colors border-b-2 whitespace-nowrap ${
              isActive('/settings/activity-logs')
                ? 'text-white bg-[#00A651] rounded-t border-[#00A651]'
                : 'text-[#12263F] dark:text-gray-300 hover:text-[#2C7BE5] border-transparent'
            }`}
          >
            <Zap className="w-4 h-4 flex-shrink-0" />
            Activity Logging
          </Link>
        </div>
      </div>

      {/* Page Content */}
      {children}
    </ZohoLayout>
  )
}
