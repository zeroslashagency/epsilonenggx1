# STANDALONE ATTENDANCE - SPECIFICATION

**Date:** October 28, 2025  
**Status:** 📋 SPECIFICATION DOCUMENT  
**Type:** Separate Attendance System Integration

---

## 🎯 OVERVIEW

**Standalone Attendance** is a separate attendance tracking system that users can access with their main system credentials. It's designed as an independent portal for attendance management.

---

## 🔑 KEY CHARACTERISTICS

### **1. Separate System**
- Not part of main application
- Runs on different URL/domain
- Independent interface and functionality
- Future implementation (placeholder currently)

### **2. Redirect Behavior**
- When user clicks "Standalone Attendance" permission
- System redirects to external attendance portal
- Uses same authentication credentials
- Seamless single sign-on experience

### **3. Employee Code Requirement**
- **MANDATORY:** User must have Employee Code set
- Without Employee Code → Cannot access standalone attendance
- Employee Code used for identification in standalone system
- Validation happens before redirect

---

## 📋 PERMISSION STRUCTURE

### **In Role Profile Editor:**

```
Standalone Attendance (Parent Item)
  Actions: Access (Enable/Disable)
  Type: Binary permission (not granular)
  
  Sub-Items (Collapsible):
    ├─ Employee Self-Service
    │   Actions: Access
    │   Description: Employee attendance portal access
    │   Requirement: Employee Code
    │
    └─ Attendance Sync
        Actions: Access
        Description: Data sync between systems
        Status: Future feature
```

---

## 🔧 TECHNICAL IMPLEMENTATION

### **1. Permission Check**

```typescript
// Check if user has standalone attendance access
const hasStandaloneAccess = user.permissions.includes('standalone_attendance')

// Check if user has employee code
const hasEmployeeCode = user.employee_code && user.employee_code.trim() !== ''

// Determine if user can access
const canAccessStandalone = hasStandaloneAccess && hasEmployeeCode
```

---

### **2. UI Validation**

```typescript
// In Role Profile Editor - when enabling Standalone Attendance
const handleStandaloneAttendanceToggle = (enabled: boolean) => {
  if (enabled) {
    // Show warning if no employee code
    if (!user.employee_code) {
      showWarning(
        '⚠️ Employee Code Required',
        'This user must have an Employee Code set to access Standalone Attendance. ' +
        'Please set the Employee Code in the user profile before enabling this permission.'
      )
      return false
    }
  }
  
  // Enable/disable permission
  updatePermission('standalone_attendance', enabled)
}
```

---

### **3. Redirect Logic**

```typescript
// When user clicks Standalone Attendance in navigation
const handleStandaloneAttendanceClick = () => {
  // Check permission
  if (!user.permissions.includes('standalone_attendance')) {
    showError('Access Denied', 'You do not have permission to access Standalone Attendance.')
    return
  }
  
  // Check employee code
  if (!user.employee_code || user.employee_code.trim() === '') {
    showError(
      'Employee Code Required',
      'You must have an Employee Code set in your profile to access Standalone Attendance. ' +
      'Please contact your administrator.'
    )
    return
  }
  
  // Redirect to standalone system
  // Future: Replace with actual standalone attendance URL
  const standaloneUrl = process.env.NEXT_PUBLIC_STANDALONE_ATTENDANCE_URL || '/attendance-portal'
  
  // Pass authentication token and employee code
  const redirectUrl = `${standaloneUrl}?token=${authToken}&employee_code=${user.employee_code}`
  
  window.location.href = redirectUrl
}
```

---

### **4. User Profile Validation**

```typescript
// In User Edit page - Employee Code field
<div>
  <label className="block text-sm font-medium mb-2">
    Employee Code
    {user.permissions.includes('standalone_attendance') && (
      <span className="text-red-500 ml-1">* Required for Standalone Attendance</span>
    )}
  </label>
  <input
    type="text"
    value={employeeCode}
    onChange={(e) => setEmployeeCode(e.target.value)}
    className="w-full px-3 py-2 border rounded"
    placeholder="Enter employee code"
  />
  {user.permissions.includes('standalone_attendance') && !employeeCode && (
    <p className="text-xs text-red-500 mt-1">
      ⚠️ This user has Standalone Attendance enabled but no Employee Code set.
      They will not be able to access the standalone system.
    </p>
  )}
</div>
```

---

## 🎨 UI COMPONENTS

### **1. Role Profile Editor - Standalone Attendance Row**

```tsx
<tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
  <td className="py-4 px-4 border-r">
    <div className="flex items-center gap-2">
      <button onClick={() => toggleCollapse('standalone_attendance')}>
        {collapsed['standalone_attendance'] ? 
          <ChevronRight className="w-4 h-4" /> : 
          <ChevronDown className="w-4 h-4" />
        }
      </button>
      <div>
        <span className="font-semibold">Standalone Attendance</span>
        <span className="ml-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
          Requires Employee Code
        </span>
      </div>
    </div>
  </td>
  <td className="py-4 px-4 text-center border-r" colSpan={5}>
    <input
      type="checkbox"
      checked={permissions.standalone_attendance}
      onChange={(e) => handleStandaloneToggle(e.target.checked)}
      className="w-5 h-5"
    />
    <span className="ml-2 text-sm text-gray-600">Access</span>
  </td>
</tr>

{/* Sub-items when expanded */}
{!collapsed['standalone_attendance'] && (
  <>
    <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
      <td className="py-3 px-4 border-r">
        <div className="flex items-center gap-2 pl-8">
          <span className="text-gray-400">└─</span>
          <span className="text-sm">Employee Self-Service</span>
        </div>
      </td>
      <td className="py-3 px-4 text-center border-r" colSpan={5}>
        <input
          type="checkbox"
          checked={permissions.standalone_attendance_self_service}
          disabled={!permissions.standalone_attendance}
          className="w-4 h-4"
        />
        <span className="ml-2 text-xs text-gray-500">Access</span>
      </td>
    </tr>
    
    <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
      <td className="py-3 px-4 border-r">
        <div className="flex items-center gap-2 pl-8">
          <span className="text-gray-400">└─</span>
          <span className="text-sm">Attendance Sync</span>
          <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            Coming Soon
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-center border-r" colSpan={5}>
        <input
          type="checkbox"
          disabled
          className="w-4 h-4 opacity-50"
        />
        <span className="ml-2 text-xs text-gray-400">Access</span>
      </td>
    </tr>
  </>
)}
```

---

### **2. User Edit Page - Standalone Attendance Section**

```tsx
{/* In Roles Tab */}
<div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
  <div className="flex items-start gap-3">
    <input
      type="checkbox"
      checked={permissions.includes('standalone_attendance')}
      onChange={() => togglePermission('standalone_attendance')}
      className="mt-1 w-4 h-4"
    />
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        Enable Standalone Attendance Site
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
        Allow user to access the dedicated attendance website with same credentials
      </p>
      
      {/* Warning if no employee code */}
      {permissions.includes('standalone_attendance') && !user.employee_code && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            ⚠️ <strong>Employee Code Required:</strong> This user must have an Employee Code 
            set in the Overview tab to access Standalone Attendance.
          </p>
        </div>
      )}
      
      {/* Success message if employee code exists */}
      {permissions.includes('standalone_attendance') && user.employee_code && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
          <p className="text-xs text-green-800">
            ✅ Employee Code: <strong>{user.employee_code}</strong> - Ready for Standalone Attendance
          </p>
        </div>
      )}
    </div>
  </div>
</div>
```

---

### **3. Navigation Menu - Standalone Attendance Link**

```tsx
{/* In Sidebar Navigation */}
{user.permissions.includes('standalone_attendance') && (
  <button
    onClick={handleStandaloneAttendanceClick}
    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
  >
    <ExternalLink className="w-5 h-5" />
    <span>Standalone Attendance</span>
    {!user.employee_code && (
      <span className="ml-auto text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
        Setup Required
      </span>
    )}
  </button>
)}
```

---

## ⚠️ VALIDATION RULES

### **1. Permission Assignment**
```
IF user.standalone_attendance = true
THEN user.employee_code MUST NOT be empty
ELSE show warning message
```

### **2. Access Attempt**
```
IF user clicks Standalone Attendance
THEN check user.permissions.includes('standalone_attendance')
  AND check user.employee_code exists
  IF both true THEN redirect
  ELSE show error message
```

### **3. Profile Update**
```
IF user.employee_code is removed
  AND user.standalone_attendance = true
THEN show warning:
  "This user has Standalone Attendance enabled. 
   Removing Employee Code will prevent access."
```

---

## 📊 DATABASE SCHEMA

### **Users Table**
```sql
-- Existing fields
employee_code VARCHAR(50)  -- Required for standalone attendance
standalone_attendance VARCHAR(3) DEFAULT 'NO'  -- 'YES' or 'NO'

-- Validation constraint
ALTER TABLE users
ADD CONSTRAINT check_standalone_requires_employee_code
CHECK (
  standalone_attendance = 'NO' 
  OR (standalone_attendance = 'YES' AND employee_code IS NOT NULL AND employee_code != '')
);
```

---

## 🔄 FUTURE IMPLEMENTATION

### **Phase 1: Current (Placeholder)**
- Permission toggle in Role Editor
- Employee Code validation
- Warning messages
- Redirect to placeholder page

### **Phase 2: Integration**
- Build/connect actual standalone attendance system
- Implement SSO authentication
- Data synchronization between systems
- Real-time attendance tracking

### **Phase 3: Advanced Features**
- Attendance Sync sub-permission
- Mobile app integration
- Biometric attendance
- Geofencing for attendance

---

## 📋 IMPLEMENTATION CHECKLIST

### **Role Profile Editor:**
- [ ] Add Standalone Attendance parent item
- [ ] Add Employee Self-Service sub-item
- [ ] Add Attendance Sync sub-item (disabled)
- [ ] Add "Requires Employee Code" badge
- [ ] Implement Access checkbox (not Full/View/Create/Edit/Delete)
- [ ] Add validation when enabling permission

### **User Edit Page:**
- [ ] Add Standalone Attendance checkbox in Roles tab
- [ ] Add Employee Code validation warning
- [ ] Show success message when employee code exists
- [ ] Link to Overview tab to set employee code

### **User Profile:**
- [ ] Add Employee Code field in Overview tab
- [ ] Mark as required if Standalone Attendance enabled
- [ ] Add validation on save
- [ ] Show warning if removing employee code with permission enabled

### **Navigation:**
- [ ] Add Standalone Attendance link (conditional)
- [ ] Add "Setup Required" badge if no employee code
- [ ] Implement redirect logic
- [ ] Add error handling

### **Backend:**
- [ ] Add database constraint for employee code requirement
- [ ] Update permission check API
- [ ] Add validation in user update endpoint
- [ ] Log standalone attendance access attempts

---

## 🎯 SUMMARY

**Standalone Attendance** is a special permission that:
- ✅ Requires Employee Code (mandatory)
- ✅ Redirects to external system (future)
- ✅ Uses Access permission (not granular)
- ✅ Has 2 sub-items (Employee Self-Service, Attendance Sync)
- ✅ Validates before enabling
- ✅ Shows warnings in UI
- ✅ Currently placeholder (future implementation)

---

**END OF SPECIFICATION**
