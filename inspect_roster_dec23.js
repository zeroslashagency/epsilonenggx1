
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRoster() {
    const dateStr = '2025-12-23';
    console.log(`--- Inspecting Roster API Response for ${dateStr} ---`);

    const { data: employees } = await supabase.from('employee_master').select('*');
    const { data: overrides } = await supabase.from('employee_daily_schedule').select('*').eq('work_date', dateStr);
    const { data: assignments } = await supabase.from('employee_shift_assignments').select('*, shift_template:shift_templates(*)').lte('start_date', dateStr).or(`end_date.is.null,end_date.gte.${dateStr}`);
    const { data: rotationSteps } = await supabase.from('shift_rotation_steps').select('*');
    const { data: templates } = await supabase.from('shift_templates').select('*');

    // Simulate API Logic
    const roster = employees.map(emp => {
        const code = emp.employee_code;
        const override = overrides?.find(o => o.employee_code === code);
        if (override) return { emp, shift: override, source: 'override' };

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
                    return { emp, shift: weekPattern, template: t, source: 'rotation' };
                }
            } else if (assignment.assignment_type === 'fixed' && t) {
                return { emp, shift: t, source: 'fixed' };
            }
        }
        return { emp, shift: null, source: 'none' };
    });

    const assigned = roster.filter(r => r.shift && !r.shift.is_off && r.shift.name !== 'Weekly Off');
    console.log(JSON.stringify(assigned, null, 2));
}

inspectRoster().catch(console.error);
