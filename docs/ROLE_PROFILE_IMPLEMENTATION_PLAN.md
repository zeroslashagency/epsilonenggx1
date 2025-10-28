# ROLE PROFILE EDITOR - IMPLEMENTATION PLAN

**Date:** October 28, 2025  
**Status:** 📋 AWAITING APPROVAL  
**Implementation Type:** Dual-Mode Permission Structure

---

## 🎯 OBJECTIVE

Implement **BOTH** simple parent permissions AND granular sub-item permissions in the Role Profile Editor:

1. **Parent Items** - Control entire pages/sections (e.g., "Chart" controls all chart types)
2. **Sub-Items** - Granular control within parent (e.g., "Timeline View", "Gantt Chart", "KPI Charts")

---

## ✅ VERIFIED: ACTUAL PAGE STRUCTURE

### **Production Pages (ALL EXIST):**
- ✅ `/app/production/orders/page.tsx` - **EXISTS**
- ✅ `/app/production/machines/page.tsx` - **EXISTS**
- ✅ `/app/production/personnel/page.tsx` - **EXISTS**
- ✅ `/app/production/tasks/page.tsx` - **EXISTS**

### **Monitoring Pages (ALL EXIST):**
- ✅ `/app/monitoring/alerts/` - **EXISTS**
- ✅ `/app/monitoring/reports/` - **EXISTS**
- ✅ `/app/monitoring/quality-control/` - **EXISTS**
- ✅ `/app/monitoring/maintenance/` - **EXISTS**

### **Charts & Analytics:**
- ✅ `/app/chart/page.tsx` - Single page with Timeline, Gantt, KPI charts
- ✅ `/app/analytics/page.tsx` - Single page with Production, Quality, Machine analytics

---

## 📊 PROPOSED STRUCTURE

### **1. MAIN - Dashboard**
```
Dashboard
  Actions: Full, View, Create, Edit, Delete
  Special Permissions:
    - Allow users to export dashboard data
    - Allow users to customize dashboard layout
```

---

### **2. MAIN - Scheduling**
```
Schedule Generator
  Actions: Full, View, Create, Edit, Delete, Approve
  Special Permissions:
    - Allow users to override schedule conflicts
    - Allow users to publish schedules

Schedule Generator Dashboard
  Actions: Full, View, Create, Edit, Delete
```

---

### **3. MAIN - Charts** ⭐ DUAL-MODE

```
Chart (Parent Item)
  Actions: Full, View, Create, Edit, Delete
  Controls: Entire /app/chart/page.tsx
  
  Sub-Items (Collapsible):
    ├─ Timeline View
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Timeline chart section within Chart page
    │
    ├─ Gantt Chart
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Gantt chart section within Chart page
    │
    └─ KPI Charts
        Actions: Full, View, Create, Edit, Delete
        Controls: KPI chart section within Chart page

Special Permissions:
  - Allow users to export chart data
  - Allow users to create custom reports
```

**UI Behavior:**
- "Chart" row is always visible
- Click expand icon → Shows 3 sub-items indented
- Checking "Chart" parent → Auto-checks all sub-items
- Unchecking "Chart" parent → Auto-unchecks all sub-items
- Sub-items can be individually controlled when parent is checked

---

### **4. MAIN - Analytics** ⭐ DUAL-MODE

```
Analytics (Parent Item)
  Actions: Full, View, Create, Edit, Delete
  Controls: Entire /app/analytics/page.tsx
  
  Sub-Items (Collapsible):
    ├─ Production Efficiency
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Production analytics section
    │
    ├─ Quality
    │   Actions: Full, View, Create, Edit, Delete
    │   Controls: Quality analytics section
    │
    └─ Machine
        Actions: Full, View, Create, Edit, Delete
        Controls: Machine analytics section

Special Permissions:
  - Allow users to export sensitive data
```

**UI Behavior:**
- Same collapsible behavior as Charts
- Parent controls entire Analytics page
- Sub-items control specific dashboard sections

---

### **5. MAIN - Attendance**
```
Attendance
  Actions: Full, View, Create, Edit, Delete, Approve
  Special Permissions:
    - Allow users to modify attendance for others
    - Allow users to approve leave requests
    - Allow users to sync attendance data

Standalone Attendance
  Actions: Full, View, Create, Edit, Delete
```

---

### **6. PRODUCTION** ⭐ COLLAPSIBLE

```
Production (Parent Section)
  
  Sub-Items:
    ├─ Orders
    │   Actions: Full, View, Create, Edit, Delete, Approve
    │   Page: /app/production/orders/page.tsx ✅
    │
    ├─ Machines
    │   Actions: Full, View, Create, Edit, Delete
    │   Page: /app/production/machines/page.tsx ✅
    │
    ├─ Personnel
    │   Actions: Full, View, Create, Edit, Delete
    │   Page: /app/production/personnel/page.tsx ✅
    │
    └─ Tasks
        Actions: Full, View, Create, Edit, Delete, Approve
        Page: /app/production/tasks/page.tsx ✅

Special Permissions:
  - Allow users to halt production lines
  - Allow users to emergency stop machines
  - Allow users to modify production schedules
```

---

### **7. MONITORING** ⭐ COLLAPSIBLE

```
Monitoring (Parent Section)
  
  Sub-Items:
    ├─ Alerts
    │   Actions: Full, View, Create, Edit, Delete
    │   Page: /app/monitoring/alerts/ ✅
    │
    ├─ Reports
    │   Actions: Full, View, Create, Edit, Delete
    │   Page: /app/monitoring/reports/ ✅
    │
    ├─ Quality Control
    │   Actions: Full, View, Create, Edit, Delete, Approve
    │   Page: /app/monitoring/quality-control/ ✅
    │
    └─ Maintenance
        Actions: Full, View, Create, Edit, Delete, Approve
        Page: /app/monitoring/maintenance/ ✅

Special Permissions:
  - Allow users to acknowledge critical alerts
  - Allow users to override quality checks
  - Allow users to schedule emergency maintenance
```

---

### **8. SYSTEM - Administration**
```
User Management
  Actions: Full, View, Create, Edit, Delete

Add Users
  Actions: Full, View, Create, Edit, Delete

Role Profiles
  Actions: Full, View, Create, Edit, Delete

Activity Logging
  Actions: Full, View, Create, Edit, Delete

System Settings
  Actions: Full, View, Create, Edit, Delete

Organization Settings
  Actions: Full, View, Create, Edit, Delete

Account
  Actions: View, Edit

Special Permissions:
  - Allow users to impersonate other users
  - Allow users to modify system configurations
  - Allow users to delete users
  - Allow users to reset passwords
```

---

## 🎨 UI IMPLEMENTATION

### **Collapsible Row Structure**

```tsx
// Parent Row (e.g., "Chart")
<tr className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
  <td className="py-4 px-4 text-sm font-medium text-gray-900 dark:text-white border-r">
    <div className="flex items-center gap-2">
      <button 
        onClick={() => toggleCollapse('chart')}
        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
      >
        {collapsed['chart'] ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      <span className="font-semibold">Chart</span>
    </div>
  </td>
  {/* Checkboxes for Full, View, Create, Edit, Delete */}
</tr>

// Sub-Item Rows (shown when expanded)
{!collapsed['chart'] && (
  <>
    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-r">
        <div className="flex items-center gap-2 pl-8">
          <span className="text-gray-400">└─</span>
          <span>Timeline View</span>
        </div>
      </td>
      {/* Checkboxes */}
    </tr>
    
    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-r">
        <div className="flex items-center gap-2 pl-8">
          <span className="text-gray-400">└─</span>
          <span>Gantt Chart</span>
        </div>
      </td>
      {/* Checkboxes */}
    </tr>
    
    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-r">
        <div className="flex items-center gap-2 pl-8">
          <span className="text-gray-400">└─</span>
          <span>KPI Charts</span>
        </div>
      </td>
      {/* Checkboxes */}
    </tr>
  </>
)}
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
  isSubItem?: boolean      // NEW: Marks as sub-item
  parent?: string          // NEW: Parent item name
  isCollapsible?: boolean  // NEW: Has sub-items
}

interface PermissionModule {
  name: string
  items: Record<string, ModulePermission>
  specialPermissions?: string[]
}

// State for collapse/expand
const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
  chart: true,
  analytics: true,
  production: false,
  monitoring: false
})
```

---

## 📋 IMPLEMENTATION STEPS

### **Phase 1: Update Data Structure**
1. Add `isSubItem`, `parent`, `isCollapsible` fields to interface
2. Update `main_charts` module with Chart + 3 sub-items
3. Update `main_analytics` module with Analytics + 3 sub-items
4. Keep Production and Monitoring with existing sub-items
5. Add collapse state management

**Files to modify:**
- `/app/settings/roles/[id]/edit/page.tsx` (lines 9-240)

---

### **Phase 2: Update UI Rendering**
1. Add collapse/expand button for parent items
2. Render sub-items with indentation when expanded
3. Add visual indicators (chevron icons, tree lines)
4. Style sub-items differently (lighter background)

**Files to modify:**
- `/app/settings/roles/[id]/edit/page.tsx` (lines 606-710)

---

### **Phase 3: Add Parent-Child Logic**
1. When parent checked → Auto-check all children
2. When parent unchecked → Auto-uncheck all children
3. When all children checked → Auto-check parent
4. When any child unchecked → Uncheck parent

**Files to modify:**
- `/app/settings/roles/[id]/edit/page.tsx` (updatePermission function)

---

### **Phase 4: Backend Integration**
1. Update API to handle nested permissions
2. Save parent + child permissions to database
3. Load and restore collapse states

**Files to modify:**
- `/app/api/admin/roles/[id]/route.ts`

---

### **Phase 5: Permission Enforcement**
1. Add permission checks in Chart page for sub-items
2. Add permission checks in Analytics page for sub-items
3. Update permission utility functions

**Files to modify:**
- `/app/chart/page.tsx`
- `/app/analytics/page.tsx`
- `/app/lib/utils/permission-levels.ts`

---

## 📊 SUMMARY

| Module | Parent Items | Sub-Items | Total Items | Status |
|--------|-------------|-----------|-------------|--------|
| Dashboard | 1 | 0 | 1 | ✅ Simple |
| Scheduling | 2 | 0 | 2 | ✅ Simple |
| **Charts** | 1 | 3 | 4 | ⭐ Dual-Mode |
| **Analytics** | 1 | 3 | 4 | ⭐ Dual-Mode |
| Attendance | 2 | 0 | 2 | ✅ Simple |
| **Production** | 0 | 4 | 4 | ⭐ Collapsible |
| **Monitoring** | 0 | 4 | 4 | ⭐ Collapsible |
| Administration | 7 | 0 | 7 | ✅ Simple |
| **TOTAL** | **14** | **14** | **28** | |

---

## ⚠️ IMPORTANT NOTES

### **Dual-Mode Behavior:**

**Charts & Analytics:**
- Parent item (Chart/Analytics) controls ENTIRE page
- Sub-items provide granular control WITHIN the page
- Both levels are functional and enforced

**Production & Monitoring:**
- No parent item
- Only sub-items (each is a separate page)
- Each sub-item is independent

---

## 🚀 ESTIMATED EFFORT

| Phase | Description | Time | Priority |
|-------|-------------|------|----------|
| Phase 1 | Data Structure | 1 hour | High |
| Phase 2 | UI Rendering | 2 hours | High |
| Phase 3 | Parent-Child Logic | 1 hour | High |
| Phase 4 | Backend Integration | 2 hours | Medium |
| Phase 5 | Permission Enforcement | 3 hours | Medium |
| **TOTAL** | | **9 hours** | |

---

## ✅ APPROVAL CHECKLIST

Before implementation, confirm:

- [ ] Dual-mode structure is correct (parent + sub-items for Charts/Analytics)
- [ ] All Production pages exist and should be included
- [ ] All Monitoring pages exist and should be included
- [ ] Collapsible UI design is acceptable
- [ ] Parent-child checkbox logic is correct
- [ ] Special permissions are complete
- [ ] Account item should be included in Administration

---

## 🎯 NEXT STEPS

**AWAITING USER APPROVAL**

Once approved, will proceed with:
1. Phase 1: Update data structure
2. Phase 2: Implement collapsible UI
3. Phase 3: Add parent-child logic
4. Test and verify functionality

---

**END OF IMPLEMENTATION PLAN**
