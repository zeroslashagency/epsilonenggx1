// Create a global Supabase client initialization function
        function initSupabase() {
            // Check if supabase is available globally or on window
            const supabaseLib = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
            
            if (!supabaseLib || typeof supabaseLib.createClient !== 'function') {
                console.error('Supabase library not loaded or createClient not available');
                return null;
            }
            
            const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sxnaopzgaddvziplrlbe.supabase.co';
            const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w';
            
            try {
                // Initialize and return the Supabase client
                const client = supabaseLib.createClient(SUPABASE_URL, SUPABASE_KEY, {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: false, // Disable URL session detection to prevent redirect loops
                        storage: window.localStorage
                    }
                });
                
                // Test the connection
                client.from('temp_schedule_sessions').select('count').limit(1).then(({ data, error }) => {
                    if (error) {
                        console.warn('Supabase connection test failed:', error.message);
                    } else {
                        console.log('✅ Supabase database connection successful');
                    }
                });
                
                return client;
            } catch (error) {
                console.error('Failed to create Supabase client:', error);
                return null;
            }
        }
        
        // Initialize Supabase with retry mechanism
        async function initializeSupabaseWithRetry() {
            let attempts = 0;
            const maxAttempts = 5;
            
            while (attempts < maxAttempts) {
                try {
                    const supabase = initSupabase();
                    if (supabase) {
                        window.supabase = supabase; // Make available globally
                        console.log('Supabase initialized successfully');
                        
                        // Check for session in URL hash and clear it to prevent redirect loops
                        if (window.location.hash) {
                            const hash = window.location.hash;
                            if (hash.includes('access_token') || hash.includes('error=')) {
                                // Clear the hash without refreshing
                                history.replaceState(null, null, ' ');
                            }
                        }
                        
                        return supabase;
                    }
                } catch (error) {
                    console.warn(`Supabase initialization attempt ${attempts + 1} failed:`, error);
                }
                
                attempts++;
                if (attempts < maxAttempts) {
                    console.log(`Retrying Supabase initialization in 1 second... (attempt ${attempts + 1}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            console.error('Failed to initialize Supabase after all attempts');
            return null;
        }
        
        // Start initialization
        initializeSupabaseWithRetry();
