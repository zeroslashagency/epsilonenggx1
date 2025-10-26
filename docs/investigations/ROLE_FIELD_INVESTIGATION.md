# 🔍 ROLE FIELD INVESTIGATION REPORT

## The Mystery of Two Role Fields

**Date:** October 20, 2025  
**Issue:** Why does `profiles` table have BOTH `role` and `role_badge` fields?

---

## 🎯 EXECUTIVE SUMMARY

Your system has **THREE different ways** to store user roles, causing confusion:

1. **`profiles.role`** - Legacy field with CHECK constraint
2. **`profiles.role_badge`** - Newer field without constraints
3. **`user_roles` table** - Proper RBAC implementation

**Problem:** These fields are **NOT synchronized** and serve different purposes!

---

## 📊 CURRENT STATE

### **Admin User (admin@example.com):**

```sql
profiles table:
├── role: "Admin"              ← Limited by CHECK constraint
├── role_badge: "super_admin"  ← No constraints, flexible
└── id: bdbcaa43-f84b-48fa-9eac-3f98b02ebbe5

user_roles table:
├── super_admin role ✅
└── admin role ✅
```

---

## 🔍 DETAILED ANALYSIS

### **1. The `role` Field (Legacy)**

**Database Schema:**
```sql
Column: role
Type: text
Nullable: YES
Default: 'Operator'
Constraint: CHECK (role = ANY (ARRAY['Admin', 'Operator', 'Test User']))
```

**Problems:**
- ❌ **Limited to 3 values only**: 'Admin', 'Operator', 'Test User'
- ❌ **No 'Super Admin' allowed** due to CHECK constraint
- ❌ **Cannot add new roles** without altering constraint
- ❌ **Legacy design** - not flexible

**Used in code:**
```typescript
// Line 52 in auth.middleware.ts
role: profile.role || profile.role_badge || 'Employee'

// Line 166 in auth.middleware.ts
if (user.role === 'Super Admin') {
  return true  // This NEVER works because role can't be 'Super Admin'!
}
```

---

### **2. The `role_badge` Field (Workaround)**

**Database Schema:**
```sql
Column: role_badge
Type: text
Nullable: YES
Default: null
Constraint: NONE ✅
```

**Advantages:**
- ✅ **No constraints** - can be any value
- ✅ **Flexible** - can use 'super_admin', 'Super Admin', etc.
- ✅ **Works around** the role field limitation

**Used in code:**
```typescript
// Line 52 in auth.middleware.ts
role: profile.role || profile.role_badge || 'Employee'
// Falls back to role_badge if role is null
```

**Problem:**
- ⚠️ The code checks `user.role === 'Super Admin'` but this field gets populated from `profile.role || profile.role_badge`
- ⚠️ Since `profile.role = 'Admin'`, it uses that instead of `role_badge`!

---

### **3. The `user_roles` Table (Proper RBAC)**

**Database Schema:**
```sql
Table: user_roles
Columns:
├── user_id (UUID) → references profiles(id)
├── role_id (UUID) → references roles(id)
└── created_at (timestamp)
```

**This is the CORRECT way:**
- ✅ **Proper many-to-many relationship**
- ✅ **User can have multiple roles**
- ✅ **Roles defined in `roles` table**
- ✅ **Flexible and scalable**

**Roles in database:**
```sql
roles table:
├── admin (fc0724ee-d98e-48bf-af5e-673c2a915deb)
├── attendance (66468915-f065-4612-9224-43b3754533c2)
├── monitor (51d3173d-cf1e-464a-8cd1-0c04702c98c6)
├── operator (b98dc2d7-3562-41b8-823f-5272a020c0e0)
└── super_admin (3a4677e5-b31b-465f-84c4-44d738b678b4) ✅
```

---

## 🐛 THE BUG EXPLAINED

### **Why Super Admin Check Doesn't Work:**

```typescript
// In auth.middleware.ts line 52:
role: profile.role || profile.role_badge || 'Employee'
//     ^^^^^^^^^^^^    ^^^^^^^^^^^^^^^^
//     'Admin'         'super_admin'
//     This is used!   This is ignored!

// Later in line 166:
if (user.role === 'Super Admin') {  // ❌ NEVER TRUE!
  return true
}
```

**What happens:**
1. User has `profile.role = 'Admin'` (from CHECK constraint)
2. User has `profile.role_badge = 'super_admin'`
3. Code uses `profile.role` first (because it's not null)
4. So `user.role = 'Admin'` (not 'Super Admin')
5. Super Admin check fails! ❌

---

## 🔧 THE FIX

### **Option 1: Quick Fix (Recommended)**

Update the middleware to check BOTH fields:

```typescript
// In auth.middleware.ts line 166:
export async function hasPermission(user: User, permission: string): Promise<boolean> {
  // Super Admin has all permissions
  // Check BOTH role and role_badge
  if (user.role === 'Super Admin' || 
      user.role === 'super_admin' ||
      user.role_badge === 'super_admin' ||
      user.role_badge === 'Super Admin') {
    return true
  }
  
  // ... rest of code
}
```

**Also update line 52:**
```typescript
// Prioritize role_badge for super_admin
const userRole = profile.role_badge === 'super_admin' 
  ? 'Super Admin' 
  : (profile.role || profile.role_badge || 'Employee')

return {
  id: profile.id,
  email: profile.email,
  full_name: profile.full_name,
  role: userRole
}
```

---

### **Option 2: Remove CHECK Constraint (Better)**

Remove the outdated constraint:

```sql
-- Drop the constraint
ALTER TABLE profiles 
DROP CONSTRAINT profiles_role_check;

-- Now you can set role to 'Super Admin'
UPDATE profiles
SET role = 'Super Admin'
WHERE role_badge = 'super_admin';
```

**Benefits:**
- ✅ Allows any role value
- ✅ Makes role and role_badge consistent
- ✅ Simpler code

---

### **Option 3: Deprecate Both Fields (Best Long-term)**

Use ONLY the `user_roles` table:

```typescript
// Remove role and role_badge from profiles
// Get role from user_roles table only

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  // ... auth code ...
  
  // Get user's primary role from user_roles
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id)
    .eq('roles.name', 'super_admin')
    .single()
  
  const isSuperAdmin = !!userRole
  
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: isSuperAdmin ? 'Super Admin' : 'Employee'
  }
}
```

**Benefits:**
- ✅ Single source of truth
- ✅ Proper RBAC implementation
- ✅ No field duplication
- ✅ Scalable

---

## 📋 COMPARISON TABLE

| Aspect | `role` | `role_badge` | `user_roles` |
|--------|--------|--------------|--------------|
| **Constraint** | ❌ Limited to 3 values | ✅ No constraint | ✅ Flexible |
| **Super Admin** | ❌ Not allowed | ✅ Allowed | ✅ Allowed |
| **Multiple Roles** | ❌ No | ❌ No | ✅ Yes |
| **Scalability** | ❌ Poor | ⚠️ Medium | ✅ Excellent |
| **RBAC Standard** | ❌ No | ❌ No | ✅ Yes |
| **Current Usage** | ⚠️ Used first | ⚠️ Fallback | ✅ Proper |

---

## 🎯 RECOMMENDATION

### **Immediate Action (Today):**

1. **Fix the middleware** to check both fields (Option 1)
2. **Test** that Super Admin permissions work

### **Short Term (This Week):**

1. **Remove CHECK constraint** (Option 2)
2. **Sync role and role_badge** fields
3. **Update all users** to have consistent values

### **Long Term (Next Month):**

1. **Deprecate both fields** (Option 3)
2. **Use only user_roles table**
3. **Update all code** to use proper RBAC
4. **Remove role and role_badge columns**

---

## 🔍 WHY THIS HAPPENED

This is a classic case of **technical debt** and **evolving requirements**:

```
Timeline:
2024 → profiles.role created with CHECK constraint
       (Only needed: Admin, Operator, Test User)
       
2025 → Need for Super Admin added
       ❌ Can't modify role (constraint blocks it)
       ✅ Add role_badge as workaround
       
2025 → Implement proper RBAC with user_roles table
       ⚠️ But old fields still exist!
       
NOW → Three different role systems coexist
       → Confusion and bugs!
```

---

## ✅ CONCLUSION

**Why they're different:**
- `role` = Legacy field with constraints (can't be 'Super Admin')
- `role_badge` = Workaround field (can be 'super_admin')
- They serve **different purposes** due to technical debt

**Why it's confusing:**
- Code checks `role` first, ignoring `role_badge`
- Super Admin check doesn't work properly
- Three systems (role, role_badge, user_roles) not synchronized

**Solution:**
- **Quick:** Fix middleware to check both fields
- **Better:** Remove constraint and sync fields
- **Best:** Use only user_roles table (proper RBAC)

---

**Status:** 🔴 **NEEDS FIXING**  
**Priority:** HIGH  
**Impact:** Super Admin permissions may not work correctly
