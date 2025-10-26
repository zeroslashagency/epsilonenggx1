#!/bin/bash

# ============================================================================
# DEPLOY EDGE FUNCTION - HISTORICAL DATA SYNC
# ============================================================================

echo "🚀 Deploying Edge Function: sync-historical-data"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "📦 Installing Supabase CLI..."
    npm install -g supabase
fi

# Check if logged in
echo "🔐 Checking Supabase login..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo "🔑 Please run: supabase login"
    exit 1
fi

# Link to project (if not already linked)
echo "🔗 Linking to project..."
supabase link --project-ref sxnaopzgaddvziplrlbe

# Deploy the Edge Function
echo ""
echo "📤 Deploying Edge Function..."
supabase functions deploy sync-historical-data

# Check deployment status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Edge Function deployed successfully!"
    echo ""
    echo "📍 Function URL:"
    echo "   https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/sync-historical-data"
    echo ""
    echo "🧪 Test with:"
    echo "   curl -X POST \\"
    echo "     'https://sxnaopzgaddvziplrlbe.supabase.co/functions/v1/sync-historical-data' \\"
    echo "     -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"fromDate\":\"2025-10-14\",\"toDate\":\"2025-10-20\",\"smartofficeUrl\":\"http://localhost:84/api/v2/WebAPI\",\"smartofficeApiKey\":\"344612092518\"}'"
    echo ""
    echo "🎉 Ready to use!"
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Please check the error messages above."
    exit 1
fi
