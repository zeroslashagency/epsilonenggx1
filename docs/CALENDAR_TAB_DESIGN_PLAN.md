# Calendar Tab - Design & Implementation Plan

## 🎯 Goal
Create a modern, interactive calendar view showing employee attendance with month/year navigation and clickable dates that display detailed information.

---

## 🎨 Design Concept 1: Minimal Modern

```
┌─────────────────────────────────────────────────────────────────┐
│  ← October 2025 →                    [2025 ▼]  [November ▼]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Mon   Tue   Wed   Thu   Fri   Sat   Sun                       │
│                    1     2     3     4     5                    │
│                   ✅    ✅    -     -     -                     │
│                                                                  │
│   6     7     8     9    10    11    12                         │
│   ✅    ⚠️    ✅    ❌    ✅    -     -                          │
│                                                                  │
│  13    14    15    16    17    18    19                         │
│   ✅    ✅    ⚠️    ✅    ✅    -     -                          │
│                                                                  │
│  20    21    22    23    24    25    26                         │
│   ✅    ✅    ✅    ⚠️    ✅    -     -                          │
│                                                                  │
│  27    28    29    30                                            │
│   ✅    ✅    ✅    ✅                                            │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Legend: ✅ Present (20)  ⚠️ Late (3)  ❌ Absent (1)  - Weekend │
│  Attendance Rate: 95% (20/21 working days)                      │
└─────────────────────────────────────────────────────────────────┘

[When clicking Nov 7 (⚠️)]
┌─────────────────────────────────────────────────────────────────┐
│  📅 November 7, 2025 (Thursday)                        [Close ✕]│
├─────────────────────────────────────────────────────────────────┤
│  Status: ⚠️ Late Arrival                                        │
│                                                                  │
│  🕐 08:45 AM - Check In (Late by 45 min)                       │
│  ⏸️  12:30 PM - Break Start                                     │
│  ▶️  01:15 PM - Break End                                       │
│  🏁 05:30 PM - Check Out                                        │
│                                                                  │
│  ⏱️  Total Hours: 7h 45m (excluding break)                      │
│  📊 Productivity: 96%                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Design Concept 2: Card-Based Modern

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Prev]  November 2025  [Next →]        Year: [2025 ▼]       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  M    T    W    T    F    S    S                               │
│                                                                  │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                            │
│ │  │ │  │ │  │ │1 │ │2 │ │3 │ │4 │                            │
│ │  │ │  │ │  │ │✅│ │✅│ │- │ │- │                            │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                            │
│                                                                  │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                            │
│ │5 │ │6 │ │7 │ │8 │ │9 │ │10│ │11│                            │
│ │✅│ │✅│ │⚠️│ │✅│ │❌│ │- │ │- │                            │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                            │
│                                                                  │
│  ... (more weeks)                                               │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 📊 Monthly Summary                                          │ │
│ │ Present: 20 days | Late: 3 days | Absent: 1 day           │ │
│ │ Attendance Rate: 95%                                        │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Design Concept 3: Heatmap Style

```
┌─────────────────────────────────────────────────────────────────┐
│  November 2025                    [← Oct] [Nov] [Dec →]        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun                             │
│                                                                  │
│   -    -    -    1    2    3    4                              │
│   ⬜   ⬜   ⬜   🟢   🟢   ⬛   ⬛                              │
│                                                                  │
│   5    6    7    8    9   10   11                              │
│   🟢   🟢   🟡   🟢   🔴   ⬛   ⬛                              │
│                                                                  │
│  12   13   14   15   16   17   18                              │
│   🟢   🟢   🟡   🟢   🟢   ⬛   ⬛                              │
│                                                                  │
│  19   20   21   22   23   24   25                              │
│   🟢   🟢   🟢   🟡   🟢   ⬛   ⬛                              │
│                                                                  │
│  26   27   28   29   30                                         │
│   🟢   🟢   🟢   🟢   🟢                                         │
│                                                                  │
│  Legend:                                                         │
│  🟢 Present (100%)  🟡 Late (75%)  🔴 Absent (0%)  ⬛ Weekend  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Design Concept 4: Modern Dashboard Style (RECOMMENDED)

```
┌─────────────────────────────────────────────────────────────────┐
│  Attendance Calendar                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Year: 2025 ▼ │  │ Month: Nov ▼ │  │ 📊 20/21 days (95%) │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  November 2025                                                   │
│                                                                  │
│  Mon    Tue    Wed    Thu    Fri    Sat    Sun                 │
│  ───    ───    ───    ───    ───    ───    ───                 │
│                        1      2      3      4                   │
│                      ┌───┐  ┌───┐  ┌───┐  ┌───┐               │
│                      │ ✅ │  │ ✅ │  │ - │  │ - │               │
│                      │ 1 │  │ 2 │  │   │  │   │               │
│                      └───┘  └───┘  └───┘  └───┘               │
│                                                                  │
│   5      6      7      8      9     10     11                  │
│  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐            │
│  │ ✅ │  │ ✅ │  │ ⚠️ │  │ ✅ │  │ ❌ │  │ - │  │ - │            │
│  │ 3 │  │ 4 │  │ 2 │  │ 4 │  │ 0 │  │   │  │   │            │
│  └───┘  └───┘  └───┘  └───┘  └───┘  └───┘  └───┘            │
│                                                                  │
│  ... (more weeks)                                               │
│                                                                  │
│  Small number = punch count for that day                        │
└─────────────────────────────────────────────────────────────────┘

[Scrollable Detail Panel - Appears when clicking a date]
┌─────────────────────────────────────────────────────────────────┐
│  📅 November 7, 2025                                   [Close ✕]│
├─────────────────────────────────────────────────────────────────┤
│  ⚠️ Late Arrival                                                │
│                                                                  │
│  Punch History:                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🕐 08:45 AM  Check In      ⚠️ Late by 45 minutes          │ │
│  │ ⏸️  12:30 PM  Break Start                                  │ │
│  │ ▶️  01:15 PM  Break End                                    │ │
│  │ 🏁 05:30 PM  Check Out                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Summary:                                                        │
│  • Total Hours: 7h 45m                                          │
│  • Break Time: 45m                                              │
│  • Working Hours: 7h 0m                                         │
│  • Status: Late Arrival                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📐 Technical Implementation Plan

### Phase 1: Calendar Grid Component (60 min)

**File:** `app/personnel/components/CalendarTab.tsx`

```tsx
interface CalendarTabProps {
  employeeCode: string
  employeeName: string
}

interface DayData {
  date: string
  status: 'present' | 'late' | 'absent' | 'weekend' | 'future'
  punchCount: number
  logs: AttendanceLog[]
}

function CalendarTab({ employeeCode, employeeName }: CalendarTabProps) {
  const [selectedYear, setSelectedYear] = useState(2025)
  const [selectedMonth, setSelectedMonth] = useState(10) // November (0-indexed)
  const [selectedDate, setSelectedDate] = useState<DayData | null>(null)
  const [calendarData, setCalendarData] = useState<DayData[]>([])
  
  // Fetch attendance data for selected month
  useEffect(() => {
    fetchMonthAttendance()
  }, [selectedYear, selectedMonth, employeeCode])
  
  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <CalendarHeader 
        year={selectedYear}
        month={selectedMonth}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
        stats={calculateMonthStats(calendarData)}
      />
      
      {/* Calendar Grid */}
      <CalendarGrid 
        data={calendarData}
        onDateClick={setSelectedDate}
        selectedDate={selectedDate}
      />
      
      {/* Detail Modal */}
      {selectedDate && (
        <DateDetailModal 
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}
```

### Phase 2: Calendar Header Component (20 min)

```tsx
function CalendarHeader({ year, month, onYearChange, onMonthChange, stats }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-xl font-bold">Attendance Calendar</h3>
      
      <div className="flex gap-3">
        {/* Year Selector */}
        <select 
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="px-4 py-2 border rounded-lg"
        >
          {[2023, 2024, 2025, 2026].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        
        {/* Month Selector */}
        <select 
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="px-4 py-2 border rounded-lg"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        
        {/* Stats Badge */}
        <div className="px-4 py-2 bg-blue-100 rounded-lg">
          📊 {stats.present}/{stats.total} days ({stats.rate}%)
        </div>
      </div>
    </div>
  )
}
```

### Phase 3: Calendar Grid Component (90 min)

```tsx
function CalendarGrid({ data, onDateClick, selectedDate }) {
  const weeks = generateWeeks(data)
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border p-6">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-2">
        {weeks.map((week, weekIdx) => (
          week.map((day, dayIdx) => (
            <CalendarDay 
              key={`${weekIdx}-${dayIdx}`}
              day={day}
              onClick={() => day && onDateClick(day)}
              isSelected={selectedDate?.date === day?.date}
            />
          ))
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Present ({data.filter(d => d.status === 'present').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span>Late ({data.filter(d => d.status === 'late').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Absent ({data.filter(d => d.status === 'absent').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <span>Weekend</span>
        </div>
      </div>
    </div>
  )
}
```

### Phase 4: Calendar Day Cell Component (30 min)

```tsx
function CalendarDay({ day, onClick, isSelected }) {
  if (!day) {
    return <div className="aspect-square"></div>
  }
  
  const statusColors = {
    present: 'bg-green-100 border-green-500 text-green-900',
    late: 'bg-yellow-100 border-yellow-500 text-yellow-900',
    absent: 'bg-red-100 border-red-500 text-red-900',
    weekend: 'bg-gray-100 border-gray-300 text-gray-500',
    future: 'bg-gray-50 border-gray-200 text-gray-400'
  }
  
  const statusIcons = {
    present: '✅',
    late: '⚠️',
    absent: '❌',
    weekend: '-',
    future: ''
  }
  
  return (
    <button
      onClick={onClick}
      className={`
        aspect-square p-2 rounded-lg border-2 transition-all
        hover:shadow-lg hover:scale-105
        ${statusColors[day.status]}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-lg font-bold">{new Date(day.date).getDate()}</div>
        <div className="text-xl">{statusIcons[day.status]}</div>
        {day.punchCount > 0 && (
          <div className="text-xs mt-1">{day.punchCount} punches</div>
        )}
      </div>
    </button>
  )
}
```

### Phase 5: Date Detail Modal (45 min)

```tsx
function DateDetailModal({ date, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">
            📅 {new Date(date.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ✕
          </button>
        </div>
        
        {/* Status Badge */}
        <div className="mb-6">
          <StatusBadge status={date.status} />
        </div>
        
        {/* Punch History */}
        <div className="space-y-3">
          <h4 className="font-semibold">Punch History:</h4>
          {date.logs.map((log, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">{getPunchIcon(log.punch_direction)}</span>
              <div className="flex-1">
                <div className="font-medium">
                  {new Date(log.log_date).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                <div className="text-sm text-gray-600">
                  {log.punch_direction === 'in' ? 'Check In' : 'Check Out'}
                </div>
              </div>
              {log.isLate && (
                <span className="text-xs text-yellow-600">⚠️ Late</span>
              )}
            </div>
          ))}
        </div>
        
        {/* Summary */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold mb-2">Summary:</h4>
          <ul className="space-y-1 text-sm">
            <li>• Total Hours: {calculateTotalHours(date.logs)}</li>
            <li>• Punch Count: {date.punchCount}</li>
            <li>• Status: {date.status}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
```

---

## ✅ Implementation Checklist

### Phase 1: Setup (15 min)
- [ ] Create CalendarTab.tsx component file
- [ ] Add necessary imports and interfaces
- [ ] Set up state management

### Phase 2: Data Fetching (30 min)
- [ ] Create API endpoint to fetch monthly attendance
- [ ] Process data into calendar format
- [ ] Calculate day statuses (present/late/absent)
- [ ] Handle weekends and future dates

### Phase 3: Calendar Grid (60 min)
- [ ] Build calendar header with month/year selectors
- [ ] Create day grid layout (7 columns)
- [ ] Generate weeks array with proper dates
- [ ] Add day cells with status colors

### Phase 4: Interactivity (45 min)
- [ ] Add click handlers to day cells
- [ ] Create detail modal component
- [ ] Show punch logs for selected date
- [ ] Add close functionality

### Phase 5: Styling & Polish (30 min)
- [ ] Add hover effects
- [ ] Implement responsive design
- [ ] Add loading states
- [ ] Add empty states

**Total Estimated Time:** 3 hours

---

## 🎨 Color Scheme

**Status Colors:**
- Present: Green (#10B981)
- Late: Yellow/Orange (#F59E0B)
- Absent: Red (#EF4444)
- Weekend: Gray (#9CA3AF)
- Future: Light Gray (#E5E7EB)

**Interactive States:**
- Hover: Shadow + Scale
- Selected: Blue ring
- Active: Darker shade

---

## 🚀 AWAITING YOUR APPROVAL

**Which design concept do you prefer?**

1. **Concept 1:** Minimal Modern (simple icons)
2. **Concept 2:** Card-Based (boxed days)
3. **Concept 3:** Heatmap Style (color intensity)
4. **Concept 4:** Dashboard Style (with punch counts) ⭐ RECOMMENDED

**Or would you like me to combine elements from different concepts?**

Once approved, I'll start building the calendar tab!
