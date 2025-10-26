-- Check if we have data for Oct 14-20, 2025

SELECT 
  DATE(log_date) as date,
  COUNT(*) as punch_count,
  COUNT(DISTINCT employee_code) as employee_count,
  MIN(log_date) as first_punch,
  MAX(log_date) as last_punch
FROM employee_raw_logs
WHERE DATE(log_date) BETWEEN '2025-10-14' AND '2025-10-20'
GROUP BY DATE(log_date)
ORDER BY date;

-- Also check total records
SELECT 
  'Total Records' as info,
  COUNT(*) as count
FROM employee_raw_logs;

-- Check date range
SELECT 
  'Date Range' as info,
  MIN(DATE(log_date)) as earliest_date,
  MAX(DATE(log_date)) as latest_date
FROM employee_raw_logs;
