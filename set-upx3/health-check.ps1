# SmartOffice Sync Health Check Script
# Run this to diagnose issues

Write-Host ""
Write-Host "🏥 SmartOffice Sync Health Check" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check 1: Node.js installed
Write-Host "1. Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js NOT installed!" -ForegroundColor Red
    Write-Host "      Install from: https://nodejs.org/" -ForegroundColor Yellow
}
Write-Host ""

# Check 2: SmartOffice API accessible
Write-Host "2. Checking SmartOffice API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:84/api/v2/WebAPI/GetDeviceLogs?apikey=344612092518" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   ✅ SmartOffice API is accessible" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Cannot connect to SmartOffice API!" -ForegroundColor Red
    Write-Host "      Make sure SmartOffice is running on port 84" -ForegroundColor Yellow
}
Write-Host ""

# Check 3: Sync script exists
Write-Host "3. Checking sync script..." -ForegroundColor Yellow
if (Test-Path "C:\SmartOfficeSync\office-sync-script.js") {
    Write-Host "   ✅ Sync script found" -ForegroundColor Green
} else {
    Write-Host "   ❌ Sync script NOT found!" -ForegroundColor Red
    Write-Host "      Expected: C:\SmartOfficeSync\office-sync-script.js" -ForegroundColor Yellow
}
Write-Host ""

# Check 4: Scheduled tasks
Write-Host "4. Checking scheduled tasks..." -ForegroundColor Yellow
$mainTask = Get-ScheduledTask -TaskName "SmartOfficeSync" -ErrorAction SilentlyContinue
$monitorTask = Get-ScheduledTask -TaskName "SmartOfficeSync-Monitor" -ErrorAction SilentlyContinue

if ($mainTask) {
    $mainInfo = Get-ScheduledTaskInfo -TaskName "SmartOfficeSync"
    Write-Host "   ✅ Main task: $($mainTask.State)" -ForegroundColor Green
    Write-Host "      Last run: $($mainInfo.LastRunTime)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Main task NOT found!" -ForegroundColor Red
}

if ($monitorTask) {
    $monitorInfo = Get-ScheduledTaskInfo -TaskName "SmartOfficeSync-Monitor"
    Write-Host "   ✅ Monitor task: $($monitorTask.State)" -ForegroundColor Green
    Write-Host "      Last run: $($monitorInfo.LastRunTime)" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Monitor task NOT found (optional)" -ForegroundColor Yellow
}
Write-Host ""

# Check 5: Process running
Write-Host "5. Checking if sync process is running..." -ForegroundColor Yellow
$syncProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like "*office-sync-script*"}
if ($syncProcess) {
    Write-Host "   ✅ Sync process is running (PID: $($syncProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   ❌ Sync process is NOT running!" -ForegroundColor Red
}
Write-Host ""

# Check 6: Log files
Write-Host "6. Checking log files..." -ForegroundColor Yellow
$logFiles = @(
    "C:\SmartOfficeSync\startup.log",
    "C:\SmartOfficeSync\service.log",
    "C:\SmartOfficeSync\monitor.log",
    "C:\SmartOfficeSync\sync-output.log"
)

foreach ($log in $logFiles) {
    if (Test-Path $log) {
        $lastWrite = (Get-Item $log).LastWriteTime
        Write-Host "   ✅ $([System.IO.Path]::GetFileName($log)) - Last updated: $lastWrite" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $([System.IO.Path]::GetFileName($log)) - Not found" -ForegroundColor Yellow
    }
}
Write-Host ""

# Check 7: Internet connectivity
Write-Host "7. Checking Supabase connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://sxnaopzgaddvziplrlbe.supabase.co" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   ✅ Can connect to Supabase" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Cannot connect to Supabase!" -ForegroundColor Red
    Write-Host "      Check internet connection" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "📊 Health Check Complete" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you see ❌ errors above, fix them before running sync." -ForegroundColor Yellow
Write-Host ""
Write-Host "To view recent logs:" -ForegroundColor Cyan
Write-Host "  type C:\SmartOfficeSync\sync-output.log" -ForegroundColor White
Write-Host ""
Write-Host "To manually start sync:" -ForegroundColor Cyan
Write-Host "  Start-ScheduledTask -TaskName 'SmartOfficeSync'" -ForegroundColor White
Write-Host ""

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
