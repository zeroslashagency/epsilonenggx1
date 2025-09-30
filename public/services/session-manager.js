/**
 * Session-Based Schedule Manager
 * Handles temporary storage of schedule data during user session
 * Data is overwritten on each generation and cleared on demand
 */

class BrowserSessionStorage {
    constructor() {
        this.storageKey = 'currentScheduleSession';
        this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
    }
    
    store(sessionData) {
        const data = {
            ...sessionData,
            storedAt: Date.now(),
            expiresAt: Date.now() + this.maxAge
        };
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            sessionStorage.setItem(this.storageKey, JSON.stringify(data));
            console.log('Session data stored successfully');
        } catch (error) {
            console.error('Failed to store session data:', error);
        }
    }
    
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return null;
            
            const parsed = JSON.parse(data);
            
            // Check if expired
            if (Date.now() > parsed.expiresAt) {
                console.log('Session expired, clearing data');
                this.clear();
                return null;
            }
            
            return parsed;
        } catch (error) {
            console.error('Failed to load session data:', error);
            this.clear();
            return null;
        }
    }
    
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            sessionStorage.removeItem(this.storageKey);
            console.log('Session data cleared');
        } catch (error) {
            console.error('Failed to clear session data:', error);
        }
    }
    
    isValid() {
        const data = this.load();
        return data && data.isActive && Date.now() < data.expiresAt;
    }
}

class TemporaryDatabaseStorage {
    constructor() {
        this.supabase = window.supabase;
    }
    
    getSupabase() {
        return window.supabase || this.supabase;
    }
    
    async storeSession(sessionData) {
        const supabase = this.getSupabase();
        if (!supabase) {
            console.warn('Supabase not available, skipping database storage');
            return { success: true };
        }
        
        try {
            const { data, error } = await supabase
                .from('temp_schedule_sessions')
                .upsert({
                    session_id: sessionData.sessionId,
                    user_id: sessionData.userId,
                    user_role: sessionData.userRole,
                    schedule_data: sessionData.scheduleData,
                    is_active: sessionData.isActive,
                    last_updated: sessionData.lastUpdated
                });
                
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Failed to store session in database:', error);
            return { success: false, error: error.message };
        }
    }
    
    async loadSession(sessionId) {
        const supabase = this.getSupabase();
        if (!supabase) return null;
        
        try {
            const { data, error } = await supabase
                .from('temp_schedule_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .eq('is_active', true)
                .single();
                
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to load session from database:', error);
            return null;
        }
    }
    
    async clearSession(sessionId) {
        const supabase = this.getSupabase();
        if (!supabase) return { success: true };
        
        try {
            const { error } = await supabase
                .from('temp_schedule_sessions')
                .update({ is_active: false })
                .eq('session_id', sessionId);
                
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Failed to clear session in database:', error);
            return { success: false, error: error.message };
        }
    }
}

class SessionBasedScheduleManager {
    constructor() {
        this.browserStorage = new BrowserSessionStorage();
        this.dbStorage = new TemporaryDatabaseStorage();
        this.currentSession = null;
        this.isGenerating = false;
        this.autoCleanupInterval = null;
        
        this.initialize();
    }
    
    async initialize() {
        console.log('Initializing session manager...');
        
        // Load existing session from browser storage
        this.currentSession = this.browserStorage.load();
        
        if (!this.currentSession) {
            // Try to restore from database if user is logged in
            await this.tryRestoreFromDatabase();
            
            // If still no session, create new one
            if (!this.currentSession) {
                await this.createNewSession();
            }
        } else {
            console.log('Loaded existing session from browser:', this.currentSession.sessionId);
            
            // Try to sync with database to get latest data
            await this.syncWithDatabase();
        }
        
        this.startAutoCleanup();
        this.updateUI();
        
        // Restore UI state if we have data - wait for DOM to be ready
        if (this.hasActiveSchedule()) {
            // Wait for DOM to be ready and UI functions to be available
            await this.waitForUIReady();
            await this.restoreUIState();
            
            // Fallback: try restoration again after a delay if UI wasn't ready
            setTimeout(async () => {
                if (this.hasActiveSchedule() && (!window.savedOrders || window.savedOrders.length === 0)) {
                    console.log('🔄 Retrying UI restoration...');
                    await this.restoreUIState();
                }
            }, 2000);
        }
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    async createNewSession() {
        // Get current user info
        const userInfo = await this.getCurrentUserInfo();
        
        this.currentSession = {
            sessionId: this.generateSessionId(),
            userId: userInfo.userId,
            userRole: userInfo.userRole,
            isActive: true,
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            scheduleData: null,
            deviceInfo: this.getDeviceInfo()
        };
        
        // Store in browser storage
        this.browserStorage.store(this.currentSession);
        
        // Store in database
        await this.dbStorage.storeSession(this.currentSession);
        
        console.log('✅ Created new session:', this.currentSession.sessionId);
        console.log('📱 Device info:', this.currentSession.deviceInfo);
        return this.currentSession;
    }
    
    async getCurrentUserInfo() {
        // Try to get user info from Supabase auth
        if (window.supabase) {
            try {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (user) {
                    // Get user role from profiles
                    const { data: profile } = await window.supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    
                    return {
                        userId: user.id,
                        userRole: profile?.role || 'Operator'
                    };
                }
            } catch (error) {
                console.warn('Failed to get user info from Supabase:', error);
            }
        }
        
        // Fallback to default values
        return {
            userId: 'anonymous_' + Date.now(),
            userRole: 'Operator'
        };
    }
    
    async tryRestoreFromDatabase() {
        try {
            const userInfo = await this.getCurrentUserInfo();
            
            if (userInfo.userId && userInfo.userId.startsWith('anonymous_')) {
                console.log('Anonymous user, skipping database restore');
                return;
            }
            
            // TEMPORARY FIX: Disable cross-device session restoration to prevent data conflicts
            console.log('Cross-device session restoration disabled to prevent data conflicts');
            return;
            
            console.log('Attempting to restore session from database for user:', userInfo.userId);
            
            // Get the most recent active session for this user (cross-device support)
            const { data: sessions, error } = await this.dbStorage.getSupabase()
                .from('temp_schedule_sessions')
                .select('*')
                .eq('user_id', userInfo.userId)
                .eq('is_active', true)
                .order('last_updated', { ascending: false })
                .limit(1);
                
            if (error) throw error;
            
            if (sessions && sessions.length > 0) {
                const sessionData = sessions[0];
                console.log('Found existing session in database:', sessionData.session_id);
                
                // Check if session is still valid (not expired)
                const sessionAge = Date.now() - new Date(sessionData.last_updated).getTime();
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                
                if (sessionAge > maxAge) {
                    console.log('Session expired, deactivating...');
                    await this.deactivateExpiredSession(sessionData.session_id);
                    return;
                }
                
                this.currentSession = {
                    sessionId: sessionData.session_id,
                    userId: sessionData.user_id,
                    userRole: sessionData.user_role,
                    isActive: sessionData.is_active,
                    created: sessionData.created_at,
                    lastUpdated: sessionData.last_updated,
                    scheduleData: sessionData.schedule_data,
                    deviceInfo: this.getDeviceInfo()
                };
                
                // Store in browser storage for this device
                this.browserStorage.store(this.currentSession);
                
                console.log('✅ Session restored from database successfully (cross-device)');
                console.log('📱 Device info:', this.currentSession.deviceInfo);
                
            } else {
                console.log('No existing session found in database for user:', userInfo.userId);
            }
            
        } catch (error) {
            console.error('Failed to restore session from database:', error);
        }
    }
    
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            timestamp: new Date().toISOString()
        };
    }
    
    async deactivateExpiredSession(sessionId) {
        try {
            const supabase = this.dbStorage.getSupabase();
            if (!supabase) return;
            
            await supabase
                .from('temp_schedule_sessions')
                .update({ is_active: false })
                .eq('session_id', sessionId);
                
            console.log('Expired session deactivated:', sessionId);
        } catch (error) {
            console.error('Failed to deactivate expired session:', error);
        }
    }
    
    async syncWithDatabase() {
        try {
            if (!this.currentSession || !this.currentSession.sessionId) return;
            
            const supabase = this.dbStorage.getSupabase();
            if (!supabase) {
                console.warn('Supabase not available for session sync');
                return;
            }
            
            console.log('Syncing session with database...');
            
            // Get latest data from database
            const { data: sessionData, error } = await supabase
                .from('temp_schedule_sessions')
                .select('*')
                .eq('session_id', this.currentSession.sessionId)
                .eq('is_active', true)
                .limit(1);
                
            if (error) {
                console.warn('Failed to sync with database:', error);
                return;
            }
            
            const sessionRecord = sessionData && sessionData.length > 0 ? sessionData[0] : null;
            
            if (sessionRecord && sessionRecord.schedule_data) {
                // Update current session with database data
                this.currentSession.scheduleData = sessionRecord.schedule_data;
                this.currentSession.lastUpdated = sessionRecord.last_updated;
                
                // Update browser storage
                this.browserStorage.store(this.currentSession);
                
                console.log('Session synced with database successfully');
            }
            
        } catch (error) {
            console.error('Failed to sync session with database:', error);
        }
    }
    
    async waitForUIReady() {
        return new Promise((resolve) => {
            const checkUI = () => {
                // Check if DOM is ready and UI functions are available
                if (document.readyState === 'complete' && 
                    typeof updateOrdersTable === 'function' && 
                    typeof displayResults === 'function') {
                    console.log('✅ UI is ready for restoration');
                    resolve();
                } else {
                    console.log('⏳ Waiting for UI to be ready...');
                    setTimeout(checkUI, 100);
                }
            };
            checkUI();
        });
    }
    
    async restoreUIState() {
        try {
            if (!this.hasActiveSchedule()) return;
            
            console.log('🔍 Debug: Restoring UI state from session data...');
            console.log('🔍 Current session:', this.currentSession);
            console.log('🔍 Schedule data:', this.currentSession.scheduleData);
            
            const scheduleData = this.currentSession.scheduleData;
            
            // Restore saved orders
            if (scheduleData.savedOrders && scheduleData.savedOrders.length > 0) {
                console.log('🔍 Restoring savedOrders:', scheduleData.savedOrders);
                await this.restoreSavedOrders(scheduleData.savedOrders);
            } else if (scheduleData.inputParameters && scheduleData.inputParameters.length > 0) {
                console.log('🔍 No savedOrders, using inputParameters as fallback:', scheduleData.inputParameters);
                await this.restoreSavedOrders(scheduleData.inputParameters);
            } else {
                console.log('🔍 No savedOrders or inputParameters found in session data');
            }
            
            // Restore schedule output
            if (scheduleData.generatedSchedule) {
                console.log('🔍 Restoring generatedSchedule:', scheduleData.generatedSchedule);
                await this.restoreScheduleOutput(scheduleData.generatedSchedule);
            } else {
                console.log('🔍 No generatedSchedule found in session data');
            }
            
            console.log('✅ UI state restored successfully');
            
        } catch (error) {
            console.error('Failed to restore UI state:', error);
        }
    }
    
    async restoreSavedOrders(savedOrders) {
        try {
            console.log('Restoring saved orders directly...');
            
            // Restore the global savedOrders variable directly
            if (savedOrders && Array.isArray(savedOrders)) {
                window.savedOrders = savedOrders;
                console.log('✅ Restored savedOrders:', window.savedOrders.length, 'orders');
                
            // Update the orders table UI directly
            if (typeof updateOrdersTable === 'function') {
                updateOrdersTable();
            } else {
                console.warn('updateOrdersTable function not available');
            }
            } else {
                console.log('No saved orders to restore');
            }
            
        } catch (error) {
            console.error('Failed to restore saved orders:', error);
        }
    }
    
    async restoreScheduleOutput(scheduleData) {
        try {
            console.log('Restoring schedule output directly...');
            
            // Restore the global scheduleResults variable directly
            if (scheduleData && Array.isArray(scheduleData)) {
                // Data is stored as generatedSchedule array, need to wrap it in scheduleResults format
                window.scheduleResults = {
                    rows: scheduleData,
                    alerts: []
                };
                console.log('✅ Restored scheduleResults:', scheduleData.length, 'rows');
                
            // Update the schedule output UI directly
            if (typeof displayResults === 'function') {
                displayResults();
            } else {
                console.warn('displayResults function not available');
            }
                
                // Show the results card explicitly (fallback)
                const resultsCard = document.getElementById('resultsCard');
                if (resultsCard) {
                    resultsCard.style.display = 'block';
                    console.log('✅ Results card shown');
                    
                    // Additional fallback: ensure it's visible after a delay
                    setTimeout(() => {
                        if (resultsCard.style.display !== 'block') {
                            resultsCard.style.display = 'block';
                            console.log('🔄 Results card visibility restored after delay');
                        }
                    }, 500);
                } else {
                    console.warn('Results card element not found');
                }
            } else {
                console.log('No schedule data to restore');
            }
            
        } catch (error) {
            console.error('Failed to restore schedule output:', error);
        }
    }
    
    async generateAndStoreSchedule(inputData, scheduleResults) {
        if (this.isGenerating) {
            console.warn('Schedule generation already in progress');
            return;
        }
        
        this.isGenerating = true;
        this.updateGenerationStatus('Generating schedule...');
        
        try {
            // Get the current savedOrders from the global variable
            const savedOrders = window.savedOrders || [];
            
            console.log('🔍 Debug: Storing schedule data...');
            console.log('🔍 savedOrders from window:', savedOrders);
            console.log('🔍 savedOrders length:', savedOrders.length);
            console.log('🔍 inputData:', inputData);
            console.log('🔍 scheduleResults:', scheduleResults);
            
            // Update session with new data
            this.currentSession.scheduleData = {
                savedOrders: savedOrders, // Store the actual savedOrders array
                inputParameters: inputData, // Keep the processed input data
                generatedSchedule: scheduleResults.rows || scheduleResults,
                metadata: {
                    totalOperations: (scheduleResults.rows || scheduleResults).length,
                    totalParts: this.getUniqueParts(scheduleResults.rows || scheduleResults),
                    generatedAt: new Date().toISOString(),
                    version: (this.currentSession.scheduleData?.metadata?.version || 0) + 1
                }
            };
            
            console.log('🔍 Final session data:', this.currentSession.scheduleData);
            
            this.currentSession.lastUpdated = new Date().toISOString();
            
            // Store in browser (primary storage)
            this.browserStorage.store(this.currentSession);
            
            // Store in database (backup)
            await this.dbStorage.storeSession(this.currentSession);
            
            // NEW: Save schedule results to Supabase
            await this.saveScheduleResultsToSupabase(scheduleResults);
            
            this.updateGenerationStatus('Schedule generated and stored successfully');
            this.updateUI();
            
            console.log('Schedule stored in session:', this.currentSession.sessionId);
            return this.currentSession.scheduleData;
            
        } catch (error) {
            console.error('Failed to store schedule:', error);
            this.updateGenerationStatus('Error storing schedule');
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }
    
    /**
     * Save schedule results to Supabase database
     */
    async saveScheduleResultsToSupabase(scheduleResults) {
        try {
            const supabase = this.dbStorage.getSupabase();
            if (!supabase) {
                console.warn('Supabase not available, skipping schedule results save');
                return;
            }
            
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.warn('No authenticated user, skipping schedule results save');
                return;
            }
            
            // Clear existing schedule results for this user
            await supabase
                .from('schedule_outputs')
                .delete()
                .eq('user_id', user.id);
            
            // Prepare schedule results data
            const scheduleRows = scheduleResults.rows || scheduleResults;
            if (scheduleRows && scheduleRows.length > 0) {
                const resultsData = scheduleRows.map((row, index) => ({
                    id: `${user.id}_${Date.now()}_${index}`,
                    user_id: user.id,
                    part_number: row.PartNumber,
                    order_quantity: row.Order_Quantity,
                    priority: row.Priority,
                    batch_id: row.Batch_ID,
                    batch_qty: row.Batch_Qty,
                    operation_seq: row.OperationSeq,
                    operation_name: row.OperationName,
                    machine: row.Machine,
                    person: row.Person,
                    setup_start: row.SetupStart,
                    setup_end: row.SetupEnd,
                    run_start: row.RunStart,
                    run_end: row.RunEnd,
                    timing: row.Timing,
                    due_date: row.DueDate,
                    status: row.Status,
                    created_at: new Date().toISOString()
                }));
                
                // Insert new schedule results
                const { data, error } = await supabase
                    .from('schedule_outputs')
                    .insert(resultsData);
                
                if (error) {
                    console.error('Failed to save schedule results to Supabase:', error);
                } else {
                    console.log('✅ Schedule results saved to Supabase:', resultsData.length, 'rows');
                }
            }
            
        } catch (error) {
            console.error('Error saving schedule results to Supabase:', error);
        }
    }
    
    getUniqueParts(scheduleRows) {
        if (!scheduleRows || !Array.isArray(scheduleRows)) return 0;
        const uniqueParts = new Set(scheduleRows.map(row => row.PartNumber));
        return uniqueParts.size;
    }
    
    async clearSession() {
        try {
            this.currentSession.isActive = false;
            
            // Clear browser storage
            this.browserStorage.clear();
            
            // Mark as inactive in database
            if (this.currentSession.sessionId) {
                await this.dbStorage.clearSession(this.currentSession.sessionId);
            }
            
            // Create new session
            await this.createNewSession();
            
            this.updateUI();
            this.showNotification('Session cleared successfully');
            
            console.log('Session cleared and new session created');
            return { success: true, message: 'Session cleared successfully' };
            
        } catch (error) {
            console.error('Failed to clear session:', error);
            this.showNotification('Error clearing session', 'error');
            return { success: false, error: error.message };
        }
    }
    
    getCurrentScheduleData() {
        return this.currentSession?.scheduleData;
    }
    
    hasActiveSchedule() {
        return this.currentSession?.scheduleData && this.currentSession.isActive;
    }
    
    updateGenerationStatus(message) {
        const statusElement = document.getElementById('generationStatus');
        if (statusElement) {
            const statusText = statusElement.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = message;
            }
        }
        console.log('Generation status:', message);
    }
    
    updateUI() {
        const hasData = this.hasActiveSchedule();
        
        // Update session status indicator
        const sessionStatus = document.getElementById('sessionStatus');
        if (sessionStatus) {
            sessionStatus.style.display = hasData ? 'block' : 'none';
            
            if (hasData) {
                const sessionTime = sessionStatus.querySelector('.session-time');
                if (sessionTime) {
                    const lastUpdated = new Date(this.currentSession.lastUpdated);
                    sessionTime.textContent = `Last updated: ${this.formatTimeAgo(lastUpdated)}`;
                }
                
                // Add cross-device indicator if session was restored from database
                const indicator = sessionStatus.querySelector('.session-indicator');
                if (indicator && this.currentSession.deviceInfo) {
                    const lastUpdated = new Date(this.currentSession.lastUpdated);
                    indicator.title = `Cross-device session\nDevice: ${this.currentSession.deviceInfo.platform}\nRestored: ${this.formatTimeAgo(lastUpdated)}`;
                    indicator.classList.add('cross-device');
                }
            }
        }
        
        // Update action buttons
        const exportBtn = document.getElementById('exportExcel');
        const clearBtn = document.getElementById('clearAll');
        
        if (exportBtn) exportBtn.disabled = !hasData;
        if (clearBtn) clearBtn.disabled = !hasData;
        
        // Update generation button
        const generateBtn = document.getElementById('generateSchedule');
        if (generateBtn) {
            generateBtn.disabled = this.isGenerating;
            generateBtn.textContent = this.isGenerating ? 'Generating...' : 'Generate Schedule';
        }
    }
    
    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
    
    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
            ${type === 'error' ? 'background-color: #dc3545;' : 'background-color: #28a745;'}
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    startAutoCleanup() {
        // Clean up expired sessions every minute
        this.autoCleanupInterval = setInterval(() => {
            if (!this.browserStorage.isValid()) {
                console.log('Session expired, clearing data');
                this.clearSession();
            }
        }, 60000);
    }
    
    stopAutoCleanup() {
        if (this.autoCleanupInterval) {
            clearInterval(this.autoCleanupInterval);
            this.autoCleanupInterval = null;
        }
    }
    
    // Export current schedule data for Excel export
    exportScheduleData() {
        if (!this.hasActiveSchedule()) {
            throw new Error('No active schedule to export');
        }
        
        return {
            rows: this.currentSession.scheduleData.generatedSchedule,
            metadata: this.currentSession.scheduleData.metadata,
            inputParameters: this.currentSession.scheduleData.inputParameters
        };
    }
    
    // Get session statistics
    getSessionStats() {
        if (!this.hasActiveSchedule()) {
            return {
                hasData: false,
                message: 'No active schedule'
            };
        }
        
        const data = this.currentSession.scheduleData;
        return {
            hasData: true,
            sessionId: this.currentSession.sessionId,
            totalOperations: data.metadata.totalOperations,
            totalParts: data.metadata.totalParts,
            generatedAt: data.metadata.generatedAt,
            version: data.metadata.version,
            lastUpdated: this.currentSession.lastUpdated
        };
    }
    
    async cleanupExpiredSessions() {
        try {
            const supabase = this.dbStorage.getSupabase();
            if (!supabase) return;
            
            const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            
            const { error } = await supabase
                .from('temp_schedule_sessions')
                .update({ is_active: false })
                .lt('last_updated', cutoffTime);
                
            if (error) throw error;
            
            console.log('✅ Expired sessions cleaned up (cross-device)');
        } catch (error) {
            console.error('Failed to cleanup expired sessions:', error);
        }
    }
    
    // Method to manually show results card (can be called from main app)
    showResultsCard() {
        try {
            const resultsCard = document.getElementById('resultsCard');
            if (resultsCard) {
                resultsCard.style.display = 'block';
                console.log('✅ Results card manually shown');
                return true;
            } else {
                console.warn('Results card element not found');
                return false;
            }
        } catch (error) {
            console.error('Failed to show results card:', error);
            return false;
        }
    }
    
    // Method to manually store current state (can be called when orders are added)
    async storeCurrentState() {
        try {
            console.log('🔍 Manually storing current state...');
            
            const savedOrders = window.savedOrders || [];
            const scheduleResults = window.scheduleResults || { rows: [], alerts: [] };
            
            console.log('🔍 Current savedOrders:', savedOrders);
            console.log('🔍 Current scheduleResults:', scheduleResults);
            
            // Update session with current data
            this.currentSession.scheduleData = {
                savedOrders: savedOrders,
                inputParameters: savedOrders, // Use savedOrders as input parameters
                generatedSchedule: scheduleResults.rows || [],
                metadata: {
                    totalOperations: (scheduleResults.rows || []).length,
                    totalParts: this.getUniqueParts(scheduleResults.rows || []),
                    generatedAt: new Date().toISOString(),
                    version: (this.currentSession.scheduleData?.metadata?.version || 0) + 1
                }
            };
            
            this.currentSession.lastUpdated = new Date().toISOString();
            
            // Store in browser and database
            this.browserStorage.store(this.currentSession);
            await this.dbStorage.storeSession(this.currentSession);
            
            console.log('✅ Current state stored successfully');
            this.updateUI();
            
        } catch (error) {
            console.error('Failed to store current state:', error);
        }
    }
    
    // Method to manually trigger UI restoration (can be called from main app)
    async triggerUIRestoration() {
        try {
            console.log('🔄 Manually triggering UI restoration...');
            
            if (this.hasActiveSchedule()) {
                await this.waitForUIReady();
                await this.restoreUIState();
                console.log('✅ Manual UI restoration completed');
            } else {
                console.log('No session data to restore');
            }
        } catch (error) {
            console.error('Failed to manually restore UI:', error);
        }
    }
    
    /**
     * Load schedule results from Supabase database
     */
    async loadScheduleResultsFromSupabase() {
        try {
            const supabase = this.dbStorage.getSupabase();
            if (!supabase) {
                console.warn('Supabase not available, skipping schedule results load');
                return null;
            }
            
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.warn('No authenticated user, skipping schedule results load');
                return null;
            }
            
            // Load schedule results for this user
            const { data: results, error } = await supabase
                .from('schedule_outputs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Failed to load schedule results from Supabase:', error);
                return null;
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
                
                console.log('✅ Loaded schedule results from Supabase:', scheduleRows.length, 'rows');
                
                // Update global scheduleResults variable
                window.scheduleResults = {
                    rows: scheduleRows,
                    alerts: []
                };
                
                return scheduleRows;
            } else {
                console.log('No schedule results found in Supabase');
                return null;
            }
            
        } catch (error) {
            console.error('Error loading schedule results from Supabase:', error);
            return null;
        }
    }
    
    /**
     * Clear all data from Supabase (saved orders and schedule results)
     */
    async clearAllSupabaseData() {
        try {
            const supabase = this.dbStorage.getSupabase();
            if (!supabase) {
                console.warn('Supabase not available, skipping clear operation');
                return { success: false, error: 'Supabase not available' };
            }
            
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.warn('No authenticated user, skipping clear operation');
                return { success: false, error: 'No authenticated user' };
            }
            
            console.log('🗑️ Clearing all Supabase data for user:', user.id);
            
            // Clear saved orders
            const { error: ordersError } = await supabase
                .from('saved_orders')
                .delete()
                .eq('user_id', user.id);
            
            if (ordersError) {
                console.error('Failed to clear saved orders:', ordersError);
            } else {
                console.log('✅ Cleared saved orders from Supabase');
            }
            
            // Clear schedule results
            const { error: resultsError } = await supabase
                .from('schedule_outputs')
                .delete()
                .eq('user_id', user.id);
            
            if (resultsError) {
                console.error('Failed to clear schedule results:', resultsError);
            } else {
                console.log('✅ Cleared schedule results from Supabase');
            }
            
            // Clear session data
            const { error: sessionError } = await supabase
                .from('temp_schedule_sessions')
                .update({ is_active: false })
                .eq('user_id', user.id);
            
            if (sessionError) {
                console.error('Failed to clear session data:', sessionError);
            } else {
                console.log('✅ Cleared session data from Supabase');
            }
            
            // Clear local data
            window.savedOrders = [];
            window.scheduleResults = { rows: [], alerts: [] };
            
            // Update UI
            if (typeof updateOrdersTable === 'function') {
                updateOrdersTable();
            }
            if (typeof displayResults === 'function') {
                displayResults();
            }
            
            console.log('✅ All data cleared successfully');
            return { success: true };
            
        } catch (error) {
            console.error('Error clearing Supabase data:', error);
            return { success: false, error: error.message };
        }
    }

    // Method to get session info for debugging
    getSessionInfo() {
        if (!this.currentSession) return null;
        
        return {
            sessionId: this.currentSession.sessionId,
            userId: this.currentSession.userId,
            userRole: this.currentSession.userRole,
            isActive: this.currentSession.isActive,
            created: this.currentSession.created,
            lastUpdated: this.currentSession.lastUpdated,
            deviceInfo: this.currentSession.deviceInfo,
            hasScheduleData: this.hasActiveSchedule(),
            scheduleDataSize: this.currentSession.scheduleData ? 
                JSON.stringify(this.currentSession.scheduleData).length : 0
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SessionBasedScheduleManager = SessionBasedScheduleManager;
    window.BrowserSessionStorage = BrowserSessionStorage;
    window.TemporaryDatabaseStorage = TemporaryDatabaseStorage;
    
    // Make clear function available globally
    window.clearAllSupabaseData = async function() {
        if (window.sessionManager) {
            return await window.sessionManager.clearAllSupabaseData();
        } else {
            console.error('Session manager not available');
            return { success: false, error: 'Session manager not available' };
        }
    };
    
    console.log('Session management system loaded successfully');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SessionBasedScheduleManager,
        BrowserSessionStorage,
        TemporaryDatabaseStorage
    };
}
