# 📋 PERSONNEL PAGE - RECENT ATTENDANCE RECORDS (SIMPLIFIED)

**Date:** 2025-11-02 05:27 IST  
**Request:** Add "Recent Attendance Records" table with **ONLY Date and Check In columns**  
**Status:** AWAITING USER APPROVAL

---

## 🎯 OBJECTIVE

**Add simplified "Recent Attendance Records" table to Personnel page**

**Columns:** 
- ✅ Date (with "Yesterday", "Today" formatting)
- ✅ Check In (with green clock icon)
- ❌ NO Check Out column
- ❌ NO Status column  
- ❌ NO ✓ column

**Position:** Below "Attendance Summary" section  
**Style:** Dark theme table  
**Data:** Selected employee's attendance records

---

## 📋 SIMPLIFIED TABLE DESIGN

### 2-Column Table
```
┌─────────────────────────────────────────────────┐
│ 📋 Recent Attendance Records                    │
├──────────────────┬─────────────────────────────┤
│ Date             │ Check In                    │
├──────────────────┼─────────────────────────────┤
│ Yesterday        │ 🕐 00:00                    │
│ Nov 1, 2025      │                             │
├──────────────────┼─────────────────────────────┤
│ Fri, Oct 31      │ 🕐 00:00                    │
│ Oct 31, 2025     │                             │
├──────────────────┼─────────────────────────────┤
│ Thu, Oct 30      │ 🕐 00:00                    │
│ Oct 30, 2025     │                             │
├──────────────────┼─────────────────────────────┤
│ Wed, Oct 29      │ 🕐 00:00                    │
│ Oct 29, 2025     │                             │
└──────────────────┴─────────────────────────────┘
```

### Features
- **2 columns only:** Date + Check In
- **Dark theme:** Black/dark blue background
- **Date formatting:** "Yesterday", "Today", or day name
- **Full date:** Shows full date below day name
- **Green clock icon:** 🕐 before check-in time
- **Clickable rows:** Opens Day Details modal
- **Hover effect:** Row highlights on hover

---

## 🎨 COMPONENT CODE

### RecentAttendanceRecords.tsx
```tsx
"use client"

import { useState, useEffect } from 'react'
import { apiGet } from '@/app/lib/utils/api-client'
import { DayDetailsModal } from './DayDetailsModal'

interface RecentAttendanceRecordsProps {
  employeeCode: string
  employeeName: string
  dateRange: string
  loading?: boolean
}

export function RecentAttendanceRecords({
  employeeCode,
  employeeName,
  dateRange,
  loading
}: RecentAttendanceRecordsProps) {
  const [records, setRecords] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (employeeCode) {
      fetchRecords()
    }
  }, [employeeCode, dateRange])

  const fetchRecords = async () => {
    // Fetch employee attendance data
    // Group by date
    // Process into records array
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  return (
    <>
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            📋 Recent Attendance Records
          </h3>
        </div>
        
        {loadingData ? (
          <div className="p-12 text-center">
            <div className="text-gray-400">Loading records...</div>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400">No attendance records found</div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">
                  Date
                </th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">
                  Check In
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => (
                <tr 
                  key={idx}
                  onClick={() => setSelectedDay(record)}
                  className="border-t border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">
                      {formatDate(record.date)}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {formatFullDate(record.date)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {record.firstCheckIn && (
                      <span className="text-green-400 flex items-center gap-2">
                        🕐 {formatTime(record.firstCheckIn)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedDay && (
        <DayDetailsModal
          date={selectedDay.date}
          employeeName={employeeName}
          logs={selectedDay.allLogs}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  )
}
```

---

## 📅 DAY DETAILS MODAL

### DayDetailsModal.tsx
```tsx
"use client"

interface DayDetailsModalProps {
  date: Date
  employeeName: string
  logs: any[]
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
      hour12: true
    })
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            📅 Day Details
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>
        
        {/* Date */}
        <div className="mb-6">
          <div className="text-lg text-white mb-2">
            {formatFullDate(date)}
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-500 text-white rounded text-sm">
              present
            </span>
            <span className="text-green-400 text-sm">high confidence</span>
          </div>
        </div>
        
        {/* Work Summary */}
        <div className="mb-6">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
            ⏱️ Work Summary
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-400 text-sm">Total Work Time</div>
              <div className="text-white text-lg">0:00</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Intervals</div>
              <div className="text-white text-lg">0</div>
            </div>
          </div>
        </div>
        
        {/* Work Intervals */}
        <div className="mb-6">
          <h4 className="text-white font-semibold mb-3">Work Intervals</h4>
          <div className="text-gray-400 text-sm">
            No work intervals recorded
          </div>
        </div>
        
        {/* Punch Events */}
        <div>
          <h4 className="text-white font-semibold mb-3">Punch Events</h4>
          <div className="space-y-2">
            {logs.map((log, idx) => (
              <div 
                key={idx}
                className="bg-gray-800 rounded p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-green-400">
                    🟢 {log.punch_direction?.toUpperCase()}
                  </span>
                  <span className="text-white">
                    {formatTime(log.log_date)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">
                    Device: device-1
                  </span>
                  <span className="text-green-400 text-sm">high</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 📁 FILES TO CREATE

### New Files
1. `/components/RecentAttendanceRecords.tsx` - Simplified 2-column table
2. `/components/DayDetailsModal.tsx` - Modal component

### Modified Files
1. `/app/personnel/page.tsx` - Add table below Attendance Summary

---

## 🔧 INTEGRATION

### Add to Personnel Page (After Stats Grid)
```tsx
{/* Summary Stats Grid */}
<div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E3E6F0] dark:border-gray-700">
  {/* ... existing stats ... */}
</div>

{/* NEW: Recent Attendance Records (2 columns only) */}
<div className="mt-6">
  <RecentAttendanceRecords 
    employeeCode={selectedEmployee.employee_code}
    employeeName={selectedEmployee.full_name}
    dateRange={getDateRangeLabel()}
    loading={loadingStats}
  />
</div>
```

---

## ⏱️ IMPLEMENTATION TIME

**Estimated:** ~60 minutes
- RecentAttendanceRecords component: 20 min
- DayDetailsModal component: 15 min
- Data processing: 10 min
- Dark theme styling: 10 min
- Integration: 5 min

**Complexity:** Low (simple 2-column table)

---

## ✅ SUCCESS CRITERIA

**Table is successful when:**
1. ✅ Shows below Attendance Summary section
2. ✅ Dark theme styling
3. ✅ **ONLY 2 columns:** Date + Check In
4. ✅ Date shows "Yesterday", "Today", or day name
5. ✅ Full date shown below day name
6. ✅ Green clock icon before check-in time
7. ✅ Rows are clickable
8. ✅ Day Details modal opens on click
9. ✅ Modal shows all punch events
10. ✅ **NO Check Out column**
11. ✅ **NO Status column**
12. ✅ **NO ✓ column**

---

## 🎯 FINAL SUMMARY

**What:** Add "Recent Attendance Records" table (2 columns only)  
**Columns:** Date + Check In  
**Where:** Below Attendance Summary section  
**Style:** Dark theme  
**Features:** Clickable rows, Day Details modal  
**Time:** ~60 minutes  

---

## ✅ AWAITING USER APPROVAL

**Please confirm:**
1. ✅ 2 columns only (Date + Check In) - correct?
2. ✅ NO Check Out, Status, or ✓ columns - correct?
3. ✅ Dark theme styling - correct?
4. ✅ Clickable rows with Day Details modal - correct?

**Once approved, I will:**
1. Create `RecentAttendanceRecords.tsx` (2-column table)
2. Create `DayDetailsModal.tsx` (modal)
3. Integrate into personnel page
4. Test with employee data
5. Show you the result

---

**Plan Created:** 2025-11-02 05:27 IST  
**Status:** Ready for implementation  
**Awaiting:** User approval
