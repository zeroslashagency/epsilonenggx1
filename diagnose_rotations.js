
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('--- Shift Templates ---');
    const { data: templates } = await supabase.from('shift_templates').select('*');
    console.log(JSON.stringify(templates, null, 2));

    console.log('\n--- Rotation Steps ---');
    const { data: steps } = await supabase.from('shift_rotation_steps').select('*').order('template_id', { ascending: true }).order('step_order', { ascending: true });
    console.log(JSON.stringify(steps, null, 2));

    console.log('\n--- Active Assignments ---');
    const { data: assignments } = await supabase.from('employee_shift_assignments').select('*').limit(10);
    console.log(JSON.stringify(assignments, null, 2));
}

diagnose().catch(console.error);
