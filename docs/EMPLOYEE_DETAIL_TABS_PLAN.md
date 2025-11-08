# Employee Detail Page - Tab Navigation Plan

## 🎯 Goal
Add a tab navigation system below the hero stats cards to organize employee information into different sections.

---

## 📑 Tab Structure

### Proposed Tabs:

1. **Overview** (Default)
   - Current attendance summary
   - Recent attendance records table
   - Performance metrics (already exists)

2. **Activity**
   - Detailed punch logs
   - Daily activity timeline
   - Check-in/check-out history

3. **Calendar**
   - Monthly calendar view
   - Visual attendance heatmap
   - Mark present/absent/late days

4. **History**
   - Historical attendance data
   - Past months comparison
   - Trends over time

5. **Reports**
   - Downloadable reports
   - Custom date range selection
   - Export options (PDF, Excel)

6. **Employee Feedback**
   - Performance reviews
   - Manager comments
   - Employee notes

7. **Gamified Attendance**
   - Attendance streaks
   - Badges/achievements
   - Leaderboard position
   - Points system

8. **Shift Management**
   - Assigned shifts
   - Shift schedule
   - Shift swap requests

9. **Leave & Overtime**
   - Leave balance
   - Leave requests
   - Overtime hours
   - Compensatory off

10. **Trends & Heatmaps**
    - Attendance patterns
    - Weekly/monthly heatmaps
    - Performance graphs
    - Punctuality trends

---

## 🎨 Design Specifications

### Tab Navigation Bar

```
┌─────────────────────────────────────────────────────────────────┐
│  [Overview] [Activity] [Calendar] [History] [Reports] [More ▼] │
└─────────────────────────────────────────────────────────────────┘
```

**Styling:**
- Background: White/Dark gray card
- Active tab: Blue underline + blue text
- Inactive tabs: Gray text
- Hover: Light gray background
- Border bottom: Light gray separator

**Responsive:**
- Desktop: Show first 5-6 tabs, rest in "More" dropdown
- Tablet: Show first 3-4 tabs
- Mobile: Horizontal scroll or dropdown menu

---

## 📐 Implementation Plan

### Phase 1: Basic Tab Structure (30 min)
- [ ] Create tab navigation component
- [ ] Add state management for active tab
- [ ] Style tab buttons
- [ ] Add active/inactive states

### Phase 2: Overview Tab (Already Exists) (15 min)
- [ ] Move existing content to Overview tab
- [ ] Attendance summary
- [ ] Recent records table
- [ ] Performance metrics

### Phase 3: Activity Tab (45 min)
- [ ] Create activity timeline component
- [ ] Show detailed punch logs
- [ ] Group by date
- [ ] Show check-in/check-out times
- [ ] Add status indicators (on-time, late, early)

### Phase 4: Calendar Tab (60 min)
- [ ] Create calendar grid component
- [ ] Show current month
- [ ] Color-code days (present=green, absent=red, late=yellow)
- [ ] Add month navigation
- [ ] Show attendance percentage for month

### Phase 5: History Tab (45 min)
- [ ] Create historical data view
- [ ] Month selector dropdown
- [ ] Show past months data
- [ ] Comparison charts
- [ ] Trend indicators

### Phase 6: Reports Tab (30 min)
- [ ] Date range picker
- [ ] Export buttons (Excel, PDF)
- [ ] Report preview
- [ ] Custom filters

### Phase 7: Advanced Features (Later)
- [ ] Employee Feedback section
- [ ] Gamification system
- [ ] Shift management
- [ ] Leave & overtime tracking
- [ ] Trend graphs & heatmaps

---

## 🔧 Technical Implementation

### File Structure
```
app/personnel/
  ├── page.tsx (main page)
  └── components/
      ├── EmployeeDetailTabs.tsx (NEW - tab navigation)
      ├── tabs/
      │   ├── OverviewTab.tsx (NEW - existing content)
      │   ├── ActivityTab.tsx (NEW)
      │   ├── CalendarTab.tsx (NEW)
      │   ├── HistoryTab.tsx (NEW)
      │   ├── ReportsTab.tsx (NEW)
      │   ├── FeedbackTab.tsx (NEW - future)
      │   ├── GamificationTab.tsx (NEW - future)
      │   ├── ShiftTab.tsx (NEW - future)
      │   ├── LeaveTab.tsx (NEW - future)
      │   └── TrendsTab.tsx (NEW - future)
      └── ... (existing components)
```

### Component Structure

```tsx
// EmployeeDetailTabs.tsx
interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  component: React.ComponentType<any>
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', component: OverviewTab },
  { id: 'activity', label: 'Activity', component: ActivityTab },
  { id: 'calendar', label: 'Calendar', component: CalendarTab },
  { id: 'history', label: 'History', component: HistoryTab },
  { id: 'reports', label: 'Reports', component: ReportsTab },
  // ... more tabs
]

function EmployeeDetailTabs({ employee, attendanceData }) {
  const [activeTab, setActiveTab] = useState('overview')
  
  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'active' : ''}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="p-6">
        {tabs.find(t => t.id === activeTab)?.component({ employee, attendanceData })}
      </div>
    </div>
  )
}
```

---

## 🎨 Tab Content Mockups

### 1. Overview Tab (Current View)
- Attendance summary section
- Recent attendance records table
- Performance metrics

### 2. Activity Tab
```
┌─────────────────────────────────────────────────────────────────┐
│  📅 November 7, 2025                                             │
│  ✅ 08:13 AM - Check In (On Time)                               │
│  ⏸️  12:30 PM - Break Start                                      │
│  ▶️  01:15 PM - Break End                                        │
│  🏁 05:45 PM - Check Out                                         │
│  ⏱️  Total: 8h 32m                                               │
├─────────────────────────────────────────────────────────────────┤
│  📅 November 6, 2025                                             │
│  ⚠️  09:15 AM - Check In (Late)                                 │
│  ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Calendar Tab
```
┌─────────────────────────────────────────────────────────────────┐
│  ← November 2025 →                          Attendance: 95%     │
│                                                                  │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun                             │
│        1    2    3    4    5    6                               │
│   ✅   ✅   ⚠️   ✅   ✅   -    -                                │
│                                                                  │
│   7    8    9   10   11   12   13                              │
│   ✅   ❌   ✅   ✅   ⚠️   -    -                                │
│                                                                  │
│  Legend: ✅ Present  ⚠️ Late  ❌ Absent  - Weekend              │
└─────────────────────────────────────────────────────────────────┘
```

### 4. History Tab
```
┌─────────────────────────────────────────────────────────────────┐
│  Select Month: [November 2025 ▼]                                │
│                                                                  │
│  October 2025:  22/23 days (96%)  ↑ +2%                        │
│  September 2025: 20/22 days (91%)  ↓ -3%                       │
│  August 2025:   21/23 days (91%)  →                            │
│                                                                  │
│  [View Detailed Report]                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Reports Tab
```
┌─────────────────────────────────────────────────────────────────┐
│  Generate Report                                                 │
│                                                                  │
│  From: [Nov 1, 2025]  To: [Nov 30, 2025]                       │
│                                                                  │
│  Include:                                                        │
│  ☑ Attendance Summary                                           │
│  ☑ Punch Logs                                                   │
│  ☑ Late Arrivals                                                │
│  ☑ Performance Metrics                                          │
│                                                                  │
│  [📄 Export PDF]  [📊 Export Excel]                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Priority Implementation Order

### Immediate (Phase 1-3):
1. ✅ Tab navigation structure
2. ✅ Overview tab (move existing content)
3. ✅ Activity tab (detailed logs)

### Short-term (Phase 4-6):
4. Calendar view
5. History view
6. Reports section

### Future Enhancements:
7. Employee Feedback
8. Gamification
9. Shift Management
10. Leave & Overtime
11. Trends & Heatmaps

---

## 🚀 Next Steps

**AWAITING YOUR APPROVAL:**

Should I proceed with:
1. **Phase 1:** Create basic tab navigation structure?
2. **Phase 2:** Move existing content to Overview tab?
3. **Phase 3:** Build Activity tab with detailed punch logs?

Or would you like me to adjust the plan first?
