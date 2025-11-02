# 🔴 PRODUCTION API DIAGNOSTIC REPORT

**Date:** 2025-11-02 03:22 IST  
**Status:** CRITICAL - 500 Internal Server Errors

---

## ✅ WORKING COMPONENTS

### Navigation System
- ✅ `/dashboard` → `/chart` - **WORKING**
- ✅ `/dashboard` → `/attendance` - **WORKING**
- ✅ `/dashboard` → `/personnel` - **WORKING**
- ✅ No redirect loops detected
- ✅ Authentication flow stable
- ✅ Session management functional

---

## 🔴 FAILING COMPONENTS

### Production API Endpoints

#### 1. `/api/production/orders`
- **Status:** 500 Internal Server Error
- **Method:** GET
- **URL:** `http://localhost:3000/api/production/orders?page=1&limit=50`
- **Error Count:** 2 attempts failed

#### 2. `/api/production/machines`
- **Status:** 500 Internal Server Error
- **Method:** GET
- **URL:** `http://localhost:3000/api/production/machines?page=1&limit=50`
- **Error Count:** 2 attempts failed

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue #1: RLS Policy Mismatch

**Problem:** The API routes use `requirePermission(request, 'operate_machine')` middleware, but the RLS policies check for permissions in the `user_permissions` table.

**Code Analysis:**

**API Route (orders/route.ts:12):**
```typescript
const authResult = await requirePermission(request, 'operate_machine')
```

**RLS Policy (migration SQL:180-187):**
```sql
CREATE POLICY "Users with operate_machine can manage orders" ON production_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = auth.uid() AND p.code = 'operate_machine'
    )
  );
```

**The Problem:**
- The middleware checks permissions via RBAC (role_permissions table)
- The RLS policy checks permissions via user_permissions table
- These are TWO DIFFERENT permission systems
- User likely has role-based permissions but NOT user-specific permissions

---

### Issue #2: Missing Authorization Header

**Problem:** API calls from frontend may not include the Authorization Bearer token.

**Evidence:**
- `requirePermission` middleware expects: `Authorization: Bearer <token>`
- Frontend API client may not be sending this header
- Without the header, `getUserFromRequest` returns null → 401 Unauthorized

---

### Issue #3: Database Tables May Not Exist

**Problem:** Migration may not have been applied to the database.

**Tables Required:**
- `production_orders`
- `machines`
- `production_personnel`
- `production_tasks`
- `system_alerts`
- `quality_checks`
- `maintenance_records`

**Migration File:** `20251025_production_monitoring_tables.sql`

---

## 📋 DETAILED FINDINGS

### Middleware Flow (auth.middleware.ts)

1. **getUserFromRequest (line 13-62)**
   - Extracts Bearer token from Authorization header
   - Verifies token with Supabase
   - Fetches user profile with role
   - Returns User object or null

2. **requirePermission (line 283-314)**
   - Calls `getUserFromRequest`
   - If no user → 401 Unauthorized
   - Calls `hasPermission(user, 'operate_machine')`
   - If no permission → 403 Forbidden

3. **hasPermission (line 167-217)**
   - Super Admin → always true
   - Gets user roles from `user_roles` table
   - Gets role permissions from `role_permissions` table
   - Checks if permission code exists in role permissions

### RLS Policy Flow

1. **Policy checks `user_permissions` table** (NOT `role_permissions`)
2. **Joins with `permissions` table**
3. **Checks if user has direct permission assignment**

### The Disconnect

```
MIDDLEWARE CHECKS:     user → user_roles → role_permissions → permissions
RLS POLICY CHECKS:     user → user_permissions → permissions
```

**These are different permission paths!**

---

## 🎯 RECOMMENDED FIXES

### Fix #1: Update RLS Policies to Match RBAC System

**Change RLS policies to check role-based permissions:**

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Users with operate_machine can manage orders" ON production_orders;
DROP POLICY IF EXISTS "Users with operate_machine can manage machines" ON machines;

-- Create new RBAC-compatible policies
CREATE POLICY "Users with operate_machine can manage orders" ON production_orders
  FOR ALL USING (
    -- Super Admin has all access
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
    OR
    -- Check role-based permissions
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code = 'operate_machine'
    )
  );

CREATE POLICY "Users with operate_machine can manage machines" ON machines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid() AND p.code = 'operate_machine'
    )
  );
```

### Fix #2: Verify Migration Applied

**Run this SQL to check if tables exist:**

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'production_orders',
  'machines',
  'production_personnel',
  'production_tasks'
);
```

**If tables don't exist, apply migration:**
```bash
# Apply the migration
psql -h <host> -U <user> -d <database> -f supabase/migrations/20251025_production_monitoring_tables.sql
```

### Fix #3: Add Authorization Header to Frontend API Calls

**Check frontend API client (api-client.ts):**

```typescript
// Ensure Authorization header is included
const token = await supabase.auth.getSession()
const headers = {
  'Authorization': `Bearer ${token.data.session?.access_token}`,
  'Content-Type': 'application/json'
}
```

---

## 🚨 IMMEDIATE ACTION REQUIRED

### Priority 1: Fix RLS Policies (CRITICAL)
- Update RLS policies to use RBAC system
- Apply new policies to database
- **Estimated Time:** 10 minutes

### Priority 2: Verify Database Tables
- Check if production tables exist
- Apply migration if needed
- **Estimated Time:** 5 minutes

### Priority 3: Check Frontend Authorization
- Verify API client sends Bearer token
- Test API calls with proper headers
- **Estimated Time:** 5 minutes

---

## 📊 IMPACT ASSESSMENT

### Affected Features
- ❌ Production Orders Management
- ❌ Machine Monitoring
- ❌ Production Tasks
- ❌ Personnel Management
- ❌ Quality Checks
- ❌ Maintenance Records

### Unaffected Features
- ✅ Dashboard Navigation
- ✅ Chart/Analytics
- ✅ Attendance Tracking
- ✅ User Authentication
- ✅ Session Management

---

## 🔧 TESTING PLAN

After applying fixes:

1. **Test API Endpoints:**
   ```bash
   curl -H "Authorization: Bearer <token>" \
        http://localhost:3000/api/production/orders
   ```

2. **Check Database:**
   ```sql
   SELECT COUNT(*) FROM production_orders;
   SELECT COUNT(*) FROM machines;
   ```

3. **Verify RLS:**
   ```sql
   -- Test as authenticated user
   SET ROLE authenticated;
   SELECT * FROM production_orders LIMIT 1;
   ```

4. **Frontend Testing:**
   - Navigate to `/production/orders`
   - Navigate to `/production/machines`
   - Verify data loads without 500 errors

---

## 📝 CONCLUSION

**Root Cause:** RLS policies use `user_permissions` table while middleware uses `role_permissions` table (RBAC). This mismatch causes permission checks to fail even when user has correct role-based permissions.

**Solution:** Update RLS policies to check role-based permissions via `user_roles` → `role_permissions` → `permissions` path, matching the middleware logic.

**Status:** Ready to implement fixes.
