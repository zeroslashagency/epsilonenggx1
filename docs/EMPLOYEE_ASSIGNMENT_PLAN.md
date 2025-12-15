# 👥 EMPLOYEE ASSIGNMENT INTERFACE - DETAILED PLAN

## 🎯 OBJECTIVE
Create a powerful employee assignment interface where admins can:
- View all employees in a list
- Filter by department, role, status
- Select multiple employees (bulk selection)
- Assign shifts/rotations to selected group
- Customize assignments per employee

---

## 📋 FEATURE BREAKDOWN

### **1. FILTER BAR (Top Section)**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Search: [____________]  Department: [All ▼]  Role: [All ▼]  │
│ Status: [All ▼]  Shift: [All ▼]  [Clear Filters] [Select All]  │
└─────────────────────────────────────────────────────────────────┘
```

**Filter Options:**

1. **Search Bar**
   - Search by name or employee code
   - Real-time filtering

2. **Department Filter**
   - All
   - Production
   - Admin
   - Supervisor
   - Quality Control
   - Maintenance

3. **Role Filter**
   - All
   - Operator
   - Supervisor
   - Manager
   - Admin

4. **Status Filter**
   - All
   - Active
   - On Leave
   - Inactive

5. **Current Shift Filter**
   - All
   - Morning Shift
   - Afternoon Shift
   - Night Shift
   - Rotational
   - Unassigned

6. **Quick Actions**
   - Clear All Filters
   - Select All (visible employees)
   - Deselect All

---

### **2. EMPLOYEE LIST (Main Section)**

```
┌─────────────────────────────────────────────────────────────────┐
│ ☐ Select All (52 employees)                    [Bulk Actions ▼]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ☑ nandhini (EE001)                                         [⋮]  │
│   Account & Admin | General Shift No.1 (9:00 AM - 6:00 PM)      │
│   ■ #DFF0D8                                                      │
│                                                                  │
│ ☑ Ramakrishnan (EE002)                                     [⋮]  │
│   Supervisor | General Shift No.2 (9:00 AM - 7:00 PM)           │
│   ■ #D9EDF7                                                      │
│                                                                  │
│ ☐ mustaq (EE003)                                           [⋮]  │
│   Supervisor | General Shift No.2 (9:00 AM - 7:00 PM)           │
│   ■ #D9EDF7                                                      │
│                                                                  │
│ ☑ Athul (EE004)                                            [⋮]  │
│   Production | Rotational No.1 (4-week rotation)                │
│   ■ #D4EDDA | Currently: Week 2 (2PM-12AM) 🌙                   │
│                                                                  │
│ ☐ Badal (EE005)                                            [⋮]  │
│   Production | Rotational No.2 (3-week rotation)                │
│   ■ #F8D7DA | Currently: Week 2 (6PM-6AM) 🌙                    │
│                                                                  │
│ ... (47 more employees)                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Employee Card Features:**
- ☑ Checkbox for selection
- Employee name & code
- Department & role
- Current shift assignment
- Color indicator
- Current week/pattern (for rotations)
- Overnight indicator (🌙)
- Quick actions menu (⋮)

---

### **3. BULK ACTION PANEL (Bottom/Sticky)**

**When employees are selected:**

```
┌─────────────────────────────────────────────────────────────────┐
│ ✓ 3 employees selected                                          │
│ [Assign Shift ▼] [Assign Rotation ▼] [Mark Leave] [Remove]     │
└─────────────────────────────────────────────────────────────────┘
```

**Actions Available:**

1. **Assign Fixed Shift**
   - Morning Shift (6:00 AM - 2:00 PM)
   - Afternoon Shift (2:00 PM - 10:00 PM)
   - Night Shift (10:00 PM - 6:00 AM)
   - General Shift No.1 (9:00 AM - 6:00 PM)
   - General Shift No.2 (9:00 AM - 7:00 PM)
   - Custom...

2. **Assign Rotation Profile**
   - 2-Week Rotation A/B
   - 4-Week Rotational Pattern
   - 3-Week Rotational Pattern
   - Create New Rotation...

3. **Mark Leave**
   - Sick Leave
   - Casual Leave
   - Vacation
   - Unpaid Leave
   - Custom...

4. **Remove Assignment**
   - Remove current shift
   - Mark as unassigned

5. **Export Selected**
   - Export to CSV
   - Export to PDF
   - Print roster

---

### **4. ASSIGNMENT MODAL (When Action Clicked)**

**Example: Assign Shift Modal**

```
┌────────────────────────────────────────────────────────────────┐
│ Assign Shift to Selected Employees (3)                    [✕] │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Selected Employees:                                             │
│ • nandhini (EE001) - Account & Admin                           │
│ • Ramakrishnan (EE002) - Supervisor                            │
│ • Athul (EE004) - Production                                   │
│                                                                 │
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│ Assignment Type:                                                │
│ ● Fixed Shift    ○ Rotation Profile                            │
│                                                                 │
│ Select Shift Template:                                          │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ General Shift No.1 (9:00 AM - 6:00 PM)              [▼]  │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Available Templates:                                            │
│ • General Shift No.1 (9:00 AM - 6:00 PM) - 9 hrs              │
│ • General Shift No.2 (9:00 AM - 7:00 PM) - 10 hrs             │
│ • Morning Shift (6:00 AM - 2:00 PM) - 8 hrs                   │
│ • Afternoon Shift (2:00 PM - 10:00 PM) - 8 hrs                │
│ • Night Shift (10:00 PM - 6:00 AM) - 8 hrs                    │
│                                                                 │
│ Assignment Period:                                              │
│ Start Date: [📅 Nov 12, 2025]  End Date: [📅 Feb 1, 2026]     │
│ ☐ Indefinite assignment                                        │
│                                                                 │
│ ☑ Send email notification to employees                         │
│ ☑ Create calendar invites                                      │
│                                                                 │
│                              [Cancel]  [Assign to All (3)]     │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

### **5. CUSTOMIZATION OPTIONS**

**Per-Employee Customization:**

When you click the menu (⋮) on individual employee:

```
┌─────────────────────────────┐
│ Quick Actions               │
├─────────────────────────────┤
│ ✏️  Edit Assignment          │
│ 🔄 Change Shift              │
│ 📅 Override for Date         │
│ 🏖️  Mark Leave               │
│ 📊 View Schedule             │
│ 🗑️  Remove Assignment        │
└─────────────────────────────┘
```

**Bulk Customization:**

For selected employees, you can:
- Apply same shift to all
- Apply different shifts per employee
- Set individual start/end dates
- Add exceptions for specific dates
- Copy assignments from another employee

---

## 🎨 UI LAYOUT

### **Desktop View (1920x1080)**

```
┌─────────────────────────────────────────────────────────────────┐
│ Employee Assignment Manager                    [Export] [Save]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ FILTER BAR                                                │   │
│ │ 🔍 Search  | Department | Role | Status | Shift          │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ EMPLOYEE LIST (52 employees)                             │   │
│ │ ☐ Select All                          [Bulk Actions ▼]   │   │
│ │ ─────────────────────────────────────────────────────    │   │
│ │ ☑ Employee 1                                        [⋮]  │   │
│ │ ☑ Employee 2                                        [⋮]  │   │
│ │ ☐ Employee 3                                        [⋮]  │   │
│ │ ☑ Employee 4                                        [⋮]  │   │
│ │ ...                                                       │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ BULK ACTION PANEL (Sticky Bottom)                        │   │
│ │ ✓ 3 selected | [Assign Shift] [Assign Rotation] [Leave] │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### **Mobile View (375x667)**

```
┌─────────────────────────────┐
│ ← Assignment Manager        │
├─────────────────────────────┤
│ 🔍 Search...                │
│ [Filters ▼] [3 selected]    │
├─────────────────────────────┤
│                             │
│ ☑ nandhini (EE001)     [⋮]  │
│   Admin | Gen. Shift No.1   │
│   ■ #DFF0D8                 │
│                             │
│ ☑ Ramakrishnan (EE002) [⋮]  │
│   Supervisor | Gen. No.2    │
│   ■ #D9EDF7                 │
│                             │
│ ☐ mustaq (EE003)       [⋮]  │
│   Supervisor | Gen. No.2    │
│   ■ #D9EDF7                 │
│                             │
│ (Scroll for more...)        │
│                             │
├─────────────────────────────┤
│ ✓ 2 selected                │
│ [Assign Shift ▼]            │
└─────────────────────────────┘
```

---

## ⚡ WORKFLOW EXAMPLES

### **Example 1: Assign Morning Shift to Production Team**

1. Filter: Department = "Production"
2. Click "Select All" (15 employees selected)
3. Click "Assign Shift" → Select "Morning Shift (6:00 AM - 2:00 PM)"
4. Set start date: Nov 12, 2025
5. Click "Assign to All (15)"
6. ✅ All 15 production employees now on morning shift

### **Example 2: Assign 4-Week Rotation to Specific Employees**

1. Search: "Athul"
2. Check: Athul, Deepak, Kumar (3 selected)
3. Click "Assign Rotation" → Select "4-Week Rotational Pattern"
4. Set anchor date: Nov 3, 2025
5. Click "Assign to All (3)"
6. ✅ All 3 employees now on 4-week rotation

### **Example 3: Mark Leave for Multiple Employees**

1. Filter: Department = "Admin"
2. Select: nandhini, Employee X (2 selected)
3. Click "Mark Leave" → Select "Vacation"
4. Set dates: Dec 20-27, 2025
5. Click "Apply"
6. ✅ Both employees marked on vacation

---

## 🔧 TECHNICAL FEATURES

### **Smart Features:**
- ✅ Real-time filtering
- ✅ Conflict detection (overlapping shifts)
- ✅ Validation (rest periods, overtime limits)
- ✅ Undo/Redo support
- ✅ Auto-save drafts
- ✅ Bulk operations with progress indicator
- ✅ Export selected employees
- ✅ Import assignments from CSV

### **Performance:**
- Virtualized list (handle 1000+ employees)
- Debounced search
- Optimistic UI updates
- Background sync

---

## 📊 DATA STRUCTURE

```typescript
interface Employee {
  id: string
  code: string
  name: string
  department: string
  role: string
  status: 'active' | 'on_leave' | 'inactive'
  currentAssignment?: {
    type: 'fixed' | 'rotation'
    shiftId?: string
    rotationId?: string
    startDate: string
    endDate?: string
    currentWeek?: number
  }
}

interface BulkAssignment {
  employeeIds: string[]
  assignmentType: 'fixed' | 'rotation'
  templateId?: string
  rotationId?: string
  startDate: string
  endDate?: string
  sendNotifications: boolean
  createCalendarInvites: boolean
}
```

---

## ✅ APPROVAL CHECKLIST

Please review and approve:

- [ ] **Filter Bar Design** - Search + 5 filter dropdowns
- [ ] **Employee List** - Cards with checkboxes, current assignment
- [ ] **Bulk Actions** - Assign shift, rotation, leave, remove
- [ ] **Assignment Modal** - Template selection, date range, notifications
- [ ] **Customization** - Per-employee quick actions menu
- [ ] **Mobile Layout** - Compact filters, stacked cards, sticky actions
- [ ] **Workflows** - Bulk assign, rotation assign, leave marking

---

## 🚀 IMPLEMENTATION PLAN

**After your approval:**

1. Create `/tools/employee-assignment/page.tsx`
2. Build filter bar component
3. Build employee list with virtualization
4. Build bulk action panel
5. Build assignment modal
6. Add mobile responsive layout
7. Test all workflows

**Estimated Time:** 2-3 hours for full implementation

---

**Ready for your approval! Please review and let me know if you want any changes.** 🎯
