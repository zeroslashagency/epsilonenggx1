-- =====================================================
-- MOBILE DEVICE MONITORING TABLES
-- Created: 2026-01-22
-- Purpose: Support Mobile Device Logs / Monitor features
-- =====================================================

-- 1. Mobile Devices Table (Registry of devices)
CREATE TABLE IF NOT EXISTS public.mobile_devices (
    device_id VARCHAR(100) PRIMARY KEY, -- Unique hardware ID or generated UUID from app
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    model VARCHAR(255),
    os_version VARCHAR(100),
    app_version VARCHAR(100),
    battery_level INTEGER,
    is_charging BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Mobile Device Events (Raw Event Log)
CREATE TABLE IF NOT EXISTS public.mobile_device_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(100) REFERENCES public.mobile_devices(device_id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'SCREEN_ON', 'SCREEN_OFF', 'APP_USAGE', 'NETWORK_CHANGE', 'BLUETOOTH', 'STORAGE', 'LOCATION'
    event_data JSONB, -- Flexible payload (e.g., { app_package: 'com.instagram', duration: 300 })
    battery_level INTEGER,
    network_type VARCHAR(50), -- 'WIFI', 'MOBILE', 'NONE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Mobile Daily Stats (Aggregated Summary for fast querying)
-- This receives daily summaries from the device or is aggregated via cron
CREATE TABLE IF NOT EXISTS public.mobile_daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(100) REFERENCES public.mobile_devices(device_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_screen_time_seconds INTEGER DEFAULT 0,
    total_data_usage_bytes BIGINT DEFAULT 0,
    storage_used_bytes BIGINT DEFAULT 0,
    storage_total_bytes BIGINT DEFAULT 0,
    app_usage_summary JSONB, -- { "Social": 500, "Productivity": 200 }
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mobile_devices_user ON public.mobile_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_events_device ON public.mobile_device_events(device_id);
CREATE INDEX IF NOT EXISTS idx_mobile_events_type ON public.mobile_device_events(event_type);
CREATE INDEX IF NOT EXISTS idx_mobile_events_created ON public.mobile_device_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_stats_date ON public.mobile_daily_stats(date);

-- RLS Policies
ALTER TABLE public.mobile_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_device_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_daily_stats ENABLE ROW LEVEL SECURITY;

-- Policies for Mobile Devices
CREATE POLICY "Users can view their own devices" ON public.mobile_devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own devices" ON public.mobile_devices
    FOR ALL USING (auth.uid() = user_id);

-- Policies for Events
CREATE POLICY "Users can view their own device events" ON public.mobile_device_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.mobile_devices WHERE device_id = mobile_device_events.device_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can insert their own device events" ON public.mobile_device_events
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.mobile_devices WHERE device_id = mobile_device_events.device_id AND user_id = auth.uid())
    );

-- Policies for Stats
CREATE POLICY "Users can view their own device stats" ON public.mobile_daily_stats
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.mobile_devices WHERE device_id = mobile_daily_stats.device_id AND user_id = auth.uid())
    );

-- Grant permissions (Adjust as needed for your specific role setup)
GRANT ALL ON public.mobile_devices TO authenticated;
GRANT ALL ON public.mobile_device_events TO authenticated;
GRANT ALL ON public.mobile_daily_stats TO authenticated;
grant all on public.mobile_devices to service_role;
grant all on public.mobile_device_events to service_role;
grant all on public.mobile_daily_stats to service_role;
