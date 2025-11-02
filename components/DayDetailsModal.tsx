"use client"

interface AttendanceLog {
  log_date: string
  punch_direction: string
  employee_code: string
  employee_name?: string
}

interface DayDetailsModalProps {
  date: Date
  employeeName: string
  logs: AttendanceLog[]
  onClose: () => void
}

export function DayDetailsModal({
  date,
  employeeName,
  logs,
  onClose
}: DayDetailsModalProps) {
  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const d = new Date(dateString)
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const calculateWorkTime = () => {
    // Simple calculation: if there are pairs of in/out, calculate time
    // For now, return 0:00 as placeholder
    return '0:00'
  }

  const countIntervals = () => {
    // Count pairs of check-in/check-out
    return 0
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 dark:bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-xl border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📅 Day Details
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>
        
        {/* Date */}
        <div className="mb-6">
          <div className="text-lg text-gray-900 dark:text-white mb-2">
            {formatFullDate(date)}
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-500 text-white rounded text-sm">
              present
            </span>
            <span className="text-green-600 dark:text-green-400 text-sm">high confidence</span>
          </div>
        </div>
        
        {/* Work Summary */}
        <div className="mb-6">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-3 flex items-center gap-2">
            ⏱️ Work Summary
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">Total Work Time</div>
              <div className="text-gray-900 dark:text-white text-lg">{calculateWorkTime()}</div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">Intervals</div>
              <div className="text-gray-900 dark:text-white text-lg">{countIntervals()}</div>
            </div>
          </div>
        </div>
        
        {/* Work Intervals */}
        <div className="mb-6">
          <h4 className="text-gray-900 dark:text-white font-semibold mb-3">Work Intervals</h4>
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            No work intervals recorded
          </div>
        </div>
        
        {/* Punch Events */}
        <div>
          <h4 className="text-gray-900 dark:text-white font-semibold mb-3">Punch Events</h4>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-gray-600 dark:text-gray-400 text-sm">No punch events recorded</div>
            ) : (
              logs.map((log, idx) => (
                <div 
                  key={idx}
                  className="bg-gray-100 dark:bg-gray-800 rounded p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className={`${log.punch_direction?.toLowerCase() === 'in' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {log.punch_direction?.toLowerCase() === 'in' ? '🟢' : '🔴'} {log.punch_direction?.toUpperCase()}
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {formatTime(log.log_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      Device: device-1
                    </span>
                    <span className="text-green-600 dark:text-green-400 text-sm">high</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
