@echo off
REM ============================================
REM DOCUMENTATION CLEANUP SCRIPT (Windows)
REM Date: October 25, 2025
REM Purpose: Organize and clean up documentation files
REM ============================================

echo 🧹 Starting documentation cleanup...
echo.

REM Create archive folders
echo 📁 Creating archive folders...
if not exist "docs\fixes" mkdir docs\fixes
if not exist "docs\audits" mkdir docs\audits
if not exist "docs\investigations" mkdir docs\investigations
echo ✅ Folders created
echo.

REM Archive fix documentation
echo 🗄️ Archiving fix documentation...
if exist "SIDEBAR_FIX_REPORT.md" move "SIDEBAR_FIX_REPORT.md" "docs\fixes\" >nul && echo   ✅ SIDEBAR_FIX_REPORT.md
if exist "COLLAPSIBLE_SECTIONS_FIX.md" move "COLLAPSIBLE_SECTIONS_FIX.md" "docs\fixes\" >nul && echo   ✅ COLLAPSIBLE_SECTIONS_FIX.md
if exist "ROLE_PERMISSIONS_FIX.md" move "ROLE_PERMISSIONS_FIX.md" "docs\fixes\" >nul && echo   ✅ ROLE_PERMISSIONS_FIX.md
if exist "FIXES_APPLIED_SUMMARY.md" move "FIXES_APPLIED_SUMMARY.md" "docs\fixes\" >nul && echo   ✅ FIXES_APPLIED_SUMMARY.md
if exist "FIXES_APPLIED_FINAL_REPORT.md" move "FIXES_APPLIED_FINAL_REPORT.md" "docs\fixes\" >nul && echo   ✅ FIXES_APPLIED_FINAL_REPORT.md
if exist "COMPLETE_RBAC_FIX_SUMMARY.md" move "COMPLETE_RBAC_FIX_SUMMARY.md" "docs\fixes\" >nul && echo   ✅ COMPLETE_RBAC_FIX_SUMMARY.md
if exist "ROLE_FIX_APPLIED.md" move "ROLE_FIX_APPLIED.md" "docs\fixes\" >nul && echo   ✅ ROLE_FIX_APPLIED.md
echo.

REM Archive audit documentation
echo 🗄️ Archiving audit documentation...
if exist "SENIOR_DEV_COMPLETE_AUDIT_REPORT.md" move "SENIOR_DEV_COMPLETE_AUDIT_REPORT.md" "docs\audits\" >nul && echo   ✅ SENIOR_DEV_COMPLETE_AUDIT_REPORT.md
if exist "AUDIT_REPORT.md" move "AUDIT_REPORT.md" "docs\audits\" >nul && echo   ✅ AUDIT_REPORT.md
if exist "AUDIT_SUMMARY.md" move "AUDIT_SUMMARY.md" "docs\audits\" >nul && echo   ✅ AUDIT_SUMMARY.md
if exist "API_PERMISSIONS_AUDIT.md" move "API_PERMISSIONS_AUDIT.md" "docs\audits\" >nul && echo   ✅ API_PERMISSIONS_AUDIT.md
echo.

REM Archive investigations
echo 🗄️ Archiving investigations...
if exist "ROLE_FIELD_INVESTIGATION.md" move "ROLE_FIELD_INVESTIGATION.md" "docs\investigations\" >nul && echo   ✅ ROLE_FIELD_INVESTIGATION.md
echo.

REM Delete temporary testing files
echo 🗑️ Deleting temporary testing files...
if exist "TESTING_VERIFICATION_PLAN.md" del "TESTING_VERIFICATION_PLAN.md" && echo   ✅ TESTING_VERIFICATION_PLAN.md deleted
if exist "QUICK_TEST_GUIDE.md" del "QUICK_TEST_GUIDE.md" && echo   ✅ QUICK_TEST_GUIDE.md deleted
if exist "verification-scripts.sql" del "verification-scripts.sql" && echo   ✅ verification-scripts.sql deleted
if exist "MIGRATION_ANALYSIS.md" del "MIGRATION_ANALYSIS.md" && echo   ✅ MIGRATION_ANALYSIS.md deleted
if exist "MIGRATION_GUIDE.md" del "MIGRATION_GUIDE.md" && echo   ✅ MIGRATION_GUIDE.md deleted
if exist "MIGRATION_SUMMARY.md" del "MIGRATION_SUMMARY.md" && echo   ✅ MIGRATION_SUMMARY.md deleted
echo.

REM Delete Task Master files (optional)
echo ⚠️ Task Master files detected. Delete them? (y/n)
set /p response=
if /i "%response%"=="y" (
    echo 🗑️ Deleting Task Master files...
    if exist "TASKMASTER_READY.md" del "TASKMASTER_READY.md" && echo   ✅ TASKMASTER_READY.md deleted
    if exist "TASK_MASTER_SETUP.md" del "TASK_MASTER_SETUP.md" && echo   ✅ TASK_MASTER_SETUP.md deleted
    if exist "TASK_BREAKDOWN.md" del "TASK_BREAKDOWN.md" && echo   ✅ TASK_BREAKDOWN.md deleted
    if exist "init-taskmaster.bat" del "init-taskmaster.bat" && echo   ✅ init-taskmaster.bat deleted
    if exist "init-taskmaster.sh" del "init-taskmaster.sh" && echo   ✅ init-taskmaster.sh deleted
    echo.
    echo   Would you like to uninstall task-master-ai package? (y/n)
    set /p npm_response=
    if /i "!npm_response!"=="y" (
        call npm uninstall task-master-ai && echo   ✅ task-master-ai uninstalled
    )
) else (
    echo   ⏭️ Skipping Task Master files
)
echo.

REM Summary
echo ✅ Cleanup complete!
echo.
echo 📊 Summary:
echo   📁 Files organized:
echo      - docs\fixes\ (7 files)
echo      - docs\audits\ (4 files)
echo      - docs\investigations\ (1 file)
echo.
echo   🗑️ Files deleted:
echo      - 6 temporary testing files
if /i "%response%"=="y" (
    echo      - 5 Task Master files
)
echo.
echo   ✅ Essential files remaining:
echo      - README.md
echo      - EPSILON_PRD.md
echo      - FEATURE_MATRIX.md
echo      - VISUAL_WORKFLOW.md
echo      - REVISED_IMPLEMENTATION_PLAN.md
echo      - PROJECT_STRUCTURE_REPORT.md
echo      - SUPER_ADMIN_EXPLAINED.md
echo      - CLEANUP_AND_TASKMASTER_REPORT.md
echo.
echo 🎉 Your project is now clean and organized!
pause
