# ROLE PROFILE EDITOR - DUAL-MODE IMPLEMENTATION (ALL SECTIONS)

**Date:** October 28, 2025  
**Status:** 📋 IMPLEMENTATION REPORT  
**Structure:** DUAL-MODE for ALL sections

---

## 🎯 DUAL-MODE CONCEPT

**Every section has:**
1. **Parent Item** - Controls entire section/page
2. **Sub-Items** - Granular control within section (collapsible)

**Example:**
```
Dashboard (Parent) ← Controls entire dashboard
  ├─ Overview Widget
  ├─ Production Metrics
  └─ Recent Activity
```

---

## 📊 COMPLETE STRUCTURE (ALL DUAL-MODE)

### **1. MAIN - Dashboard** ⭐ DUAL-MODE

```
Dashboard (Parent Item)
  Actions: Full, View, Create, Edit, Delete
  Controls: Entire /app/dashboard page
  
  Sub-Items (Collapsible):
    ├─ Overview Widget
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Main overview section
    │
    ├─ Production Metrics
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Production metrics cards
    │
    └─ Recent Activity
        Actions: Full, View, Create, Edit, Delete
        Controls: Activity feed section

Special Permissions:
  - Allow users to export dashboard data
  - Allow users to customize dashboard layout
```

---

### **2. MAIN - Scheduling** ⭐ DUAL-MODE

```
Scheduling (Parent Section)
  
  Schedule Generator (Parent Item)
    Actions: Full, View, Create, Edit, Delete, Approve
    Controls: Entire /app/scheduler page
    
    Sub-Items (Collapsible):
      ├─ Create Schedule
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Schedule creation interface
      │
      ├─ Edit Schedule
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Schedule editing interface
      │
      ├─ Publish Schedule
      │   Actions: Full, View, Create, Edit, Delete, Approve
      │   Controls: Schedule publishing functionality
      │
      └─ Schedule History
          Actions: Full, View, Create, Edit, Delete
          Controls: Historical schedules view
  
  Schedule Generator Dashboard (Parent Item)
    Actions: Full, View, Create, Edit, Delete
    Controls: Entire /app/schedule-dashboard page
    
    Sub-Items (Collapsible):
      ├─ Timeline View
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Timeline visualization
      │
      ├─ Calendar View
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Calendar visualization
      │
      └─ Statistics
          Actions: Full, View, Create, Edit, Delete
          Controls: Schedule statistics panel

Special Permissions:
  - Allow users to override schedule conflicts
  - Allow users to publish schedules
```

---

### **3. MAIN - Charts** ⭐ DUAL-MODE

```
Chart (Parent Item)
  Actions: Full, View, Create, Edit, Delete
  Controls: Entire /app/chart page
  
  Sub-Items (Collapsible):
    ├─ Timeline View
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Timeline chart section
    │
    ├─ Gantt Chart
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Gantt chart section
    │
    └─ KPI Charts
        Actions: Full, View, Create, Edit, Delete
        Controls: KPI dashboard section

Special Permissions:
  - Allow users to export chart data
  - Allow users to create custom reports
```

---

### **4. MAIN - Analytics** ⭐ DUAL-MODE

```
Analytics (Parent Item)
  Actions: Full, View, Create, Edit, Delete
  Controls: Entire /app/analytics page
  
  Sub-Items (Collapsible):
    ├─ Production Efficiency
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Production analytics dashboard
    │
    ├─ Quality Analytics
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Quality metrics dashboard
    │
    └─ Machine Analytics
        Actions: Full, View, Create, Edit, Delete
        Controls: Machine performance dashboard

Special Permissions:
  - Allow users to export sensitive data
```

---

### **5. MAIN - Attendance** ⭐ DUAL-MODE

```
Attendance (Parent Item)
  Actions: Full, View, Create, Edit, Delete, Approve
  Controls: Entire /app/attendance page
  
  Sub-Items (Collapsible):
    ├─ View Attendance
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Attendance viewing interface
    │
    ├─ Mark Attendance
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Attendance marking functionality
    │
    ├─ Attendance Reports
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Attendance reporting section
    │
    └─ Leave Management
        Actions: Full, View, Create, Edit, Delete, Approve
        Controls: Leave requests and approvals

Standalone Attendance (Parent Item)
  Actions: Full, View, Create, Edit, Delete
  Controls: Standalone attendance system access
  Note: Separate project - already built
  
  Sub-Items (Collapsible):
    ├─ Employee Self-Service
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Employee attendance portal
    │
    ├─ Attendance Sync
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Data synchronization
    │
    └─ Attendance Reports
        Actions: Full, View, Create, Edit, Delete
        Controls: Standalone attendance reports

Special Permissions:
  - Allow users to modify attendance for others
  - Allow users to approve leave requests
  - Allow users to sync attendance data
```

---

### **6. PRODUCTION** ⭐ DUAL-MODE

```
Production (Parent Section)

  Orders (Parent Item)
    Actions: Full, View, Create, Edit, Delete, Approve
    Controls: Entire /app/production/orders page
    
    Sub-Items (Collapsible):
      ├─ Create Order
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Order creation interface
      │
      ├─ Edit Order
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Order editing interface
      │
      ├─ Order Status
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Order status tracking
      │
      └─ Order Approval
          Actions: Full, View, Create, Edit, Delete, Approve
          Controls: Order approval workflow

  Machines (Parent Item)
    Actions: Full, View, Create, Edit, Delete
    Controls: Entire /app/production/machines page
    
    Sub-Items (Collapsible):
      ├─ Machine List
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Machine inventory view
      │
      ├─ Machine Status
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Real-time machine status
      │
      └─ Machine Configuration
          Actions: Full, View, Create, Edit, Delete
          Controls: Machine settings and config

  Personnel (Parent Item)
    Actions: Full, View, Create, Edit, Delete
    Controls: Entire /app/production/personnel page
    
    Sub-Items (Collapsible):
      ├─ Personnel List
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Personnel directory
      │
      ├─ Shift Assignment
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Shift scheduling for personnel
      │
      └─ Skill Management
          Actions: Full, View, Create, Edit, Delete
          Controls: Personnel skills and certifications

  Tasks (Parent Item)
    Actions: Full, View, Create, Edit, Delete, Approve
    Controls: Entire /app/production/tasks page
    
    Sub-Items (Collapsible):
      ├─ Create Task
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Task creation interface
      │
      ├─ Task Assignment
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Assigning tasks to personnel
      │
      ├─ Task Progress
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Task tracking and updates
      │
      └─ Task Completion
          Actions: Full, View, Create, Edit, Delete, Approve
          Controls: Task completion and approval

Special Permissions:
  - Allow users to halt production lines
  - Allow users to emergency stop machines
  - Allow users to modify production schedules
```

---

### **7. MONITORING** ⭐ DUAL-MODE

```
Monitoring (Parent Section)

  Alerts (Parent Item)
    Actions: Full, View, Create, Edit, Delete
    Controls: Entire /app/monitoring/alerts page
    
    Sub-Items (Collapsible):
      ├─ View Alerts
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Alert dashboard
      │
      ├─ Create Alert Rules
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Alert rule configuration
      │
      └─ Alert History
          Actions: Full, View, Create, Edit, Delete
          Controls: Historical alerts log

  Reports (Parent Item)
    Actions: Full, View, Create, Edit, Delete
    Controls: Entire /app/monitoring/reports page
    
    Sub-Items (Collapsible):
      ├─ Generate Reports
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Report generation interface
      │
      ├─ Scheduled Reports
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Automated report scheduling
      │
      └─ Report Templates
          Actions: Full, View, Create, Edit, Delete
          Controls: Report template management

  Quality Control (Parent Item)
    Actions: Full, View, Create, Edit, Delete, Approve
    Controls: Entire /app/monitoring/quality-control page
    
    Sub-Items (Collapsible):
      ├─ Quality Inspections
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Quality inspection interface
      │
      ├─ Quality Metrics
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Quality KPIs and metrics
      │
      └─ Quality Approvals
          Actions: Full, View, Create, Edit, Delete, Approve
          Controls: Quality approval workflow

  Maintenance (Parent Item)
    Actions: Full, View, Create, Edit, Delete, Approve
    Controls: Entire /app/monitoring/maintenance page
    
    Sub-Items (Collapsible):
      ├─ Maintenance Schedule
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Preventive maintenance planning
      │
      ├─ Maintenance Requests
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Maintenance request submission
      │
      ├─ Maintenance History
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Maintenance records and logs
      │
      └─ Maintenance Approval
          Actions: Full, View, Create, Edit, Delete, Approve
          Controls: Maintenance approval workflow

Special Permissions:
  - Allow users to acknowledge critical alerts
  - Allow users to override quality checks
  - Allow users to schedule emergency maintenance
```

---

### **8. SYSTEM - Administration** ⭐ DUAL-MODE

```
Administration (Parent Section)

  User Management (Parent Item)
    Actions: Full, View, Create, Edit, Delete
    Controls: Entire /app/settings/users page
    
    Sub-Items (Collapsible):
      ├─ View Users
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: User list and search
      │
      ├─ Edit User Details
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: User profile editing
      │
      └─ User Permissions
          Actions: Full, View, Create, Edit, Delete
          Controls: User permission assignment

  Add Users (Parent Item)
    Actions: Full, View, Create, Edit, Delete
    Controls: Entire /app/settings/add-users page
    
    Sub-Items (Collapsible):
      ├─ Manual User Creation
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Single user creation form
      │
      └─ Bulk User Import
          Actions: Full, View, Create, Edit, Delete
          Controls: CSV/Excel user import

  Role Profiles (Parent Item)
    Actions: Full, View, Create, Edit, Delete
    Controls: Entire /app/settings/roles page
    
    Sub-Items (Collapsible):
      ├─ View Roles
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Role list and details
      │
      ├─ Create Role
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: New role creation
      │
      └─ Edit Role Permissions
          Actions: Full, View, Create, Edit, Delete
          Controls: Role permission configuration

  Activity Logging (Parent Item)
    Actions: Full, View, Create, Edit, Delete
    Controls: Entire /app/settings/activity-logs page
    
    Sub-Items (Collapsible):
      ├─ View Logs
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Activity log viewer
      │
      ├─ Filter Logs
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Log filtering and search
      │
      └─ Export Logs
          Actions: Full, View, Create, Edit, Delete
          Controls: Log export functionality

  System Settings (Parent Item)
    Actions: Full, View, Create, Edit, Delete
    Controls: System configuration page
    
    Sub-Items (Collapsible):
      ├─ General Settings
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Basic system configuration
      │
      ├─ Security Settings
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Security and authentication config
      │
      └─ Integration Settings
          Actions: Full, View, Create, Edit, Delete
          Controls: Third-party integrations

  Organization Settings (Parent Item)
    Actions: Full, View, Create, Edit, Delete
    Controls: Organization configuration page
    
    Sub-Items (Collapsible):
      ├─ Company Profile
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Company information
      │
      ├─ Department Management
      │   Actions: Full, View, Create, Edit, Delete
      │   Controls: Department structure
      │
      └─ Location Management
          Actions: Full, View, Create, Edit, Delete
          Controls: Plant/facility locations

  Account (Parent Item)
    Actions: View, Edit
    Controls: Entire /app/account page
    
    Sub-Items (Collapsible):
      ├─ Profile Settings
      │   Actions: View, Edit
      │   Controls: User profile information
      │
      └─ Password & Security
          Actions: View, Edit
          Controls: Password and security settings

Special Permissions:
  - Allow users to impersonate other users
  - Allow users to modify system configurations
  - Allow users to delete users
  - Allow users to reset passwords
```

---

## 📊 SUMMARY

| Section | Parent Items | Sub-Items | Total Items | Collapsible Levels |
|---------|-------------|-----------|-------------|--------------------|
| Dashboard | 1 | 3 | 4 | 1 level |
| Scheduling | 2 | 7 | 9 | 2 levels |
| Charts | 1 | 3 | 4 | 1 level |
| Analytics | 1 | 3 | 4 | 1 level |
| Attendance | 2 | 6 | 8 | 2 levels |
| Production | 4 | 12 | 16 | 2 levels |
| Monitoring | 4 | 12 | 16 | 2 levels |
| Administration | 7 | 17 | 24 | 2 levels |
| **TOTAL** | **22** | **64** | **86** | |

---

## 🎨 UI IMPLEMENTATION

### **Collapsible Structure (2 Levels)**

```tsx
// Level 1: Section Header (e.g., "PRODUCTION")
<div className="bg-white dark:bg-gray-800 rounded-lg border mb-6">
  <h2 className="text-lg font-semibold p-4 bg-gray-50 dark:bg-gray-700 border-b">
    PRODUCTION
  </h2>
  
  <table className="w-full">
    <thead>
      {/* Column headers: Particulars, Full, View, Create, Edit, Delete, Approve */}
    </thead>
    
    <tbody>
      {/* Level 2: Parent Item (e.g., "Orders") */}
      <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
        <td className="py-4 px-4 border-r">
          <div className="flex items-center gap-2">
            <button onClick={() => toggleCollapse('orders')}>
              {collapsed['orders'] ? 
                <ChevronRight className="w-4 h-4" /> : 
                <ChevronDown className="w-4 h-4" />
              }
            </button>
            <span className="font-semibold">Orders</span>
          </div>
        </td>
        {/* Checkboxes for Full, View, Create, Edit, Delete, Approve */}
      </tr>
      
      {/* Level 3: Sub-Items (shown when expanded) */}
      {!collapsed['orders'] && (
        <>
          <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
            <td className="py-3 px-4 border-r">
              <div className="flex items-center gap-2 pl-8">
                <span className="text-gray-400">└─</span>
                <span className="text-sm">Create Order</span>
              </div>
            </td>
            {/* Checkboxes */}
          </tr>
          
          <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
            <td className="py-3 px-4 border-r">
              <div className="flex items-center gap-2 pl-8">
                <span className="text-gray-400">└─</span>
                <span className="text-sm">Edit Order</span>
              </div>
            </td>
            {/* Checkboxes */}
          </tr>
          
          {/* More sub-items... */}
        </>
      )}
      
      {/* Next parent item (e.g., "Machines") */}
      <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
        <td className="py-4 px-4 border-r">
          <div className="flex items-center gap-2">
            <button onClick={() => toggleCollapse('machines')}>
              {collapsed['machines'] ? 
                <ChevronRight className="w-4 h-4" /> : 
                <ChevronDown className="w-4 h-4" />
              }
            </button>
            <span className="font-semibold">Machines</span>
          </div>
        </td>
        {/* Checkboxes */}
      </tr>
      
      {/* Machines sub-items when expanded... */}
    </tbody>
  </table>
</div>
```

---

## 🔧 DATA STRUCTURE

```typescript
interface ModulePermission {
  full: boolean
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
  approve?: boolean
  isSubItem?: boolean      // Marks as sub-item (Level 3)
  parent?: string          // Parent item name
  isParent?: boolean       // Has sub-items
  level?: 1 | 2 | 3       // Hierarchy level
}

interface PermissionModule {
  name: string
  items: Record<string, ModulePermission>
  specialPermissions?: string[]
}

// Collapse state for all parent items
const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
  // Dashboard
  dashboard: true,
  
  // Scheduling
  schedule_generator: true,
  schedule_dashboard: true,
  
  // Charts & Analytics
  chart: true,
  analytics: true,
  
  // Attendance
  attendance: true,
  standalone_attendance: true,
  
  // Production
  orders: true,
  machines: true,
  personnel: true,
  tasks: true,
  
  // Monitoring
  alerts: true,
  reports: true,
  quality_control: true,
  maintenance: true,
  
  // Administration
  user_management: true,
  add_users: true,
  role_profiles: true,
  activity_logging: true,
  system_settings: true,
  organization_settings: true,
  account: true
})
```

---

## 📋 IMPLEMENTATION PHASES

### **Phase 1: Data Structure (3 hours)**
- Update all 8 sections with parent + sub-items
- Add 63 sub-items across all sections
- Define hierarchy levels (1, 2, 3)
- Add collapse state for 22 parent items

### **Phase 2: UI Rendering (4 hours)**
- Implement collapsible rows for all parent items
- Add indentation and tree lines for sub-items
- Style parent vs sub-item rows differently
- Add expand/collapse icons
- Handle 2-level hierarchy display

### **Phase 3: Parent-Child Logic (2 hours)**
- Parent checked → Auto-check all children
- Parent unchecked → Auto-uncheck all children
- All children checked → Auto-check parent
- Any child unchecked → Uncheck parent
- Handle nested logic (section → parent → sub-items)

### **Phase 4: Backend Integration (3 hours)**
- Update API to handle 85 permission items
- Save parent + child permissions to database
- Load and restore collapse states
- Handle permission inheritance

### **Phase 5: Permission Enforcement (6 hours)**
- Add permission checks in all 22 parent pages
- Implement sub-item permission checks
- Update permission utility functions
- Test all 85 permission items

### **Phase 6: Testing & Polish (2 hours)**
- Test collapse/expand functionality
- Test parent-child checkbox logic
- Test permission enforcement
- Fix bugs and polish UI

---

## ⏱️ TOTAL EFFORT

**20 hours** (2.5 days)

| Phase | Hours |
|-------|-------|
| Data Structure | 3 |
| UI Rendering | 4 |
| Parent-Child Logic | 2 |
| Backend Integration | 3 |
| Permission Enforcement | 6 |
| Testing & Polish | 2 |
| **TOTAL** | **20** |

---

## ✅ BENEFITS

1. **Consistent Structure** - Every section follows same dual-mode pattern
2. **Granular Control** - 85 permission items for fine-grained access control
3. **Flexible** - Can control entire sections or specific features
4. **Scalable** - Easy to add more sub-items in future
5. **User-Friendly** - Collapsible UI keeps interface clean
6. **Powerful** - Supports complex permission requirements

---

## 🚀 READY TO IMPLEMENT

All sections now have dual-mode structure:
- ✅ 22 parent items
- ✅ 63 sub-items
- ✅ 85 total permission items
- ✅ 2-level collapsible hierarchy
- ✅ Consistent UI pattern across all sections

---

**END OF IMPLEMENTATION REPORT**
