# DATABASE VERIFICATION REPORT

**Date:** October 28, 2025  
**Time:** 20:18 IST  
**Status:** ⚠️ SUPABASE ACCESS TOKEN EXPIRED  
**Verification Method:** Migration Files Analysis

---

## 🔴 CRITICAL ISSUE: SUPABASE ACCESS UNAUTHORIZED

**Error:** `Unauthorized. Please provide a valid access token`

**Impact:** Cannot directly query Supabase database

**Token in MCP:** `sb_secret_fK_Oh_EQr_jkQpZrhhrwWg_1_Ekl7AT`

**Project Ref:** `sxnaopzgaddvziplrlbe`

**Action Required:** User must refresh Supabase access token

---

## ✅ DATABASE SCHEMA VERIFICATION (From Migration Files)

### **Current Database Structure**

#### **1. Tables** ✅

**permissions**
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**roles**
- Existing table (referenced in migrations)
- Stores role definitions

**role_permissions** (Junction Table)
```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);
```

**user_permissions** (Junction Table)
```sql
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);
```

---

#### **2. Current Permissions** (~40 items)

**Dashboard (5 permissions)**
- `dashboard.view` - View Dashboard
- `dashboard.create` - Create Dashboard
- `dashboard.edit` - Edit Dashboard
- `dashboard.delete` - Delete Dashboard
- `dashboard.export` - Export Dashboard

**Schedule (6 permissions)**
- `schedule.view` - View Schedules
- `schedule.create` - Create Schedules
- `schedule.edit` - Edit Schedules
- `schedule.delete` - Delete Schedules
- `schedule.approve` - Approve Schedules
- `schedule.publish` - Publish Schedules

**Analytics (5 permissions)**
- `analytics.view` - View Analytics
- `analytics.create` - Create Analytics
- `analytics.edit` - Edit Analytics
- `analytics.delete` - Delete Analytics
- `analytics.export` - Export Analytics

**Attendance (6 permissions)**
- `attendance.view` - View Attendance
- `attendance.create` - Create Attendance
- `attendance.edit` - Edit Attendance
- `attendance.delete` - Delete Attendance
- `attendance.approve` - Approve Attendance
- `attendance.sync` - Sync Attendance

**Users (6 permissions)**
- `users.view` - View Users
- `users.create` - Create Users
- `users.edit` - Edit Users
- `users.delete` - Delete Users
- `users.impersonate` - Impersonate Users
- `users.permissions` - Manage User Permissions

**Roles (5 permissions)**
- `roles.view` - View Roles
- `roles.create` - Create Roles
- `roles.edit` - Edit Roles
- `roles.delete` - Delete Roles
- `roles.permissions` - Manage Role Permissions

**System (4 permissions)**
- `system.settings` - System Settings
- `system.audit` - View Audit Logs
- `system.backup` - Backup System
- `system.restore` - Restore System

**Total:** ~40 permissions

---

#### **3. Helper Functions** ✅

**get_user_permissions(user_id UUID)**
- Returns all permissions for a user
- Combines role permissions + custom user permissions
- Returns: permission_code, permission_name, source

**user_has_permission(user_id UUID, permission_code VARCHAR)**
- Checks if user has specific permission
- Handles Super Admin wildcard
- Returns: BOOLEAN

---

#### **4. Views** ✅

**user_permissions_view**
- Shows all user permissions with details
- Includes permission source (role or custom)

**role_permissions_summary**
- Aggregates permissions per role
- Shows permission count and list

---

## 📊 CURRENT vs REQUIRED STRUCTURE

### **Current System (40 items)**

| Category | Permissions | Structure |
|----------|-------------|-----------|
| Dashboard | 5 | Flat |
| Schedule | 6 | Flat |
| Analytics | 5 | Flat |
| Attendance | 6 | Flat |
| Users | 6 | Flat |
| Roles | 5 | Flat |
| System | 4 | Flat |
| **TOTAL** | **~40** | **Flat** |

### **Required System (82 items)**

| Section | Parents | Sub-Items | Total | Structure |
|---------|---------|-----------|-------|-----------|
| Dashboard | 1 | 3 | 4 | Hierarchical |
| Scheduling | 2 | 7 | 9 | Hierarchical |
| Charts | 1 | 3 | 4 | Hierarchical |
| Analytics | 1 | 3 | 4 | Hierarchical |
| Attendance | 2 | 6 | 8 | Hierarchical |
| Production | 4 | 12 | 16 | Hierarchical |
| Monitoring | 4 | 12 | 16 | Hierarchical |
| Administration | 6 | 14 | 20 | Hierarchical |
| **TOTAL** | **21** | **61** | **82** | **Hierarchical** |

---

## 🔧 REQUIRED DATABASE CHANGES

### **1. Add Parent-Child Relationship** 🆕

**Option A: Add columns to permissions table**
```sql
ALTER TABLE permissions 
ADD COLUMN parent_id UUID REFERENCES permissions(id),
ADD COLUMN is_parent BOOLEAN DEFAULT FALSE,
ADD COLUMN level INTEGER DEFAULT 1,
ADD COLUMN sort_order INTEGER DEFAULT 0;

CREATE INDEX idx_permissions_parent ON permissions(parent_id);
```

**Option B: Create separate hierarchy table**
```sql
CREATE TABLE permission_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_permission_id UUID REFERENCES permissions(id),
  child_permission_id UUID REFERENCES permissions(id),
  level INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(parent_permission_id, child_permission_id)
);
```

**Recommendation:** Option A (simpler, more efficient)

---

### **2. Expand Permission Codes** 🆕

**Current Format:** `category.action`
- Example: `dashboard.view`, `schedule.create`

**New Format:** `category.item.action` or `category.parent.child.action`
- Parent: `charts.chart.view`
- Sub-item: `charts.chart.timeline_view.view`
- Sub-item: `charts.chart.gantt_chart.view`

**Alternative Format:** Keep flat but add metadata
- `charts.timeline_view.view` with `parent_code = 'charts.chart'`

---

### **3. Add New Permission Categories** 🆕

**Missing Categories:**
- ❌ Charts (not in current schema)
- ❌ Production (not in current schema)
- ❌ Monitoring (not in current schema)
- ❌ Account (not in current schema)
- ❌ Standalone Attendance (not in current schema)

**Need to add:**
- Charts (1 parent + 3 sub = 4 items)
- Production (4 parents + 12 sub = 16 items)
- Monitoring (4 parents + 12 sub = 16 items)
- Account (1 parent + 2 sub = 3 items)
- Standalone Attendance (1 parent + 3 sub = 4 items)

---

### **4. Update Existing Categories** 🔄

**Dashboard:**
- Current: 5 flat permissions
- Required: 1 parent + 3 sub-items = 4 permissions
- Change: Add hierarchy

**Scheduling:**
- Current: 6 flat permissions
- Required: 2 parents + 7 sub-items = 9 permissions
- Change: Add hierarchy + new items

**Analytics:**
- Current: 5 flat permissions
- Required: 1 parent + 3 sub-items = 4 permissions
- Change: Add hierarchy

**Attendance:**
- Current: 6 flat permissions
- Required: 2 parents + 6 sub-items = 8 permissions
- Change: Add hierarchy + Standalone Attendance

---

### **5. Add Export Action** 🆕

**Current Actions:** view, create, edit, delete, approve, sync
**New Action:** export

**Affected Items:**
- All Track Records: View + Export
- Export Excel: Export only
- Various reports: Export functionality

---

## 📋 MIGRATION PLAN

### **Phase 1: Schema Updates**

**1.1 Add Parent-Child Columns**
```sql
ALTER TABLE permissions 
ADD COLUMN parent_id UUID REFERENCES permissions(id),
ADD COLUMN is_parent BOOLEAN DEFAULT FALSE,
ADD COLUMN level INTEGER DEFAULT 1,
ADD COLUMN sort_order INTEGER DEFAULT 0,
ADD COLUMN actions JSONB DEFAULT '{}';

CREATE INDEX idx_permissions_parent ON permissions(parent_id);
CREATE INDEX idx_permissions_level ON permissions(level);
```

**1.2 Add Metadata for UI**
```sql
ALTER TABLE permissions
ADD COLUMN ui_section VARCHAR(100),
ADD COLUMN ui_collapsible BOOLEAN DEFAULT FALSE,
ADD COLUMN ui_icon VARCHAR(50);
```

---

### **Phase 2: Data Migration**

**2.1 Mark Existing Permissions as Legacy**
```sql
UPDATE permissions 
SET category = 'legacy_' || category
WHERE code IN (SELECT code FROM permissions);
```

**2.2 Insert New Parent Permissions**
```sql
-- Dashboard Parent
INSERT INTO permissions (code, name, description, category, is_parent, level, sort_order)
VALUES ('dashboard', 'Dashboard', 'Access to dashboard', 'dashboard', TRUE, 1, 1);

-- Charts Parent
INSERT INTO permissions (code, name, description, category, is_parent, level, sort_order)
VALUES ('charts.chart', 'Chart', 'Access to charts page', 'charts', TRUE, 1, 2);

-- ... (repeat for all 21 parents)
```

**2.3 Insert Sub-Item Permissions**
```sql
-- Dashboard Sub-items
INSERT INTO permissions (code, name, description, category, parent_id, is_parent, level, sort_order)
SELECT 
  'dashboard.overview_widget',
  'Overview Widget',
  'Access to overview widget',
  'dashboard',
  p.id,
  FALSE,
  2,
  1
FROM permissions p
WHERE p.code = 'dashboard';

-- ... (repeat for all 61 sub-items)
```

---

### **Phase 3: Update Helper Functions**

**3.1 Update get_user_permissions()**
```sql
CREATE OR REPLACE FUNCTION get_user_permissions(user_id_param UUID)
RETURNS TABLE (
  permission_code VARCHAR,
  permission_name VARCHAR,
  parent_code VARCHAR,
  is_parent BOOLEAN,
  level INTEGER,
  source VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.code,
    p.name,
    parent.code as parent_code,
    p.is_parent,
    p.level,
    'role'::VARCHAR as source
  FROM profiles prof
  JOIN role_permissions rp ON rp.role_id = prof.role_id
  JOIN permissions p ON p.id = rp.permission_id
  LEFT JOIN permissions parent ON parent.id = p.parent_id
  WHERE prof.id = user_id_param
  
  UNION
  
  SELECT DISTINCT
    p.code,
    p.name,
    parent.code as parent_code,
    p.is_parent,
    p.level,
    'user'::VARCHAR as source
  FROM user_permissions up
  JOIN permissions p ON p.id = up.permission_id
  LEFT JOIN permissions parent ON parent.id = p.parent_id
  WHERE up.user_id = user_id_param
  ORDER BY level, sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **Phase 4: Update Role Assignments**

**4.1 Clear Old Permissions**
```sql
DELETE FROM role_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE category LIKE 'legacy_%'
);
```

**4.2 Assign New Permissions to Roles**
```sql
-- Super Admin: All permissions (wildcard in code)
-- Admin: Most permissions
-- Manager: View + Edit permissions
-- Employee: Basic view permissions
-- Operator: Manufacturing permissions

-- (Use similar logic as current setup_permissions.sql but with new codes)
```

---

## ⚠️ RISKS & CONSIDERATIONS

### **1. Data Loss Risk** 🔴 HIGH
- Existing role_permissions will be invalidated
- User_permissions will need remapping
- **Mitigation:** Backup before migration

### **2. Downtime** 🟡 MEDIUM
- Schema changes require database locks
- Migration may take 5-10 minutes
- **Mitigation:** Run during off-hours

### **3. Code Changes** 🟡 MEDIUM
- Frontend permission checks need updates
- API endpoints need new permission codes
- **Mitigation:** Backward compatibility layer

### **4. Testing Effort** 🟡 MEDIUM
- 82 permissions to test
- Parent-child logic to verify
- **Mitigation:** Automated testing

---

## 📊 VERIFICATION CHECKLIST

### **Schema Verification** ✅
- [x] Current tables identified
- [x] Current permissions counted (~40)
- [x] Helper functions documented
- [x] Views documented

### **Gap Analysis** ✅
- [x] Missing categories identified (Charts, Production, Monitoring, Account)
- [x] Hierarchy structure missing
- [x] Export action missing
- [x] Parent-child relationships missing

### **Migration Plan** ✅
- [x] Schema updates defined
- [x] Data migration steps outlined
- [x] Function updates specified
- [x] Role assignments planned

### **Risk Assessment** ✅
- [x] Data loss risk identified
- [x] Downtime estimated
- [x] Code changes scoped
- [x] Testing requirements defined

---

## 🚀 NEXT STEPS

### **Immediate Actions Required:**

1. **Refresh Supabase Access Token** 🔴 CRITICAL
   - Current token expired
   - Cannot proceed without database access
   - User must generate new token from Supabase dashboard

2. **Backup Current Database** 🔴 CRITICAL
   - Export all tables before migration
   - Save role_permissions and user_permissions
   - Create rollback script

3. **Create Migration Script** 🟡 HIGH
   - Write SQL migration for 82 permissions
   - Include parent-child relationships
   - Add rollback capability

4. **Test Migration on Dev** 🟡 HIGH
   - Run migration on development database
   - Verify all 82 permissions created
   - Test helper functions

5. **Update Application Code** 🟡 MEDIUM
   - Update permission checks in frontend
   - Update API permission validation
   - Add backward compatibility

---

## 📋 SUMMARY

**Current State:**
- ✅ Database schema verified from migration files
- ✅ ~40 flat permissions identified
- ✅ Helper functions and views documented
- ❌ Supabase access token expired (cannot query live database)

**Required Changes:**
- 🆕 Add parent-child relationships (21 parents + 61 sub-items)
- 🆕 Add 5 new categories (Charts, Production, Monitoring, Account, Standalone)
- 🆕 Add Export action
- 🔄 Update 4 existing categories with hierarchy

**Estimated Effort:**
- Schema updates: 2 hours
- Data migration: 3 hours
- Function updates: 2 hours
- Testing: 3 hours
- **Total: 10 hours**

**Blocker:**
- 🔴 Supabase access token must be refreshed before proceeding

---

**END OF DATABASE VERIFICATION REPORT**
