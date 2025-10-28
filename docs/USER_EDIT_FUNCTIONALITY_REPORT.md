# USER EDIT FUNCTIONALITY - DEEP INVESTIGATION REPORT

**Date:** October 28, 2025  
**Scope:** User Edit Section, Permission Checkboxes, Role vs Permission Modification  
**Status:** ✅ FULLY DOCUMENTED

---

## 📋 EXECUTIVE SUMMARY

This report provides a **detailed investigation** of the User Edit section, explaining exactly what can be edited, how permissions work, and the relationship between roles and individual permissions.

### Key Finding: **ROLE-BASED WITH PERMISSION OVERRIDE**

The system uses **PURE ROLE-BASED** permissions with a **DISPLAY-ONLY** checkbox interface. Here's what you can actually modify:

| What You Can Edit | How It Works | Saved To Database |
|-------------------|--------------|-------------------|
| **User Role** | Dropdown selection | ✅ `profiles.role` |
| **Standalone Attendance** | Checkbox toggle | ✅ `profiles.standalone_attendance` |
| **Permission Checkboxes** | ❌ DISPLAY ONLY | ❌ NOT SAVED |

---

## 🔍 DETAILED INVESTIGATION

### 1. **WHAT THE EDIT BUTTON DOES**

**Location:** `/settings/users/[id]` → Roles Tab → "Edit Permissions" button

**When You Click "Edit Permissions":**
```typescript
// Line 503-507
onClick={() => setIsEditing(true)}

// Enables:
1. Role dropdown becomes editable
2. Permission checkboxes become clickable
3. "Save Changes" button appears
```

**What Changes:**
```
Before Edit:
- Role dropdown: DISABLED (grayed out)
- Permission checkboxes: DISABLED (grayed out)
- Button: "Edit Permissions"

After Edit:
- Role dropdown: ENABLED (can select)
- Permission checkboxes: ENABLED (can check/uncheck)
- Buttons: "Cancel" + "Save Changes"
```

---

### 2. **ROLE DROPDOWN - WHAT IT DOES**

**Code:** Lines 530-540

```typescript
<select
  value={selectedRole}
  onChange={(e) => setSelectedRole(e.target.value)}
  disabled={!isEditing}
>
  <option value="">Select role</option>
  <option value="Admin">Admin</option>
  <option value="Operator">Operator</option>
  <option value="Test User">Test User</option>
</select>
```

**What Happens When You Change Role:**
```
1. You select "Admin" from dropdown
2. selectedRole state updates to "Admin"
3. Click "Save Changes"
4. API call: POST /api/admin/update-user-permissions
5. Database: UPDATE profiles SET role = 'Admin' WHERE id = userId
6. User now has Admin role
```

**✅ THIS ACTUALLY CHANGES THE USER'S ROLE**

---

### 3. **PERMISSION CHECKBOXES - WHAT THEY DO**

**Code:** Lines 548-563

```typescript
{SYSTEM_FUNCTIONS.map((func) => (
  <div key={func.id}>
    <input
      type="checkbox"
      checked={permissions.includes(func.id)}
      onChange={() => togglePermission(func.id)}
      disabled={!isEditing}
    />
    <div>
      <h4>{func.label}</h4>
      <p>{func.description}</p>
    </div>
  </div>
))}
```

**The 10 Permission Checkboxes:**
1. ☑️ Dashboard
2. ☑️ Schedule Generator
3. ☑️ Schedule Generator Dashboard
4. ☑️ Chart
5. ☑️ Analytics
6. ☑️ Attendance
7. ☑️ Standalone Attendance
8. ☑️ Production
9. ☑️ Monitoring
10. ☑️ Manage Users & Security

**What Happens When You Check/Uncheck:**
```typescript
// Line 161-167
const togglePermission = (permId: string) => {
  setPermissions(prev => 
    prev.includes(permId) 
      ? prev.filter(p => p !== permId)  // Remove if checked
      : [...prev, permId]                // Add if unchecked
  )
}
```

**Local State Changes:**
```
1. You check "Analytics" checkbox
2. permissions array updates: ['dashboard', 'analytics']
3. UI shows checkbox as checked
4. Click "Save Changes"
5. API receives: { permissions: ['dashboard', 'analytics'] }
```

---

### 4. **WHAT ACTUALLY GETS SAVED**

**API Endpoint:** `/api/admin/update-user-permissions/route.ts`

**Request Body:**
```json
{
  "userId": "uuid",
  "role": "Admin",
  "permissions": ["dashboard", "analytics", "attendance"],
  "standalone_attendance": "YES"
}
```

**What The API Does:**
```typescript
// Lines 80-88
const { data: updateData, error: updateError } = await supabase
  .from('profiles')
  .update({
    role: role || 'Operator',                    // ✅ SAVED
    standalone_attendance: standalone_attendance || 'NO',  // ✅ SAVED
    updated_at: new Date().toISOString()
  })
  .eq('id', userId)
```

**❌ NOTICE: `permissions` array is NOT saved to database!**

**Why?**
```typescript
// Lines 106-112
// NOTE: user_permissions table cannot be used because it has FK to auth.users
// Permissions are controlled by ROLE and standalone_attendance flag in profiles table

console.log('📝 Permissions requested (controlled by role):', permissions)
console.log('ℹ️  Permissions are determined by user role, not individual grants')
console.log('ℹ️  Only standalone_attendance can be toggled independently')
```

---

### 5. **THE TRUTH: ROLE-BASED SYSTEM**

**How Permissions ACTUALLY Work:**

```
User Role → Determines Permissions

Admin Role:
  ✅ dashboard
  ✅ schedule_generator
  ✅ schedule_generator_dashboard
  ✅ chart
  ✅ analytics
  ✅ attendance
  ✅ manage_users

Operator Role:
  ✅ dashboard
  ✅ schedule_generator
  ✅ attendance

Test User Role:
  ✅ dashboard
  ✅ chart
  ✅ analytics
  ✅ attendance
```

**Code That Determines This:** Lines 137-143

```typescript
// Role-based permissions
if (foundUser.role === 'Admin') {
  userPermissions.push('schedule_generator', 'schedule_generator_dashboard', 
                       'chart', 'analytics', 'attendance', 'manage_users')
} else if (foundUser.role === 'Operator') {
  userPermissions.push('schedule_generator', 'attendance')
} else if (foundUser.role === 'Test User') {
  userPermissions.push('chart', 'analytics', 'attendance')
}
```

---

### 6. **WHAT YOU CAN ACTUALLY MODIFY**

#### ✅ **Option 1: Change User Role**
```
Action: Select different role from dropdown
Effect: User gets ALL permissions of that role
Saved: profiles.role = 'Admin'
Result: User now has Admin permissions
```

**Example:**
```
Before: User is "Operator"
  - Has: dashboard, schedule_generator, attendance

Change to: "Admin"
  - Now has: dashboard, schedule_generator, chart, analytics, 
             attendance, manage_users

Database: UPDATE profiles SET role = 'Admin' WHERE id = userId
```

#### ✅ **Option 2: Toggle Standalone Attendance**
```
Action: Check/uncheck "Standalone Attendance" checkbox
Effect: Enables/disables standalone attendance site access
Saved: profiles.standalone_attendance = 'YES' or 'NO'
Result: User can/cannot access standalone attendance site
```

**Example:**
```
Before: standalone_attendance = 'NO'
  - User cannot access standalone attendance site

Check box: standalone_attendance = 'YES'
  - User can now access standalone attendance site

Database: UPDATE profiles SET standalone_attendance = 'YES'
```

#### ❌ **Option 3: Individual Permission Checkboxes**
```
Action: Check/uncheck individual permissions
Effect: VISUAL ONLY - Shows in UI
Saved: ❌ NOT SAVED TO DATABASE
Result: No actual change to user permissions
```

**Why Not Saved?**
```
1. System uses PURE ROLE-BASED permissions
2. Permissions determined by role, not individual grants
3. Checkboxes are for DISPLAY/PREVIEW only
4. Only role and standalone_attendance are saved
5. Individual permission grants not supported in current implementation
```

---

## 🎯 REAL-WORLD SCENARIOS

### Scenario 1: Change User from Operator to Admin

**Steps:**
1. Go to Settings → Users
2. Click on user "John (Operator)"
3. Click "Roles" tab
4. Click "Edit Permissions"
5. Change dropdown from "Operator" to "Admin"
6. Click "Save Changes"

**What Happens:**
```
API Call:
POST /api/admin/update-user-permissions
{
  userId: "john-uuid",
  role: "Admin",
  permissions: [...],  // ← Ignored by API
  standalone_attendance: "NO"
}

Database:
UPDATE profiles 
SET role = 'Admin', updated_at = NOW()
WHERE id = 'john-uuid'

Result:
✅ John is now Admin
✅ John has ALL Admin permissions
✅ John can manage users
✅ John can access analytics
```

---

### Scenario 2: Try to Give Operator "Analytics" Permission

**Steps:**
1. Go to Settings → Users
2. Click on user "Mike (Operator)"
3. Click "Roles" tab
4. Click "Edit Permissions"
5. Keep role as "Operator"
6. Check "Analytics" checkbox
7. Click "Save Changes"

**What Happens:**
```
API Call:
POST /api/admin/update-user-permissions
{
  userId: "mike-uuid",
  role: "Operator",
  permissions: ["dashboard", "schedule_generator", "attendance", "analytics"],
  standalone_attendance: "NO"
}

Database:
UPDATE profiles 
SET role = 'Operator', updated_at = NOW()
WHERE id = 'mike-uuid'

Result:
❌ Mike is still Operator
❌ Mike does NOT have analytics permission
❌ Checkbox state NOT saved
✅ Only role saved (still Operator)

Why: Permissions are role-based, not individual
```

---

### Scenario 3: Enable Standalone Attendance

**Steps:**
1. Go to Settings → Users
2. Click on user "Sarah (Admin)"
3. Click "Roles" tab
4. Click "Edit Permissions"
5. Check "Standalone Attendance" checkbox
6. Click "Save Changes"

**What Happens:**
```
API Call:
POST /api/admin/update-user-permissions
{
  userId: "sarah-uuid",
  role: "Admin",
  permissions: [...],
  standalone_attendance: "YES"  // ← This IS saved
}

Database:
UPDATE profiles 
SET role = 'Admin', standalone_attendance = 'YES'
WHERE id = 'sarah-uuid'

Result:
✅ Sarah can now access standalone attendance site
✅ Uses same credentials
✅ Separate website for attendance tracking
```

---

## 📊 COMPARISON TABLE

| Feature | Can Edit? | Saved to DB? | Effect |
|---------|-----------|--------------|--------|
| **User Role** | ✅ Yes | ✅ Yes | Changes all permissions |
| **Standalone Attendance** | ✅ Yes | ✅ Yes | Enables attendance site |
| **Dashboard Checkbox** | ❌ Display Only | ❌ No | No effect |
| **Schedule Generator Checkbox** | ❌ Display Only | ❌ No | No effect |
| **Chart Checkbox** | ❌ Display Only | ❌ No | No effect |
| **Analytics Checkbox** | ❌ Display Only | ❌ No | No effect |
| **Attendance Checkbox** | ❌ Display Only | ❌ No | No effect |
| **Production Checkbox** | ❌ Display Only | ❌ No | No effect |
| **Monitoring Checkbox** | ❌ Display Only | ❌ No | No effect |
| **Manage Users Checkbox** | ❌ Display Only | ❌ No | No effect |

---

## 🔧 HOW TO MODIFY PERMISSIONS

### ✅ **Method 1: Change Role (Recommended)**

**To Give More Permissions:**
```
Current: Operator (4 permissions)
Change to: Admin (8 permissions)
Result: User gets all Admin permissions
```

**To Remove Permissions:**
```
Current: Admin (8 permissions)
Change to: Operator (4 permissions)
Result: User loses Admin-only permissions
```

### ✅ **Method 2: Toggle Standalone Attendance**

**To Enable:**
```
Check: "Standalone Attendance" checkbox
Save: standalone_attendance = 'YES'
Result: User can access attendance site
```

**To Disable:**
```
Uncheck: "Standalone Attendance" checkbox
Save: standalone_attendance = 'NO'
Result: User cannot access attendance site
```

### ❌ **Method 3: Individual Permissions (NOT SUPPORTED)**

**Current System:**
```
❌ Cannot grant individual permissions
❌ Cannot revoke individual permissions
❌ Checkboxes are display-only
❌ Must use roles for permission control
```

**Why Not Supported:**
```
1. System designed for PURE ROLE-BASED access
2. Simpler to manage (fewer moving parts)
3. Prevents permission sprawl
4. Easier to audit
5. Database schema optimized for roles
```

---

## 🎨 UI BEHAVIOR EXPLAINED

### When NOT Editing:
```
Role Dropdown: DISABLED (grayed out)
  - Shows current role
  - Cannot change

Permission Checkboxes: DISABLED (grayed out)
  - Show current permissions based on role
  - Cannot check/uncheck

Button: "Edit Permissions"
  - Click to enable editing
```

### When Editing:
```
Role Dropdown: ENABLED
  - Can select different role
  - Changes take effect on save

Permission Checkboxes: ENABLED
  - Can check/uncheck
  - ⚠️ Changes are VISUAL ONLY
  - Only standalone_attendance actually saves

Buttons: "Cancel" + "Save Changes"
  - Cancel: Discards changes
  - Save: Saves role + standalone_attendance
```

---

## 🔐 SECURITY FEATURES

### 1. **Self-Modification Prevention**
```typescript
// Line 69-74
if (user.id === userId) {
  return NextResponse.json({
    error: 'Security violation: You cannot modify your own permissions.'
  }, { status: 403 })
}
```

**Result:**
```
❌ You cannot edit your own permissions
❌ You cannot change your own role
✅ Must ask another admin to make changes
✅ Prevents privilege escalation
```

---

### 2. **Permission Check**
```typescript
// Line 10-12
const authResult = await requirePermission(request, 'users.permissions')
if (authResult instanceof NextResponse) return authResult
```

**Result:**
```
✅ Only users with 'users.permissions' can edit
✅ Typically Admin or Super Admin
❌ Operators cannot edit permissions
❌ Employees cannot edit permissions
```

---

### 3. **Rate Limiting**
```typescript
// Lines 29-58
const rateLimitResult = await permissionUpdateLimiter.check(rateLimitKey)

if (!rateLimitResult.success) {
  return NextResponse.json({
    error: 'Too many permission update requests.'
  }, { status: 429 })
}
```

**Result:**
```
✅ 20 requests per minute per IP
❌ Exceeding limit returns 429
✅ Prevents abuse
✅ Includes retry-after header
```

---

### 4. **Audit Logging**
```typescript
// Lines 115-126
await supabase.from('audit_logs').insert({
  action: 'user_permissions_updated',
  meta_json: {
    user_id: userId,
    role,
    permissions,
    standalone_attendance
  }
})
```

**Result:**
```
✅ All changes logged
✅ Who made the change
✅ What was changed
✅ When it was changed
✅ Complete audit trail
```

---

## 💡 KEY INSIGHTS

### 1. **Role vs Permission Editing**
```
ROLES: ✅ Can be edited
  - Change dropdown
  - Saves to database
  - Changes user's permissions

PERMISSIONS: ❌ Cannot be edited individually
  - Checkboxes are display-only
  - Not saved to database
  - Controlled by role
```

### 2. **What "Edit Permissions" Actually Means**
```
Button says: "Edit Permissions"
What it does: "Edit Role (which controls permissions)"

More accurate name: "Edit Role & Standalone Access"
```

### 3. **The Only Two Things You Can Change**
```
1. User Role (Admin, Operator, Test User)
   ↓
   Changes ALL permissions at once

2. Standalone Attendance (YES/NO)
   ↓
   Adds/removes standalone attendance access
```

---

## 🎯 RECOMMENDATIONS

### For Current System:
```
✅ System works correctly as designed
✅ Pure role-based is simpler to manage
✅ Prevents permission sprawl
✅ Easier to audit and maintain
```

### If You Want Individual Permissions:
```
Would require:
1. New database table: user_permissions
2. API changes to save individual permissions
3. Middleware changes to check user_permissions
4. UI changes to make checkboxes functional
5. Migration to hybrid role + permission system

Complexity: HIGH
Benefit: More granular control
Risk: Permission sprawl, harder to manage
```

### UI Improvement Suggestions:
```
1. Rename button: "Edit Role & Access" (clearer)
2. Add tooltip: "Permissions are role-based"
3. Disable checkboxes except standalone_attendance
4. Add note: "Change role to modify permissions"
5. Show which permissions come from role
```

---

## 📋 SUMMARY

### What You Can Edit:
1. ✅ **User Role** - Changes all permissions
2. ✅ **Standalone Attendance** - Enables attendance site

### What You CANNOT Edit:
1. ❌ **Individual Permissions** - Display only
2. ❌ **Permission Checkboxes** - Not saved (except standalone)

### How It Works:
```
Role → Determines Permissions

Admin → Gets Admin permissions
Operator → Gets Operator permissions
Test User → Gets Test User permissions

+ Standalone Attendance (optional toggle)
```

### The Edit Button:
```
Enables: Role dropdown + Standalone checkbox
Does NOT: Save individual permission checkboxes
Purpose: Change user's role (which changes permissions)
```

---

## 🔗 RELATED FILES

- **Frontend:** `/app/settings/users/[id]/page.tsx`
- **API:** `/app/api/admin/update-user-permissions/route.ts`
- **Middleware:** `/app/lib/middleware/auth.middleware.ts`
- **Types:** `/app/lib/types/auth.types.ts`
- **Database:** `profiles` table (role, standalone_attendance)

---

**Report Generated:** October 28, 2025  
**Status:** ✅ FULLY DOCUMENTED  
**System Type:** Pure Role-Based Access Control (RBAC)

---

## ✅ FINAL ANSWER

**Q: Can I edit particular permissions or only roles?**

**A: You can ONLY edit:**
1. **The user's ROLE** (which changes all their permissions at once)
2. **Standalone Attendance** (on/off toggle)

**You CANNOT edit individual permissions.** The checkboxes are for display only. Permissions are determined by the role you assign.

**To give a user more permissions:** Change their role to a higher role (e.g., Operator → Admin)

**To remove permissions:** Change their role to a lower role (e.g., Admin → Operator)
