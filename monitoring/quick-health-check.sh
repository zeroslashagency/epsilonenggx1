#!/bin/bash

# ============================================================================
# QUICK HEALTH CHECK - Attendance System
# ============================================================================
# Purpose: Quick snapshot of system health
# Usage: ./quick-health-check.sh
# ============================================================================

echo "🏥 Attendance System - Quick Health Check"
echo "=========================================="
echo ""

# Configuration
SUPABASE_URL="https://sxnaopzgaddvziplrlbe.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w"

# 1. Check Database
echo "📊 Database Status:"
response=$(curl -s -X GET \
    "${SUPABASE_URL}/rest/v1/employee_raw_logs?select=count" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Range: 0-0")

if [ $? -eq 0 ]; then
    echo "   ✅ Database: Reachable"
    count=$(echo "$response" | grep -o '[0-9]*' | head -1)
    echo "   📊 Total Records: ${count:-unknown}"
else
    echo "   ❌ Database: Unreachable"
fi

# 2. Check Sync Script
echo ""
echo "🔄 Sync Script Status:"
if pgrep -f "office-sync-script.js" > /dev/null; then
    echo "   ✅ Sync Script: Running"
    pid=$(pgrep -f "office-sync-script.js")
    echo "   🆔 Process ID: $pid"
else
    echo "   ❌ Sync Script: Not Running"
    echo "   💡 Start with: cd set-upx3 && node office-sync-script.js --daemon"
fi

# 3. Check Last Sync Time
echo ""
echo "🕐 Last Sync:"
last_sync=$(curl -s -X GET \
    "${SUPABASE_URL}/rest/v1/employee_raw_logs?select=sync_time&order=sync_time.desc&limit=1" \
    -H "apikey: ${SUPABASE_ANON_KEY}" | grep -o '"sync_time":"[^"]*"' | cut -d'"' -f4)

if [ -n "$last_sync" ]; then
    echo "   🕐 Last Sync: $last_sync"
else
    echo "   ⚠️  Last Sync: Unknown"
fi

# 4. Check Today's Data
echo ""
echo "📅 Today's Data:"
today=$(date '+%Y-%m-%d')
today_count=$(curl -s -X GET \
    "${SUPABASE_URL}/rest/v1/employee_raw_logs?select=count&log_date=gte.${today}T00:00:00&log_date=lte.${today}T23:59:59" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Range: 0-0" | grep -o '[0-9]*' | head -1)

echo "   📊 Today's Punches: ${today_count:-0}"

# 5. Check Unique Employees Today
unique_today=$(curl -s -X GET \
    "${SUPABASE_URL}/rest/v1/employee_raw_logs?select=employee_code&log_date=gte.${today}T00:00:00&log_date=lte.${today}T23:59:59" \
    -H "apikey: ${SUPABASE_ANON_KEY}" | grep -o '"employee_code":"[^"]*"' | sort -u | wc -l)

echo "   👥 Unique Employees: ${unique_today:-0}"

# 6. Overall Health
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 Overall Health:"

if [ $? -eq 0 ] && pgrep -f "office-sync-script.js" > /dev/null && [ -n "$last_sync" ]; then
    echo "   ✅ System Status: HEALTHY"
else
    echo "   ⚠️  System Status: NEEDS ATTENTION"
fi

echo ""
echo "📅 Check Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
