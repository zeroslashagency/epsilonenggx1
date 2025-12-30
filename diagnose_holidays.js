
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    const dateStr = '2025-12-22';
    console.log(`--- Diagnosing for ${dateStr} ---`);

    console.log('\n--- Public Holidays ---');
    const { data: holidays } = await supabase.from('public_holidays').select('*');
    console.log(JSON.stringify(holidays, null, 2));

    console.log('\n--- Dashboard Data (Settings) ---');
    const { data: settings } = await supabase.from('dashboard_data').select('*').eq('timeline_view', 'advanced_settings');
    console.log(JSON.stringify(settings, null, 2));

    console.log('\n--- Daily Overrides for Dec 21-22 ---');
    const { data: overrides } = await supabase.from('employee_daily_schedule').select('*').gte('work_date', '2025-12-21').lte('work_date', '2025-12-22');
    console.log(JSON.stringify(overrides, null, 2));
}

diagnose().catch(console.error);
