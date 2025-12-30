const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAPI() {
    const employeeCode = '10'; // Test employee
    const workDate = '2025-12-25'; // Christmas for testing
    const shiftId = '70c24ae0-a990-4180-bb5d-8004e6f95aa3'; // General Shift

    console.log('--- Phase 1: Cleaning up existing test data ---');
    await supabase.from('employee_shift_assignments').delete().eq('employee_code', employeeCode);
    await supabase.from('employee_daily_schedule').delete().eq('employee_code', employeeCode).gte('work_date', workDate);

    console.log('--- Phase 2: Testing Assign (Persistent) ---');
    // Simulate the API call logic since I can't easily curl with auth in a script
    // I'll run the logic from the route.ts manually here to verify it works
    const yesterday = new Date(new Date(workDate).setDate(new Date(workDate).getDate() - 1)).toISOString().split('T')[0];

    // logic from app/api/assignments/update/route.ts
    const action = 'assign';

    // 1. Delete ALL future assignments
    await supabase.from('employee_shift_assignments').delete().eq('employee_code', employeeCode).gte('start_date', workDate);

    // 2. Close active
    const { data: assignmentsToClose } = await supabase.from('employee_shift_assignments').select('id').eq('employee_code', employeeCode).lt('start_date', workDate).or(`end_date.is.null,end_date.gte.${workDate}`);
    if (assignmentsToClose?.length > 0) {
        await supabase.from('employee_shift_assignments').update({ end_date: yesterday }).in('id', assignmentsToClose.map(a => a.id));
    }

    // 3. Create new
    await supabase.from('employee_shift_assignments').insert({
        employee_code: employeeCode,
        assignment_type: 'fixed',
        shift_template_id: shiftId,
        start_date: workDate
    });

    console.log('Verifying Phase 2 results...');
    const { data: results2 } = await supabase.from('employee_shift_assignments').select('*').eq('employee_code', employeeCode);
    console.table(results2);

    console.log('--- Phase 3: Testing Move (Persistent) ---');
    const newWorkDate = '2025-12-27';
    const newYesterday = new Date(new Date(newWorkDate).setDate(new Date(newWorkDate).getDate() - 1)).toISOString().split('T')[0];

    // 1. Delete future
    await supabase.from('employee_shift_assignments').delete().eq('employee_code', employeeCode).gte('start_date', newWorkDate);

    // 2. Close active
    const { data: toClose3 } = await supabase.from('employee_shift_assignments').select('id').eq('employee_code', employeeCode).lt('start_date', newWorkDate).or(`end_date.is.null,end_date.gte.${newWorkDate}`);
    if (toClose3?.length > 0) {
        await supabase.from('employee_shift_assignments').update({ end_date: newYesterday }).in('id', toClose3.map(a => a.id));
    }

    // 3. Create new
    await supabase.from('employee_shift_assignments').insert({
        employee_code: employeeCode,
        assignment_type: 'fixed',
        shift_template_id: shiftId, // Same or different, doesn't matter for logic test
        start_date: newWorkDate
    });

    console.log('Verifying Phase 3 results...');
    const { data: results3 } = await supabase.from('employee_shift_assignments').select('*').eq('employee_code', employeeCode);
    console.table(results3);
}

verifyAPI();
