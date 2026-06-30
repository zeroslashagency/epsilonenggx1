-- Slim DB to call-record + attendance + geofence. Remove device-monitoring data
-- (wifi/network/battery/app-usage/screen-time/storage/bluetooth/health/live).
-- KEEP device_events (call-log sync flows through it) + device_notifications.

drop trigger if exists device_events_update_live_status on public.device_events;

drop table if exists public.screen_time_logs cascade;
drop table if exists public.app_usage_logs cascade;
drop table if exists public.network_logs cascade;
drop table if exists public.storage_logs cascade;
drop table if exists public.bluetooth_logs cascade;
drop table if exists public.device_health_logs cascade;
drop table if exists public.device_live_status cascade;
drop table if exists public.device_status cascade;

drop function if exists public.update_device_live_status_timestamp() cascade;
drop function if exists public.upsert_device_live_status_from_event() cascade;
drop function if exists public.clean_up_old_device_logs() cascade;
