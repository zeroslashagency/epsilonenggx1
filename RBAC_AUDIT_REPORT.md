# 🔒 RBAC System Audit Report
**Generated:** 2025-10-30  
**Project:** Epsilon Scheduling System

---

## ⚠️ CRITICAL FINDINGS

### 🚨 **RBAC IS NOT FULLY IMPLEMENTED**

The system has **TWO SEPARATE permission systems** that are **NOT connected**:

1. **OLD SYSTEM (auth-context.tsx)** - Currently Active ❌
   - Hardcoded permissions based on role strings
   - Does NOT use database `permissions_json`
   - Does NOT check `role_permissions` table
   - Simple string matching: `userPermissions.includes('dashboard')`

2. **NEW SYSTEM (permission-checker.ts)** - Available but NOT Used ✅
   - Granular permission checking
   - Supports 86-item permission structure
   - Can read `permissions_json` from database
   - **NOT CONNECTED TO UI**

---

## 📊 Current Permission Flow

### How Permissions Work NOW:

```
User Login
    ↓
fetchUserProfile() in auth-context.tsx
    ↓
Hardcoded role check:
    - if (role === 'Admin') → permissions = ['schedule_generator', 'chart', ...]
    - if (role === 'Operator') → permissions = ['schedule_generator', 'attendance']
    ↓
setUserPermissions(['dashboard', 'chart', ...])
    ↓
UI checks: hasPermission('dashboard')
    ↓
Returns: userPermissions.includes('dashboard')
```

**❌ PROBLEM:** Database `permissions_json` is **NEVER READ** by the frontend!

---

## 🔍 Detailed Analysis

### 1. Auth Context (Currently Active)

**File:** `/app/lib/contexts/auth-context.tsx`

**Lines 48-63:** Hardcoded permission assignment
```typescript
// Calculate permissions based on role
const permissions: string[] = ['dashboard'] // All users get dashboard

if (profile.role === 'Admin') {
  permissions.push('schedule_generator', 'schedule_generator_dashboard', 
                   'chart', 'analytics', 'attendance', 'manage_users')
} else if (profile.role === 'Operator') {
  permissions.push('schedule_generator', 'attendance')
} else if (profile.role === 'Test User') {
  permissions.push('chart', 'analytics', 'attendance')
}
```

**Issues:**
- ❌ Ignores `permissions_json` from database
- ❌ Ignores `role_permissions` table
- ❌ Cannot be updated without code changes
- ❌ Role editing in UI has NO EFFECT on actual permissions

### 2. Permission Checker (Available but Unused)

**File:** `/app/lib/utils/permission-checker.ts`

**Capabilities:**
- ✅ Granular permission checking (view, create, edit, delete, approve, export)
- ✅ Module-based structure (main_dashboard, main_attendance, etc.)
- ✅ Helper functions: `canView()`, `canEdit()`, `canCreate()`, etc.
- ✅ Specific permission sets: `AttendancePermissions`, `ChartPermissions`

**Problem:** 
- ❌ **NEVER IMPORTED OR USED IN ANY UI COMPONENT**
- ❌ No connection to auth context
- ❌ No way to fetch user's `permissions_json` from database

### 3. Backend Middleware (Partially Working)

**File:** `/app/lib/middleware/auth.middleware.ts`

**Functions:**
- ✅ `requireRole()` - Works (checks role string)
- ✅ `requireAuth()` - Works (validates JWT)
- ⚠️ `requirePermission()` - Exists but checks `role_permissions` table only
- ⚠️ `hasPermission()` - Checks join table, NOT `permissions_json`

**Issues:**
- ❌ Backend checks `role_permissions` table
- ❌ Frontend checks hardcoded strings
- ❌ Role editing syncs to `permissions_json` AND `role_permissions`
- ❌ But frontend never reads either!

---

## 🎯 What SHOULD Happen vs What ACTUALLY Happens

### Scenario: Admin edits "Operator" role permissions

#### Expected Flow (NOT WORKING):
```
1. Admin unchecks "Schedule Generator" permission
2. Saves to database → permissions_json updated
3. Operator user refreshes page
4. Frontend fetches permissions_json
5. UI hides "Schedule Generator" menu item
6. Operator cannot access schedule generator
```

#### Actual Flow (CURRENT):
```
1. Admin unchecks "Schedule Generator" permission
2. Saves to database → permissions_json updated ✅
3. Operator user refreshes page
4. Frontend runs hardcoded check: if (role === 'Operator') ❌
5. Hardcoded permissions include 'schedule_generator' ❌
6. UI shows "Schedule Generator" menu item ❌
7. Operator CAN STILL ACCESS schedule generator ❌
```

---

## 📋 Database Tables Status

### ✅ Tables Exist and Work:

1. **`roles`** table
   - ✅ Has `permissions_json` column (JSONB)
   - ✅ Stores detailed 86-item permission structure
   - ✅ Updated when admin edits role
   - ❌ **NEVER READ BY FRONTEND**

2. **`role_permissions`** table (join table)
   - ✅ Links roles to permissions
   - ✅ Updated when admin edits role (Task 4 sync)
   - ⚠️ Used by backend middleware only
   - ❌ **NOT USED BY FRONTEND**

3. **`permissions`** table
   - ✅ Contains permission definitions
   - ✅ Has permission codes
   - ⚠️ Used by backend only

4. **`user_roles`** table
   - ✅ Links users to roles
   - ⚠️ Used by backend only

---

## 🔧 What Works vs What Doesn't

### ✅ WORKING:

1. **Role Management UI**
   - Create roles ✅
   - Edit role permissions ✅
   - Delete roles (with validation) ✅
   - Clone roles ✅
   - Save to database ✅

2. **Backend API Protection**
   - JWT authentication ✅
   - Role-based endpoint protection ✅
   - `requireRole(['Admin', 'Super Admin'])` ✅

3. **Database Sync**
   - `permissions_json` saved ✅
   - `role_permissions` table synced ✅
   - Both tables stay consistent ✅

### ❌ NOT WORKING:

1. **Frontend Permission Enforcement**
   - UI shows all menu items regardless of permissions ❌
   - Buttons/features not hidden based on permissions ❌
   - Database permissions ignored ❌

2. **Real-time Permission Updates**
   - Editing role permissions has no effect on logged-in users ❌
   - Users must be hardcoded in auth-context.tsx ❌

3. **Granular Permission Control**
   - Cannot control view/edit/create/delete separately ❌
   - Cannot hide specific buttons or sections ❌
   - All-or-nothing access per page ❌

---

## 🛠️ Required Fixes

### Priority 1: Connect Frontend to Database Permissions

**File to modify:** `/app/lib/contexts/auth-context.tsx`

**Changes needed:**

1. **Fetch `permissions_json` from database:**
```typescript
const fetchUserProfile = async (userId: string) => {
  // Get user's role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  
  // Get role's permissions_json from roles table
  const { data: roleData } = await supabase
    .from('roles')
    .select('permissions_json')
    .eq('name', profile.role)
    .single()
  
  // Store full permission structure
  setUserPermissions(roleData?.permissions_json || {})
}
```

2. **Update `hasPermission()` to use permission-checker:**
```typescript
import { canView, hasPermission as checkPerm } from '@/app/lib/utils/permission-checker'

const hasPermission = (moduleKey: string, itemKey: string, action: string): boolean => {
  if (userRole === 'Super Admin') return true
  return checkPerm(userPermissions, moduleKey, itemKey, action)
}
```

3. **Update UI components to use granular checks:**
```typescript
// OLD: hasPermission('dashboard')
// NEW: hasPermission('main_dashboard', 'Dashboard', 'view')
```

### Priority 2: Update Sidebar Menu

**File:** `/app/components/zoho-ui/ZohoSidebar.tsx`

**Add permission checks to each menu item:**
```typescript
{canView(userPermissions, 'main_dashboard', 'Dashboard') && (
  <Link href="/dashboard">Dashboard</Link>
)}

{canView(userPermissions, 'main_attendance', 'Attendance') && (
  <Link href="/attendance">Attendance</Link>
)}
```

### Priority 3: Update Page Components

**Add permission checks to:**
- Button visibility (Edit, Delete, Export)
- Section visibility (cards, tables, charts)
- Feature access (create, approve, etc.)

---

## 📊 Permission Structure Example

### Database `permissions_json` format:
```json
{
  "main_dashboard": {
    "name": "MAIN - Dashboard",
    "items": {
      "Dashboard": {
        "full": false,
        "view": true,
        "create": false,
        "edit": false,
        "delete": false
      }
    }
  },
  "main_attendance": {
    "name": "MAIN - Attendance",
    "items": {
      "Attendance": {
        "full": false,
        "view": true,
        "create": false,
        "edit": false,
        "delete": false
      },
      "Export Excel": {
        "full": false,
        "view": false,
        "create": false,
        "edit": false,
        "delete": false,
        "export": true
      }
    }
  }
}
```

---

## 🎯 Summary

### Current State:
- ✅ Backend: Role management works perfectly
- ✅ Database: Permissions stored correctly
- ❌ Frontend: **COMPLETELY IGNORES DATABASE PERMISSIONS**
- ❌ UI: Shows everything to everyone (based on hardcoded role strings)

### Root Cause:
**The frontend auth context uses hardcoded permission arrays instead of fetching `permissions_json` from the database.**

### Impact:
**Editing role permissions in the UI has ZERO EFFECT on what users can actually see or do.**

### Solution:
**Connect `auth-context.tsx` to database `permissions_json` and use `permission-checker.ts` utilities throughout the UI.**

---

## 🔍 Testing Recommendations

### Test 1: Verify Current Behavior
1. Login as Operator
2. Note which menu items are visible
3. Edit Operator role, remove all permissions
4. Logout and login again as Operator
5. **Expected:** Menu items should be hidden
6. **Actual:** All menu items still visible ❌

### Test 2: Check Database
1. Query: `SELECT permissions_json FROM roles WHERE name = 'operator'`
2. Verify permissions are saved correctly ✅
3. Confirm frontend never reads this data ❌

### Test 3: Backend Protection
1. Try accessing API endpoint without permission
2. Should return 403 Forbidden ✅
3. Backend protection works correctly ✅

---

## 📝 Conclusion

**The RBAC system is 50% complete:**
- ✅ Backend infrastructure works
- ✅ Database schema correct
- ✅ Role management UI functional
- ❌ **Frontend permission enforcement MISSING**
- ❌ **UI does not respect database permissions**

**Critical Action Required:**
Modify `auth-context.tsx` to fetch and use `permissions_json` from database instead of hardcoded role checks.

---

**Report End**
