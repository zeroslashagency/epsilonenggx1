#!/bin/bash

# ============================================
# DOCUMENTATION CLEANUP SCRIPT
# Date: October 25, 2025
# Purpose: Organize and clean up documentation files
# ============================================

echo "🧹 Starting documentation cleanup..."
echo ""

# Create archive folders
echo "📁 Creating archive folders..."
mkdir -p docs/fixes
mkdir -p docs/audits
mkdir -p docs/investigations
echo "✅ Folders created"
echo ""

# Archive fix documentation
echo "🗄️ Archiving fix documentation..."
mv SIDEBAR_FIX_REPORT.md docs/fixes/ 2>/dev/null && echo "  ✅ SIDEBAR_FIX_REPORT.md"
mv COLLAPSIBLE_SECTIONS_FIX.md docs/fixes/ 2>/dev/null && echo "  ✅ COLLAPSIBLE_SECTIONS_FIX.md"
mv ROLE_PERMISSIONS_FIX.md docs/fixes/ 2>/dev/null && echo "  ✅ ROLE_PERMISSIONS_FIX.md"
mv FIXES_APPLIED_SUMMARY.md docs/fixes/ 2>/dev/null && echo "  ✅ FIXES_APPLIED_SUMMARY.md"
mv FIXES_APPLIED_FINAL_REPORT.md docs/fixes/ 2>/dev/null && echo "  ✅ FIXES_APPLIED_FINAL_REPORT.md"
mv COMPLETE_RBAC_FIX_SUMMARY.md docs/fixes/ 2>/dev/null && echo "  ✅ COMPLETE_RBAC_FIX_SUMMARY.md"
mv ROLE_FIX_APPLIED.md docs/fixes/ 2>/dev/null && echo "  ✅ ROLE_FIX_APPLIED.md"
echo ""

# Archive audit documentation
echo "🗄️ Archiving audit documentation..."
mv SENIOR_DEV_COMPLETE_AUDIT_REPORT.md docs/audits/ 2>/dev/null && echo "  ✅ SENIOR_DEV_COMPLETE_AUDIT_REPORT.md"
mv AUDIT_REPORT.md docs/audits/ 2>/dev/null && echo "  ✅ AUDIT_REPORT.md"
mv AUDIT_SUMMARY.md docs/audits/ 2>/dev/null && echo "  ✅ AUDIT_SUMMARY.md"
mv API_PERMISSIONS_AUDIT.md docs/audits/ 2>/dev/null && echo "  ✅ API_PERMISSIONS_AUDIT.md"
echo ""

# Archive investigations
echo "🗄️ Archiving investigations..."
mv ROLE_FIELD_INVESTIGATION.md docs/investigations/ 2>/dev/null && echo "  ✅ ROLE_FIELD_INVESTIGATION.md"
echo ""

# Delete temporary testing files
echo "🗑️ Deleting temporary testing files..."
rm -f TESTING_VERIFICATION_PLAN.md && echo "  ✅ TESTING_VERIFICATION_PLAN.md deleted"
rm -f QUICK_TEST_GUIDE.md && echo "  ✅ QUICK_TEST_GUIDE.md deleted"
rm -f verification-scripts.sql && echo "  ✅ verification-scripts.sql deleted"
rm -f MIGRATION_ANALYSIS.md && echo "  ✅ MIGRATION_ANALYSIS.md deleted"
rm -f MIGRATION_GUIDE.md && echo "  ✅ MIGRATION_GUIDE.md deleted"
rm -f MIGRATION_SUMMARY.md && echo "  ✅ MIGRATION_SUMMARY.md deleted"
echo ""

# Delete Task Master files (optional)
echo "⚠️ Task Master files detected. Delete them? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "🗑️ Deleting Task Master files..."
    rm -f TASKMASTER_READY.md && echo "  ✅ TASKMASTER_READY.md deleted"
    rm -f TASK_MASTER_SETUP.md && echo "  ✅ TASK_MASTER_SETUP.md deleted"
    rm -f TASK_BREAKDOWN.md && echo "  ✅ TASK_BREAKDOWN.md deleted"
    rm -f init-taskmaster.bat && echo "  ✅ init-taskmaster.bat deleted"
    rm -f init-taskmaster.sh && echo "  ✅ init-taskmaster.sh deleted"
    echo ""
    echo "  Would you like to uninstall task-master-ai package? (y/n)"
    read -r npm_response
    if [[ "$npm_response" =~ ^[Yy]$ ]]; then
        npm uninstall task-master-ai && echo "  ✅ task-master-ai uninstalled"
    fi
else
    echo "  ⏭️ Skipping Task Master files"
fi
echo ""

# Summary
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  📁 Files organized:"
echo "     - docs/fixes/ (7 files)"
echo "     - docs/audits/ (4 files)"
echo "     - docs/investigations/ (1 file)"
echo ""
echo "  🗑️ Files deleted:"
echo "     - 6 temporary testing files"
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "     - 5 Task Master files"
fi
echo ""
echo "  ✅ Essential files remaining:"
echo "     - README.md"
echo "     - EPSILON_PRD.md"
echo "     - FEATURE_MATRIX.md"
echo "     - VISUAL_WORKFLOW.md"
echo "     - REVISED_IMPLEMENTATION_PLAN.md"
echo "     - PROJECT_STRUCTURE_REPORT.md"
echo "     - SUPER_ADMIN_EXPLAINED.md"
echo "     - CLEANUP_AND_TASKMASTER_REPORT.md"
echo ""
echo "🎉 Your project is now clean and organized!"
