#!/bin/bash

# ============================================================================
# MONITOR SMARTOFFICE & AUTO-SYNC HISTORICAL DATA
# ============================================================================

echo "🔍 SmartOffice Monitoring & Auto-Sync Script"
echo "=============================================="
echo ""
echo "📅 Target Dates: October 14-20, 2025"
echo "🎯 Objective: Sync historical data when SmartOffice comes online"
echo ""

# Configuration
SMARTOFFICE_URL="http://localhost:84/api/v2/WebAPI"
API_KEY="344612092518"
CHECK_INTERVAL=30  # seconds
FROM_DATE="2025-10-14"
TO_DATE="2025-10-20"

# Function to check if SmartOffice is online
check_smartoffice() {
    local test_url="${SMARTOFFICE_URL}/GetDeviceLogs?apikey=${API_KEY}&fromdate=2025-10-26&todate=2025-10-26"
    
    if curl -s -f --max-time 5 "$test_url" > /dev/null 2>&1; then
        return 0  # Online
    else
        return 1  # Offline
    fi
}

# Function to sync historical data
sync_historical_data() {
    echo ""
    echo "🔄 SmartOffice is ONLINE! Starting historical sync..."
    echo "📅 Syncing: $FROM_DATE to $TO_DATE"
    echo ""
    
    cd "$(dirname "$0")/set-upx3" || exit 1
    
    # Run the sync script
    node office-sync-script.js historical "$FROM_DATE" "$TO_DATE"
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo ""
        echo "✅ Historical sync completed successfully!"
        echo ""
        echo "📊 Verification Steps:"
        echo "   1. Go to: http://localhost:3001/attendance"
        echo "   2. Check analytics chart for Oct 14-20"
        echo "   3. Verify data appears (not 0 punches)"
        echo ""
        return 0
    else
        echo ""
        echo "❌ Historical sync failed with exit code: $exit_code"
        echo "   Please check the logs above for errors"
        echo ""
        return 1
    fi
}

# Main monitoring loop
attempt=1
max_attempts=1000  # Run for ~8 hours (1000 * 30 seconds)

echo "🔍 Starting monitoring loop..."
echo "   Checking every $CHECK_INTERVAL seconds"
echo "   Press Ctrl+C to stop"
echo ""

while [ $attempt -le $max_attempts ]; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] Attempt $attempt/$max_attempts - Checking SmartOffice status..."
    
    if check_smartoffice; then
        echo "[$timestamp] ✅ SmartOffice is ONLINE!"
        
        # Sync historical data
        if sync_historical_data; then
            echo "[$timestamp] 🎉 Mission accomplished! Exiting..."
            exit 0
        else
            echo "[$timestamp] ⚠️  Sync failed, will retry in $CHECK_INTERVAL seconds..."
        fi
    else
        echo "[$timestamp] ❌ SmartOffice is OFFLINE - waiting $CHECK_INTERVAL seconds..."
    fi
    
    # Wait before next check
    sleep $CHECK_INTERVAL
    attempt=$((attempt + 1))
done

echo ""
echo "⏰ Maximum attempts reached. Please run this script again later."
echo ""
exit 1
