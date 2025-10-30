# 🚀 DEPLOYMENT INSTRUCTIONS

## Current Situation:
- ✅ Fixes are complete on LOCAL machine
- ❌ Production (Vercel) has OLD code
- ❌ 401 errors on production because it's using old fetch() without auth

## What Needs to be Deployed:

### 1. Permission Display Fix
**File:** `/app/settings/roles/[id]/edit/page.tsx`
- Clean slate approach (all permissions start FALSE)
- Only applies database values
- Extensive console logging

### 2. Authentication Fix
**File:** `/app/settings/roles/[id]/edit/page.tsx`
- Uses `apiGet` and `apiPut` helpers
- Includes JWT tokens automatically
- Fixes 401 errors

### 3. Debug Endpoint
**File:** `/app/api/admin/roles/debug/route.ts`
- Shows raw database data
- Helps verify permissions_json

---

## 🔧 DEPLOYMENT OPTIONS:

### Option 1: Git Push (Recommended)
```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Fix role permissions display and authentication

- Fix permission display bug (clean slate approach)
- Fix 401 errors (use apiClient with JWT tokens)  
- Add debug endpoint for database inspection
- Add extensive console logging"

# Push to main branch (triggers Vercel deployment)
git push origin main
```

### Option 2: Vercel CLI
```bash
# Deploy directly
vercel --prod
```

### Option 3: Vercel Dashboard
1. Go to Vercel dashboard
2. Click "Redeploy" on latest deployment
3. Wait for build to complete

---

## ⏱️ After Deployment:

1. **Wait 2-3 minutes** for Vercel to build and deploy
2. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
3. **Test on production:**
   - Go to https://epsilonengg.vercel.app/settings/roles
   - Click Edit on Monitor role
   - Should load WITHOUT 401 errors
   - Should show console logs
   - Should show correct permissions (not all checked)

---

## 🧪 TESTING CHECKLIST:

After deployment, verify:
- [ ] No 401 errors in console
- [ ] Role loads successfully
- [ ] Console shows debug logs
- [ ] Permissions display correctly (not all checked)
- [ ] Can save changes
- [ ] Changes persist to database

---

## 📝 FILES CHANGED:

1. `/app/settings/roles/[id]/edit/page.tsx` - Main fixes
2. `/app/api/admin/roles/debug/route.ts` - Debug endpoint
3. `/ROLE_PROFILES_TEST_REPORT.md` - Documentation
4. `/ROLE_PROFILES_FIX_PLAN.md` - Implementation plan
5. `/CRITICAL_DATABASE_ISSUE.md` - Database findings

---

## ⚠️ IMPORTANT NOTES:

- **Database is still empty** - All roles have `permissions_json: {}`
- After deployment works, you'll need to **save permissions via UI** to populate database
- Once saved, permissions will display correctly on subsequent loads

---

## 🆘 IF DEPLOYMENT FAILS:

Check Vercel build logs for errors:
1. Go to Vercel dashboard
2. Click on failed deployment
3. View build logs
4. Share error messages if needed
