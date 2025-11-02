# 🔄 TRIGGER-SYNC EDGE FUNCTION - COMPLETE GUIDE

**URL:** `https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/trigger-sync`  
**Status:** ✅ ACTIVE (Deployed and Running)  
**Version:** 1

---

## 🎯 PURPOSE

The `trigger-sync` edge function is a **Supabase Edge Function** that creates sync requests for your office computer to process. It acts as a bridge between your web application and the SmartOffice attendance device.

**What it does:**
1. Receives sync requests via HTTP POST
2. Creates entries in `sync_requests` database table
3. Office computer monitors this table and processes requests
4. Fetches attendance data from SmartOffice API
5. Stores data in Supabase database

---

## 🏗️ HOW IT WORKS

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Your Web App  │────────▶│  trigger-sync    │────────▶│  sync_requests  │
│   or Script     │  POST   │  Edge Function   │  INSERT │     Table       │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                                                    │
                                                                    ▼
                                                          ┌─────────────────┐
                                                          │ Office Computer │
                                                          │   Sync Script   │
                                                          │  (Polls every   │
                                                          │   5 seconds)    │
                                                          └─────────────────┘
                                                                    │
                                                                    ▼
                                                          ┌─────────────────┐
                                                          │  SmartOffice    │
                                                          │      API        │
                                                          │ (localhost:84)  │
                                                          └─────────────────┘
                                                                    │
                                                                    ▼
                                                          ┌─────────────────┐
                                                          │ employee_raw_   │
                                                          │      logs       │
                                                          │   (Database)    │
                                                          └─────────────────┘
```

---

## 🚀 USE CASES

### 1. **Sync Specific Date Range**
Sync attendance data for a specific period (e.g., October 1-31)

### 2. **Immediate Refresh**
Trigger immediate sync of current data (bypass 5-second interval)

### 3. **Historical Data Recovery**
Recover missing or incomplete attendance data from past dates

### 4. **Employee Names Sync**
Sync all employee names from SmartOffice device

### 5. **Auto-Detect Range**
Automatically discover available data range and sync everything

---

## 📋 USAGE EXAMPLES

### Example 1: Sync Specific Date Range

**Request:**
```bash
curl -X POST "https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/trigger-sync" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w" \
  -H "Content-Type: application/json" \
  -d '{
    "syncType": "historical",
    "dateFrom": "2025-10-01",
    "dateTo": "2025-10-31",
    "requestedBy": "admin"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Historical sync requested for 2025-10-01 to 2025-10-31",
  "syncRequest": {
    "id": 61,
    "sync_type": "historical",
    "status": "pending",
    "requested_at": "2025-11-02T03:42:00.000Z",
    "result": "Historical sync: 2025-10-01 to 2025-10-31"
  },
  "note": "Historical sync may take several minutes depending on data volume"
}
```

---

### Example 2: Immediate Refresh (Website Button)

**Request:**
```bash
curl -X POST "https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/trigger-sync" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "refresh",
    "requestedBy": "website-refresh-button"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Immediate refresh sync requested",
  "syncRequest": {
    "id": 62,
    "sync_type": "manual",
    "status": "pending",
    "requested_by": "website-refresh-button",
    "result": "Immediate refresh sync from website"
  },
  "immediateRefresh": true,
  "note": "Current data will be synced immediately (bypassing 5-second interval)"
}
```

---

### Example 3: Sync Employee Names

**Request:**
```bash
curl -X POST "https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/trigger-sync" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sync-employees",
    "requestedBy": "admin"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Employee names sync requested",
  "syncRequest": {
    "id": 63,
    "sync_type": "employees",
    "status": "pending",
    "result": "Sync all employee names from SmartOffice"
  },
  "employeeSync": true,
  "note": "All employee names will be fetched from SmartOffice and updated in database"
}
```

---

### Example 4: Auto-Detect and Sync All Data

**Request:**
```bash
curl -X POST "https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/trigger-sync" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "autoDetectRange": true,
    "requestedBy": "admin"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-detect and sync all historical data requested",
  "syncRequest": {
    "id": 64,
    "sync_type": "discover",
    "status": "pending",
    "result": "Auto-detect historical range and sync all available data"
  },
  "autoDetectRange": true,
  "note": "The script will discover available data range and sync everything"
}
```

---

## 📊 PARAMETERS

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `syncType` | string | No | "manual" | Type: "historical", "manual", "employees", "discover" |
| `dateFrom` | string | No | null | Start date (YYYY-MM-DD format) |
| `dateTo` | string | No | null | End date (YYYY-MM-DD format) |
| `requestedBy` | string | No | "dashboard" | Who requested the sync (for tracking) |
| `action` | string | No | null | Action: "refresh", "immediate", "sync-employees" |
| `autoDetectRange` | boolean | No | false | Auto-detect and sync all available data |

---

## ⏱️ TIMING

### Processing Time
- **Single day:** 2-3 seconds
- **Week:** 5-7 seconds  
- **Month:** 7-10 seconds

### Polling Frequency
- Office computer checks for requests: **Every 5 seconds**
- Auto-sync of last 24 hours: **Every 5 seconds**

### Recommended Wait
- After creating request: **30 seconds**
- For large ranges (>1 month): **1-2 minutes**

---

## 🔍 MONITORING

### Check Sync Request Status

**SQL Query:**
```sql
SELECT 
  id,
  sync_type,
  status,
  result,
  requested_by,
  requested_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - requested_at)) as processing_seconds
FROM sync_requests
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 10;
```

### Verify Data Synced

**SQL Query:**
```sql
SELECT 
  DATE(log_date) as date,
  COUNT(*) as total_records,
  COUNT(DISTINCT employee_code) as unique_employees
FROM employee_raw_logs
WHERE DATE(log_date) >= '2025-10-01'
  AND DATE(log_date) <= '2025-10-31'
GROUP BY DATE(log_date)
ORDER BY date;
```

---

## 🔐 AUTHENTICATION

**Required:** Supabase Anon Key (public) or Service Role Key (server-side)

**Your Anon Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w
```

**Usage:**
```bash
-H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## 🎯 INTEGRATION IN YOUR APP

### JavaScript/TypeScript Example

```typescript
async function triggerSync(dateFrom: string, dateTo: string) {
  const response = await fetch(
    'https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/trigger-sync',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_ANON_KEY',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        syncType: 'historical',
        dateFrom,
        dateTo,
        requestedBy: 'web-app'
      })
    }
  )
  
  const data = await response.json()
  console.log('Sync request created:', data)
  return data
}

// Usage
await triggerSync('2025-10-01', '2025-10-31')
```

### React Component Example

```tsx
import { useState } from 'react'

export function SyncButton() {
  const [loading, setLoading] = useState(false)
  
  const handleSync = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        'https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/trigger-sync',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR_ANON_KEY',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'refresh',
            requestedBy: 'website-button'
          })
        }
      )
      
      const data = await response.json()
      
      if (data.success) {
        alert('Sync started! Data will be updated in 30 seconds.')
      } else {
        alert('Sync failed: ' + data.error)
      }
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <button onClick={handleSync} disabled={loading}>
      {loading ? 'Syncing...' : 'Sync Now'}
    </button>
  )
}
```

---

## 🚨 TROUBLESHOOTING

### Issue: Request Stuck in "Pending"

**Cause:** Office computer sync script not running

**Solution:**
1. Check if office computer is online
2. Verify sync script is running
3. Check SmartOffice API is accessible (localhost:84)

### Issue: No Data Synced

**Cause:** No data exists in SmartOffice for that date

**Solution:**
1. Verify date range is correct
2. Check SmartOffice device has data
3. Confirm employees were present on that date

### Issue: 401 Unauthorized

**Cause:** Missing or invalid authorization header

**Solution:**
- Add `Authorization: Bearer YOUR_ANON_KEY` header
- Verify anon key is correct

---

## 📝 BEST PRACTICES

1. **Always wait 30 seconds** after creating sync request before checking results
2. **Use specific date ranges** instead of syncing entire months at once
3. **Monitor sync_requests table** to track success/failure
4. **Keep office computer online** for automatic processing
5. **Verify data** after sync completes using SQL queries

---

## 🎯 SUMMARY

**What is it?**
- Supabase Edge Function that creates sync requests

**What does it do?**
- Creates entries in `sync_requests` table
- Office computer processes these requests
- Fetches data from SmartOffice API
- Stores in Supabase database

**When to use it?**
- Sync specific date ranges
- Immediate data refresh
- Historical data recovery
- Employee names sync

**How long does it take?**
- Request creation: Instant
- Data processing: 2-10 seconds
- Total wait time: ~30 seconds

**Is it working?**
- ✅ YES - Function is deployed and active
- ✅ Version 1 running on Supabase
- ✅ Ready to use right now

---

## 📞 RELATED RESOURCES

**Documentation:**
- Full guide: `/docs/EDGE_FUNCTION_SYNC_DOCUMENTATION.md`

**Scripts:**
- Create sync request: `/scripts/database/create-sync-request.js`
- Monitor sync: `/scripts/maintenance/monitor-and-sync.sh`

**Database Tables:**
- `sync_requests` - Queue of sync requests
- `employee_raw_logs` - Attendance data storage
- `device_status` - Office computer status

**Other Edge Functions:**
- `recover-missing-days` - Auto-detect and recover missing data

---

**Last Updated:** 2025-11-02 03:42 IST  
**Status:** ✅ ACTIVE AND READY TO USE
