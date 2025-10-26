"use client"

import { ReactNode } from 'react'

interface ZohoCardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
}

export function ZohoCard({
  children,
  title,
  subtitle,
  actions,
  className = '',
  padding = 'md',
  hoverable = false
}: ZohoCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div
      className={`
        bg-white dark:bg-gray-800
        border border-[#E3E6F0] dark:border-gray-700
        rounded-[4px]
        ${hoverable ? 'hover:bg-[#F8F9FC] dark:hover:bg-gray-750 transition-colors duration-200' : ''}
        ${className}
      `}
    >
      {(title || subtitle || actions) && (
        <div className={`flex items-start justify-between border-b border-gray-200 dark:border-gray-700 ${paddingClasses[padding]}`}>
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
    </div>
  )
}

interface ZohoStatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon?: ReactNode
  iconBg?: string
}

export function ZohoStatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  iconBg = 'bg-blue-100 dark:bg-blue-900/20'
}: ZohoStatCardProps) {
  const changeColors = {
    increase: 'text-green-600 dark:text-green-400',
    decrease: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400'
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {value}
          </p>
          {change && (
            <p className={`text-sm font-medium mt-2 ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${iconBg}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
