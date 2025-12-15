
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sxnaopzgaddvziplrlbe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bmFvcHpnYWRkdnppcGxybGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjUyODQsImV4cCI6MjA3MjIwMTI4NH0.o3UAaJtrNpVh_AsljSC1oZNkJPvQomedvtJlXTE3L6w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runAudit() {
    console.log("Starting System Audit...");
    const errors = [];
    const warnings = [];

    // 1. Check Profiles
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
    if (profileError) {
        errors.push(`Failed to fetch profiles: ${profileError.message}`);
    } else {
        console.log(`Found ${profiles.length} profiles.`);
        profiles.forEach(p => {
            if (!p.employee_code) warnings.push(`Profile ${p.full_name} (${p.id}) missing employee_code.`);
            if (!p.role) warnings.push(`Profile ${p.full_name} (${p.id}) missing role.`);
        });
    }

    // 2. Check Employee Master
    const { data: employees, error: empError } = await supabase.from('employee_master').select('*');
    if (empError) {
        errors.push(`Failed to fetch employees: ${empError.message}`);
    } else {
        console.log(`Found ${employees.length} employees.`);
        // Check linkage
        if (profiles) {
            employees.forEach(emp => {
                const linked = profiles.find(p => p.employee_code === emp.employee_code);
                if (!linked) {
                    // Pass, not every employee needs a profile
                }
            });
            // Check if any profile has invalid employee_code
            profiles.forEach(p => {
                const exists = employees.find(e => e.employee_code === p.employee_code);
                if (!exists && p.employee_code) warnings.push(`Profile ${p.full_name} has employee_code '${p.employee_code}' which does not exist in employee_master.`);
            });
        }
    }

    // 3. Check Reports (integrity)
    const { data: reports, error: reportError } = await supabase.from('fir_activity').select('*');
    if (reportError) {
        errors.push(`Failed to fetch reports: ${reportError.message}`);
    } else {
        console.log(`Found ${reports.length} reports.`);
        reports.forEach(r => {
            if (!r.submitted_person_id) {
                // We know old records might be missing it, but we backfilled.
                errors.push(`Report ${r.id} (${r.title}) missing submitted_person_id.`);
            } else {
                // Verify submitted_person_id exists in profiles/users (we can't query users table directly with anon key usually, but verified against profiles)
                // If profiles table is the source of truth for our app users
                if (profiles) {
                    const submitter = profiles.find(p => p.id === r.submitted_person_id);
                    if (!submitter) errors.push(`Report ${r.id} has submitted_person_id ${r.submitted_person_id} which does not exist in profiles.`);
                }
            }

            if (r.created_by === 'Vignesh' && r.submitted_person_id && profiles) {
                const submitter = profiles.find(p => p.id === r.submitted_person_id);
                if (submitter && submitter.full_name !== 'Vignesh') {
                    // This is the "Junk Data" issue I found earlier
                    warnings.push(`Report ${r.id} created_by says 'Vignesh' but linked profile is '${submitter.full_name}'. Data mismatch.`);
                }
            }
        });
    }

    // 4. Output Report
    console.log("\n--- AUDIT RESULTS ---");
    console.log(`Errors: ${errors.length}`);
    errors.forEach(e => console.error(`[ERROR] ${e}`));

    console.log(`Warnings: ${warnings.length}`);
    warnings.forEach(w => console.warn(`[WARN] ${w}`));

    if (errors.length === 0) console.log("System Data Integrity: PASS (with warnings)");
    else console.log("System Data Integrity: FAIL");
}

runAudit();
