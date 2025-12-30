
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDec23() {
    const dateStr = '2025-12-23';
    console.log(`--- Checking Roster Logic for ${dateStr} ---`);

    // 1. Fetch employees
    const { data: employees } = await supabase.from('employee_master').select('employee_code, employee_name, department');

    // 2. Fetch assignments
    const { data: assignments } = await supabase
        .from('employee_shift_assignments')
        .select('*, shift_template:shift_templates(*)')
        .lte('start_date', dateStr)
        .or(`end_date.is.null,end_date.gte.${dateStr}`);

    // 3. Fetch rotation steps
    const { data: rotationSteps } = await supabase.from('shift_rotation_steps').select('*');

    // Logic Simulation
    const roster = employees.map(emp => {
        const code = emp.employee_code;
        const activeAssignments = (assignments || [])
            .filter(a => a.employee_code === code)
            .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

        const assignment = activeAssignments[0];
        if (assignment) {
            const t = assignment.shift_template;
            if (assignment.assignment_type === 'rotation' && t) {
                const steps = rotationSteps.filter(s => s.template_id === assignment.shift_template_id);
                const weeks = t.weeks_pattern || steps.length || 1;
                const startUTC = new Date(assignment.start_date + 'T00:00:00Z');
                const currUTC = new Date(dateStr + 'T00:00:00Z');
                const daysDiff = Math.floor((currUTC.getTime() - startUTC.getTime()) / (1000 * 60 * 60 * 24));
                const weekIdx = Math.floor(daysDiff / 7) % weeks;
                const weekPattern = steps[weekIdx];

                if (weekPattern) {
                    const workDays = weekPattern.work_days || t.work_days || [0, 1, 2, 3, 4, 5, 6];
                    const dayOfWeek = currUTC.getUTCDay();
                    return {
                        name: emp.employee_name,
                        code: emp.employee_code,
                        shift: weekPattern.shift_name,
                        isOff: !workDays.includes(dayOfWeek),
                        weekIdx,
                        dayOfWeek
                    };
                }
            } else if (assignment.assignment_type === 'fixed' && t) {
                return { name: emp.employee_name, code: emp.employee_code, shift: t.name };
            }
        }
        return null;
    }).filter(Boolean);

    console.log(JSON.stringify(roster, null, 2));
}

checkDec23().catch(console.error);
