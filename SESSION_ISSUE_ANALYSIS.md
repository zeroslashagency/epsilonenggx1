# 🔴 SESSION LOGOUT ISSUE - ROOT CAUSE FOUND

**Date:** 2025-11-01 20:03 IST  
**Issue:** User gets logged out after page refresh  
**Status:** 🔴 CRITICAL BUG FOUND

---

## 🔍 ROOT CAUSE IDENTIFIED:

**File:** `app/lib/services/supabase-client.ts`  
**Lines:** 56-61

```typescript
clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // ❌ THIS IS THE PROBLEM
    autoRefreshToken: false, // ❌ THIS TOO
  },
})
```

**Problem:**
- `persistSession: false` - Session is NOT saved to localStorage
- `autoRefreshToken: false` - Token doesn't refresh automatically
- Every page refresh = new session = user logged out

---

## 🔍 WHY THIS HAPPENS:

1. User logs in → Session created in memory only
2. User refreshes page → Memory cleared
3. Supabase checks for session → Not found (not persisted)
4. Auth context sees no session → Redirects to /auth
5. User logged out

---

## ✅ SOLUTION:

**Change the client configuration to persist sessions:**

```typescript
// WRONG (current):
clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // ❌ Don't persist
    autoRefreshToken: false, // ❌ Don't refresh
  },
})

// CORRECT (should be):
clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // ✅ Save to localStorage
    autoRefreshToken: true, // ✅ Auto-refresh tokens
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})
```

---

## 📝 ADDITIONAL ISSUES FOUND:

### **1. Auth Context Uses Same Client**
**File:** `app/lib/contexts/auth-context.tsx` (line 7)
```typescript
const supabase = getSupabaseClient()
```
- Uses the client with `persistSession: false`
- This is why sessions don't persist

### **2. Comment Says "Disable for server-side"**
**File:** `supabase-client.ts` (line 58)
```typescript
persistSession: false, // Disable session persistence for server-side
```
- This comment is WRONG
- This client is used on CLIENT-SIDE (auth-context.tsx)
- Should persist sessions for client-side usage

---

## 🔧 FIX REQUIRED:

**Need TWO different clients:**

1. **Client-side client** (for browser/auth):
   - `persistSession: true`
   - `autoRefreshToken: true`
   - Used in auth-context.tsx

2. **Server-side client** (for API routes):
   - `persistSession: false`
   - `autoRefreshToken: false`
   - Used in API routes

**Currently using server-side config for client-side = sessions don't persist**

---

## 🎯 IMPACT:

- ❌ Users logged out on every refresh
- ❌ Poor user experience
- ❌ Sessions not persisting
- ❌ Tokens not refreshing

---

## 📋 FIX PLAN:

1. Create separate `getSupabaseBrowserClient()` function
2. Configure with `persistSession: true` and `autoRefreshToken: true`
3. Update auth-context.tsx to use browser client
4. Keep server client as-is for API routes

---

**This is a critical bug that needs immediate fix.**
