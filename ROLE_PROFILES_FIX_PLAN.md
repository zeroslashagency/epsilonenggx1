# ROLE PROFILES - COMPLETE FIX PLAN
**Created:** 2025-10-30 04:57 AM  
**Priority:** HIGH  
**Estimated Time:** 4-6 hours

---

## 🎯 OBJECTIVES

Fix all critical issues in Role Profiles system:
1. ✅ Fix permission display bug
2. ✅ Connect delete button with user validation
3. ✅ Implement clone functionality
4. ✅ Fix permission saving consistency

---

## 📋 DETAILED IMPLEMENTATION PLAN

### TASK 1: Fix Permission Display Bug
**Priority:** CRITICAL  
**Time:** 1.5 hours  
**Files to Modify:**
- `/app/settings/roles/[id]/edit/page.tsx`
- `/app/settings/roles/[id]/edit/permissionData.ts`

**Steps:**
1. Modify `fetchRole()` function to properly map database permissions to UI state
2. Clear default checked states from `initialPermissionModules`
3. Update permission state initialization logic
4. Ensure checkboxes reflect actual database values

**Code Changes:**
```typescript
// In fetchRole() function
if (role.permissions_json && typeof role.permissions_json === 'object') {
  // Create a fresh copy of initialPermissionModules with all unchecked
  const freshModules = JSON.parse(JSON.stringify(initialPermissionModules))
  
  // Uncheck everything first
  Object.keys(freshModules).forEach(moduleKey => {
    Object.keys(freshModules[moduleKey].permissions).forEach(permKey => {
      freshModules[moduleKey].permissions[permKey].checked = false
    })
  })
  
  // Now check only the permissions from database
  Object.keys(role.permissions_json).forEach(moduleKey => {
    if (freshModules[moduleKey]) {
      Object.keys(role.permissions_json[moduleKey].permissions).forEach(permKey => {
        if (freshModules[moduleKey].permissions[permKey]) {
          freshModules[moduleKey].permissions[permKey].checked = 
            role.permissions_json[moduleKey].permissions[permKey].checked
        }
      })
    }
  })
  
  setPermissionModules(freshModules)
}
```

**Testing:**
- Open Operator role (should show only 4 permissions checked)
- Open Admin role (should show 8 permissions checked)
- Verify unchecked permissions remain unchecked

---

### TASK 2: Connect Delete Button with User Validation
**Priority:** CRITICAL  
**Time:** 2 hours  
**Files to Modify:**
- `/app/settings/roles/page.tsx`
- `/app/api/admin/roles/[id]/route.ts` (enhance existing DELETE endpoint)

**Implementation:**

#### Step 1: Create User Check API Enhancement
Modify DELETE endpoint to check if role is assigned to users:

```typescript
// In /app/api/admin/roles/[id]/route.ts - DELETE function
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireRole(request, ['Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const roleId = params.id
    
    // Get role name first
    const { data: role } = await supabase
      .from('roles')
      .select('name')
      .eq('id', roleId)
      .single()
    
    // Check if any users have this role
    const { data: usersWithRole, error: userCheckError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', role.name)
    
    if (userCheckError) throw userCheckError
    
    // If users exist with this role, return error with user list
    if (usersWithRole && usersWithRole.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete role',
        message: `This role is assigned to ${usersWithRole.length} user(s). Please reassign these users to another role before deleting.`,
        users: usersWithRole.map(u => ({
          name: u.full_name,
          email: u.email
        }))
      }, { status: 400 })
    }
    
    // Safe to delete - no users have this role
    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId)

    if (deleteError) throw deleteError

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'role_deleted',
        meta_json: {
          role_id: roleId,
          role_name: role.name,
          deleted_by: user.email
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete role'
    }, { status: 500 })
  }
}
```

#### Step 2: Add Delete Handler to UI

```typescript
// In /app/settings/roles/page.tsx
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
const [deleteError, setDeleteError] = useState<string | null>(null)
const [affectedUsers, setAffectedUsers] = useState<any[]>([])

const handleDeleteClick = (role: Role) => {
  setRoleToDelete(role)
  setDeleteError(null)
  setAffectedUsers([])
  setDeleteConfirmOpen(true)
}

const handleDeleteConfirm = async () => {
  if (!roleToDelete) return
  
  try {
    const response = await fetch(`/api/admin/roles/${roleToDelete.id}`, {
      method: 'DELETE'
    })
    
    const data = await response.json()
    
    if (!data.success) {
      // Role is assigned to users
      setDeleteError(data.message)
      setAffectedUsers(data.users || [])
      return
    }
    
    // Success - refresh roles list
    setDeleteConfirmOpen(false)
    setRoleToDelete(null)
    fetchRoles()
    
  } catch (error) {
    setDeleteError('Failed to delete role. Please try again.')
  }
}
```

#### Step 3: Add Confirmation Dialog UI

```tsx
{/* Delete Confirmation Dialog */}
{deleteConfirmOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-semibold text-[#12263F] dark:text-white mb-4">
        Delete Role: {roleToDelete?.name}
      </h3>
      
      {deleteError ? (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <p className="text-sm text-red-800 dark:text-red-200">{deleteError}</p>
          </div>
          
          {affectedUsers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#12263F] dark:text-white">
                Users with this role:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {affectedUsers.map((user, idx) => (
                  <div key={idx} className="text-sm text-[#95AAC9] bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {user.name} ({user.email})
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#95AAC9] mt-2">
                Please reassign these users to another role before deleting.
              </p>
            </div>
          )}
          
          <button
            onClick={() => {
              setDeleteConfirmOpen(false)
              setRoleToDelete(null)
              setDeleteError(null)
              setAffectedUsers([])
            }}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-[#12263F] dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[#95AAC9]">
            Are you sure you want to delete this role? This action cannot be undone.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDeleteConfirmOpen(false)
                setRoleToDelete(null)
              }}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-[#12263F] dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)}
```

#### Step 4: Connect Button

```tsx
<button 
  onClick={() => handleDeleteClick(role)}
  className="px-3 py-1 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
>
  🗑️
</button>
```

**Testing:**
1. Try to delete role assigned to users → Should show error with user list
2. Try to delete unused role → Should delete successfully
3. Verify audit log is created

---

### TASK 3: Implement Clone Functionality
**Priority:** HIGH  
**Time:** 1.5 hours  
**Files to Create/Modify:**
- `/app/api/admin/roles/[id]/clone/route.ts` (NEW)
- `/app/settings/roles/page.tsx` (MODIFY)

**Implementation:**

#### Step 1: Create Clone API Endpoint

```typescript
// NEW FILE: /app/api/admin/roles/[id]/clone/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/app/lib/services/supabase-client'
import { requireRole } from '@/app/lib/middleware/auth.middleware'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(request, ['Admin', 'Super Admin'])
  if (authResult instanceof NextResponse) return authResult
  const user = authResult

  try {
    const supabase = getSupabaseAdminClient()
    const sourceRoleId = params.id
    
    // Get source role
    const { data: sourceRole, error: fetchError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', sourceRoleId)
      .single()
    
    if (fetchError) throw fetchError
    
    // Generate new name
    let newName = `${sourceRole.name} (Copy)`
    let counter = 1
    
    // Check if name exists, increment counter if needed
    while (true) {
      const { data: existing } = await supabase
        .from('roles')
        .select('id')
        .eq('name', newName)
        .single()
      
      if (!existing) break
      
      counter++
      newName = `${sourceRole.name} (Copy ${counter})`
    }
    
    // Create cloned role
    const { data: newRole, error: createError } = await supabase
      .from('roles')
      .insert({
        name: newName,
        description: sourceRole.description,
        is_manufacturing_role: sourceRole.is_manufacturing_role,
        permissions_json: sourceRole.permissions_json
      })
      .select()
      .single()
    
    if (createError) throw createError
    
    // Clone role_permissions if they exist
    const { data: sourcePermissions } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', sourceRoleId)
    
    if (sourcePermissions && sourcePermissions.length > 0) {
      const permissionInserts = sourcePermissions.map(sp => ({
        role_id: newRole.id,
        permission_id: sp.permission_id
      }))
      
      await supabase
        .from('role_permissions')
        .insert(permissionInserts)
    }
    
    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        action: 'role_cloned',
        meta_json: {
          source_role_id: sourceRoleId,
          source_role_name: sourceRole.name,
          new_role_id: newRole.id,
          new_role_name: newName,
          cloned_by: user.email
        }
      })
    
    return NextResponse.json({
      success: true,
      data: newRole,
      message: `Role cloned as "${newName}"`
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clone role'
    }, { status: 500 })
  }
}
```

#### Step 2: Add Clone Handler to UI

```typescript
// In /app/settings/roles/page.tsx
const handleCloneRole = async (role: Role) => {
  try {
    const response = await fetch(`/api/admin/roles/${role.id}/clone`, {
      method: 'POST'
    })
    
    const data = await response.json()
    
    if (data.success) {
      // Show success message
      alert(`Role cloned successfully as "${data.data.name}"`)
      // Refresh roles list
      fetchRoles()
    } else {
      alert(`Failed to clone role: ${data.error}`)
    }
  } catch (error) {
    alert('Failed to clone role. Please try again.')
  }
}
```

#### Step 3: Connect Button

```tsx
<button 
  onClick={() => handleCloneRole(role)}
  className="px-3 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
>
  Clone
</button>
```

**Testing:**
1. Clone Operator role → Should create "Operator (Copy)"
2. Clone again → Should create "Operator (Copy 2)"
3. Verify permissions are copied
4. Verify audit log is created

---

### TASK 4: Fix Permission Saving Consistency
**Priority:** MEDIUM  
**Time:** 1 hour  
**Files to Modify:**
- `/app/api/admin/roles/[id]/route.ts`

**Implementation:**

```typescript
// In PUT /api/admin/roles/[id] endpoint
// After updating permissions_json, also update role_permissions table

if (permissions) {
  updateData.permissions_json = permissions
  
  // Also sync role_permissions table
  // First, delete existing permissions
  await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
  
  // Extract permission codes from permissions_json
  const permissionCodes: string[] = []
  Object.values(permissions).forEach((module: any) => {
    Object.entries(module.permissions || {}).forEach(([key, perm]: [string, any]) => {
      if (perm.checked) {
        permissionCodes.push(key)
      }
    })
  })
  
  // Get permission IDs from codes
  if (permissionCodes.length > 0) {
    const { data: permissionData } = await supabase
      .from('permissions')
      .select('id, code')
      .in('code', permissionCodes)
    
    if (permissionData && permissionData.length > 0) {
      const rolePermissionInserts = permissionData.map(p => ({
        role_id: roleId,
        permission_id: p.id
      }))
      
      await supabase
        .from('role_permissions')
        .insert(rolePermissionInserts)
    }
  }
}
```

**Testing:**
1. Edit role permissions
2. Save
3. Verify both `permissions_json` and `role_permissions` table are updated
4. Verify user permissions work correctly

---

## 📊 IMPLEMENTATION ORDER

1. **TASK 2** - Connect Delete Button (2 hours)
   - Most visible missing functionality
   - User validation is important safety feature

2. **TASK 1** - Fix Permission Display (1.5 hours)
   - Critical UX issue causing confusion
   - Affects all role editing

3. **TASK 3** - Implement Clone (1.5 hours)
   - Advertised feature that doesn't work
   - Useful for creating similar roles

4. **TASK 4** - Fix Permission Saving (1 hour)
   - Backend consistency issue
   - Less visible but important

**Total Estimated Time:** 6 hours

---

## ✅ SUCCESS CRITERIA

### Task 1 - Permission Display:
- [ ] Operator role shows only 4 permissions checked
- [ ] Admin role shows only 8 permissions checked
- [ ] Unchecked permissions remain unchecked
- [ ] No false positives (everything checked)

### Task 2 - Delete Button:
- [ ] Delete button shows confirmation dialog
- [ ] Cannot delete role assigned to users
- [ ] Shows list of affected users
- [ ] Shows helpful message to reassign users first
- [ ] Can delete unused roles successfully
- [ ] Audit log created on deletion

### Task 3 - Clone Button:
- [ ] Clone creates new role with "(Copy)" suffix
- [ ] Multiple clones increment counter
- [ ] All permissions copied correctly
- [ ] Audit log created on clone
- [ ] Roles list refreshes after clone

### Task 4 - Permission Saving:
- [ ] Both `permissions_json` and `role_permissions` updated
- [ ] No data inconsistency
- [ ] User permissions work correctly after save

---

## 🧪 TESTING CHECKLIST

### Pre-Implementation Tests:
- [x] Verified Clone button does nothing
- [x] Verified Delete button does nothing
- [x] Verified permission display shows all checked
- [x] Documented all issues in test report

### Post-Implementation Tests:
- [ ] Test delete with users assigned to role
- [ ] Test delete with no users assigned
- [ ] Test clone functionality
- [ ] Test clone naming (Copy, Copy 2, etc.)
- [ ] Test permission display accuracy
- [ ] Test permission save consistency
- [ ] Verify audit logs for all operations
- [ ] Test error handling
- [ ] Test loading states
- [ ] Cross-browser testing

---

## 🚨 ROLLBACK PLAN

If issues occur during implementation:

1. **Git Branches:**
   - Create feature branch for each task
   - Test thoroughly before merging
   - Keep main branch stable

2. **Database Backups:**
   - Backup `roles` table before changes
   - Backup `role_permissions` table
   - Document rollback SQL scripts

3. **Rollback Steps:**
   ```bash
   # Revert code changes
   git checkout main
   git reset --hard <previous-commit>
   
   # Restore database if needed
   # (Use Supabase dashboard or SQL scripts)
   ```

---

## 📝 NOTES

- All changes maintain backward compatibility
- No breaking changes to existing functionality
- Audit logs track all role modifications
- User-friendly error messages
- Proper permission checks on all endpoints
- TypeScript types maintained throughout

---

## 🎯 NEXT STEPS AFTER COMPLETION

1. **Documentation:**
   - Update API documentation
   - Create user guide for role management
   - Document permission system

2. **Enhancements:**
   - Add role templates
   - Add bulk user reassignment
   - Add role usage analytics
   - Add permission search/filter

3. **Testing:**
   - Add unit tests
   - Add integration tests
   - Add E2E tests

4. **Monitoring:**
   - Track role deletion attempts
   - Monitor permission changes
   - Alert on suspicious activity
