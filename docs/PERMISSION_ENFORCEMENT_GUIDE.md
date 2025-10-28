# PERMISSION ENFORCEMENT IMPLEMENTATION GUIDE

**Date:** October 28, 2025  
**Status:** 🚧 IN PROGRESS  
**Phase:** 5.2 - Attendance Page Enforcement

---

## 📊 IMPLEMENTATION PROGRESS

### **✅ Completed (11 hours)**

**Phases 1-4:** Complete
- Data structure (82 items)
- Collapsible UI
- Parent-child logic
- Backend integration

**Phase 5.1:** Permission Utility ✅
- Created `permission-checker.ts` with 293 lines
- Core functions: hasPermission, canView, canEdit, canCreate, canDelete, canExport, canApprove
- Helper objects: AttendancePermissions, ChartPermissions, AnalyticsPermissions

### **🚧 In Progress (Phase 5.2)**

**Attendance Page Enforcement:**
- ✅ Added permission imports
- ✅ Added userPermissions state
- ✅ Added permission check variables
- ✅ Conditionally hide Export Excel button
- ⏳ Need to add checks for All Track Records
- ⏳ Need to add checks for Today's Activity section

---

## 🎯 HOW TO USE PERMISSION CHECKER

### **1. Import the Utility**

```typescript
import { AttendancePermissions, canView, canExport } from '@/app/lib/utils/permission-checker'
import type { PermissionModule } from '@/app/lib/utils/permission-checker'
```

### **2. Get User Permissions**

```typescript
// In your component
const [userPermissions, setUserPermissions] = useState<Record<string, PermissionModule> | null>(null)

// Load from user session/context
useEffect(() => {
  // TODO: Get from authenticated user's role
  // const permissions = await getUserPermissions()
  // setUserPermissions(permissions)
}, [])
```

### **3. Check Permissions**

**Option A: Use Helper Objects (Recommended)**

```typescript
// Attendance-specific checks
const canViewTodaysActivity = AttendancePermissions.canViewTodaysActivity(userPermissions)
const canViewAllRecords = AttendancePermissions.canViewAllRecords(userPermissions)
const canExportRecords = AttendancePermissions.canExportRecords(userPermissions)
const canExportExcel = AttendancePermissions.canExportExcel(userPermissions)
```

**Option B: Use Core Functions**

```typescript
// Generic permission checks
const canViewAttendance = canView(userPermissions, 'main_attendance', 'Attendance')
const canExportData = canExport(userPermissions, 'main_attendance', 'Export Excel')
```

### **4. Apply in UI**

```typescript
// Conditionally render buttons
{canExportExcel && (
  <Button onClick={() => exportToExcel()}>
    <Download className="h-4 w-4" />
    Export Excel
  </Button>
)}

// Disable features
<Button 
  disabled={!canExportRecords}
  onClick={() => exportRecords()}
>
  Export Records
</Button>

// Show/hide sections
{canViewTodaysActivity && (
  <Card>
    <h2>Today's Recent Activity</h2>
    {/* Activity content */}
  </Card>
)}
```

---

## 📋 PERMISSION MAPPING

### **Attendance Module (`main_attendance`)**

| Item | View | Export | Notes |
|------|------|--------|-------|
| **Attendance (Parent)** | ✅ | ❌ | View-only access |
| Today's Recent Activity | ✅ | ❌ | Read-only display |
| All Track Records | ✅ | ✅ | View + Export |
| Export Excel | ❌ | ✅ | Export only |

### **Charts Module (`main_charts`)**

| Item | View | Create | Edit | Delete | Export |
|------|------|--------|------|--------|--------|
| **Chart (Parent)** | ✅ | ❌ | ❌ | ❌ | ✅ |
| Timeline View | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gantt Chart | ✅ | ❌ | ❌ | ❌ | ❌ |
| KPI Charts | ✅ | ❌ | ❌ | ❌ | ❌ |

### **Analytics Module (`main_analytics`)**

| Item | View | Create | Edit | Delete |
|------|------|--------|------|--------|
| **Analytics (Parent)** | ✅ | ❌ | ❌ | ❌ |
| Production Efficiency | ✅ | ❌ | ❌ | ❌ |
| Quality Analytics | ✅ | ❌ | ❌ | ❌ |
| Machine Analytics | ✅ | ❌ | ❌ | ❌ |

---

## 🔧 IMPLEMENTATION CHECKLIST

### **Attendance Page** (2 hours)

- [x] Import permission checker
- [x] Add userPermissions state
- [x] Add permission check variables
- [x] Hide Export Excel button if no permission
- [ ] Hide All Track Records export if no permission
- [ ] Show Today's Activity based on view permission
- [ ] Add permission warnings/messages
- [ ] Test with different roles

### **Chart Page** (2 hours)

- [ ] Import permission checker
- [ ] Add userPermissions state
- [ ] Check canViewCharts before rendering
- [ ] Check canViewTimeline for timeline section
- [ ] Check canViewGantt for gantt section
- [ ] Check canViewKPI for KPI section
- [ ] Hide export buttons if no permission
- [ ] Test with different roles

### **Analytics Page** (1 hour)

- [ ] Import permission checker
- [ ] Add userPermissions state
- [ ] Check canViewAnalytics before rendering
- [ ] Check sub-item permissions for each section
- [ ] Test with different roles

### **Other Pages** (As needed)

- [ ] Dashboard
- [ ] Scheduling
- [ ] Production
- [ ] Monitoring
- [ ] Administration

---

## 🎨 UI PATTERNS

### **Pattern 1: Hide Button**

```typescript
{canExport && (
  <Button onClick={handleExport}>Export</Button>
)}
```

### **Pattern 2: Disable Button**

```typescript
<Button 
  disabled={!canEdit}
  onClick={handleEdit}
  title={!canEdit ? "You don't have permission to edit" : ""}
>
  Edit
</Button>
```

### **Pattern 3: Show Warning**

```typescript
{!canView && (
  <Alert variant="warning">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Access Restricted</AlertTitle>
    <AlertDescription>
      You don't have permission to view this content.
    </AlertDescription>
  </Alert>
)}
```

### **Pattern 4: Redirect**

```typescript
useEffect(() => {
  if (!canViewPage) {
    router.push('/unauthorized')
  }
}, [canViewPage])
```

---

## 🧪 TESTING SCENARIOS

### **Test Case 1: View-Only User**

**Permissions:**
- Attendance: View only
- Today's Activity: View
- All Track Records: View (no export)
- Export Excel: No access

**Expected Behavior:**
- ✅ Can see Today's Activity
- ✅ Can see All Track Records table
- ❌ Cannot see Export Excel button
- ❌ Cannot export from All Track Records

### **Test Case 2: Export User**

**Permissions:**
- All Track Records: View + Export
- Export Excel: Export

**Expected Behavior:**
- ✅ Can see Export Excel button
- ✅ Can export from All Track Records
- ✅ Can download Excel files

### **Test Case 3: No Access User**

**Permissions:**
- Attendance: No access

**Expected Behavior:**
- ❌ Cannot access Attendance page
- ❌ Redirected to unauthorized page

---

## 📊 PERMISSION ENFORCEMENT STATUS

| Page | Status | Progress | Notes |
|------|--------|----------|-------|
| **Attendance** | 🚧 In Progress | 40% | Export button hidden, need more checks |
| **Chart** | ⏳ Pending | 0% | Ready to implement |
| **Analytics** | ⏳ Pending | 0% | Ready to implement |
| **Dashboard** | ⏳ Pending | 0% | Low priority |
| **Scheduling** | ⏳ Pending | 0% | Low priority |
| **Production** | ⏳ Pending | 0% | Low priority |
| **Monitoring** | ⏳ Pending | 0% | Low priority |
| **Administration** | ⏳ Pending | 0% | Low priority |

---

## 🚀 NEXT STEPS

1. **Fix Attendance Page Syntax Errors** (30 min)
   - Resolve TypeScript errors
   - Test permission checks

2. **Complete Attendance Enforcement** (1 hour)
   - Add All Track Records checks
   - Add Today's Activity checks
   - Add permission warnings

3. **Implement Chart Page** (2 hours)
   - Add permission checks
   - Hide/show chart sections
   - Test with different roles

4. **Implement Analytics Page** (1 hour)
   - Add permission checks
   - Test with different roles

5. **Documentation** (30 min)
   - Update this guide
   - Create examples

6. **Testing & Polish** (4 hours)
   - Test all permissions
   - Fix bugs
   - Polish UI

---

## 💡 BEST PRACTICES

1. **Always check permissions before rendering sensitive content**
2. **Provide clear feedback when access is denied**
3. **Use helper objects for cleaner code**
4. **Test with multiple roles**
5. **Document permission requirements**
6. **Handle loading states**
7. **Cache permission checks for performance**

---

## 📝 NOTES

- User permissions should come from authenticated session
- Currently using mock permissions for development
- Need to integrate with actual user role system
- Consider caching permissions for performance
- Add permission refresh mechanism

---

**END OF GUIDE**
