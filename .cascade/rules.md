# 🎯 EPSILON SCHEDULING PROJECT - IDE RULES

**Project:** Epsilon Scheduling System
**Created:** 2025-10-09
**Purpose:** Rules for AI assistants and developers working on this project

---

## 📑 TABLE OF CONTENTS

1. [🚨 Universal Rules](#-universal-rules-always-follow) - Apply to all features
2. [👥 User Management Rules](#-user-management-rules) - Users, permissions, roles, activity logs
3. [📊 Dashboard Rules](#-dashboard-rules) - Main dashboard, analytics, charts, KPIs
4. [⏰ Attendance Rules](#-attendance-rules) - Attendance tracking, sync, logs (🚨 PRODUCTION)
5. [⚙️ Settings Rules](#️-settings-rules) - System settings, organization, roles, logs
6. [📡 Monitoring Rules](#-monitoring-rules) - System health, machines, alerts
7. [🏭 Production Rules](#-production-rules) - Scheduling, machine allocation, optimization
8. [🔐 Authentication Rules](#-authentication-rules) - Login, auth, security
9. [🗄️ Database Rules](#️-database-rules) - Data integrity, queries, migrations
10. [🧪 Testing Rules](#-testing-rules) - Testing protocols, verification
11. [📝 Code Quality Rules](#-code-quality-rules) - Standards, patterns, best practices

---

## 🚨 UNIVERSAL RULES - ALWAYS FOLLOW

**These rules apply to ALL features and ALL code changes**

### Rule 1: NEVER Make Changes Without Understanding
```
❌ DON'T: Make quick fixes without investigating
✅ DO: Always investigate root cause first
✅ DO: Check database state before and after changes
✅ DO: Verify changes actually work (not just API success)
```

### Rule 2: ALWAYS Test Database Changes
```
❌ DON'T: Trust API responses that say "success"
✅ DO: Query database directly to verify changes
✅ DO: Use Supabase MCP to check actual data
✅ DO: Compare before/after states
```

**Example:**
```typescript
// After saving permissions
const { data } = await supabase
  .from('profiles')
  .select('standalone_attendance')
  .eq('id', userId)
  .single()

console.log('✅ Verified in database:', data.standalone_attendance)
```

### Rule 3: ALWAYS Add Comprehensive Logging
```
❌ DON'T: Make silent changes
✅ DO: Add console.log at every critical step
✅ DO: Log function entry/exit
✅ DO: Log state changes
✅ DO: Log API calls and responses
```

**Required Logs:**
```typescript
// User interaction
console.log('🖱️ CLICK DETECTED on:', user.full_name)

// State changes
console.log('🎨 State changed:', newState)

// API calls
console.log('📤 API Request:', payload)
console.log('📥 API Response:', response)

// Database operations
console.log('💾 Database update:', result)
console.log('✅ Verification:', verifyResult)
```

### Rule 4: NEVER Delete Files Without Verification
```
❌ DON'T: Delete files based on assumptions
✅ DO: Check if file is imported anywhere
✅ DO: Search entire codebase for references
✅ DO: Test application after deletion
✅ DO: Commit before major deletions
```

**Verification Commands:**
```bash
# Check if file is used
grep -r "filename" app/
grep -r "import.*filename" .

# Check git history
git log --all --full-history -- path/to/file
```

### Rule 4A: NEVER Create New Files Unnecessarily
```
❌ DON'T: Create new files for every analysis or test
❌ DON'T: Create multiple documentation files
❌ DON'T: Scatter test files randomly
✅ DO: Update existing files instead
✅ DO: Put test files in .testing-docs/ folder
✅ DO: Keep only 2 files in .cascade/ (rules.md + README.md)
✅ DO: Ask before creating new files

**Rule:** Only 2 files allowed in .cascade/:
- rules.md (main rules)
- README.md (guide + features overview)

**Test files go in:** .testing-docs/ folder
```

### Rule 5: ALWAYS Fix Root Cause, Not Symptoms
```
❌ DON'T: Add workarounds
❌ DON'T: Fix UI without fixing backend
❌ DON'T: Fix one user without fixing system
✅ DO: Identify root cause
✅ DO: Fix at source
✅ DO: Test all affected areas
```

### Rule 5A: 🚨 NEVER Touch Production Sync System
```
🚨 CRITICAL - PRODUCTION SYSTEM RUNNING:

❌ NEVER MODIFY WITHOUT APPROVAL:
- /set-upx3/ folder (Deployed on office computer)
- /app/api/sync-attendance/ endpoints
- /app/api/attendance-analytics/ endpoints
- Supabase tables: attendance_logs, employee_master
- Any database schema used by sync

⚠️ THIS SYSTEM IS LIVE:
- Runs every 5 seconds on office computer
- Collects attendance data from SmartOffice (localhost:84)
- Syncs to Supabase cloud database
- Used by production attendance tracking

✅ BEFORE TOUCHING ATTENDANCE SYSTEM:
1. Ask user for permission
2. Explain what you want to change
3. Wait for approval
4. Backup everything
5. Test thoroughly
6. Verify sync still works

Breaking this system stops ALL attendance data collection!
```

---

## 👥 USER MANAGEMENT RULES

**Location:** `/app/users/`, `/app/settings/roles/`, `/app/api/admin/users/`
**Features:** User creation, permissions, roles, profiles, activity logging

### Sub-sections:
- **Add User:** `/app/users/add/` - Create new users
- **User Profiles:** `/app/users/[id]/` - View/edit user details
- **Role Profiles:** `/app/settings/roles/` - Manage roles and permissions
- **Activity Logging:** `/app/settings/activity-logs/` - Audit trail
- **User Permissions:** `/app/api/admin/user-permissions/` - Permission management

### Rule 6: User Selection Must Load Permissions
```typescript
// ALWAYS call this when user is selected
const handleUserSelect = async (user: User) => {
  console.log('👤 User selected:', user.full_name)
  setSelectedUser(user)
  
  // REQUIRED: Load permissions from database
  const response = await fetch(`/api/admin/get-user-permissions?userId=${user.id}`)
  const result = await response.json()
  
  // REQUIRED: Verify response
  if (!result.success) {
    console.error('❌ Failed to load permissions')
  }
  
  // REQUIRED: Update state
  setPermissions(result.permissions || [])
}
```

#### Rule 7: Permission Save Must Verify Database
```typescript
// ALWAYS verify after save
const response = await fetch('/api/admin/update-user-permissions', {
  method: 'POST',
  body: JSON.stringify(payload)
})

const result = await response.json()

// REQUIRED: Don't trust API response
if (result.success) {
  // VERIFY in database
  const verify = await fetch(`/api/admin/get-user-permissions?userId=${userId}`)
  const verifyResult = await verify.json()
  
  if (verifyResult.permissions !== expectedPermissions) {
    console.error('❌ Save failed - database not updated!')
    alert('Error: Changes not saved')
  }
}
```

#### Rule 8: Checkbox State Must Use Functional Updates
```typescript
// ❌ WRONG - Race condition
setPermissions([...permissions, newItem])

// ✅ CORRECT - Always use functional update
setPermissions(prev => [...prev, newItem])
```

### Rule 9: Always Check Auth Entry Exists (User Management)
```typescript
// Before saving custom permissions
const { data: authCheck } = await supabase
  .from('auth.users')
  .select('id')
  .eq('id', userId)
  .single()

if (!authCheck) {
  console.warn('⚠️ User has no auth entry - custom permissions cannot be saved')
  // Handle gracefully
}
```

#### Rule 10: Dual Storage for standalone_attendance
```typescript
// REQUIRED: Update BOTH places
// 1. profiles table
await supabase
  .from('profiles')
  .update({ standalone_attendance: 'YES' })
  .eq('id', userId)

// 2. user_permissions table (if auth entry exists)
if (hasAuthEntry) {
  await supabase
    .from('user_permissions')
    .insert({
      user_id: userId,
      permission_id: standaloneAttendancePermissionId,
      effect: 'grant'
    })
}
```

### Rule 10A: Add User Validation
```typescript
// Location: /app/users/add/
// ALWAYS validate before creating user

const validateNewUser = (userData: NewUser) => {
  // REQUIRED: Check email format
  if (!isValidEmail(userData.email)) {
    throw new Error('Invalid email format')
  }
  
  // REQUIRED: Check email uniqueness
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', userData.email)
    .single()
  
  if (existing) {
    throw new Error('Email already exists')
  }
  
  // REQUIRED: Check employee code
  if (!userData.employee_code) {
    throw new Error('Employee code required')
  }
  
  // REQUIRED: Validate role
  const validRoles = ['Super Admin', 'Admin', 'Operator', 'Monitor', 'Attendance']
  if (!validRoles.includes(userData.role)) {
    throw new Error('Invalid role')
  }
}
```

### Rule 10B: Role Profile Management
```typescript
// Location: /app/settings/roles/
// ALWAYS check permissions before role changes

const canModifyRole = async (actorId: string, targetRoleId: string) => {
  const actor = await getUserRole(actorId)
  const targetRole = await getRole(targetRoleId)
  
  // REQUIRED: Super Admin can modify all
  if (actor.role === 'Super Admin') return true
  
  // REQUIRED: Admin cannot modify Super Admin
  if (targetRole.name === 'Super Admin') return false
  
  // REQUIRED: Admin can modify lower roles
  return actor.role === 'Admin'
}

// ALWAYS log role changes
const logRoleChange = async (actorId: string, userId: string, oldRole: string, newRole: string) => {
  await supabase
    .from('audit_logs')
    .insert({
      actor_id: actorId,
      target_id: userId,
      action: 'role_changed',
      meta_json: {
        old_role: oldRole,
        new_role: newRole,
        timestamp: new Date().toISOString()
      }
    })
}
```

### Rule 10C: Activity Logging
```typescript
// Location: /app/settings/activity-logs/
// ALWAYS log important user actions

const logUserActivity = async (actorId: string, action: string, details: any) => {
  // REQUIRED: Log all user management actions
  const loggableActions = [
    'user_created',
    'user_deleted',
    'user_updated',
    'role_changed',
    'permissions_updated',
    'password_reset',
    'login_success',
    'login_failed',
    'logout'
  ]
  
  if (loggableActions.includes(action)) {
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: actorId,
        action: action,
        meta_json: details,
        ip: request.ip,
        created_at: new Date().toISOString()
      })
  }
}

// ALWAYS include context in logs
const logContext = {
  user_agent: request.headers['user-agent'],
  ip: request.ip,
  timestamp: new Date().toISOString(),
  session_id: session.id
}
```

---

## 📊 DASHBOARD RULES

**Location:** `/app/dashboard/`, `/app/analytics/`, `/app/chart/`
**Features:** Main dashboard, analytics, charts, KPIs, real-time monitoring

### Sub-sections:
- **Main Dashboard:** `/app/dashboard/` - Overview, KPIs, quick stats
- **Analytics:** `/app/analytics/` - Detailed analytics, reports
- **Chart/Machine Analyzer:** `/app/chart/` - Machine performance, production charts
- **Schedule Dashboard:** `/app/schedule-dashboard/` - Production scheduling view

### Rule 11: Real-Time Data Updates
```typescript
// ALWAYS refresh dashboard data periodically
useEffect(() => {
  const interval = setInterval(() => {
    fetchDashboardData()
  }, 30000) // 30 seconds
  
  return () => clearInterval(interval)
}, [])
```

### Rule 12: Handle Loading States
```typescript
// ALWAYS show loading state
const [loading, setLoading] = useState(true)

// Show skeleton or spinner
if (loading) {
  return <DashboardSkeleton />
}
```

### Rule 13: Error Handling for Charts
```typescript
// ALWAYS handle empty data
if (!data || data.length === 0) {
  return <EmptyState message="No data available" />
}

// ALWAYS handle chart errors
try {
  renderChart(data)
} catch (error) {
  console.error('Chart render error:', error)
  return <ErrorState />
}
```

### Rule 14: Performance Optimization
```typescript
// ALWAYS memoize expensive calculations
const chartData = useMemo(() => {
  return processChartData(rawData)
}, [rawData])

// ALWAYS debounce filters
const debouncedFilter = useDebouncedCallback(
  (value) => setFilter(value),
  500
)
```

---

## ⏰ ATTENDANCE RULES

**Location:** `/app/attendance/`, `/app/api/sync-attendance/`, `/app/api/attendance-analytics/`
**Features:** Attendance tracking, sync, logs, analytics

⚠️ **CRITICAL WARNING:**
```
🚨 DO NOT MODIFY:
- /set-upx3/ folder (Production sync script - DEPLOYED on office computer)
- /app/api/sync-attendance/ (Used by production script)
- /app/api/attendance-analytics/ (Used by production script)
- Any Supabase tables used by sync (attendance_logs, employee_master)

❌ NEVER change these without approval!
✅ ALWAYS inform user before modifying sync-related code
✅ ALWAYS test sync script after any database changes
✅ ALWAYS backup before touching attendance system

The sync script is LIVE and running every 5 seconds on office computer.
Breaking it will stop all attendance data collection!
```

### Rule 15: Sync Validation
```typescript
// ALWAYS validate sync data before saving
const validateAttendanceLog = (log: AttendanceLog) => {
  if (!log.employee_code) {
    throw new Error('Employee code required')
  }
  if (!log.log_date) {
    throw new Error('Log date required')
  }
  if (!['in', 'out'].includes(log.punch_direction)) {
    throw new Error('Invalid punch direction')
  }
}
```

### Rule 16: Duplicate Prevention
```typescript
// ALWAYS check for duplicates before insert
const { data: existing } = await supabase
  .from('attendance_logs')
  .select('id')
  .eq('employee_code', log.employee_code)
  .eq('log_date', log.log_date)
  .single()

if (existing) {
  console.log('⚠️ Duplicate log, skipping')
  return
}
```

### Rule 17: Sync Error Handling
```typescript
// ALWAYS handle sync failures gracefully
try {
  await syncAttendance()
} catch (error) {
  console.error('❌ Sync failed:', error)
  
  // REQUIRED: Log failure
  await logSyncFailure(error)
  
  // REQUIRED: Retry with exponential backoff
  await retrySync(3, 1000)
}
```

### Rule 18: Employee Code Mapping
```typescript
// ALWAYS map employee codes to names
const employeeMap = await getEmployeeMap()

const enrichedLogs = logs.map(log => ({
  ...log,
  employee_name: employeeMap[log.employee_code]?.name || 'Unknown',
  department: employeeMap[log.employee_code]?.department || 'Default'
}))
```

### Rule 18A: Attendance Page Performance
```typescript
// CRITICAL: Optimize page load - don't auto-load data
// ❌ DON'T auto-fetch on mount
useEffect(() => {
  fetchAttendanceData() // ❌ WRONG - loads 13K+ records on mount
}, [])

// ✅ DO wait for user action
useEffect(() => {
  // Only load metadata
  fetchLastSyncTime()
  fetchEmployeeCount()
  // DON'T load attendance data until user clicks "Apply Filters"
}, [])

// ✅ DO load on button click
<button onClick={() => {
  fetchAttendanceData()
  fetchAnalyticsData()
}}>
  Apply Filters
</button>
```

### Rule 18B: Loading State Management
```typescript
// CRITICAL: Initialize loading state correctly
// ❌ DON'T start as true
const [loading, setLoading] = useState(true) // ❌ Button stuck on "Loading..."

// ✅ DO start as false
const [loading, setLoading] = useState(false) // ✅ Shows "Apply Filters"

// ✅ ALWAYS reset in finally block
const fetchData = async () => {
  setLoading(true)
  try {
    // fetch data
  } catch (error) {
    console.error(error)
  } finally {
    setLoading(false) // ✅ REQUIRED - always reset
  }
}
```

### Rule 18C: Database Table Names
```typescript
// CRITICAL: Use correct production table names
// ❌ DON'T use temporary or test tables
.from('employee_master_simple') // ❌ Doesn't exist
.from('attendance_logs_temp')   // ❌ Test table

// ✅ DO use production tables
.from('employee_master')     // ✅ Production table
.from('employee_raw_logs')   // ✅ Production table

// ✅ ALWAYS verify table exists in Supabase
const { data, error } = await supabase
  .from('employee_master')
  .select('count')
  .single()
```

### Rule 18D: API Response Handling
```typescript
// CRITICAL: Check actual API response structure
// ❌ DON'T assume response structure
const logs = result.data.allLogs // ❌ Might not exist

// ✅ DO check actual response
const logs = result.data.recentLogs || result.data.allLogs || []

// ✅ DO log response for debugging
console.log('📊 API Response:', {
  success: result.success,
  dataKeys: Object.keys(result.data || {}),
  recordCount: logs.length
})
```

### Rule 18E: Cloud Sync Status Display
```typescript
// CRITICAL: Show cloud sync status, not device status
// ❌ DON'T check localhost device
const checkDeviceStatus = async () => {
  await fetch('http://localhost:84') // ❌ Doesn't work from user's computer
}

// ✅ DO query Supabase for last sync time
const fetchLastSyncTime = async () => {
  const { data } = await supabase
    .from('employee_raw_logs')
    .select('sync_time')
    .order('sync_time', { ascending: false })
    .limit(1)
    .single()
  
  setLastSyncTime(new Date(data.sync_time))
}

// ✅ DO show relative time
const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diff < 60) return `${diff} min ago`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}
```

---

## ⚙️ SETTINGS RULES

**Location:** `/app/settings/`, `/app/api/admin/settings/`
**Features:** System settings, organization, preferences, roles, activity logs

### Sub-sections:
- **Organization Settings:** `/app/settings/organization/` - Company info, branding
- **User Preferences:** `/app/settings/user-preferences/` - Personal settings
- **Role Management:** `/app/settings/roles/` - Create/edit roles, permissions
- **Activity Logs:** `/app/settings/activity-logs/` - System audit trail
- **System Configuration:** General system settings, sync intervals

### Rule 19: Settings Validation
```typescript
// ALWAYS validate settings before save
const validateSettings = (settings: Settings) => {
  if (settings.sync_interval < 5) {
    throw new Error('Sync interval must be at least 5 seconds')
  }
  if (!settings.organization_name) {
    throw new Error('Organization name required')
  }
}
```

### Rule 20: Settings Persistence
```typescript
// ALWAYS verify settings saved
const saveSettings = async (settings: Settings) => {
  const { error } = await supabase
    .from('settings')
    .upsert(settings)
  
  if (error) throw error
  
  // REQUIRED: Verify
  const { data: saved } = await supabase
    .from('settings')
    .select()
    .single()
  
  if (JSON.stringify(saved) !== JSON.stringify(settings)) {
    throw new Error('Settings not saved correctly')
  }
}
```

### Rule 21: Role Management
```typescript
// ALWAYS check role permissions before allowing changes
const canModifyRole = async (actorId: string, targetRoleId: string) => {
  const actor = await getUserRole(actorId)
  const targetRole = await getRole(targetRoleId)
  
  // Super Admin can modify all
  if (actor.role === 'Super Admin') return true
  
  // Admin cannot modify Super Admin
  if (targetRole.name === 'Super Admin') return false
  
  return actor.role === 'Admin'
}
```

---

## 📡 MONITORING RULES

**Location:** `/app/monitoring/`, `/app/machines/`, `/app/alerts/`
**Features:** System monitoring, machine status, alerts, real-time tracking

### Sub-sections:
- **System Monitoring:** Real-time system health
- **Machine Monitoring:** `/app/machines/` - Machine status, uptime, performance
- **Alerts:** `/app/alerts/` - System alerts, notifications
- **Activity Monitoring:** Real-time user activity, system events

### Rule 21A: Real-Time Monitoring
```typescript
// Location: /app/monitoring/
// ALWAYS use WebSocket or polling for real-time data

const monitorSystemHealth = () => {
  // REQUIRED: Check critical services
  const services = [
    { name: 'Database', endpoint: '/api/health/database' },
    { name: 'Sync', endpoint: '/api/check-sync-status' },
    { name: 'Auth', endpoint: '/api/health/auth' }
  ]
  
  // REQUIRED: Poll every 30 seconds
  setInterval(async () => {
    for (const service of services) {
      const health = await checkServiceHealth(service.endpoint)
      if (!health.ok) {
        // REQUIRED: Alert immediately
        triggerAlert({
          severity: 'critical',
          service: service.name,
          message: health.error
        })
      }
    }
  }, 30000)
}
```

### Rule 21B: Machine Status Tracking
```typescript
// Location: /app/machines/
// ALWAYS track machine status changes

const trackMachineStatus = async (machineId: string, status: string) => {
  // REQUIRED: Log status change
  await supabase
    .from('machine_status_log')
    .insert({
      machine_id: machineId,
      status: status,
      timestamp: new Date().toISOString()
    })
  
  // REQUIRED: Update current status
  await supabase
    .from('machines')
    .update({ 
      current_status: status,
      last_updated: new Date().toISOString()
    })
    .eq('id', machineId)
  
  // REQUIRED: Alert if critical
  if (status === 'error' || status === 'offline') {
    await sendAlert({
      type: 'machine_down',
      machine_id: machineId,
      severity: 'high'
    })
  }
}
```

### Rule 21C: Alert Management
```typescript
// Location: /app/alerts/
// ALWAYS prioritize alerts by severity

const alertPriority = {
  critical: 1,  // System down, data loss
  high: 2,      // Machine down, sync failed
  medium: 3,    // Performance degradation
  low: 4        // Informational
}

// REQUIRED: Show critical alerts prominently
const displayAlerts = (alerts: Alert[]) => {
  const sorted = alerts.sort((a, b) => 
    alertPriority[a.severity] - alertPriority[b.severity]
  )
  
  // REQUIRED: Auto-dismiss low priority after 5 seconds
  sorted.forEach(alert => {
    if (alert.severity === 'low') {
      setTimeout(() => dismissAlert(alert.id), 5000)
    }
  })
}
```

---

## 🏭 PRODUCTION RULES

**Location:** `/app/production/`, `/app/scheduler/`, `/app/schedule-dashboard/`
**Features:** Production planning, scheduling, machine allocation

### Sub-sections:
- **Production Dashboard:** Production overview, current jobs
- **Scheduler:** `/app/scheduler/` - Production scheduling, job allocation
- **Schedule Dashboard:** `/app/schedule-dashboard/` - Schedule visualization
- **Machine Allocation:** Assign jobs to machines

⚠️ **IMPORTANT NOTE:**
```
These features may be in development or coming soon.
Check with team before implementing production-related features.
```

### Rule 21D: Production Scheduling
```typescript
// Location: /app/scheduler/
// ALWAYS validate schedule before saving

const validateSchedule = (schedule: ProductionSchedule) => {
  // REQUIRED: Check machine availability
  for (const job of schedule.jobs) {
    const machine = await getMachine(job.machine_id)
    if (machine.status !== 'available') {
      throw new Error(`Machine ${machine.name} not available`)
    }
  }
  
  // REQUIRED: Check time conflicts
  const conflicts = findScheduleConflicts(schedule)
  if (conflicts.length > 0) {
    throw new Error(`Schedule conflicts found: ${conflicts.join(', ')}`)
  }
  
  // REQUIRED: Validate job dependencies
  for (const job of schedule.jobs) {
    if (job.depends_on) {
      const dependency = schedule.jobs.find(j => j.id === job.depends_on)
      if (!dependency || dependency.end_time > job.start_time) {
        throw new Error(`Job dependency conflict for ${job.name}`)
      }
    }
  }
}
```

### Rule 21E: Machine Allocation
```typescript
// Location: /app/production/
// ALWAYS check machine capacity before allocation

const allocateMachine = async (jobId: string, machineId: string) => {
  // REQUIRED: Check machine status
  const machine = await getMachine(machineId)
  if (machine.status !== 'available') {
    throw new Error('Machine not available')
  }
  
  // REQUIRED: Check machine capacity
  const job = await getJob(jobId)
  if (job.required_capacity > machine.capacity) {
    throw new Error('Machine capacity insufficient')
  }
  
  // REQUIRED: Update machine status
  await supabase
    .from('machines')
    .update({ 
      status: 'allocated',
      current_job_id: jobId,
      allocated_at: new Date().toISOString()
    })
    .eq('id', machineId)
  
  // REQUIRED: Log allocation
  await logActivity('machine_allocated', {
    machine_id: machineId,
    job_id: jobId
  })
}
```

### Rule 21F: Schedule Optimization
```typescript
// Location: /app/scheduler/
// ALWAYS optimize for efficiency

const optimizeSchedule = (jobs: Job[], machines: Machine[]) => {
  // REQUIRED: Sort by priority and deadline
  const sortedJobs = jobs.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority
    }
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })
  
  // REQUIRED: Allocate to most suitable machine
  const schedule = []
  for (const job of sortedJobs) {
    const suitableMachines = machines.filter(m => 
      m.capacity >= job.required_capacity &&
      m.capabilities.includes(job.required_capability)
    )
    
    // REQUIRED: Choose machine with earliest availability
    const machine = suitableMachines.sort((a, b) => 
      a.next_available_time - b.next_available_time
    )[0]
    
    if (machine) {
      schedule.push({
        job_id: job.id,
        machine_id: machine.id,
        start_time: machine.next_available_time,
        end_time: machine.next_available_time + job.duration
      })
    }
  }
  
  return schedule
}
```

---

## 🔐 AUTHENTICATION RULES

**Location:** `/app/auth/`, `/app/api/auth/`, `/app/lib/contexts/auth-context.tsx`
**Features:** Login, logout, session management, security

### Rule 22: Session Validation
```typescript
// ALWAYS validate session on protected routes
const validateSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    router.push('/auth')
    return false
  }
  
  // REQUIRED: Check session expiry
  if (new Date(session.expires_at) < new Date()) {
    await supabase.auth.signOut()
    router.push('/auth')
    return false
  }
  
  return true
}
```

### Rule 23: Password Security
```typescript
// ALWAYS enforce password requirements
const validatePassword = (password: string) => {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain uppercase letter')
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain number')
  }
  if (!/[!@#$%^&*]/.test(password)) {
    throw new Error('Password must contain special character')
  }
}
```

### Rule 24: Auth Error Handling
```typescript
// ALWAYS handle auth errors gracefully
try {
  await supabase.auth.signInWithPassword({ email, password })
} catch (error) {
  // NEVER expose detailed error to user
  console.error('Auth error:', error)
  
  // Show generic message
  setError('Invalid email or password')
  
  // REQUIRED: Log for security monitoring
  await logAuthFailure(email, error)
}
```

---

## 🗄️ DATABASE RULES

**Location:** All API routes, database queries
**Features:** Data integrity, queries, migrations

### Rule 25: Transaction Usage
```typescript
// ALWAYS use transactions for related updates
const { error } = await supabase.rpc('update_user_with_permissions', {
  p_user_id: userId,
  p_role: role,
  p_permissions: permissions
})

// Or manual transaction
const { data, error } = await supabase
  .from('profiles')
  .update({ role })
  .eq('id', userId)

if (!error) {
  await supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', userId)
  
  await supabase
    .from('user_permissions')
    .insert(newPermissions)
}
```

### Rule 26: Query Optimization
```typescript
// ALWAYS limit query results
const { data } = await supabase
  .from('attendance_logs')
  .select('*')
  .limit(100) // REQUIRED

// ALWAYS use indexes for filters
const { data } = await supabase
  .from('attendance_logs')
  .select('*')
  .eq('employee_code', code) // Indexed field
  .gte('log_date', startDate)
  .lte('log_date', endDate)
```

### Rule 27: Data Validation
```typescript
// ALWAYS validate before insert/update
const validateData = (data: any) => {
  // Check required fields
  if (!data.id) throw new Error('ID required')
  
  // Check data types
  if (typeof data.email !== 'string') {
    throw new Error('Email must be string')
  }
  
  // Check constraints
  if (data.age < 0) {
    throw new Error('Age must be positive')
  }
}
```

---

## 🧪 TESTING RULES

**Location:** All code
**Features:** Testing protocols, verification

### Rule 28: Test Complete User Flow
```
REQUIRED TEST SEQUENCE:
1. Refresh page
2. Click on user → Verify logs appear
3. Verify permissions load → Check console
4. Click Edit → Verify checkboxes enabled
5. Check boxes → Verify state updates
6. Save → Verify API success
7. Query database → Verify actual update
8. Refresh page → Verify persistence
9. Click user again → Verify correct state
```

### Rule 29: Test Edge Cases
```
REQUIRED EDGE CASES:
- User without auth entry
- User with no permissions
- User with all permissions
- Cancel edit (should revert)
- Multiple rapid clicks
- Network failure
- Database error
```

### Rule 30: Never Deploy Without Testing
```
❌ DON'T: Deploy based on "it looks good"
✅ DO: Run complete test suite
✅ DO: Test on fresh browser session
✅ DO: Test with different users
✅ DO: Check database directly
✅ DO: Verify logs show correct flow
```

---

## 📝 CODE QUALITY RULES

**Location:** All code
**Features:** Standards, patterns, best practices

### Rule 31: No Duplicate Code
```
❌ DON'T: Copy-paste similar functions
✅ DO: Create reusable utilities
✅ DO: Use shared components
✅ DO: Extract common logic
```

### Rule 32: Meaningful Variable Names
```
❌ BAD:
const d = await fetch(url)
const r = await d.json()

✅ GOOD:
const response = await fetch(url)
const result = await response.json()
```

### Rule 33: Error Handling Required
```typescript
// ALWAYS wrap in try-catch
try {
  const result = await riskyOperation()
  
  // ALWAYS check for errors
  if (result.error) {
    console.error('❌ Operation failed:', result.error)
    // ALWAYS show user-friendly message
    alert(`Error: ${result.error}`)
    return
  }
  
} catch (error) {
  console.error('❌ Exception:', error)
  alert('An unexpected error occurred')
}
```

### Rule 34: TypeScript Strict Mode
```typescript
// ❌ NEVER use 'any'
const data: any = await fetch()

// ✅ ALWAYS define proper types
interface UserPermission {
  userId: string
  permissions: string[]
  standalone_attendance: 'YES' | 'NO'
}

const data: UserPermission = await fetch()
```

---

## 📁 FILE ORGANIZATION RULES

### Rule 18: One Component Per File
```
❌ DON'T: Multiple components in one file
✅ DO: One component per file
✅ DO: Name file same as component
```

### Rule 19: Consistent Import Order
```typescript
// 1. External libraries
import React from 'react'
import { useRouter } from 'next/navigation'

// 2. Internal utilities
import { supabase } from '@/lib/supabase'

// 3. Components
import { Button } from '@/components/ui/button'

// 4. Types
import type { User } from '@/types'

// 5. Styles
import './styles.css'
```

### Rule 20: No Test Files in Production
```
❌ NEVER commit:
- *test*.ts
- *demo*.tsx
- *temp*.js
- *fix*.sql (temporary fixes)

✅ ALWAYS:
- Remove before commit
- Use .gitignore
- Keep in separate test directory
```

---

## 🔄 API RULES

### Rule 21: RESTful API Structure
```
✅ CORRECT:
GET    /api/users           - List users
POST   /api/users           - Create user
GET    /api/users/[id]      - Get user
PUT    /api/users/[id]      - Update user
DELETE /api/users/[id]      - Delete user

❌ WRONG:
/api/get-users
/api/create-user
/api/modify-user
/api/update-user-profile
```

### Rule 22: Consistent Response Format
```typescript
// ALWAYS use this format
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  warning?: string
}

// Example
return NextResponse.json({
  success: true,
  data: { user, permissions },
  warning: 'Some permissions may not persist'
})
```

### Rule 23: Validate All Inputs
```typescript
// ALWAYS validate
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // REQUIRED: Validate
  if (!body.userId) {
    return NextResponse.json({
      success: false,
      error: 'userId is required'
    }, { status: 400 })
  }
  
  // REQUIRED: Sanitize
  const userId = body.userId.trim()
  
  // Continue...
}
```

---

## 🐛 DEBUGGING RULES

### Rule 24: Debug Systematically
```
DEBUGGING PROCESS:
1. Reproduce bug consistently
2. Add logs at each step
3. Identify where it breaks
4. Check database state
5. Fix root cause
6. Verify fix works
7. Test edge cases
8. Remove debug logs (keep important ones)
```

### Rule 25: Use Descriptive Log Messages
```typescript
// ❌ BAD
console.log('here')
console.log('data:', data)

// ✅ GOOD
console.log('🔍 [handleUserSelect] Starting user selection for:', userId)
console.log('📊 [handleUserSelect] Current permissions state:', permissions)
console.log('✅ [handleUserSelect] Successfully loaded permissions:', result.permissions)
```

### Rule 26: Keep Debug Logs in Development
```typescript
// Use environment check
if (process.env.NODE_ENV === 'development') {
  console.log('🐛 Debug:', data)
}

// Or use debug flag
const DEBUG = true
if (DEBUG) {
  console.log('🐛 Debug:', data)
}
```

---

## 📝 DOCUMENTATION RULES

### Rule 27: Comment Complex Logic
```typescript
// ✅ GOOD - Explains WHY
// We use functional update here to avoid race conditions
// when multiple checkboxes are clicked rapidly
setPermissions(prev => [...prev, newItem])

// ❌ BAD - States the obvious
// Add item to array
setPermissions([...permissions, newItem])
```

### Rule 28: Update README When Adding Features
```
REQUIRED in README:
- What the feature does
- How to use it
- API endpoints involved
- Database tables affected
- Known limitations
```

### Rule 29: Document Breaking Changes
```
REQUIRED in CHANGELOG:
- What changed
- Why it changed
- Migration steps
- Affected users/features
```

---

## 🚀 DEPLOYMENT RULES

### Rule 30: Pre-Deployment Checklist
```
BEFORE DEPLOYING:
[ ] All tests pass
[ ] No console errors
[ ] No TypeScript errors
[ ] Database migrations applied
[ ] Environment variables set
[ ] Backup created
[ ] Rollback plan ready
[ ] Stakeholders notified
```

---

## 🎯 PRIORITY SYSTEM

### P0 - Critical (Fix Immediately)
- System down
- Data loss
- Security vulnerability
- User cannot login

### P1 - High (Fix Today)
- Feature broken
- Major bug
- Performance issue
- User blocked

### P2 - Medium (Fix This Week)
- Minor bug
- UI issue
- Enhancement
- Optimization

### P3 - Low (Fix When Possible)
- Nice to have
- Cosmetic issue
- Documentation
- Refactoring

---

## ✅ RULE COMPLIANCE CHECKLIST

Before submitting any code change:

- [ ] Investigated root cause (Rule 1)
- [ ] Tested database changes (Rule 2)
- [ ] Added comprehensive logging (Rule 3)
- [ ] Verified no files deleted accidentally (Rule 4)
- [ ] Fixed root cause, not symptoms (Rule 5)
- [ ] Followed TypeScript strict mode (Rule 17)
- [ ] Added error handling (Rule 16)
- [ ] Tested complete user flow (Rule 11)
- [ ] Tested edge cases (Rule 12)
- [ ] Updated documentation (Rule 28)

---

## 📞 WHEN IN DOUBT

1. **Check these rules first**
2. **Review existing code for patterns**
3. **Test in development environment**
4. **Ask for code review**
5. **Document your decision**

---

**Remember:** These rules exist because we've made these mistakes before. Following them saves time and prevents bugs.

---

## 📋 QUICK REFERENCE BY FEATURE

### 👥 Working on User Management?
**Read:** Rules 6-10, 10A-10C
**Sub-sections:** Add User, User Profiles, Role Profiles, Activity Logging
**Key Points:**
- Always load permissions when user selected
- Verify save in database
- Use functional state updates
- Check auth entry exists
- Update both profiles and user_permissions tables
- Validate email uniqueness
- Log all user actions
- Check role permissions before changes

### 📊 Working on Dashboard?
**Read:** Rules 11-14
**Sub-sections:** Main Dashboard, Analytics, Chart/Machine Analyzer, Schedule Dashboard
**Key Points:**
- Refresh data periodically (30 seconds)
- Show loading states
- Handle empty data gracefully
- Memoize expensive calculations
- Debounce filters

### ⏰ Working on Attendance? 🚨 DANGER
**Read:** Rules 15-18 + Rule 5A + PRODUCTION_SYSTEMS.md
**Sub-sections:** Attendance Logs, Sync System (LOCKED), Analytics
**Key Points:**
- 🚨 NEVER touch /set-upx3/ without approval
- 🚨 NEVER modify sync APIs without approval
- Validate sync data
- Prevent duplicates
- Handle sync failures gracefully
- Map employee codes to names

### ⚙️ Working on Settings?
**Read:** Rules 19-21
**Sub-sections:** Organization, User Preferences, Roles, Activity Logs, System Config
**Key Points:**
- Validate before save
- Verify settings persisted
- Check role permissions
- Log all changes
- Handle organization branding

### 📡 Working on Monitoring?
**Read:** Rules 21A-21C
**Sub-sections:** System Health, Machine Status, Alerts, Activity
**Key Points:**
- Poll services every 30 seconds
- Track machine status changes
- Prioritize alerts by severity
- Alert immediately on critical issues
- Auto-dismiss low priority alerts

### 🏭 Working on Production?
**Read:** Rules 21D-21F
**Sub-sections:** Production Dashboard, Scheduler, Machine Allocation
**Key Points:**
- Validate schedules before saving
- Check machine availability
- Detect time conflicts
- Optimize for efficiency
- Log all allocations
- ⚠️ Check if features are implemented

### 🔐 Working on Authentication?
**Read:** Rules 22-24
**Key Points:**
- Validate sessions
- Enforce password requirements
- Handle auth errors gracefully
- Never expose detailed errors

### 🗄️ Working with Database?
**Read:** Rules 25-27
**Key Points:**
- Use transactions for related updates
- Limit query results
- Validate data before insert/update

### 🧪 Testing Any Feature?
**Read:** Rules 28-30
**Key Points:**
- Test complete user flow
- Test edge cases
- Never deploy without testing

### 📝 General Code Quality?
**Read:** Rules 31-34
**Key Points:**
- No duplicate code
- Meaningful variable names
- Error handling required
- TypeScript strict mode

---

## 🎯 RULE PRIORITY LEVELS

### 🔴 CRITICAL (Never Break)
- Rule 1: Understand before changing
- Rule 2: Test database changes
- Rule 3: Add comprehensive logging
- Rule 5: Fix root cause
- Rule 7: Verify permission save
- Rule 30: Never deploy without testing

### 🟡 HIGH (Follow Strictly)
- Rule 6: Load permissions on user select
- Rule 8: Use functional updates
- Rule 9: Check auth entry
- Rule 16: Prevent duplicates
- Rule 22: Validate sessions
- Rule 25: Use transactions

### 🟢 MEDIUM (Best Practices)
- Rule 11-14: Dashboard optimization
- Rule 15-18: Attendance handling
- Rule 19-21: Settings management
- Rule 31-34: Code quality

---

## 📞 WHEN IN DOUBT

1. **Check these rules first** - Find your feature category
2. **Review existing code** - Look for similar patterns
3. **Test in development** - Never test in production
4. **Ask for code review** - Two eyes are better than one
5. **Document your decision** - Help future developers

---

**Last Updated:** 2025-10-09
**Version:** 2.0 - Categorized by Feature
