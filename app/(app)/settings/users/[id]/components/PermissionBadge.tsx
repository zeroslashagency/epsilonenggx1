import React from 'react'
import { PermissionLevel } from '@/app/lib/utils/permission-levels'

interface PermissionBadgeProps {
  level: PermissionLevel
  className?: string
}

export function PermissionBadge({ level, className = '' }: PermissionBadgeProps) {
  const getBadgeStyles = () => {
    switch (level) {
      case 'full':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
      case 'edit':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      case 'view':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'access':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
      case 'none':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
    }
  }
  
  const getBadgeText = () => {
    switch (level) {
      case 'full':
        return 'Full'
      case 'edit':
        return 'Edit'
      case 'view':
        return 'View'
      case 'access':
        return 'Access'
      case 'none':
        return 'None'
      default:
        return 'None'
    }
  }
  
  return (
    <span 
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getBadgeStyles()} ${className}`}
      title={`Access level: ${getBadgeText()}`}
    >
      {getBadgeText()}
    </span>
  )
}
