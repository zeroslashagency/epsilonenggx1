#!/bin/bash

# ============================================================================
# PM2 Setup Script for Office Sync
# ============================================================================
# PM2 is a production process manager that:
# - Auto-restarts if script crashes
# - Starts on computer boot
# - Provides logs and monitoring
# - Works on Windows, Mac, and Linux
# ============================================================================

echo ""
echo "========================================"
echo " SmartOffice Sync - PM2 Setup"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js is installed: $(node --version)"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install PM2"
        exit 1
    fi
    
    echo "✅ PM2 installed successfully"
else
    echo "✅ PM2 is already installed: $(pm2 --version)"
fi

echo ""
echo "🚀 Starting sync script with PM2..."

# Stop existing instance if running
pm2 delete smartoffice-sync 2>/dev/null

# Start the script with PM2
pm2 start office-sync-script.js --name smartoffice-sync --time

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Script started successfully!"
    echo ""
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 to start on boot
    echo "🔧 Setting up auto-start on boot..."
    pm2 startup
    
    echo ""
    echo "========================================"
    echo " SUCCESS! Setup Complete"
    echo "========================================"
    echo ""
    echo "The sync script is now running and will:"
    echo "  ✅ Auto-restart if it crashes"
    echo "  ✅ Start automatically on computer boot"
    echo "  ✅ Run in the background 24/7"
    echo ""
    echo "Useful PM2 commands:"
    echo "  pm2 status              - Check script status"
    echo "  pm2 logs smartoffice-sync  - View logs"
    echo "  pm2 restart smartoffice-sync - Restart script"
    echo "  pm2 stop smartoffice-sync    - Stop script"
    echo "  pm2 delete smartoffice-sync  - Remove script"
    echo "  pm2 monit              - Real-time monitoring"
    echo ""
else
    echo ""
    echo "❌ Failed to start script with PM2"
    exit 1
fi
