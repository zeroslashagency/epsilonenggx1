# 🔄 Shift & Leave SYSTEM - COMPLETE IMPLEMENTATION PLAN

## 📊 DEEP ANALYSIS REPORT

### **Current System Architecture**

#### **Existing Database Tables:**
- ✅ `profiles` - User/employee data (17 records)
- ✅ `employee_raw_logs` - Raw attendance punch data (in/out logs)
- ✅ `production_personnel` - Personnel with shift info (morning/afternoon/night)
- ✅ `user_activity` - Activity tracking
- ✅ `roles` - Role-based permissions
- ❌ **NO shift management tables**
- ❌ **NO leave management tables**
- ❌ **NO roster/schedule tables**

#### **Current Attendance System:**
- **Table:** `employee_raw_logs`
- **Fields:** employee_code, log_date, punch_direction (in/out), sync_time
- **Sample Data:** Real-time punch logs (latest: 2025-11-12 07:00:48)
- **Integration:** Syncs from external attendance device
- **Current Pages:** `/attendance`, `/personnel`, `/dashboard`

#### **Existing Features:**
- ✅ Real-time attendance tracking
- ✅ Employee profiles with roles
- ✅ Production personnel with shift assignment
- ✅ Activity logging
- ✅ Role-based permissions (RBAC)
- ✅ Mobile-responsive UI

---

## 🎯 Shift & Leave - FEATURE BREAKDOWN

### **Module Structure:**

```
📁 Shift & Leave
│
├── 🔄 Shift Scheduler
│   ├─ Shift Templates (Fixed, Rotating, Custom)
│   ├─ Shift Assignment (Individual/Team/Role-based)
│   ├─ Shift Swap Requests (Employee-initiated)
│   ├─ Shift Calendar (Team & Individual views)
│   └─ Shift Patterns Library
│
├── 📅 Leave Requests
│   ├─ Leave Application Form (Type, Dates, Reason, Attachments)
│   ├─ Multi-level Approval Workflow
│   ├─ Auto-Approval Rules Engine
│   ├─ Leave Balance & Quota Management
│   └─ Leave Cancellation & Amendments
│
├── ⚙️ Attendance Rules & Exceptions
│   ├─ Grace Periods & Cut-off Times
│   ├─ Late/Early Exit Rules
│   ├─ Missed Punch Workflows
│   ├─ Overtime Calculation & Requests
│   └─ Auto-deductions & Scoring
│
├── 📊 Roster & Workforce View
│   ├─ Daily Roster Board (Drag & Drop)
│   ├─ Absence Heatmap
│   ├─ On-duty/Off-duty Filters
│   └─ Downloadable Rosters (CSV/PDF)
│
├── 🔔 Notifications & Automations
│   ├─ Email/Slack Notifications
│   ├─ Reminder Mailers
│   ├─ Calendar Invites (Google/Outlook)
│   └─ Payroll Integration Flags
│
└── 🛡️ Admin / Policies
    ├─ Leave Types & Accrual Rules
    ├─ Public Holidays & Regional Settings
    ├─ Role-Based Permissions
    ├─ Audit Logs
    └─ Reporting (Trends, Coverage)
```

---

## 📋 PHASED IMPLEMENTATION PLAN

### **PHASE 1: DATABASE FOUNDATION** (Week 1)
**Goal:** Create all database tables, functions, and policies

#### **Task 1.1: Shift Management Tables**
```sql
-- shift_templates
-- shift_assignments
-- shift_patterns
-- shift_swap_requests
```

#### **Task 1.2: Leave Management Tables**
```sql
-- leave_types
-- leave_balances
-- leave_requests
-- leave_approvals
-- leave_quota_rules
```

#### **Task 1.3: Attendance Rules Tables**
```sql
-- attendance_rules
-- attendance_exceptions
-- overtime_requests
-- missed_punch_explanations
```

#### **Task 1.4: Supporting Tables**
```sql
-- public_holidays
-- roster_assignments
-- notification_queue
-- audit_logs_shift_leave
```

#### **Task 1.5: Database Functions**
```sql
-- calculate_leave_balance()
-- check_shift_overlap()
-- get_roster_for_date()
-- calculate_overtime()
-- get_unique_employee_count() (fix existing issue)
```

#### **Task 1.6: RLS Policies**
- Employee can view own shifts/leaves
- Manager can view team shifts/leaves
- Admin can view/edit all
- HR can manage leave policies

---

### **PHASE 2: BACKEND APIs** (Week 2)
**Goal:** Create all API endpoints for CRUD operations

#### **Task 2.1: Shift APIs**
```
POST   /api/shifts/templates          - Create shift template
GET    /api/shifts/templates          - List templates
PUT    /api/shifts/templates/:id      - Update template
DELETE /api/shifts/templates/:id      - Delete template

POST   /api/shifts/assign             - Assign shift to employee
GET    /api/shifts/assignments        - Get assignments
PUT    /api/shifts/assignments/:id    - Update assignment

POST   /api/shifts/swap-request       - Request shift swap
GET    /api/shifts/swap-requests      - List swap requests
PUT    /api/shifts/swap-request/:id   - Approve/reject swap
```

#### **Task 2.2: Leave APIs**
```
POST   /api/leaves/request            - Submit leave request
GET    /api/leaves/requests           - List leave requests
PUT    /api/leaves/request/:id        - Update/cancel request
DELETE /api/leaves/request/:id        - Delete request

GET    /api/leaves/balance            - Get leave balance
GET    /api/leaves/types              - List leave types
POST   /api/leaves/approve            - Approve leave
POST   /api/leaves/reject             - Reject leave
```

#### **Task 2.3: Roster APIs**
```
GET    /api/roster/daily              - Get daily roster
GET    /api/roster/weekly             - Get weekly roster
GET    /api/roster/monthly            - Get monthly roster
POST   /api/roster/generate           - Auto-generate roster
PUT    /api/roster/update             - Update roster
```

#### **Task 2.4: Rules & Exceptions APIs**
```
GET    /api/attendance/rules          - Get attendance rules
POST   /api/attendance/exception      - Submit exception
GET    /api/overtime/requests         - List overtime requests
POST   /api/overtime/request          - Submit overtime request
```

---

### **PHASE 3: UI COMPONENTS** (Week 3)
**Goal:** Build reusable UI components

#### **Task 3.1: Shift Components**
```tsx
<ShiftCalendar />           - Calendar view with shifts
<ShiftTemplateCard />       - Shift template display
<ShiftAssignmentForm />     - Assign shift form
<ShiftSwapRequestCard />    - Swap request card
<ShiftPatternBuilder />     - Visual pattern builder
```

#### **Task 3.2: Leave Components**
```tsx
<LeaveRequestForm />        - Leave application form
<LeaveBalanceCard />        - Leave balance display
<LeaveApprovalCard />       - Approval action card
<LeaveCalendar />           - Leave calendar view
<LeaveHistoryTable />       - Leave history table
```

#### **Task 3.3: Roster Components**
```tsx
<RosterBoard />             - Drag & drop roster board
<RosterCalendar />          - Calendar with roster
<AbsenceHeatmap />          - Visual absence heatmap
<RosterExport />            - Export functionality
```

#### **Task 3.4: Common Components**
```tsx
<ApprovalWorkflow />        - Multi-level approval UI
<NotificationBell />        - Notification center
<FileUpload />              - Attachment upload
<DateRangePicker />         - Date range selector
<EmployeeSelector />        - Employee picker
```

---

### **PHASE 4: MAIN PAGES** (Week 4)
**Goal:** Build main feature pages with mobile responsiveness

#### **Task 4.1: Shift Scheduler Page**
**Route:** `/shift-leave/shifts`

**Desktop Layout:**
```
┌─────────────────────────────────────────┐
│ Header: Shift Scheduler                 │
├─────────────┬───────────────────────────┤
│ Sidebar     │ Main Content              │
│ - Templates │ ┌─────────────────────┐   │
│ - Patterns  │ │ Calendar View       │   │
│ - Assign    │ │ (Week/Month)        │   │
│ - Swaps     │ └─────────────────────┘   │
│             │ ┌─────────────────────┐   │
│             │ │ Shift List          │   │
│             │ │ (Table/Cards)       │   │
│             │ └─────────────────────┘   │
└─────────────┴───────────────────────────┘
```

**Mobile Layout:**
```
┌─────────────────┐
│ Header          │
├─────────────────┤
│ Tab Navigation  │
│ [Cal][List][+]  │
├─────────────────┤
│ Calendar View   │
│ (Swipeable)     │
├─────────────────┤
│ Shift Cards     │
│ (Scrollable)    │
└─────────────────┘
```

#### **Task 4.2: Leave Management Page**
**Route:** `/shift-leave/leaves`

**Desktop Layout:**
```
┌─────────────────────────────────────────┐
│ Header: Leave Management                │
├─────────────┬───────────────────────────┤
│ Filters     │ Main Content              │
│ - Status    │ ┌─────────────────────┐   │
│ - Type      │ │ Leave Balance       │   │
│ - Date      │ │ (Cards)             │   │
│             │ └─────────────────────┘   │
│ Actions     │ ┌─────────────────────┐   │
│ [+ Request] │ │ Leave Requests      │   │
│             │ │ (Table/Timeline)    │   │
│             │ └─────────────────────┘   │
└─────────────┴───────────────────────────┘
```

**Mobile Layout:**
```
┌─────────────────┐
│ Header          │
├─────────────────┤
│ Balance Cards   │
│ (Horizontal)    │
├─────────────────┤
│ [+ New Request] │
├─────────────────┤
│ Request Cards   │
│ (Scrollable)    │
└─────────────────┘
```

#### **Task 4.3: Roster Board Page**
**Route:** `/shift-leave/roster`

**Desktop Layout:**
```
┌─────────────────────────────────────────┐
│ Header: Roster Board                    │
├─────────────────────────────────────────┤
│ Date Selector: [< Nov 12, 2025 >]      │
├─────────────────────────────────────────┤
│ Drag & Drop Board                       │
│ ┌─────────┬─────────┬─────────┐        │
│ │ Morning │ Afternoon│ Night   │        │
│ ├─────────┼─────────┼─────────┤        │
│ │ [Emp 1] │ [Emp 5] │ [Emp 9] │        │
│ │ [Emp 2] │ [Emp 6] │ [Emp10] │        │
│ │ [Emp 3] │ [Emp 7] │         │        │
│ └─────────┴─────────┴─────────┘        │
└─────────────────────────────────────────┘
```

**Mobile Layout:**
```
┌─────────────────┐
│ Date: Nov 12    │
├─────────────────┤
│ Shift Tabs      │
│ [Mor][Aft][Nig] │
├─────────────────┤
│ Employee Cards  │
│ ┌─────────────┐ │
│ │ Emp 1       │ │
│ │ 06:00-14:00 │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ Emp 2       │ │
│ └─────────────┘ │
└─────────────────┘
```

#### **Task 4.4: Attendance Rules Page**
**Route:** `/shift-leave/rules`

**Features:**
- Grace period settings
- Late arrival rules
- Overtime calculation rules
- Exception workflows
- Auto-deduction rules

---

### **PHASE 5: AUTOMATION & NOTIFICATIONS** (Week 5)
**Goal:** Implement smart automations

#### **Task 5.1: Email Automations**
- Leave request submitted → Notify manager
- Leave approved/rejected → Notify employee
- Shift assigned → Send calendar invite
- Shift swap requested → Notify both employees
- Upcoming shift reminder (1 day before)

#### **Task 5.2: Auto-Approval Engine**
```typescript
// Auto-approve if:
// - Leave duration <= 2 days
// - Employee has sufficient balance
// - No conflicting leaves in team
// - Not during blackout period
```

#### **Task 5.3: Reminder System**
- Daily shift reminders
- Leave balance expiry alerts
- Pending approval reminders
- Missed punch notifications

#### **Task 5.4: Calendar Integration**
- Google Calendar sync
- Outlook Calendar sync
- iCal export

---

### **PHASE 6: REPORTING & ANALYTICS** (Week 6)
**Goal:** Build insights and reports

#### **Task 6.1: Reports**
- Leave utilization report
- Shift coverage report
- Attendance exception report
- Overtime summary report
- Department-wise absence report

#### **Task 6.2: Dashboards**
- Leave balance dashboard
- Shift coverage heatmap
- Absence trends chart
- Approval pending summary

#### **Task 6.3: Export Functionality**
- CSV export
- PDF export
- Excel export

---

### **PHASE 7: MOBILE OPTIMIZATION & TESTING** (Week 7)
**Goal:** Ensure perfect mobile experience

#### **Task 7.1: Mobile UI Polish**
- Touch-friendly controls
- Swipe gestures
- Bottom sheets for forms
- Pull-to-refresh
- Optimized spacing

#### **Task 7.2: Testing**
- Unit tests for APIs
- Integration tests
- Mobile responsiveness testing
- Cross-browser testing
- Performance testing

#### **Task 7.3: Bug Fixes**
- Fix any issues found
- Optimize performance
- Improve UX based on feedback

---

## 🎨 UI DESIGN PRINCIPLES

### **Color Scheme:**
```
Primary: #00A651 (Green - Approved/Active)
Secondary: #2C7BE5 (Blue - Info/Links)
Warning: #FFC107 (Yellow - Pending)
Danger: #DC3545 (Red - Rejected/Late)
Success: #28A745 (Green - Success)
```

### **Typography:**
```
Headings: Inter, 600-700 weight
Body: Inter, 400 weight
Small: Inter, 300 weight
```

### **Spacing:**
```
Mobile: 12px padding, 8px gaps
Desktop: 24px padding, 16px gaps
```

### **Components:**
- Cards with shadows
- Rounded corners (8px)
- Smooth transitions
- Loading states
- Empty states
- Error states

---

## 🔐 SECURITY & PERMISSIONS

### **Role-Based Access:**

| Feature | Employee | Manager | HR | Admin |
|---------|----------|---------|----|----|
| View own shifts | ✅ | ✅ | ✅ | ✅ |
| View team shifts | ❌ | ✅ | ✅ | ✅ |
| Assign shifts | ❌ | ✅ | ✅ | ✅ |
| Request leave | ✅ | ✅ | ✅ | ✅ |
| Approve leave | ❌ | ✅ | ✅ | ✅ |
| Manage policies | ❌ | ❌ | ✅ | ✅ |
| View reports | ❌ | ✅ | ✅ | ✅ |

---

## 📦 DELIVERABLES

### **Phase 1:** Database schema + migrations
### **Phase 2:** API endpoints + documentation
### **Phase 3:** Reusable UI components
### **Phase 4:** Main feature pages (mobile + desktop)
### **Phase 5:** Automation system
### **Phase 6:** Reports & analytics
### **Phase 7:** Tested & polished product

---

## ⏱️ TIMELINE ESTIMATE

- **Phase 1:** 5 days (Database)
- **Phase 2:** 7 days (APIs)
- **Phase 3:** 7 days (Components)
- **Phase 4:** 10 days (Pages)
- **Phase 5:** 5 days (Automation)
- **Phase 6:** 5 days (Reports)
- **Phase 7:** 7 days (Testing)

**Total:** ~7 weeks (49 days)

---

## 🚀 NEXT STEPS

1. ✅ Review this plan
2. ✅ Approve to proceed
3. 🔨 Start Phase 1: Database Foundation
4. 🔨 Create UI mockups
5. 🔨 Implement features phase by phase

---

**Ready for your approval to proceed! 🎯**
