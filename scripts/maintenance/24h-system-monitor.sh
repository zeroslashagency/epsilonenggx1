#!/bin/bash

# ============================================================================
# 24-HOUR ATTENDANCE SYSTEM MONITORING SCRIPT
# ============================================================================
# Purpose: Monitor database, sync script, and API health for 24 hours
# Date: October 26, 2025, 3:10 AM IST
# ============================================================================

echo "🔍 24-Hour Attendance System Monitor"
echo "======================================"
echo ""
echo "📅 Start Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "⏱️  Duration: 24 hours"
echo "📊 Monitoring: Database, Sync Script, APIs"
echo ""

# Configuration
SUPABASE_URL="https://sxnaopzgaddvziplrlbe.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w"
API_BASE_URL="http://localhost:3001"
CHECK_INTERVAL=300  # 5 minutes
TOTAL_CHECKS=288    # 24 hours * 12 checks per hour
LOG_FILE="monitoring/monitor-$(date '+%Y%m%d-%H%M%S').log"

# Create monitoring directory
mkdir -p monitoring

# Initialize log file
echo "=== 24-Hour Monitoring Log ===" > "$LOG_FILE"
echo "Start Time: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Function to log with timestamp
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$LOG_FILE"
}

# Function to check database health
check_database() {
    log "📊 Checking database health..."
    
    # Query database for record count and last sync
    local response=$(curl -s -X POST \
        "${SUPABASE_URL}/rest/v1/rpc/get_attendance_stats" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json")
    
    if [ $? -eq 0 ]; then
        log "   ✅ Database: Reachable"
        
        # Get record count from employee_raw_logs
        local count=$(curl -s -X GET \
            "${SUPABASE_URL}/rest/v1/employee_raw_logs?select=count" \
            -H "apikey: ${SUPABASE_ANON_KEY}" \
            -H "Range: 0-0" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
        
        log "   📊 Total Records: ${count:-unknown}"
        echo "db_health,status=ok,records=${count:-0}" >> "$LOG_FILE"
    else
        log "   ❌ Database: Unreachable"
        echo "db_health,status=error" >> "$LOG_FILE"
    fi
}

# Function to check sync script status
check_sync_script() {
    log "🔄 Checking sync script status..."
    
    # Check if sync script process is running
    if pgrep -f "office-sync-script.js" > /dev/null; then
        log "   ✅ Sync Script: Running"
        
        # Get last sync time from database
        local last_sync=$(curl -s -X GET \
            "${SUPABASE_URL}/rest/v1/employee_raw_logs?select=sync_time&order=sync_time.desc&limit=1" \
            -H "apikey: ${SUPABASE_ANON_KEY}" | grep -o '"sync_time":"[^"]*"' | cut -d'"' -f4)
        
        if [ -n "$last_sync" ]; then
            log "   🕐 Last Sync: $last_sync"
            echo "sync_status,status=running,last_sync=$last_sync" >> "$LOG_FILE"
        else
            log "   ⚠️  Last Sync: Unknown"
            echo "sync_status,status=running,last_sync=unknown" >> "$LOG_FILE"
        fi
    else
        log "   ❌ Sync Script: Not Running"
        echo "sync_status,status=stopped" >> "$LOG_FILE"
    fi
}

# Function to check API health
check_api() {
    log "🌐 Checking API health..."
    
    # Check attendance API
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/get-attendance?dateRange=today" 2>/dev/null)
    local http_code=$(echo "$response" | tail -n1)
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$http_code" = "200" ]; then
        log "   ✅ Attendance API: OK (${response_time}ms)"
        echo "api_health,endpoint=attendance,status=ok,response_time=${response_time}" >> "$LOG_FILE"
    else
        log "   ❌ Attendance API: Error (HTTP $http_code)"
        echo "api_health,endpoint=attendance,status=error,http_code=$http_code" >> "$LOG_FILE"
    fi
    
    # Check analytics API
    start_time=$(date +%s%N)
    response=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/attendance-analytics?days=14" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$http_code" = "200" ]; then
        log "   ✅ Analytics API: OK (${response_time}ms)"
        echo "api_health,endpoint=analytics,status=ok,response_time=${response_time}" >> "$LOG_FILE"
    else
        log "   ❌ Analytics API: Error (HTTP $http_code)"
        echo "api_health,endpoint=analytics,status=error,http_code=$http_code" >> "$LOG_FILE"
    fi
}

# Function to check today's data
check_today_data() {
    log "📅 Checking today's data..."
    
    local today=$(date '+%Y-%m-%d')
    local response=$(curl -s -X GET \
        "${SUPABASE_URL}/rest/v1/employee_raw_logs?select=count&log_date=gte.${today}T00:00:00&log_date=lte.${today}T23:59:59" \
        -H "apikey: ${SUPABASE_ANON_KEY}")
    
    local count=$(echo "$response" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
    
    if [ -n "$count" ]; then
        log "   📊 Today's Punches: $count"
        echo "today_data,date=$today,punches=$count" >> "$LOG_FILE"
    else
        log "   ⚠️  Today's Punches: Unknown"
        echo "today_data,date=$today,punches=unknown" >> "$LOG_FILE"
    fi
}

# Function to generate summary report
generate_summary() {
    log ""
    log "📊 Generating 24-hour summary report..."
    
    local total_checks=$(grep -c "db_health" "$LOG_FILE")
    local db_errors=$(grep -c "db_health,status=error" "$LOG_FILE")
    local sync_errors=$(grep -c "sync_status,status=stopped" "$LOG_FILE")
    local api_errors=$(grep -c "api_health.*status=error" "$LOG_FILE")
    
    log ""
    log "=== 24-HOUR MONITORING SUMMARY ==="
    log "Total Checks: $total_checks"
    log "Database Errors: $db_errors"
    log "Sync Script Errors: $sync_errors"
    log "API Errors: $api_errors"
    log ""
    
    if [ $db_errors -eq 0 ] && [ $sync_errors -eq 0 ] && [ $api_errors -eq 0 ]; then
        log "✅ System Status: HEALTHY"
        log "   All systems operational for 24 hours"
    else
        log "⚠️  System Status: ISSUES DETECTED"
        log "   Please review the log file for details"
    fi
    
    log ""
    log "📄 Full log saved to: $LOG_FILE"
}

# Main monitoring loop
log "🚀 Starting 24-hour monitoring..."
log ""

check_count=0
while [ $check_count -lt $TOTAL_CHECKS ]; do
    check_count=$((check_count + 1))
    
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Check #$check_count of $TOTAL_CHECKS"
    log ""
    
    # Run all checks
    check_database
    check_sync_script
    check_api
    check_today_data
    
    log ""
    log "✅ Check complete. Next check in $CHECK_INTERVAL seconds..."
    log ""
    
    # Wait before next check (unless it's the last one)
    if [ $check_count -lt $TOTAL_CHECKS ]; then
        sleep $CHECK_INTERVAL
    fi
done

# Generate final summary
generate_summary

log ""
log "🎉 24-hour monitoring completed!"
log "📅 End Time: $(date '+%Y-%m-%d %H:%M:%S')"

exit 0
