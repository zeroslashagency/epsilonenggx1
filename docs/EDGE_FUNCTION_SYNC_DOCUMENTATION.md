# 📚 EDGE FUNCTION SYNC DOCUMENTATION

**Date:** October 31, 2025  
**Purpose:** Complete guide for syncing attendance data using Supabase Edge Functions

---

## 🎯 OVERVIEW

This system uses **Supabase Edge Functions** to sync attendance data from the SmartOffice device (office computer) to the cloud database. The office computer runs a sync script that monitors for sync requests and fetches data from the SmartOffice API.

---

## 🏗️ ARCHITECTURE

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Edge Function  │────────▶│  sync_requests   │────────▶│ Office Computer │
│  (Supabase)     │         │     (Table)      │         │   Sync Script   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                                                    │
                                                                    ▼
                                                          ┌─────────────────┐
                                                          │  SmartOffice    │
                                                          │      API        │
                                                          └─────────────────┘
                                                                    │
                                                                    ▼
                                                          ┌─────────────────┐
                                                          │ employee_raw_   │
                                                          │      logs       │
                                                          └─────────────────┘
```

---

## 📋 AVAILABLE EDGE FUNCTIONS

### 1. **trigger-sync** (Manual Sync)

**URL:** `https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/trigger-sync`

**Purpose:** Create sync requests for the office computer to process

**Use Cases:**
- Sync specific date ranges
- Historical data recovery
- Manual sync trigger

---

### 2. **recover-missing-days** (Auto-Detection)

**URL:** `https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/recover-missing-days`

**Purpose:** Automatically detect and recover missing days

**Use Cases:**
- Find gaps in attendance data
- Bulk recovery of missing days
- Monthly data validation

---

## 🚀 USAGE EXAMPLES

### Example 1: Sync Specific Date Range

**Scenario:** Sync attendance data for October 1-31, 2025

```bash
curl -X POST "https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/trigger-sync" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
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
    "requested_at": "2025-10-31T06:45:13.581+00:00"
  },
  "note": "Historical sync may take several minutes depending on data volume"
}
```

**Processing Time:** 2-10 seconds depending on data volume

---

### Example 2: Sync Single Day

**Scenario:** Sync only October 15, 2025

```bash
curl -X POST "https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/trigger-sync" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "syncType": "historical",
    "dateFrom": "2025-10-15",
    "dateTo": "2025-10-15",
    "requestedBy": "admin"
  }'
```

**Processing Time:** ~2 seconds

---

### Example 3: Auto-Detect Missing Days (Dry Run)

**Scenario:** Check which days are missing without syncing

```bash
curl -X POST "https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/recover-missing-days" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": true
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Found 5 days needing recovery",
  "missingDays": [
    {"date": "2025-10-09", "records": 0, "status": "MISSING"},
    {"date": "2025-10-10", "records": 0, "status": "MISSING"},
    {"date": "2025-10-11", "records": 0, "status": "MISSING"},
    {"date": "2025-10-14", "records": 0, "status": "MISSING"},
    {"date": "2025-10-20", "records": 1, "status": "LOW"}
  ],
  "recovered": [],
  "dryRun": true,
  "note": "DRY RUN - No sync requests created. Set dryRun=false to execute."
}
```

---

### Example 4: Auto-Recover Missing Days

**Scenario:** Automatically recover all missing days in current month

```bash
curl -X POST "https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/recover-missing-days" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": false,
    "autoRecover": true
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Found 5 days needing recovery",
  "missingDays": ["2025-10-09", "2025-10-10", "2025-10-11", "2025-10-14", "2025-10-20"],
  "recovered": [
    {"date": "2025-10-09", "success": true, "syncRequestId": 53},
    {"date": "2025-10-10", "success": true, "syncRequestId": 54},
    {"date": "2025-10-11", "success": true, "syncRequestId": 55},
    {"date": "2025-10-14", "success": true, "syncRequestId": 56},
    {"date": "2025-10-20", "success": true, "syncRequestId": 57}
  ],
  "note": "Created 5 sync requests. Office computer will process automatically."
}
```

---

### Example 5: Sync Specific Month

**Scenario:** Sync entire September 2025

```bash
curl -X POST "https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/recover-missing-days" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "month": 9,
    "year": 2025,
    "dryRun": false,
    "autoRecover": true
  }'
```

---

## 📊 PARAMETERS REFERENCE

### trigger-sync Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `syncType` | string | Yes | Type of sync: "historical" or "auto" |
| `dateFrom` | string | Yes | Start date (YYYY-MM-DD) |
| `dateTo` | string | Yes | End date (YYYY-MM-DD) |
| `requestedBy` | string | No | Who requested the sync (for tracking) |

---

### recover-missing-days Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `month` | number | No | Current month | Month to check (1-12) |
| `year` | number | No | Current year | Year to check |
| `autoRecover` | boolean | No | true | Automatically create sync requests |
| `dryRun` | boolean | No | false | Check only, don't create sync requests |

---

## 🔄 HOW IT WORKS

### Step-by-Step Process

1. **Edge Function Called**
   - User/System calls edge function via HTTP POST
   - Function validates parameters

2. **Sync Request Created**
   - Function inserts record into `sync_requests` table
   - Status: "pending"

3. **Office Computer Detects Request**
   - Sync script polls `sync_requests` table every 5 seconds
   - Picks up pending requests

4. **Data Fetched from SmartOffice**
   - Office computer calls SmartOffice API
   - Fetches attendance logs for specified date range

5. **Data Stored in Database**
   - Logs inserted into `employee_raw_logs` table
   - Duplicates prevented via upsert

6. **Request Marked Complete**
   - Sync request status updated to "completed"
   - Result message added (e.g., "Synced 159 new logs")

---

## 📋 DATABASE TABLES

### `sync_requests` (Sync Queue)

**Purpose:** Queue of sync requests for office computer to process

**Columns:**
- `id` - Unique request ID
- `sync_type` - "historical" or "auto"
- `status` - "pending", "processing", "completed", "failed"
- `requested_by` - Who requested the sync
- `requested_at` - When request was created
- `completed_at` - When request was completed
- `result` - Result message (e.g., "Synced 159 new logs")

**Example Query:**
```sql
SELECT * FROM sync_requests 
WHERE status = 'completed' 
ORDER BY completed_at DESC 
LIMIT 10;
```

---

### `employee_raw_logs` (Attendance Data)

**Purpose:** Store all employee attendance punch records

**Columns:**
- `id` - Unique log ID
- `employee_code` - Employee identifier
- `log_date` - Timestamp of punch
- `punch_direction` - "in" or "out"
- `sync_time` - When synced from SmartOffice

**Example Query:**
```sql
SELECT 
  DATE(log_date) as date,
  COUNT(*) as total_punches,
  COUNT(DISTINCT employee_code) as employees
FROM employee_raw_logs
WHERE DATE(log_date) >= '2025-10-01'
  AND DATE(log_date) <= '2025-10-31'
GROUP BY DATE(log_date)
ORDER BY date;
```

---

## 🛠️ OFFICE COMPUTER SYNC SCRIPT

**Location:** `/set-upx3/office-sync-script.js`

**How It Works:**
- Runs in daemon mode (continuous loop)
- Polls `sync_requests` table every 5 seconds
- Processes pending requests automatically
- Fetches data from SmartOffice API (localhost:84)
- Stores in Supabase database

**Auto-Sync:**
- Syncs last 24 hours every 5 seconds
- Prevents duplicates using upsert
- Handles errors gracefully

---

## ⏱️ TIMING & PERFORMANCE

### Sync Speed

| Data Volume | Processing Time |
|-------------|-----------------|
| Single day (~150 records) | 2-3 seconds |
| Week (~1,000 records) | 5-7 seconds |
| Month (~3,500 records) | 7-10 seconds |

### Polling Frequency

- Office computer checks for requests: **Every 5 seconds**
- Auto-sync of last 24 hours: **Every 5 seconds**

### Recommended Wait Times

- After creating sync request: **30 seconds**
- For large date ranges (>1 month): **1-2 minutes**

---

## 🔍 MONITORING & VERIFICATION

### Check Sync Request Status

```sql
SELECT 
  id,
  sync_type,
  status,
  result,
  requested_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - requested_at)) as processing_seconds
FROM sync_requests
WHERE id = 61;
```

---

### Verify Data Recovered

```sql
SELECT 
  DATE(log_date) as date,
  COUNT(*) as records,
  COUNT(DISTINCT employee_code) as employees
FROM employee_raw_logs
WHERE DATE(log_date) = '2025-10-15'
GROUP BY DATE(log_date);
```

---

### Check Missing Days

```sql
WITH date_series AS (
  SELECT generate_series(
    '2025-10-01'::date,
    '2025-10-31'::date,
    '1 day'::interval
  )::date AS date
)
SELECT 
  ds.date,
  COALESCE(COUNT(erl.id), 0) as records
FROM date_series ds
LEFT JOIN employee_raw_logs erl ON DATE(erl.log_date) = ds.date
GROUP BY ds.date
HAVING COUNT(erl.id) = 0
ORDER BY ds.date;
```

---

## 🚨 TROUBLESHOOTING

### Issue 1: Sync Request Stuck in "Pending"

**Cause:** Office computer script not running

**Solution:**
1. Check if office computer is online
2. Verify sync script is running
3. Check SmartOffice API is accessible (localhost:84)

---

### Issue 2: No Data Synced

**Cause:** No data exists in SmartOffice for that date

**Solution:**
1. Verify date range is correct
2. Check SmartOffice device has data
3. Confirm employees were present on that date

---

### Issue 3: Duplicate Records

**Cause:** Multiple sync requests for same date

**Solution:**
- System prevents duplicates automatically via upsert
- No action needed

---

## 📝 BEST PRACTICES

### 1. Use Dry Run First
Always test with `dryRun: true` before executing recovery

### 2. Sync During Off-Hours
Large syncs are faster when office computer is idle

### 3. Monitor Sync Requests
Check `sync_requests` table regularly for failed requests

### 4. Verify After Sync
Always verify data after sync completes

### 5. Keep Office Computer Online
Ensure office computer is always running for auto-sync

---

## 🔐 AUTHENTICATION

**Required:** Supabase Anon Key or Service Role Key

**Get Your Key:**
1. Go to Supabase Dashboard
2. Project Settings → API
3. Copy `anon` key for client-side calls
4. Copy `service_role` key for server-side calls (keep secret!)

**Example:**
```bash
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📊 COMPLETE WORKFLOW EXAMPLE

### Scenario: Recover Missing October Data

**Step 1: Check for missing days**
```bash
curl -X POST "https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/recover-missing-days" \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

**Step 2: Review missing days**
```json
{
  "missingDays": ["2025-10-09", "2025-10-10", "2025-10-11"]
}
```

**Step 3: Execute recovery**
```bash
curl -X POST "https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/recover-missing-days" \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false, "autoRecover": true}'
```

**Step 4: Wait 30 seconds**
```bash
sleep 30
```

**Step 5: Verify recovery**
```sql
SELECT 
  DATE(log_date) as date,
  COUNT(*) as records
FROM employee_raw_logs
WHERE DATE(log_date) IN ('2025-10-09', '2025-10-10', '2025-10-11')
GROUP BY DATE(log_date);
```

**Expected Result:**
```
date       | records
-----------+---------
2025-10-09 | 159
2025-10-10 | 153
2025-10-11 | 166
```

---

## 🎯 SUMMARY

**Key Points:**
- ✅ Two edge functions: `trigger-sync` and `recover-missing-days`
- ✅ Office computer processes sync requests automatically
- ✅ Data synced from SmartOffice API to Supabase
- ✅ Processing time: 2-10 seconds per request
- ✅ Duplicates prevented automatically
- ✅ Use dry run to test before executing

**Tables:**
- `sync_requests` - Queue of sync requests
- `employee_raw_logs` - Attendance data storage

**Office Computer:**
- Runs sync script in daemon mode
- Polls every 5 seconds
- Auto-syncs last 24 hours

---

## 📞 SUPPORT

**Edge Functions:**
- `trigger-sync` - Manual sync with date range
- `recover-missing-days` - Auto-detect and recover

**Database Tables:**
- `sync_requests` - Sync queue
- `employee_raw_logs` - Attendance data

**Office Computer:**
- Script: `/set-upx3/office-sync-script.js`
- API: SmartOffice at `http://localhost:84/api/v2/WebAPI`

---

**Last Updated:** October 31, 2025  
**Version:** 1.0
