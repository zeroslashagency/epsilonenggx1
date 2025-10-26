# 📚 CASCADE RULES - README

**Project:** Epsilon Scheduling System
**Last Updated:** 2025-10-09

---

## 📖 ABOUT THIS DIRECTORY

This directory contains **IDE rules** that AI assistants and developers must follow when working on this project.

---

## 📄 FILES IN THIS DIRECTORY

### `rules.md` - Main Rules Document
**Purpose:** Complete set of rules organized by feature
**Sections:**
1. 🚨 Universal Rules (Rules 1-5A) - Apply to everything
2. 👥 User Management (Rules 6-10) - User permissions, roles
3. 📊 Dashboard (Rules 11-14) - Analytics, charts
4. ⏰ Attendance (Rules 15-18) - Sync, logs
5. ⚙️ Settings (Rules 19-21) - System settings
6. 🔐 Authentication (Rules 22-24) - Login, security
7. 🗄️ Database (Rules 25-27) - Data integrity
8. 🧪 Testing (Rules 28-30) - Verification
9. 📝 Code Quality (Rules 31-34) - Standards


---

## 🎯 HOW TO USE

### For AI Assistants:
```
1. Read rules.md before making ANY changes
2. Find the relevant section for your task
3. Follow ALL rules in that section
4. Follow Universal Rules (1-5) ALWAYS
5. Verify compliance before submitting
```

### For Developers:
```
1. Read rules.md when starting a new feature
2. Keep the relevant section open while coding
3. Use Quick Reference at the end
4. Check Rule Priority Levels
5. Ask for review if unsure
```

---

## 🔍 QUICK NAVIGATION

### Working on User Management?
→ Go to "👥 USER MANAGEMENT RULES" (Rules 6-10)

### Working on Dashboard?
→ Go to "📊 DASHBOARD RULES" (Rules 11-14)

### Working on Attendance?
→ Go to "⏰ ATTENDANCE RULES" (Rules 15-18)

### Working on Settings?
→ Go to "⚙️ SETTINGS RULES" (Rules 19-21)

### Working on Authentication?
→ Go to "🔐 AUTHENTICATION RULES" (Rules 22-24)

### Working with Database?
→ Go to "🗄️ DATABASE RULES" (Rules 25-27)

### Testing?
→ Go to "🧪 TESTING RULES" (Rules 28-30)

### General Coding?
→ Go to "📝 CODE QUALITY RULES" (Rules 31-34)

---

## 🚨 CRITICAL RULES (NEVER BREAK)

These rules are **CRITICAL** and must **NEVER** be broken:

1. **Rule 1:** Understand before changing
2. **Rule 2:** Test database changes
3. **Rule 3:** Add comprehensive logging
4. **Rule 5:** Fix root cause, not symptoms
5. **Rule 5A:** 🚨 NEVER touch production sync system (See PRODUCTION_SYSTEMS.md)
6. **Rule 7:** Verify permission save in database
7. **Rule 30:** Never deploy without testing

⚠️ **SPECIAL WARNING:**
The attendance sync system (`/set-upx3/`) is LIVE and running on office computer.
DO NOT modify it or related APIs without explicit approval!
Read `PRODUCTION_SYSTEMS.md` for details.

---

## 📊 RULE STATISTICS

- **Total Rules:** 34
- **Universal Rules:** 5 (apply to everything)
- **Feature-Specific Rules:** 29
- **Critical Priority:** 6 rules
- **High Priority:** 6 rules
- **Medium Priority:** 22 rules

---

## 🔄 RULE UPDATES

### Version 2.0 (2025-10-09)
- ✅ Organized rules by feature category
- ✅ Added table of contents
- ✅ Added quick reference section
- ✅ Added priority levels
- ✅ Added navigation guide

### Version 1.0 (2025-10-09)
- ✅ Initial rules created
- ✅ 30 core rules defined
- ✅ Examples provided

---

## 💡 TIPS FOR SUCCESS

### For New Developers:
1. Read the entire `rules.md` once
2. Bookmark the relevant sections
3. Keep Quick Reference handy
4. Ask questions if unclear

### For AI Assistants:
1. Always check rules before changes
2. Reference rule numbers in commits
3. Explain which rules you followed
4. Flag rule violations immediately

### For Code Reviewers:
1. Verify rule compliance
2. Check critical rules first
3. Suggest rule improvements
4. Update rules when needed

---

## 📞 SUPPORT

### If Rules Are Unclear:
1. Check the examples in rules.md
2. Look at existing code
3. Ask the team
4. Propose clarifications

### If Rules Need Updates:
1. Discuss with team
2. Document the change
3. Update version number
4. Notify all developers

---

## ✅ COMPLIANCE CHECKLIST

Before submitting code:

- [ ] Read relevant rule section
- [ ] Followed all applicable rules
- [ ] Followed all critical rules
- [ ] Added required logging
- [ ] Tested changes
- [ ] Verified in database
- [ ] Documented decisions
- [ ] Ready for review

---

## 🎯 GOALS

These rules help us:
- ✅ Prevent common mistakes
- ✅ Maintain code quality
- ✅ Ensure consistency
- ✅ Speed up development
- ✅ Reduce bugs
- ✅ Improve collaboration


**Remember:** Rules are here to help, not hinder. If a rule doesn't make sense for your situation, discuss it with the team before breaking it.

---

---

## 🚨 PRODUCTION SYSTEMS - CRITICAL

### Attendance Sync System (LIVE)
**Status:** 🟢 DEPLOYED & RUNNING on office computer
**Location:** `/set-upx3/` folder
**Frequency:** Every 5 seconds

#### 🚨 DO NOT MODIFY:
- `/set-upx3/` folder (Production sync script)
- `/app/api/sync-attendance/` (Used by production)
- `/app/api/attendance-analytics/` (Used by production)
- `attendance_logs` table schema
- `employee_master` table schema

#### Before Touching Attendance System:
1. 🛑 STOP and ask user first
2. Explain what you want to change
3. Wait for approval
4. Backup everything
5. Test thoroughly

**Breaking this system stops ALL attendance data collection!**

---

## 🗺️ FEATURES OVERVIEW

### 1. 👥 USER MANAGEMENT (Rules 6-10, 10A-10C)
**Location:** `/app/users/`, `/app/settings/roles/`
**Status:** 🟡 Currently being fixed
**Sub-sections:** Add User, User Profiles, Role Profiles, Activity Logging

### 2. 📊 DASHBOARD (Rules 11-14)
**Location:** `/app/dashboard/`, `/app/analytics/`, `/app/chart/`
**Status:** 🟢 Safe to modify
**Sub-sections:** Main Dashboard, Analytics, Chart/Machine Analyzer, Schedule Dashboard

### 3. ⏰ ATTENDANCE (Rules 15-18 + 5A) 🚨
**Location:** `/app/attendance/`, `/set-upx3/`
**Status:** 🔴 LOCKED - Production system
**Sub-sections:** Attendance Logs, Sync System (LOCKED), Analytics

### 4. ⚙️ SETTINGS (Rules 19-21)
**Location:** `/app/settings/`
**Status:** 🟢 Safe to modify
**Sub-sections:** Organization, User Preferences, Roles, Activity Logs, System Config

### 5. 📡 MONITORING (Rules 21A-21C)
**Location:** `/app/monitoring/`, `/app/machines/`, `/app/alerts/`
**Status:** 🟢 Safe to modify
**Sub-sections:** System Health, Machine Status, Alerts, Activity

### 6. 🏭 PRODUCTION (Rules 21D-21F)
**Location:** `/app/production/`, `/app/scheduler/`
**Status:** ⚠️ May be in development
**Sub-sections:** Production Dashboard, Scheduler, Machine Allocation

### 7. 🔐 AUTHENTICATION (Rules 22-24)
**Location:** `/app/auth/`
**Status:** 🟢 Safe to modify

### 8. 🗄️ DATABASE (Rules 25-27)
**Status:** 🟡 Handle with care

---

**Last Updated:** 2025-10-09 06:22:10 IST
**Version:** 3.0 - Consolidated (2 files only)
**Maintained By:** Development Team
**Questions?** Check rules.md or ask the team
