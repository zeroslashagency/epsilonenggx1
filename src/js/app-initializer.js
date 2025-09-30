/**
 * App Initialization Module
 * Handles Supabase setup, authentication, and app initialization
 * Extracted from index.html
 */

// Global Supabase client
let supabaseClient = null;

/**
 * Initialize Supabase client
 */
function initSupabase() {
    const SUPABASE_URL = 'https://sxnaopzgaddvziplrlbe.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w';
    
    // Initialize and return the Supabase client
    return supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false, // Disable URL session detection to prevent redirect loops
            storage: window.localStorage
        }
    });
}

/**
 * Initialize Supabase and handle errors
 */
async function initializeSupabase() {
    try {
        // Check if Supabase is already initialized
        if (window.supabase) {
            console.log('Using existing Supabase client');
            return window.supabase;
        }
        
        // Wait for Supabase to be available
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts && !window.supabase) {
            console.log(`Waiting for Supabase initialization... (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        if (window.supabase) {
            console.log('Supabase initialized successfully');
            return window.supabase;
        } else {
            console.warn('Supabase not available after waiting');
            return null;
        }
        
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return null;
    }
}

/**
 * Show initialization error to user
 */
function showInitializationError() {
    const errorElement = document.createElement('div');
    errorElement.style.color = 'red';
    errorElement.style.padding = '20px';
    errorElement.style.textAlign = 'center';
    errorElement.textContent = 'Failed to initialize the application. Please refresh the page or contact support.';
    document.body.prepend(errorElement);
}

/**
 * Initialize the app after checking authentication
 */
async function initializeApp() {
    try {
        // Wait for Supabase to be fully initialized
        if (!window.supabase) {
            console.error('Supabase client not initialized');
            throw new Error('Authentication service not available');
        }
        
        // Check authentication
        if (!window.supabase || !window.supabase.auth || typeof window.supabase.auth.getSession !== 'function') {
            console.warn('Supabase auth not available, proceeding without authentication');
            // Wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (window.supabase && window.supabase.auth && typeof window.supabase.auth.getSession === 'function') {
                console.log('Supabase auth now available, retrying...');
                const { data: { session }, error } = await window.supabase.auth.getSession();
                
                if (error) {
                    console.error('Error getting session:', error);
                    window.location.href = '/auth';
                    return;
                }
                
                if (!session) {
                    console.log('No active session, redirecting to login');
                    await window.supabase.auth.signOut();
                    window.location.href = '/auth';
                    return;
                }
                
                console.log('User authenticated, proceeding to app');
            } else {
                console.warn('Supabase auth still not available, continuing without authentication');
            }
        } else {
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
        }

        // Hide loading overlay when app is initialized
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            console.log('Hiding loading overlay...');
            loadingOverlay.style.display = 'none';
        } else {
            console.warn('Loading overlay not found');
        }
        
        // Initialize your existing app
        // Check if we have persisted data
        if (window.OP_MASTER && window.OP_MASTER.length > 0) {
            // Update UI with existing data
            OrderManager.updateOrdersTable();
        }
        
        // Set default due date
        setDefaultDueDate();
        
        // Initialize other modules
        await initializeForUserRole();
        setupFormSubmission();
        setupBatchModeToggle();
        setupPriorityToggle();
        
        // Check if function exists before calling
        if (typeof window.initializeAdvancedSettings === 'function') {
            initializeAdvancedSettings();
        } else {
            console.warn('initializeAdvancedSettings function not available yet');
        }
        
        setupDueDateField();
        if (typeof window.updateUserRoleIndicator === 'function') {
            window.updateUserRoleIndicator();
        } else {
            console.warn('updateUserRoleIndicator function not available yet');
        }
        loadAdvancedSettings(); // Load saved advanced settings
        
    } catch (error) {
        console.error('Initialization error:', error);
        window.location.href = '/auth';
    }
}

/**
 * Get current user role
 */
async function getCurrentUserRole() {
    try {
        if (!window.supabase || !window.supabase.auth || typeof window.supabase.auth.getUser !== 'function') {
            console.warn('Supabase auth not available, using default role');
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
 * Start the app initialization
 */
function startApp() {
    document.addEventListener('DOMContentLoaded', async function() {
        await initializeSupabase();
        await initializeApp();
    });
}

// Export functions for use in other modules
window.AppInitializer = {
    initSupabase,
    initializeSupabase,
    initializeApp,
    getCurrentUserRole,
    initializeForUserRole,
    startApp
};

// Auto-start if this module is loaded directly
if (typeof window !== 'undefined') {
    startApp();
}
