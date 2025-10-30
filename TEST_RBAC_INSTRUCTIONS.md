# 🧪 RBAC Testing Instructions

## ✅ Changes Applied

### 1. Auth Context (`auth-context.tsx`)
- ✅ Now fetches `permissions_json` from database
- ✅ Stores full permission structure (not hardcoded strings)
- ✅ Updated `hasPermission()` to check granular permissions
- ✅ Signature: `hasPermission(moduleKey, itemKey, action)`

### 2. Sidebar (`ZohoSidebar.tsx`)
- ✅ Added permission checks to menu items
- ✅ Dashboard, Schedule Generator, Chart, Analytics, Attendance
- ✅ Menu items hidden if user lacks permission
- ✅ Super Admin sees everything

---

## 🧪 How to Test

### Test 1: Edit Operator Role Permissions

1. **Login as Admin/Super Admin**
2. **Go to:** `http://localhost:3000/settings/roles`
3. **Click Edit** on "Operator" role
4. **Uncheck ALL permissions** except:
   - Dashboard → View ✓
   - Attendance → View ✓
5. **Click Save**
6. **Check console logs:**
   ```
   🔄 Syncing role_permissions table...
   📋 Found X active permissions
   ✅ Synced X permissions to role_permissions table
   ```

### Test 2: Verify Permission Enforcement

1. **Logout**
2. **Login as Operator user**
3. **Check console logs:**
   ```
   🔍 Fetching user profile and permissions...
   👤 User role: operator
   ✅ Loaded permissions from database: X modules
   ```
4. **Check sidebar:**
   - ✅ Dashboard visible
   - ✅ Attendance visible
   - ❌ Schedule Generator hidden
   - ❌ Chart hidden
   - ❌ Analytics hidden

### Test 3: Real-time Updates

1. **Keep Operator logged in**
2. **In another browser/incognito, login as Admin**
3. **Edit Operator role, add Chart permission**
4. **Save**
5. **Go back to Operator browser**
6. **Refresh page** (Ctrl+R / Cmd+R)
7. **Check sidebar:**
   - ✅ Chart now visible

---

## 📊 Expected Behavior

### Super Admin
- Sees ALL menu items
- No permission checks applied
- Full access to everything

### Admin
- Sees items based on `permissions_json` in database
- Menu items hidden if permission missing
- Can edit role permissions

### Operator (Example)
- **Default permissions:** Dashboard, Attendance
- **Should see:** Dashboard, Attendance only
- **Should NOT see:** Schedule Generator, Chart, Analytics

### Monitor (Example)
- **Default permissions:** Dashboard, Chart, Analytics
- **Should see:** Dashboard, Chart, Analytics
- **Should NOT see:** Schedule Generator, Attendance

---

## 🔍 Debugging

### Check Database Permissions

```sql
-- Check what permissions are stored for Operator role
SELECT name, permissions_json 
FROM roles 
WHERE name = 'operator';
```

### Check Console Logs

**On login, you should see:**
```
🔍 Fetching user profile and permissions...
👤 User role: operator
✅ Loaded permissions from database: 8 modules
```

**If you see:**
```
⚠️ No permissions_json found for role: operator
```
**Problem:** Role has empty `permissions_json` - edit and save the role.

### Check Sidebar Rendering

**Open browser DevTools → Console**

Menu items are now conditionally rendered based on:
```typescript
userRole === 'Super Admin' || hasPermission('main_dashboard', 'Dashboard', 'view')
```

---

## ⚠️ Known Limitations

### Currently Protected:
- ✅ Sidebar menu items (Dashboard, Schedule Generator, Chart, Analytics, Attendance)
- ✅ Backend API endpoints (via `requireRole()` middleware)

### NOT YET Protected:
- ❌ Buttons within pages (Edit, Delete, Export)
- ❌ Sections within pages (cards, tables)
- ❌ Production/Monitoring sub-menus
- ❌ Settings sub-menus

### Next Steps:
1. Add permission checks to page-level buttons
2. Add permission checks to Production/Monitoring menus
3. Add permission checks to Settings menu
4. Add permission checks to individual features

---

## 🎯 Success Criteria

✅ **PASS if:**
- Editing role permissions updates database
- Logging in fetches permissions from database
- Sidebar hides menu items based on permissions
- Different roles see different menu items
- Super Admin sees everything

❌ **FAIL if:**
- All users see all menu items regardless of role
- Console shows "No permissions_json found"
- Editing role has no effect on UI
- Hardcoded permissions still in use

---

## 📝 Test Results Template

```
Test Date: ___________
Tester: ___________

Test 1: Edit Role Permissions
- [ ] Can edit Operator role
- [ ] Can save permissions
- [ ] Console shows sync message
- [ ] Database updated

Test 2: Permission Enforcement
- [ ] Operator sees only Dashboard + Attendance
- [ ] Admin sees correct items
- [ ] Super Admin sees everything
- [ ] Console shows correct logs

Test 3: Real-time Updates
- [ ] Editing role affects logged-in users
- [ ] Refresh loads new permissions
- [ ] Menu items appear/disappear correctly

Issues Found:
_________________________
_________________________
_________________________
```

---

**Report any issues with screenshots and console logs!**
