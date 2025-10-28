# USER EDIT UI - TEST PLAN

**Date:** October 28, 2025  
**Implementation:** Complete  
**Status:** 🧪 TESTING PHASE

---

## 🎯 TEST OBJECTIVES

1. Verify editable section works correctly
2. Verify read-only permission display shows correct information
3. Verify role changes update permission display
4. Verify standalone attendance toggle works
5. Verify save/cancel functionality
6. Verify visual appearance and UX

---

## 📋 TEST CASES

### **Test 1: Initial Page Load**

**Steps:**
1. Navigate to Settings → Users
2. Click on any user
3. Click "Roles" tab

**Expected Result:**
```
✅ Editable section visible at top (blue background)
✅ Role dropdown shows current role (disabled)
✅ Standalone checkbox shows current state (disabled)
✅ "Edit Role" button visible
✅ Permission display visible below (gray background)
✅ All 10 permissions shown with badges
✅ ✅/❌ icons show correctly
✅ Permissions grouped by category
```

**Status:** ⏳ Pending

---

### **Test 2: Click Edit Button**

**Steps:**
1. Click "Edit Role" button

**Expected Result:**
```
✅ Role dropdown becomes enabled
✅ Standalone checkbox becomes enabled
✅ "Edit Role" button → "Cancel" + "Save Changes" buttons
✅ Permission display stays read-only (no change)
✅ Blue background remains on editable section
```

**Status:** ⏳ Pending

---

### **Test 3: Change Role (Admin → Operator)**

**Steps:**
1. Click "Edit Role"
2. Change role from "Admin" to "Operator"
3. Observe permission display

**Expected Result:**
```
✅ Permission display updates immediately (preview)
✅ Admin permissions removed:
   - Analytics: [Full] → [None]
   - Manage Users: [Full] → [None]
✅ Operator permissions shown:
   - Dashboard: [View]
   - Schedule Generator: [Edit]
   - Chart: [View]
   - Attendance: [Edit]
✅ Badges update correctly
✅ ✅/❌ icons update correctly
```

**Status:** ⏳ Pending

---

### **Test 4: Toggle Standalone Attendance**

**Steps:**
1. Click "Edit Role"
2. Check "Enable Standalone Attendance Site"
3. Observe permission display

**Expected Result:**
```
✅ Standalone Attendance permission updates
✅ Changes from [None] or ❌ to [Access] and ✅
✅ Other permissions unchanged
```

**Status:** ⏳ Pending

---

### **Test 5: Save Changes**

**Steps:**
1. Click "Edit Role"
2. Change role to "Admin"
3. Enable standalone attendance
4. Click "Save Changes"

**Expected Result:**
```
✅ API call to /api/admin/update-user-permissions
✅ Request body includes:
   - userId
   - role: "Admin"
   - permissions array
   - standalone_attendance: "YES"
✅ Success message displayed
✅ Page reloads/updates
✅ "Edit Role" button returns
✅ Editable section becomes disabled
✅ Permission display shows updated permissions
```

**Status:** ⏳ Pending

---

### **Test 6: Cancel Changes**

**Steps:**
1. Click "Edit Role"
2. Change role to "Operator"
3. Enable standalone attendance
4. Click "Cancel"

**Expected Result:**
```
✅ Changes discarded
✅ Role reverts to original
✅ Standalone reverts to original
✅ Permission display reverts to original
✅ "Edit Role" button returns
✅ Editable section becomes disabled
```

**Status:** ⏳ Pending

---

### **Test 7: Permission Display Accuracy (Admin)**

**Steps:**
1. Select user with "Admin" role
2. View permission display

**Expected Result:**
```
Dashboard & Analytics:
✅ Dashboard                    [Full]
✅ Analytics                    [Full]

Scheduling:
✅ Schedule Generator           [Full]
✅ Schedule Gen Dashboard       [Full]
✅ Chart                        [View]

Attendance:
✅ Attendance                   [Edit]
✅ Standalone Attendance        [Access] (if enabled)

Production & Monitoring:
❌ Production                   [None]
❌ Monitoring                   [None]

Administration:
✅ Manage Users & Security      [Full]
```

**Status:** ⏳ Pending

---

### **Test 8: Permission Display Accuracy (Operator)**

**Steps:**
1. Select user with "Operator" role
2. View permission display

**Expected Result:**
```
Dashboard & Analytics:
✅ Dashboard                    [View]
❌ Analytics                    [None]

Scheduling:
✅ Schedule Generator           [Edit]
✅ Schedule Gen Dashboard       [View]
✅ Chart                        [View]

Attendance:
✅ Attendance                   [Edit]
✅ Standalone Attendance        [Access] (if enabled)

Production & Monitoring:
❌ Production                   [None]
❌ Monitoring                   [None]

Administration:
❌ Manage Users & Security      [None]
```

**Status:** ⏳ Pending

---

### **Test 9: Visual Appearance**

**Steps:**
1. View the page in light mode
2. View the page in dark mode

**Expected Result:**
```
Light Mode:
✅ Editable section: Blue background
✅ Permission display: Gray background
✅ Badges: Proper colors (green/blue/yellow/purple/gray)
✅ Text readable
✅ Borders visible

Dark Mode:
✅ Editable section: Dark blue background
✅ Permission display: Dark gray background
✅ Badges: Dark mode colors
✅ Text readable (white/light)
✅ Borders visible
```

**Status:** ⏳ Pending

---

### **Test 10: Responsive Design**

**Steps:**
1. View on desktop (1920x1080)
2. View on tablet (768x1024)
3. View on mobile (375x667)

**Expected Result:**
```
Desktop:
✅ Two-column layout works
✅ All content visible
✅ No overflow

Tablet:
✅ Layout adjusts appropriately
✅ Readable text
✅ Buttons accessible

Mobile:
✅ Single column layout
✅ All content accessible
✅ Buttons stack vertically
```

**Status:** ⏳ Pending

---

### **Test 11: Error Handling**

**Steps:**
1. Click "Edit Role"
2. Don't select a role
3. Click "Save Changes"

**Expected Result:**
```
✅ Validation error shown
✅ "Role is required" message
✅ Save prevented
✅ User stays in edit mode
```

**Status:** ⏳ Pending

---

### **Test 12: API Integration**

**Steps:**
1. Open browser DevTools → Network tab
2. Click "Edit Role"
3. Change role to "Admin"
4. Click "Save Changes"
5. Observe network request

**Expected Result:**
```
✅ POST request to /api/admin/update-user-permissions
✅ Request payload:
   {
     "userId": "uuid",
     "role": "Admin",
     "permissions": [...],
     "standalone_attendance": "YES"
   }
✅ Response: { "success": true, ... }
✅ Status: 200 OK
```

**Status:** ⏳ Pending

---

## 🔍 MANUAL TESTING CHECKLIST

### Editable Section:
- [ ] Role dropdown shows all 6 roles
- [ ] Role dropdown disabled when not editing
- [ ] Role dropdown enabled when editing
- [ ] Standalone checkbox disabled when not editing
- [ ] Standalone checkbox enabled when editing
- [ ] "Edit Role" button visible initially
- [ ] "Cancel" + "Save Changes" buttons when editing
- [ ] Blue background visible
- [ ] Explanatory text visible

### Permission Display:
- [ ] All 10 permissions shown
- [ ] Grouped into 5 categories
- [ ] ✅ icon for permissions user has
- [ ] ❌ icon for permissions user doesn't have
- [ ] [Full] badge for full access (green)
- [ ] [Edit] badge for edit access (blue)
- [ ] [View] badge for view access (yellow)
- [ ] [Access] badge for access (purple)
- [ ] [None] badge for no access (gray)
- [ ] Gray background visible
- [ ] Info banner at bottom
- [ ] Description under each permission

### Functionality:
- [ ] Edit button enables controls
- [ ] Role change updates permission display
- [ ] Standalone toggle updates display
- [ ] Save button calls API
- [ ] Cancel button discards changes
- [ ] Page reloads after save
- [ ] Success message shown
- [ ] Error message on failure

### Visual:
- [ ] Light mode looks good
- [ ] Dark mode looks good
- [ ] Colors are appropriate
- [ ] Text is readable
- [ ] Borders are visible
- [ ] Spacing is consistent
- [ ] No layout issues

---

## 🚀 TESTING INSTRUCTIONS

### Step 1: Start Dev Server
```bash
npm run dev
```

### Step 2: Navigate to User Edit Page
```
1. Open http://localhost:3000
2. Login as admin
3. Go to Settings → Users
4. Click on any user
5. Click "Roles" tab
```

### Step 3: Run Through Test Cases
- Follow each test case above
- Check off items in manual testing checklist
- Note any issues or bugs

### Step 4: Test Different Roles
```
Test with users having different roles:
- Admin
- Operator
- Test User
- Monitor
- Attendance
```

### Step 5: Test Edge Cases
```
- User with no role
- User with standalone already enabled
- User with standalone disabled
- Changing role multiple times
- Saving without changes
```

---

## 📊 TEST RESULTS

### Summary:
- Total Tests: 12
- Passed: ⏳ Pending
- Failed: ⏳ Pending
- Blocked: ⏳ Pending

### Issues Found:
(To be filled during testing)

### Recommendations:
(To be filled after testing)

---

## ✅ SIGN-OFF

**Tested By:** _________________  
**Date:** _________________  
**Status:** ⏳ Pending Approval  

---

**Next Steps:**
1. Run through all test cases
2. Document any issues
3. Fix issues if found
4. Re-test
5. Get user approval
6. Deploy to production
