// Initialize Supabase client
const initializeSupabaseApp = () => {
    try {
        const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w';
        
        // Check if supabase is already defined globally
        if (window.supabase) {
            console.log('Using existing Supabase client');
            return window.supabase;
        }
        
        // Check if supabase.createClient exists
        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            throw new Error('Supabase client library not loaded');
        }
        
        // Create new client
        const client = window.supabase.createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                storage: window.localStorage
            }
        });
        
        // Make it globally available
        window.supabase = client;
        return client;
        
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        throw error;
    }
};

// Initialize supabase client
let supabase;
try {
    supabase = initializeSupabaseApp();
} catch (error) {
    console.error('Critical: Failed to initialize Supabase client', error);
    // Show error to user
    document.addEventListener('DOMContentLoaded', () => {
        const errorElement = document.createElement('div');
        errorElement.style.color = 'red';
        errorElement.style.padding = '20px';
        errorElement.style.textAlign = 'center';
        errorElement.innerHTML = 'Failed to initialize the application. Please refresh the page or contact support.';
        document.body.prepend(errorElement);
    });
}

// Check authentication status
async function checkAuth() {
    try {
        // If supabase is not initialized, try to get it from window
        if (!supabase && window.supabase) {
            supabase = window.supabase;
        }
        
        // If still not initialized, show error
        if (!supabase) {
            console.error('Supabase client not initialized');
            if (!window.location.pathname.includes('/auth')) {
                window.location.href = '/auth';
            }
            return null;
        }
        
        // Ensure auth methods are available
        if (!window.supabase || !window.supabase.auth || typeof window.supabase.auth.getSession !== 'function') {
            console.warn('Supabase auth methods not available, proceeding without authentication');
            return { user: null, session: null };
        }

        // Get the current session
        const { data: { session }, error } = await window.supabase.auth.getSession();
        
        // If there was an error getting the session
        if (error) {
            console.error('Error getting session:', error);
            throw error;
        }
        
        // Check if we're on the auth page
        const isAuthPage = window.location.pathname.includes('/auth');
        
        // If no session and not on auth page, redirect to login
        if (!session && !isAuthPage) {
            console.log('No session found, redirecting to login');
            // Clear any existing session data
            await window.supabase.auth.signOut();
            window.location.href = '/auth';
            return null;
        }
        
        // If on auth page and already logged in, redirect to index
        if (session && isAuthPage) {
            console.log('Session exists, redirecting to index');
            // Clear any URL parameters and redirect
            window.location.href = 'index-final.html';
            return null;
        }
        
        // If no session and on auth page, stay on auth page
        if (!session) {
            console.log('No session, staying on auth page');
            return null;
        }
        
        console.log('Session found, fetching profile...');
        
        // Get user profile with role
        const { data: profile, error: profileError } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
        
        if (profileError) {
            console.error('Error fetching profile:', profileError);
            // If profile fetch fails, log out the user
            if (window.supabase?.auth?.signOut) {
                await window.supabase.auth.signOut();
            }
            if (!window.location.pathname.includes('/auth')) {
                window.location.href = '/auth';
            }
            return null;
        }
        
        console.log('User authenticated:', session.user.email);
        return { session, profile };
        
    } catch (error) {
        console.error('Authentication error:', error);
        // Clear any existing session on error
        if (window.supabase?.auth?.signOut) {
            await window.supabase.auth.signOut().catch(e => console.error('Error during sign out:', e));
        }
        if (!window.location.pathname.includes('/auth')) {
            window.location.href = '/auth';
        }
        return null;
    }
}

// Initialize the application
async function initApp() {
    const auth = await checkAuth();
    if (!auth) return;
    
    const { profile } = auth || {};
    
    // Update UI based on user role
    if (profile && profile.role) {
        updateUIForRole(profile.role);
    } else {
        console.log('No user profile or role found, using default role');
        updateUIForRole('operator'); // Default role
    }
    
    // Initialize session manager
    if (typeof SessionBasedScheduleManager !== 'undefined') {
        window.sessionManager = new SessionBasedScheduleManager();
        console.log('Session manager initialized');
    }
    
    // Load data based on permissions
    const userRole = profile && profile.role ? profile.role : 'operator';
    loadData(userRole);
    
    // Add logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Add session management event listeners
    setupSessionEventListeners();
    
    // Add session restoration event listeners
    setupSessionRestorationListeners();
    
    // Trigger UI restoration after everything is loaded
    setTimeout(() => {
        if (window.sessionManager && typeof window.sessionManager.triggerUIRestoration === 'function') {
            console.log('🔄 Triggering UI restoration from main app...');
            window.sessionManager.triggerUIRestoration();
            
            // Also ensure results card is shown if there's schedule data
            setTimeout(() => {
                if (window.sessionManager && typeof window.sessionManager.showResultsCard === 'function') {
                    if (window.scheduleResults && window.scheduleResults.rows && window.scheduleResults.rows.length > 0) {
                        console.log('🔄 Ensuring results card is visible...');
                        window.sessionManager.showResultsCard();
                    }
                }
            }, 1000);
        }
    }, 3000);
}

// Update UI based on user role
function updateUIForRole(role) {
    // Show/hide elements based on role
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    const subadminElements = document.querySelectorAll('.subadmin-only');
    const operatorElements = document.querySelectorAll('.operator-only');
    
    adminOnlyElements.forEach(el => el.style.display = role === 'Admin' ? 'block' : 'none');
    subadminElements.forEach(el => el.style.display = (role === 'Admin' || role === 'Subadmin') ? 'block' : 'none');
    operatorElements.forEach(el => el.style.display = 'block'); // All roles can see operator elements
    
    // Update user info in UI
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.textContent = `Logged in as: ${role}`;
    }
}

// Load data based on user role
async function loadData(role) {
    // Check if supabase is properly initialized
    if (!window.supabase || typeof window.supabase.from !== 'function') {
        console.warn('Supabase not properly initialized, skipping data load');
        return;
    }
    
    let query = window.supabase.from('saved_orders').select('*');
    
    // Operators can only see their own orders
    if (role === 'Operator') {
        const { data: { user } } = await window.supabase.auth.getUser();
        query = query.eq('user_id', user.id);
    }
    
    const { data: orders, error } = await query;
    
    if (error) {
        console.error('Error loading orders:', error);
        return;
    }
    
    // Update global savedOrders variable and UI
    if (orders && orders.length > 0) {
        // Convert Supabase format to local format
            const convertedOrders = orders.map(order => ({
                id: order.id || Date.now(),
                partNumber: order.part_number || 'Unknown',
                operationSeq: order.operation_seq || 'All',
                quantity: parseInt(order.quantity) || 0,
                priority: order.priority || 'Normal',
                dueDate: order.due_date || null,
                batchMode: order.batch_mode || 'auto-split',
                customBatchSize: order.custom_batch_size || null,
                filteredOperations: order.filtered_operations ? 
                    (typeof order.filtered_operations === 'string' ? 
                        JSON.parse(order.filtered_operations) : 
                        order.filtered_operations) : [],
                breakdownMachine: order.breakdown_machine || null,
                breakdownDateTime: order.breakdown_date_time || null,
                startDateTime: order.start_date_time || null,
                holidayRange: order.holiday_range || null,
                setupWindow: order.setup_window || null
            })).filter(order => {
                // Filter out invalid orders
                const isValid = order.partNumber !== 'Unknown' && order.quantity > 0;
                if (!isValid) {
                    console.warn(`Filtering out invalid order: ${order.partNumber}, qty: ${order.quantity}`);
                }
                return isValid;
            });
        
        // Update global variables
        window.savedOrders = convertedOrders;
        savedOrders = convertedOrders;
        
        console.log('✅ Loaded orders from Supabase:', convertedOrders.length, 'orders');
        
        // Update UI
        if (typeof updateOrdersTable === 'function') {
            updateOrdersTable();
        }
    } else {
        console.log('No orders found in Supabase');
        // Clear any existing orders
        window.savedOrders = [];
        savedOrders = [];
        if (typeof updateOrdersTable === 'function') {
            updateOrdersTable();
        }
    }
    
    // NEW: Load schedule results from Supabase
    await loadScheduleResultsFromSupabase(role);
}

// Load schedule results from Supabase
async function loadScheduleResultsFromSupabase(role) {
    try {
        if (!window.supabase || typeof window.supabase.from !== 'function') {
            console.warn('Supabase not properly initialized, skipping schedule results load');
            return;
        }
        
        let query = window.supabase.from('schedule_outputs').select('*');
        
        // Operators can only see their own results
        if (role === 'Operator') {
            const { data: { user } } = await window.supabase.auth.getUser();
            query = query.eq('user_id', user.id);
        }
        
        const { data: results, error } = await query;
        
        if (error) {
            console.error('Error loading schedule results:', error);
            return;
        }
        
        if (results && results.length > 0) {
            // Convert Supabase format back to application format
            const scheduleRows = results.map(row => ({
                PartNumber: row.part_number,
                Order_Quantity: row.order_quantity,
                Priority: row.priority,
                Batch_ID: row.batch_id,
                Batch_Qty: row.batch_qty,
                OperationSeq: row.operation_seq,
                OperationName: row.operation_name,
                Machine: row.machine,
                Person: row.person,
                SetupStart: row.setup_start,
                SetupEnd: row.setup_end,
                RunStart: row.run_start,
                RunEnd: row.run_end,
                Timing: row.timing,
                DueDate: row.due_date,
                Status: row.status
            }));
            
            // Update global scheduleResults variable
            window.scheduleResults = {
                rows: scheduleRows,
                alerts: []
            };
            
            console.log('✅ Loaded schedule results from Supabase:', scheduleRows.length, 'rows');
            
            // Update UI
            if (typeof displayResults === 'function') {
                displayResults();
            }
            
            // Show results card
            const resultsCard = document.getElementById('resultsCard');
            if (resultsCard) {
                resultsCard.style.display = 'block';
            }
        } else {
            console.log('No schedule results found in Supabase');
            // Clear any existing results
            window.scheduleResults = { rows: [], alerts: [] };
            if (typeof displayResults === 'function') {
                displayResults();
            }
        }
        
    } catch (error) {
        console.error('Error loading schedule results from Supabase:', error);
    }
}

// Handle logout
async function handleLogout() {
    try {
        const { error } = await window.supabase.auth.signOut();
        if (error) throw error;
        
        // Clear any stored session data
        localStorage.removeItem('window.supabase.auth.token');
        
        // Redirect to login page
        window.location.href = '/auth?logged_out=true';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to log out. Please try again.');
    }
}

// Setup session management event listeners
function setupSessionEventListeners() {
    // Clear session button
    const clearSessionBtn = document.getElementById('clearSession');
    if (clearSessionBtn) {
        clearSessionBtn.addEventListener('click', async () => {
            if (window.sessionManager) {
                await window.sessionManager.clearSession();
            }
        });
    }
    
    // Export session button
    const exportSessionBtn = document.getElementById('exportSession');
    if (exportSessionBtn) {
        exportSessionBtn.addEventListener('click', () => {
            if (window.sessionManager && window.sessionManager.hasActiveSchedule()) {
                try {
                    const scheduleData = window.sessionManager.exportScheduleData();
                    if (typeof exportToExcel === 'function') {
                        const result = exportToExcel(scheduleData);
                        if (result.success) {
                            window.sessionManager.showNotification('Excel file exported successfully!');
                        } else {
                            window.sessionManager.showNotification('Export failed: ' + result.message, 'error');
                        }
                    } else {
                        window.sessionManager.showNotification('Excel export not available', 'error');
                    }
                } catch (error) {
                    console.error('Export error:', error);
                    window.sessionManager.showNotification('Export failed: ' + error.message, 'error');
                }
            } else {
                window.sessionManager.showNotification('No active schedule to export', 'error');
            }
        });
    }
    
    // Clear all button (if exists)
    const clearAllBtn = document.getElementById('clearAll');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async () => {
            try {
                if (confirm('Are you sure you want to clear all data? This will remove all saved orders and schedule results from both local storage and Supabase database.')) {
                    if (window.sessionManager) {
                        // Clear Supabase data first
                        const supabaseResult = await window.sessionManager.clearAllSupabaseData();
                        
                        // Then clear local session
                        const sessionResult = await window.sessionManager.clearSession();
                        
                        if (supabaseResult.success && sessionResult.success) {
                            window.sessionManager.showNotification('All data cleared successfully from local storage and Supabase', 'success');
                        } else {
                            const errors = [];
                            if (!supabaseResult.success) errors.push('Supabase: ' + supabaseResult.error);
                            if (!sessionResult.success) errors.push('Session: ' + sessionResult.error);
                            window.sessionManager.showNotification('Partial clear: ' + errors.join(', '), 'warning');
                        }
                    } else {
                        window.sessionManager.showNotification('Session manager not available', 'error');
                    }
                }
            } catch (error) {
                console.error('Clear all error:', error);
                window.sessionManager.showNotification('Clear failed: ' + error.message, 'error');
            }
        });
    }
    
    // Export Excel button (if exists)
    const exportExcelBtn = document.getElementById('exportExcel');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => {
            if (window.sessionManager && window.sessionManager.hasActiveSchedule()) {
                try {
                    const scheduleData = window.sessionManager.exportScheduleData();
                    if (typeof exportToExcel === 'function') {
                        const result = exportToExcel(scheduleData);
                        if (result.success) {
                            window.sessionManager.showNotification('Excel file exported successfully!');
                        } else {
                            window.sessionManager.showNotification('Export failed: ' + result.message, 'error');
                        }
                    } else {
                        window.sessionManager.showNotification('Excel export not available', 'error');
                    }
                } catch (error) {
                    console.error('Export error:', error);
                    window.sessionManager.showNotification('Export failed: ' + error.message, 'error');
                }
            } else {
                window.sessionManager.showNotification('No active schedule to export', 'error');
            }
        });
    }
}

// Setup session restoration event listeners
function setupSessionRestorationListeners() {
    // Listen for saved orders restoration
    window.addEventListener('restoreSavedOrders', (event) => {
        console.log('Restoring saved orders from session...');
        const { savedOrders } = event.detail;
        
        // Restore the orders table with the saved data
        restoreOrdersTable(savedOrders);
    });
    
    // Listen for schedule output restoration
    window.addEventListener('restoreScheduleOutput', (event) => {
        console.log('Restoring schedule output from session...');
        const { scheduleData } = event.detail;
        
        // Restore the schedule output display
        restoreScheduleOutputDisplay(scheduleData);
    });
}

// Restore orders table from session data
function restoreOrdersTable(savedOrders) {
    try {
        console.log('Restoring orders table with data:', savedOrders);
        
        // Restore the global savedOrders variable
        if (savedOrders && Array.isArray(savedOrders)) {
            window.savedOrders = savedOrders;
            console.log('✅ Restored savedOrders:', window.savedOrders.length, 'orders');
            
            // Update the orders table UI
            if (typeof updateOrdersTable === 'function') {
                updateOrdersTable();
                console.log('✅ Orders table UI updated');
            } else {
                console.warn('updateOrdersTable function not found');
            }
        } else {
            console.log('No saved orders to restore');
        }
        
    } catch (error) {
        console.error('Failed to restore orders table:', error);
    }
}

// Restore schedule output display from session data
function restoreScheduleOutputDisplay(scheduleData) {
    try {
        console.log('Restoring schedule output display with data:', scheduleData);
        
        // Restore the global scheduleResults variable
        if (scheduleData && scheduleData.rows) {
            window.scheduleResults = scheduleData;
            console.log('✅ Restored scheduleResults:', scheduleData.rows.length, 'rows');
            
            // Update the schedule output UI
            if (typeof displayResults === 'function') {
                displayResults();
                console.log('✅ Schedule output UI updated');
            } else {
                console.warn('displayResults function not found');
            }
            
            // Show the results card
            const resultsCard = document.getElementById('resultsCard');
            if (resultsCard) {
                resultsCard.style.display = 'block';
                console.log('✅ Results card shown');
            }
        } else {
            console.log('No schedule data to restore');
        }
        
    } catch (error) {
        console.error('Failed to restore schedule output display:', error);
    }
}

/**
 * Clean up invalid orders from database
 * @param {Array} invalidOrders - Array of invalid order objects
 */
async function cleanupInvalidOrders(invalidOrders) {
    if (!invalidOrders || invalidOrders.length === 0) return;
    
    try {
        console.log(`🧹 Cleaning up ${invalidOrders.length} invalid orders from database`);
        
        for (const order of invalidOrders) {
            if (order.id) {
                const { error } = await window.supabase
                    .from('saved_orders')
                    .delete()
                    .eq('id', order.id);
                
                if (error) {
                    console.error(`Failed to delete invalid order ${order.id}:`, error);
                } else {
                    console.log(`✅ Deleted invalid order ${order.id}`);
                }
            }
        }
    } catch (error) {
        console.error('Error cleaning up invalid orders:', error);
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
