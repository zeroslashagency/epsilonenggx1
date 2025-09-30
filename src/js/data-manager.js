/**
 * Data Management Module
 * Handles data import/export, settings management, and database operations
 * Extracted from index.html
 */

// Global variables for data management
let holidays = [];
let breakdowns = [];
let isUsingTestData = false;
let testUserData = [];

/**
 * Save advanced settings
 */
function saveAdvancedSettings() {
    // Handle datetime-local input properly
    const startDateTimeValue = document.getElementById('startDateTime').value;
    let processedStartDateTime = null;
    
    if (startDateTimeValue) {
        // datetime-local input returns format like "2025-09-08T06:00"
        // We need to treat this as local time, not UTC
        const localDate = new Date(startDateTimeValue);
        processedStartDateTime = localDate.toISOString();
        console.log(`[UI-DEBUG] Global Start DateTime set to: ${processedStartDateTime}`);
    } else {
        console.log(`[UI-DEBUG] No Global Start DateTime set`);
    }
    
    advancedSettings = {
        startDateTime: processedStartDateTime,
        setupAvailabilityWindow: document.getElementById('setupAvailabilityWindow').value,
        shift1: document.getElementById('shift1').value,
        shift2: document.getElementById('shift2').value,
        prodShift1: document.getElementById('prodShift1').value,
        prodShift2: document.getElementById('prodShift2').value,
        prodShift3: document.getElementById('prodShift3').value,
        holidays: holidays,
        breakdowns: breakdowns
    };
    
    // Update global reference
    window.advancedSettings = advancedSettings;
    
    console.log(`[UI-DEBUG] Advanced settings saved:`, advancedSettings);
    showAlert('Advanced settings saved successfully!', 'success');
}

/**
 * Load advanced settings
 */
function loadAdvancedSettings() {
    // Load saved settings back into the UI
    if (advancedSettings.startDateTime) {
        // Convert ISO string back to datetime-local format
        const date = new Date(advancedSettings.startDateTime);
        const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        document.getElementById('startDateTime').value = localDateTime.toISOString().slice(0, 16);
        console.log(`[UI-DEBUG] Loaded Global Start DateTime: ${advancedSettings.startDateTime} -> ${localDateTime.toISOString().slice(0, 16)}`);
    } else {
        document.getElementById('startDateTime').value = '';
    }
    
    document.getElementById('setupAvailabilityWindow').value = advancedSettings.setupAvailabilityWindow || '06:00-22:00';
    document.getElementById('shift1').value = advancedSettings.shift1 || '06:00-14:00';
    document.getElementById('shift2').value = advancedSettings.shift2 || '14:00-22:00';
    document.getElementById('prodShift1').value = advancedSettings.prodShift1 || '06:00-14:00';
    document.getElementById('prodShift2').value = advancedSettings.prodShift2 || '14:00-22:00';
    document.getElementById('prodShift3').value = advancedSettings.prodShift3 || '22:00-06:00';
    
    // Load holidays and breakdowns
    if (advancedSettings.holidays) {
        holidays = advancedSettings.holidays;
        window.holidays = holidays; // Update global reference
        updateHolidayTable();
    }
    
    if (advancedSettings.breakdowns) {
        breakdowns = advancedSettings.breakdowns;
        window.breakdowns = breakdowns; // Update global reference
        updateBreakdownTable();
    }
}

/**
 * Export to Excel
 */
async function exportToExcel() {
    try {
        if (scheduleResults.length === 0) {
            showAlert('No schedule results to export. Please run the schedule first.', 'warning');
            return;
        }

        console.log('Exporting schedule results:', scheduleResults);
        console.log('First result structure:', scheduleResults[0]);

        // Use the comprehensive ExcelExporter class for 5-sheet export
        if (window.ExcelExporter) {
            const exporter = new window.ExcelExporter();
            
            // Prepare data in the format expected by ExcelExporter
            const scheduleData = {
                rows: scheduleResults,
                alerts: [], // Add any alerts if available
                summary: {
                    totalOrders: scheduleResults.length,
                    totalOperations: scheduleResults.length,
                    completedSuccessfully: scheduleResults.length
                }
            };
            
            const result = exporter.exportToExcel(scheduleData);
            
            if (result.success) {
                showAlert(`Excel file exported successfully: ${result.filename}`, 'success');
            } else {
                showAlert(`Export failed: ${result.error}`, 'error');
            }
            return;
        }

        // Fallback: Simple single-sheet export with correct property mapping
        const exportData = scheduleResults.map(result => ({
            'Part Number': result.PartNumber || result.partNumber || 'N/A',
            'Order Qty': result.Order_Quantity || result.orderQty || 'N/A',
            'Priority': result.Priority || result.priority || 'N/A',
            'Batch ID': result.Batch_ID || result.batchId || 'N/A',
            'Batch Qty': result.Batch_Qty || result.batchQty || 'N/A',
            'Operation Seq': result.OperationSeq || result.operationSeq || 'N/A',
            'Operation Name': result.OperationName || result.operationName || 'N/A',
            'Machine': result.Machine || result.machine || 'N/A',
            'Person': result.Person || result.person || 'N/A',
            'Setup Start': result.SetupStart || result.setupStart || 'N/A',
            'Setup End': result.SetupEnd || result.setupEnd || 'N/A',
            'Run Start': result.RunStart || result.runStart || 'N/A',
            'Run End': result.RunEnd || result.runEnd || 'N/A',
            'Timing': result.Timing || result.timing || 'N/A',
            'Due Date': result.DueDate || result.dueDate || 'N/A',
            'Status': result.Status || result.status || 'N/A'
        }));

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Schedule Results');

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `schedule_results_${timestamp}.xlsx`;

        // Export file
        XLSX.writeFile(wb, filename);
        
        showAlert('Schedule results exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showAlert('Error exporting to Excel: ' + error.message, 'error');
    }
}

/**
 * Import from Excel
 */
async function importFromExcel() {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get first worksheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    // Process imported data
                    processImportedData(jsonData);
                    
                } catch (error) {
                    console.error('File processing error:', error);
                    showAlert('Error processing Excel file: ' + error.message, 'error');
                }
            };
            
            reader.readAsArrayBuffer(file);
        };
        
        input.click();
    } catch (error) {
        console.error('Import error:', error);
        showAlert('Error importing from Excel: ' + error.message, 'error');
    }
}

/**
 * Process imported data
 */
function processImportedData(data) {
    try {
        // Normalize data format
        const normalizedData = data.map(row => ({
            PartNumber: row['Part Number'] || row.partnumber || row.PartNumber,
            OperationSeq: row['Operation Seq'] || row.operationseq || row.OperationSeq,
            OperationName: row['Operation Name'] || row.operationname || row.OperationName,
            SetupTime_Min: row['Setup Time'] || row.setuptime_min || row.SetupTime_Min,
            Operator: row['Operator'] || row.operator || row.Operator,
            CycleTime_Min: row['Cycle Time'] || row.cycletime_min || row.CycleTime_Min,
            Minimum_BatchSize: row['Min Batch Size'] || row.minimum_batchsize || row.Minimum_BatchSize,
            EligibleMachines: row['Eligible Machines'] || row.eligiblemachines || row.EligibleMachines
        }));

        // Set global data
        window.OP_MASTER = normalizedData;
        testUserData = normalizedData;
        isUsingTestData = true;

        // Update UI
        setupPartNumberSearch();
        updateOrdersTable();
        
        showAlert(`Successfully imported ${normalizedData.length} operations!`, 'success');
        
        console.log('Imported data:', normalizedData);
    } catch (error) {
        console.error('Data processing error:', error);
        showAlert('Error processing imported data: ' + error.message, 'error');
    }
}

/**
 * Import to database
 */
async function importToDatabase(data) {
    try {
        if (!window.supabase) {
            throw new Error('Database connection not available');
        }

        // Clear existing data
        const { error: deleteError } = await window.supabase
            .from('operations')
            .delete()
            .neq('id', 0); // Delete all records

        if (deleteError) {
            throw deleteError;
        }

        // Insert new data
        const { error: insertError } = await window.supabase
            .from('operations')
            .insert(data);

        if (insertError) {
            throw insertError;
        }

        showAlert('Data imported to database successfully!', 'success');
    } catch (error) {
        console.error('Database import error:', error);
        showAlert('Error importing to database: ' + error.message, 'error');
    }
}

/**
 * Add holiday
 */
function addHoliday() {
    const start = document.getElementById('holidayStart').value;
    const end = document.getElementById('holidayEnd').value;
    const reason = document.getElementById('holidayReason').value;

    if (!start || !end) {
        showAlert('Please enter both start and end dates for the holiday', 'warning');
        return;
    }

    const holiday = {
        id: Date.now(),
        start: start,
        end: end,
        reason: reason || 'Holiday',
        type: 'Holiday'
    };

    holidays.push(holiday);
    updateHolidayTable();

    // Clear form
    document.getElementById('holidayStart').value = '';
    document.getElementById('holidayEnd').value = '';
    document.getElementById('holidayReason').value = '';

    showAlert('Holiday added successfully!', 'success');
}

/**
 * Add breakdown
 */
function addBreakdown() {
    const start = document.getElementById('breakdownStart').value;
    const end = document.getElementById('breakdownEnd').value;
    const reason = document.getElementById('breakdownReason').value;
    
    // Get selected machines
    const selectedMachines = Array.from(document.querySelectorAll('#machineCheckboxGroup input:checked'))
        .map(checkbox => checkbox.value);

    if (!start || !end) {
        showAlert('Please enter both start and end dates for the breakdown', 'warning');
        return;
    }

    if (selectedMachines.length === 0) {
        showAlert('Please select at least one machine for the breakdown', 'warning');
        return;
    }

    const breakdown = {
        id: Date.now(),
        machines: selectedMachines,
        start: start,
        end: end,
        reason: reason || 'Breakdown'
    };

    breakdowns.push(breakdown);
    updateBreakdownTable();

    // Clear form
    document.getElementById('breakdownStart').value = '';
    document.getElementById('breakdownEnd').value = '';
    document.getElementById('breakdownReason').value = '';
    document.querySelectorAll('#machineCheckboxGroup input:checked').forEach(checkbox => {
        checkbox.checked = false;
    });

    showAlert('Breakdown added successfully!', 'success');
}

/**
 * Update holiday table
 */
function updateHolidayTable() {
    const tbody = document.getElementById('holidayTableBody');
    if (!tbody) return;

    if (holidays.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888;">No holidays added yet</td></tr>';
        return;
    }

    tbody.innerHTML = holidays.map(holiday => `
        <tr>
            <td>${holiday.start}</td>
            <td>${holiday.end}</td>
            <td>${holiday.type}</td>
            <td>${holiday.reason}</td>
            <td>
                <button class="btn btn-danger" onclick="removeHoliday(${holiday.id})">Remove</button>
            </td>
        </tr>
    `).join('');
}

/**
 * Update breakdown table
 */
function updateBreakdownTable() {
    const tbody = document.getElementById('breakdownTableBody');
    if (!tbody) return;

    if (breakdowns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888;">No breakdowns added yet</td></tr>';
        return;
    }

    tbody.innerHTML = breakdowns.map(breakdown => `
        <tr>
            <td>${breakdown.machines.join(', ')}</td>
            <td>${breakdown.start}</td>
            <td>${breakdown.end}</td>
            <td>${breakdown.reason}</td>
            <td>
                <button class="btn btn-danger" onclick="removeBreakdown(${breakdown.id})">Remove</button>
            </td>
        </tr>
    `).join('');
}

/**
 * Remove holiday
 */
function removeHoliday(id) {
    if (confirm('Are you sure you want to remove this holiday?')) {
        holidays = holidays.filter(h => h.id !== id);
        updateHolidayTable();
        showAlert('Holiday removed successfully!', 'success');
    }
}

/**
 * Remove breakdown
 */
function removeBreakdown(id) {
    if (confirm('Are you sure you want to remove this breakdown?')) {
        breakdowns = breakdowns.filter(b => b.id !== id);
        updateBreakdownTable();
        showAlert('Breakdown removed successfully!', 'success');
    }
}

/**
 * Clear session data
 */
function clearSession() {
    if (confirm('Are you sure you want to clear all session data? This will remove all orders and settings.')) {
        savedOrders = [];
        scheduleResults = [];
        holidays = [];
        breakdowns = [];
        
        updateOrdersTable();
        updateHolidayTable();
        updateBreakdownTable();
        
        // Hide results
        const resultsCard = document.getElementById('resultsCard');
        if (resultsCard) {
            resultsCard.style.display = 'none';
        }
        
        showAlert('Session cleared successfully!', 'success');
    }
}

/**
 * Logout function
 */
async function logout() {
    try {
        if (window.supabase) {
            await window.supabase.auth.signOut();
        }
        window.location.href = '/auth';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/auth';
    }
}

// Export functions for use in other modules
window.DataManager = {
    saveAdvancedSettings,
    loadAdvancedSettings,
    exportToExcel,
    importFromExcel,
    processImportedData,
    importToDatabase,
    addHoliday,
    addBreakdown,
    updateHolidayTable,
    updateBreakdownTable,
    removeHoliday,
    removeBreakdown,
    clearSession,
    logout
};
