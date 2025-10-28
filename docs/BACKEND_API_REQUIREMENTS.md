# BACKEND API REQUIREMENTS - Data Refresh Implementation

**Date:** January 28, 2025  
**Status:** Frontend Complete, Backend Pending  
**Priority:** HIGH

---

## 🚨 CURRENT SITUATION

The frontend data refresh implementation is **COMPLETE** and deployed, but the following API endpoints are returning **404 errors** because they don't exist yet:

### Console Errors Observed:
```
❌ api/analytics/reports?period=month&type=production:1  Failed to load resource: 404
❌ Error fetching analytics: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON

❌ Error fetching dashboard data: TypeError: Cannot read properties of undefined (reading 'length')
```

---

## 📋 REQUIRED API ENDPOINTS

### 1. Analytics Reports API

**Endpoint:** `GET /api/analytics/reports`

**Query Parameters:**
- `period` (string): `today` | `week` | `month` | `quarter` | `year`
- `type` (string): `production` | `efficiency` | `quality` | `machine`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalProduction": 12450,
    "unitsPerHour": 156,
    "efficiency": 87.5,
    "qualityScore": 94.2,
    "trends": [
      {
        "date": "2025-10-21",
        "value": 1200,
        "change": 5.2
      }
    ],
    "breakdown": {
      "completed": 42,
      "inProgress": 15,
      "pending": 8
    }
  }
}
```

**Database Queries Needed:**
```sql
-- Production metrics
SELECT 
  COUNT(*) as total_production,
  AVG(units_per_hour) as avg_units_per_hour,
  AVG(efficiency_rate) as avg_efficiency,
  AVG(quality_score) as avg_quality
FROM production_metrics
WHERE date >= ? AND date <= ?;

-- Trends over time
SELECT 
  DATE(created_at) as date,
  SUM(production_output) as value,
  ((SUM(production_output) - LAG(SUM(production_output)) OVER (ORDER BY DATE(created_at))) / 
   LAG(SUM(production_output)) OVER (ORDER BY DATE(created_at))) * 100 as change
FROM production_metrics
WHERE date >= ? AND date <= ?
GROUP BY DATE(created_at)
ORDER BY date;
```

---

### 2. Monitoring Reports API

**Endpoint:** `GET /api/monitoring/reports`

**Query Parameters:**
- `period` (string): `today` | `week` | `month` | `quarter` | `year`

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "title": "Production Summary",
      "description": "Overall production metrics and KPIs",
      "type": "production",
      "color": "bg-blue-100 text-blue-600",
      "lastGenerated": "2025-10-28T05:30:00Z",
      "status": "completed",
      "fileUrl": "/reports/production-summary-2025-10-28.pdf"
    },
    {
      "id": "2",
      "title": "Machine Utilization",
      "description": "Machine efficiency and uptime analysis",
      "type": "machine",
      "color": "bg-purple-100 text-purple-600",
      "lastGenerated": "2025-10-28T05:00:00Z",
      "status": "completed",
      "fileUrl": "/reports/machine-utilization-2025-10-28.pdf"
    }
  ]
}
```

**Database Queries Needed:**
```sql
-- Get all reports
SELECT 
  id,
  title,
  description,
  type,
  last_generated,
  status,
  file_url
FROM monitoring_reports
WHERE period = ?
ORDER BY last_generated DESC;
```

---

### 3. Generate Report API

**Endpoint:** `GET /api/monitoring/reports/:id/generate`

**Path Parameters:**
- `id` (string): Report ID

**Expected Response:**
```json
{
  "success": true,
  "message": "Report generated successfully",
  "data": {
    "id": "1",
    "title": "Production Summary",
    "lastGenerated": "2025-10-28T05:40:00Z",
    "status": "completed",
    "fileUrl": "/reports/production-summary-2025-10-28.pdf"
  }
}
```

**Implementation Logic:**
```javascript
// 1. Fetch report configuration
const report = await db.query('SELECT * FROM monitoring_reports WHERE id = ?', [id])

// 2. Generate report based on type
switch(report.type) {
  case 'production':
    data = await generateProductionReport(period)
    break
  case 'machine':
    data = await generateMachineReport(period)
    break
  // ... other types
}

// 3. Create PDF/Excel file
const fileUrl = await generateReportFile(data, report.type)

// 4. Update database
await db.query(
  'UPDATE monitoring_reports SET last_generated = NOW(), file_url = ? WHERE id = ?',
  [fileUrl, id]
)

// 5. Return updated report
return { success: true, data: updatedReport }
```

---

### 4. Production Metrics API

**Endpoint:** `GET /api/production/metrics`

**Query Parameters:**
- `period` (string): `today` | `week` | `month` | `quarter`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "productionOutput": 1250,
    "efficiencyRate": 87.5,
    "qualityScore": 94.2,
    "downtimeHours": 2.3,
    "activeOrders": 15,
    "completedOrders": 42,
    "machineUtilization": 87.5,
    "trends": {
      "productionOutput": 12.5,
      "efficiencyRate": 5.2,
      "qualityScore": -1.8,
      "downtimeHours": -15.3
    }
  }
}
```

**Database Queries Needed:**
```sql
-- Current period metrics
SELECT 
  SUM(production_output) as production_output,
  AVG(efficiency_rate) as efficiency_rate,
  AVG(quality_score) as quality_score,
  SUM(downtime_hours) as downtime_hours,
  COUNT(DISTINCT CASE WHEN status = 'active' THEN order_id END) as active_orders,
  COUNT(DISTINCT CASE WHEN status = 'completed' THEN order_id END) as completed_orders,
  AVG(machine_utilization) as machine_utilization
FROM production_data
WHERE date >= ? AND date <= ?;

-- Previous period for comparison
SELECT 
  SUM(production_output) as prev_production_output,
  AVG(efficiency_rate) as prev_efficiency_rate
FROM production_data
WHERE date >= ? AND date <= ?;

-- Calculate trends
SELECT 
  ((current_value - previous_value) / previous_value) * 100 as trend_percentage
```

---

### 5. Dashboard Data API (Fix Existing)

**Issue:** Dashboard is throwing error: `Cannot read properties of undefined (reading 'length')`

**Location:** `page.tsx:100:46`

**Fix Required:**
```javascript
// Current code (line 100):
const totalEmployees = employeesData.length  // ❌ employeesData is undefined

// Should be:
const totalEmployees = employeesData?.length || 0
// OR
const totalEmployees = Array.isArray(employeesData) ? employeesData.length : 0
```

**API Response Format:**
```json
{
  "success": true,
  "data": {
    "employees": [...],  // Make sure this exists
    "attendance": [...],
    "stats": {...}
  }
}
```

---

## 🔧 IMPLEMENTATION CHECKLIST

### Phase 1: Critical APIs (Priority 1)
- [ ] Create `/api/analytics/reports` endpoint
- [ ] Create `/api/monitoring/reports` endpoint
- [ ] Create `/api/monitoring/reports/:id/generate` endpoint
- [ ] Create `/api/production/metrics` endpoint
- [ ] Fix dashboard API response format

### Phase 2: Database Setup
- [ ] Create `production_metrics` table (if not exists)
- [ ] Create `monitoring_reports` table (if not exists)
- [ ] Add indexes for date-based queries
- [ ] Seed initial report configurations

### Phase 3: Report Generation
- [ ] Implement PDF generation library
- [ ] Create report templates
- [ ] Set up file storage (local/S3)
- [ ] Add report scheduling (optional)

### Phase 4: Testing
- [ ] Test all endpoints with Postman
- [ ] Verify response formats match frontend expectations
- [ ] Test with different period parameters
- [ ] Load test with large datasets

---

## 📊 DATABASE SCHEMA RECOMMENDATIONS

### `production_metrics` Table
```sql
CREATE TABLE production_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  production_output INTEGER NOT NULL,
  efficiency_rate DECIMAL(5,2),
  quality_score DECIMAL(5,2),
  downtime_hours DECIMAL(5,2),
  machine_utilization DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_production_metrics_date ON production_metrics(date);
```

### `monitoring_reports` Table
```sql
CREATE TABLE monitoring_reports (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  color VARCHAR(100),
  last_generated TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  file_url TEXT,
  period VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_monitoring_reports_type ON monitoring_reports(type);
CREATE INDEX idx_monitoring_reports_period ON monitoring_reports(period);
```

---

## 🚀 QUICK START GUIDE

### Step 1: Create API Routes (Next.js)

```typescript
// app/api/analytics/reports/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get('period') || 'month'
  const type = searchParams.get('type') || 'production'
  
  try {
    // Fetch data from database
    const data = await fetchAnalyticsData(period, type)
    
    return NextResponse.json({
      success: true,
      data: data
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
```

### Step 2: Implement Data Fetching

```typescript
async function fetchAnalyticsData(period: string, type: string) {
  const dateRange = getPeriodDateRange(period)
  
  const query = `
    SELECT 
      SUM(production_output) as total_production,
      AVG(efficiency_rate) as avg_efficiency
    FROM production_metrics
    WHERE date >= $1 AND date <= $2
  `
  
  const result = await db.query(query, [dateRange.start, dateRange.end])
  
  return {
    totalProduction: result.rows[0].total_production,
    efficiency: result.rows[0].avg_efficiency,
    // ... more fields
  }
}
```

### Step 3: Test Endpoint

```bash
# Test with curl
curl "http://localhost:3000/api/analytics/reports?period=month&type=production"

# Expected response
{
  "success": true,
  "data": {
    "totalProduction": 12450,
    "efficiency": 87.5
  }
}
```

---

## ⚠️ TEMPORARY WORKAROUND

Until backend APIs are ready, the frontend will:
- ✅ Show loading states
- ✅ Display error messages gracefully
- ✅ Fall back to mock data (Chart page)
- ✅ Fall back to default reports (Reports page)

**No crashes or broken UI** - just missing real data.

---

## 📞 SUPPORT

**Frontend Implementation:** ✅ Complete  
**Backend APIs:** ❌ Pending  
**Estimated Backend Effort:** 8-12 hours  
**Priority:** HIGH (users clicking refresh buttons)

---

**Next Steps:**
1. Backend team implements the 4 API endpoints
2. Test endpoints return correct data format
3. Deploy to staging
4. Verify frontend refresh buttons work
5. Deploy to production

**Report Generated:** January 28, 2025  
**Status:** Waiting for Backend Implementation
