-- =====================================================
-- Call Recordings Table + GPS Columns + Policies
-- Created: 2026-02-03
-- =====================================================

CREATE TABLE IF NOT EXISTS public.call_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT,
    contact_name TEXT,
    direction TEXT,
    call_type TEXT,
    scheduled_time TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    file_url TEXT,
    upload_status TEXT,
    device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_accuracy DOUBLE PRECISION,
    location_timestamp TIMESTAMPTZ
);

ALTER TABLE public.call_recordings
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS location_timestamp TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS device_id TEXT;

CREATE INDEX IF NOT EXISTS idx_call_recordings_user_id ON public.call_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_created_at ON public.call_recordings(created_at DESC);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'call_recordings'
    ) THEN
        ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can insert own call recordings" ON public.call_recordings;
        DROP POLICY IF EXISTS "Users can view own call recordings" ON public.call_recordings;

        CREATE POLICY "Users can insert own call recordings" ON public.call_recordings
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can view own call recordings" ON public.call_recordings
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'storage' AND table_name = 'objects'
    ) THEN
        DROP POLICY IF EXISTS "Users can upload own call recordings" ON storage.objects;
        DROP POLICY IF EXISTS "Users can read own call recordings" ON storage.objects;

        CREATE POLICY "Users can upload own call recordings" ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (
                bucket_id = 'call-recordings'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );

        CREATE POLICY "Users can read own call recordings" ON storage.objects
            FOR SELECT TO authenticated
            USING (
                bucket_id = 'call-recordings'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
END $$;
