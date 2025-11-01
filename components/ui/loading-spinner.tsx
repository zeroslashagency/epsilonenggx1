import React from 'react'

interface LoadingSpinnerProps {
  text?: string
  size?: 'small' | 'medium' | 'large'
  fullScreen?: boolean
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  text = 'Loading...', 
  size = 'medium',
  fullScreen = false 
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  }

  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50'
    : 'flex items-center justify-center py-12'

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative">
          <div className={`${sizeClasses[size]} rounded-full border-4 border-gray-200 dark:border-gray-700`}></div>
          <div className={`${sizeClasses[size]} rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-500 animate-spin absolute top-0 left-0`}></div>
        </div>
        
        {/* Loading Text with Animated Dots */}
        <div className="flex items-center gap-1">
          <span className="text-gray-600 dark:text-gray-400 font-medium">{text}</span>
          <span className="flex gap-1">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
          </span>
        </div>
      </div>
    </div>
  )
}

// Table Loading Component (for use inside tables)
export const TableLoading: React.FC<{ colSpan: number; text?: string }> = ({ 
  colSpan, 
  text = 'Loading...' 
}) => {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-12">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
            <div className="w-10 h-10 rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-500 animate-spin absolute top-0 left-0"></div>
          </div>
          
          {/* Loading Text */}
          <div className="flex items-center gap-1">
            <span className="text-gray-600 dark:text-gray-400 font-medium">{text}</span>
            <span className="flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
            </span>
          </div>
        </div>
      </td>
    </tr>
  )
}
