"use client"

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface ZohoButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export function ZohoButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ZohoButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `

  const variants = {
    primary: `
      bg-[#2C7BE5] hover:bg-[#1a6fd4] active:bg-[#0d5bb8]
      text-white
      focus:ring-[#2C7BE5]
      shadow-none
      dark:bg-[#2C7BE5] dark:hover:bg-[#1a6fd4]
    `,
    secondary: `
      bg-white hover:bg-[#F8F9FC] active:bg-[#E3E6F0]
      text-[#12263F]
      border border-[#E3E6F0]
      focus:ring-[#2C7BE5]
      shadow-none
      dark:bg-gray-800 dark:hover:bg-gray-700
      dark:text-gray-200 dark:border-gray-600
    `,
    danger: `
      bg-[#DC3545] hover:bg-[#c82333] active:bg-[#bd2130]
      text-white
      focus:ring-[#DC3545]
      shadow-none
      dark:bg-[#DC3545] dark:hover:bg-[#c82333]
    `,
    ghost: `
      bg-transparent hover:bg-[#F8F9FC] active:bg-[#E3E6F0]
      text-[#95AAC9]
      focus:ring-[#2C7BE5]
      shadow-none
      dark:hover:bg-gray-800
      dark:text-gray-400
    `,
    success: `
      bg-[#28A745] hover:bg-[#218838] active:bg-[#1e7e34]
      text-white
      focus:ring-[#28A745]
      shadow-none
      dark:bg-[#28A745] dark:hover:bg-[#218838]
    `
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5'
  }

  return (
    <button
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  )
}
