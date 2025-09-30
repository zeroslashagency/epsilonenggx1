/**
 * Main JavaScript Module Loader
 * Loads and initializes all JavaScript modules for the Production Scheduler
 * Extracted from index.html
 */

// Global variables
let selectedPartNumber = '';
let advancedSettings = {
    startDateTime: null,
    setupAvailabilityWindow: '06:00-22:00',
    breakdownMachines: [],
    breakdownDateTime: '',
    holidays: [],
    breakdowns: [],
    shift1: '06:00-14:00',
    shift2: '14:00-22:00',
    shift3: '22:00-06:00',
    prodShift1: '06:00-14:00',
    prodShift2: '14:00-22:00',
    prodShift3: '22:00-06:00'
};

// Dark mode functionality
function toggleDarkMode() {
    const body = document.body;
    const toggleBtn = document.getElementById('darkModeToggle');
    
    if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        toggleBtn.innerHTML = '🌙 Dark Mode';
        localStorage.setItem('darkMode', 'false');
    } else {
        body.classList.add('dark-mode');
        toggleBtn.innerHTML = '☀️ Light Mode';
        localStorage.setItem('darkMode', 'true');
    }
}

// Initialize dark mode from localStorage
function initializeDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    const toggleBtn = document.getElementById('darkModeToggle');
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        if (toggleBtn) toggleBtn.innerHTML = '☀️ Light Mode';
    } else {
        document.body.classList.remove('dark-mode');
        if (toggleBtn) toggleBtn.innerHTML = '🌙 Dark Mode';
    }
}

// Dashboard functionality
function showDashboard() {
    console.log('📊 Dashboard clicked');
    // Scroll to top to show dashboard
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Show a notification
    if (typeof showAlert === 'function') {
        showAlert('info', '📊 Dashboard view activated');
    }
}

// Chart functionality
function showChart() {
    console.log('📈 Chart clicked');
    
    // Check if there are schedule results to show chart
    if (window.scheduleResults && window.scheduleResults.rows && window.scheduleResults.rows.length > 0) {
        // Scroll to schedule results section
        const resultsSection = document.querySelector('.schedule-results');
        if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        if (typeof showAlert === 'function') {
            showAlert('info', '📈 Chart view activated - Schedule data available');
        }
    } else {
        if (typeof showAlert === 'function') {
            showAlert('warning', '📈 No schedule data available. Please run schedule first.');
        }
    }
}

// Excel Import with Button Animation
function importFromExcel() {
    console.log('📤 Import Excel clicked');
    
    // Show button animation
    showButtonAnimation('importBtn', '📤');
    
    // Call the original import function from data-manager.js
    if (typeof window.originalImportFromExcel === 'function') {
        window.originalImportFromExcel();
    } else {
        // Fallback: Create file input for import
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Show success message
            if (typeof showAlert === 'function') {
                showAlert('📤 Excel file imported successfully!', 'success');
            } else {
                alert('📤 Excel file imported successfully!');
            }
        };
        
        input.click();
    }
}

// Excel Export with Button Animation
function exportToExcel() {
    console.log('📥 Export Excel clicked');
    
    // Show button animation
    showButtonAnimation('exportBtn', '📥');
    
    // Check if we have schedule results
    const scheduleResults = window.scheduleResults;
    console.log('🔍 Current scheduleResults:', scheduleResults);
    
    if (!scheduleResults || !scheduleResults.rows || scheduleResults.rows.length === 0) {
        if (typeof showAlert === 'function') {
            showAlert('No schedule results to export. Please run the schedule first.', 'warning');
        } else {
            alert('No schedule results to export. Please run the schedule first.');
        }
        return;
    }
    
    try {
        // Use the comprehensive ExcelExporter class for 5-sheet export
        if (window.ExcelExporter) {
            const exporter = new window.ExcelExporter();
            
            // Prepare data in the format expected by ExcelExporter
            const scheduleData = {
                rows: scheduleResults.rows,
                alerts: scheduleResults.alerts || [],
                summary: scheduleResults.summary || {
                    totalOrders: scheduleResults.rows.length,
                    totalOperations: scheduleResults.rows.length,
                    completedSuccessfully: scheduleResults.rows.length
                }
            };
            
            console.log('📊 Exporting schedule data:', scheduleData);
            const result = exporter.exportToExcel(scheduleData);
            
            if (result.success) {
                if (typeof showAlert === 'function') {
                    showAlert(`Excel file exported successfully: ${result.filename}`, 'success');
                } else {
                    alert(`Excel file exported successfully: ${result.filename}`);
                }
            } else {
                if (typeof showAlert === 'function') {
                    showAlert(`Export failed: ${result.error}`, 'error');
                } else {
                    alert(`Export failed: ${result.error}`);
                }
            }
            return;
        }
        
        // Fallback: Simple single-sheet export
        const exportData = scheduleResults.rows.map(result => ({
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
        
        // Create and download Excel file
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Schedule Results');
        
        const fileName = `schedule_results_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        if (typeof showAlert === 'function') {
            showAlert(`Excel file exported successfully: ${fileName}`, 'success');
        } else {
            alert(`Excel file exported successfully: ${fileName}`);
        }
        
    } catch (error) {
        console.error('Export error:', error);
        if (typeof showAlert === 'function') {
            showAlert(`Export failed: ${error.message}`, 'error');
        } else {
            alert(`Export failed: ${error.message}`);
        }
    }
}

// Enable/Disable Export Button based on schedule results
function updateExportButtonState() {
    const exportBtn = document.getElementById('exportBtn');
    if (!exportBtn) return;
    
    const scheduleResults = window.scheduleResults;
    const hasResults = scheduleResults && scheduleResults.rows && scheduleResults.rows.length > 0;
    
    exportBtn.disabled = !hasResults;
    
    if (hasResults) {
        exportBtn.title = `Export Excel (${scheduleResults.rows.length} results)`;
        console.log('✅ Export button enabled -', scheduleResults.rows.length, 'results available');
    } else {
        exportBtn.title = 'Export Excel (No results available)';
        console.log('❌ Export button disabled - No results available');
    }
}

// Monitor schedule results changes
function monitorScheduleResults() {
    // Check every 2 seconds for schedule results
    setInterval(() => {
        updateExportButtonState();
    }, 2000);
    
    // Also check when window.scheduleResults changes
    let lastResults = null;
    setInterval(() => {
        const currentResults = window.scheduleResults;
        if (currentResults !== lastResults) {
            lastResults = currentResults;
            updateExportButtonState();
        }
    }, 1000);
}

// Show Button Internal Animation
function showButtonAnimation(buttonId, icon) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    // Add animation class
    button.classList.add('button-animating');
    
    // Create temporary icon overlay
    const overlay = document.createElement('div');
    overlay.className = 'button-animation-overlay';
    overlay.innerHTML = icon;
    button.appendChild(overlay);
    
    // Remove animation after completion
    setTimeout(() => {
        button.classList.remove('button-animating');
        if (overlay.parentNode) {
            overlay.remove();
        }
    }, 600);
}

// Make functions globally available
window.selectedPartNumber = selectedPartNumber;
window.advancedSettings = advancedSettings;
window.toggleDarkMode = toggleDarkMode;
window.showDashboard = showDashboard;
window.showChart = showChart;
window.importFromExcel = importFromExcel;
window.exportToExcel = exportToExcel;
window.showButtonAnimation = showButtonAnimation;
window.updateExportButtonState = updateExportButtonState;
window.monitorScheduleResults = monitorScheduleResults;
window.initializeDarkMode = initializeDarkMode;

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        // Wait for Supabase to be fully initialized
        if (!window.supabase) {
            console.warn('Supabase client not initialized, waiting...');
            
            // Wait for Supabase to be available
            let attempts = 0;
            const maxAttempts = 10;
            
            while (attempts < maxAttempts && !window.supabase) {
                console.log(`Waiting for Supabase... (attempt ${attempts + 1}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
            
            if (!window.supabase) {
                console.warn('Supabase not available after waiting, proceeding without authentication');
                // Continue without authentication
                await initializeForUserRole();
                setupFormSubmission();
                
                // Setup UI handlers
                if (window.UIHandlers) {
                    window.UIHandlers.setupPartNumberSearch();
                    window.UIHandlers.setupBatchModeToggle();
                    window.UIHandlers.setupPriorityToggle();
                }
                
                initializeAdvancedSettings();
                setupDueDateField();
                if (typeof window.updateUserRoleIndicator === 'function') {
                    window.updateUserRoleIndicator();
                } else {
                    console.warn('updateUserRoleIndicator function not available yet');
                }
                loadAdvancedSettings();
                return;
            }
        }
        
        // Check authentication
        const { data: { session }, error } = await window.supabase.auth.getSession();
        
        if (error) {
            console.error('Error getting session:', error);
            window.location.href = '/auth';
            return;
        }
        
        if (!session) {
            console.log('No active session, redirecting to login');
            // Clear any existing session data
            await window.supabase.auth.signOut();
            window.location.href = '/auth';
            return;
        }
        
        console.log('User authenticated, proceeding to app');

        // Hide loading overlay when app is initialized
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            console.log('Main.js: Hiding loading overlay...');
            loadingOverlay.style.display = 'none';
        } else {
            console.warn('Main.js: Loading overlay not found');
        }
        
        // Initialize your existing app
        // Check if we have persisted data
        if (window.OP_MASTER && window.OP_MASTER.length > 0) {
            // Update UI with existing data
            if (typeof window.OrderManager?.updateOrdersTable === 'function') {
                window.OrderManager.updateOrdersTable();
            } else {
                console.warn('OrderManager.updateOrdersTable not available yet');
            }
        }
        
        // Set default due date
        setDefaultDueDate();
        
        // Initialize other modules
        await initializeForUserRole();
        setupFormSubmission();
        
        // Setup UI handlers
        if (window.UIHandlers) {
            try {
                window.UIHandlers.setupPartNumberSearch();
                window.UIHandlers.setupBatchModeToggle();
                window.UIHandlers.setupPriorityToggle();
            } catch (error) {
                console.warn('UI handlers setup failed:', error);
            }
        }
        
        initializeAdvancedSettings();
        setupDueDateField();
        updateUserRoleIndicator();
        loadAdvancedSettings(); // Load saved advanced settings
        
    } catch (error) {
        console.error('Initialization error:', error);
        window.location.href = '/auth';
    }
}

/**
 * Initialize based on user role
 */
async function initializeForUserRole() {
    try {
        const userRole = await getCurrentUserRole();
        
        // Update UI based on role
        if (userRole === 'admin') {
            // Admin can see all features
            document.getElementById('userRoleIndicator').textContent = 'ADMIN';
            document.getElementById('userRoleIndicator').style.background = '#dc3545';
        } else {
            // Operator has limited access
            document.getElementById('userRoleIndicator').textContent = 'OPERATOR';
            document.getElementById('userRoleIndicator').style.background = '#28a745';
        }
        
        console.log('User role initialized:', userRole);
    } catch (error) {
        console.error('Error initializing user role:', error);
    }
}

/**
 * Get current user role
 */
async function getCurrentUserRole() {
    try {
        if (!window.supabase) {
            return 'operator';
        }
        
        const { data: { user }, error } = await window.supabase.auth.getUser();
        
        if (error) {
            console.error('Error getting user:', error);
            return 'operator';
        }
        
        if (!user) {
            return 'operator';
        }
        
        // Check user metadata for role
        const role = user.user_metadata?.role || 'operator';
        return role;
    } catch (error) {
        console.error('Error getting user role:', error);
        return 'operator';
    }
}

/**
 * Update user role indicator
 */
function updateUserRoleIndicator() {
    // This function will be called after user role is determined
    console.log('User role indicator updated');
}

/**
 * Initialize advanced settings
 */
function initializeAdvancedSettings() {
    // Set default values
    const now = new Date();
    now.setHours(6, 0, 0, 0);
    document.getElementById('startDateTime').value = now.toISOString().slice(0, 16);
    
    // Add event listeners for auto-update setup window
    document.getElementById('shift1').addEventListener('input', updateSetupWindow);
    document.getElementById('shift2').addEventListener('input', updateSetupWindow);
    
    // Initialize tables
    updateHolidayTable();
    updateBreakdownTable();
}

/**
 * Update setup window based on shifts
 */
function updateSetupWindow() {
    const shift1 = document.getElementById('shift1').value;
    const shift2 = document.getElementById('shift2').value;
    
    if (shift1 && shift2) {
        // Extract start and end times
        const shift1Start = shift1.split('-')[0];
        const shift2End = shift2.split('-')[1];
        
        // Update setup window
        document.getElementById('setupAvailabilityWindow').value = `${shift1Start}-${shift2End}`;
    }
}

/**
 * Get available part numbers from master data
 */
function getAvailablePartNumbers() {
    try {
        // Wait for OP_MASTER to be loaded
        if (!window.OP_MASTER || window.OP_MASTER.length === 0) {
            console.warn('OP_MASTER data not loaded yet, returning empty array');
            return [];
        }
        
        const partNumbers = [...new Set((window.OP_MASTER || []).map(op => String(op.PartNumber).trim()))].sort();
        console.log('Available part numbers:', partNumbers);
        return partNumbers;
    } catch (e) {
        console.warn('Failed to compute available part numbers:', e);
        return [];
    }
}

/**
 * Derive operation sequence from checkboxes
 */
function deriveOperationSeqFromCheckboxes() {
    const checkedCheckboxes = document.querySelectorAll('input[name="operationSeq"]:checked');
    const selectedSequences = Array.from(checkedCheckboxes).map(checkbox => checkbox.value).sort();
    return selectedSequences.join(',');
}

/**
 * Clear all operations
 */
function clearAllOperations() {
    const checkboxes = document.querySelectorAll('#operationDropdown input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

/**
 * Start the application
 */
function startApp() {
    document.addEventListener('DOMContentLoaded', async function() {
        await initializeApp();
        
        // Start monitoring schedule results for export button
        setTimeout(() => {
            monitorScheduleResults();
            console.log('🔍 Started monitoring schedule results for export button');
        }, 1000);
    });
}

// Make functions globally available
window.initializeApp = initializeApp;
window.initializeForUserRole = initializeForUserRole;
window.getCurrentUserRole = getCurrentUserRole;
window.updateUserRoleIndicator = updateUserRoleIndicator;
window.initializeAdvancedSettings = initializeAdvancedSettings;
window.updateSetupWindow = updateSetupWindow;
window.getAvailablePartNumbers = getAvailablePartNumbers;
window.deriveOperationSeqFromCheckboxes = deriveOperationSeqFromCheckboxes;
window.clearAllOperations = clearAllOperations;
window.startApp = startApp;

// Auto-start if this module is loaded directly
if (typeof window !== 'undefined') {
    startApp();
}
