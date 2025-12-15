
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createTestUser() {
    const email = 'superadmin@test.com';
    const password = 'password123';

    console.log(`Creating/Updating test user: ${email}`);

    // 1. Create User in Auth
    // We use admin.createUser to skip email confirmation if possible, or update if exists
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            name: 'Super Admin Test'
        }
    });

    if (createError) {
        // If user already exists, that's fine, we might want to update password though?
        // But createUser usually throws if exists.
        // Let's try listUsers or getUserById isn't easy without ID.
        // For now, if "User already registered", proceed to ensure role.
        console.log('User creation result:', createError.message);
    } else {
        console.log('User created:', user.id);
    }

    // Need to get the user ID regardless.
    // We can't query auth.users directly via client usually, but listUsers works with admin.
    // OR just sign in.

    // Let's just update the profile. Find the user first.
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const testUser = users.find(u => u.email === email);

    if (!testUser) {
        console.error('Could not find test user after creation attempt.');
        return;
    }

    console.log(`Test User ID: ${testUser.id}`);

    // 2. Ensure Profile Exists and is Super Admin
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: testUser.id,
            email: email, // Assuming profile has email column
            role: 'Super Admin',
            // name: 'Super Admin Test', // Likely full_name or doesn't exist
            full_name: 'Super Admin Test'
        }, { onConflict: 'id' });

    if (profileError) {
        console.error('Error updating profile:', profileError);
    } else {
        console.log('Profile updated to Super Admin.');
    }

    // 3. Ensure User Permissions (Optional, if relying on roles table)
    // If 'Role' table logic is used, ensure 'Super Admin' role exists in roles table
    const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('name', 'Super Admin')
        .single();

    if (roleError || !roleData) {
        console.log('Super Admin role not found in roles table. Creating it...');
        // Insert Super Admin role
        // Warning: schemas differ, assuming minimal schema
        const { error: createRoleError } = await supabase
            .from('roles')
            .insert({
                name: 'Super Admin',
                permissions: ['*'], // Legacy
                permissions_json: { super_admin: true } // New structure example
            });

        if (createRoleError) console.error('Error creating role:', createRoleError);
        else console.log('Super Admin role created.');
    } else {
        console.log('Super Admin role exists.');
    }

    console.log('Done.');
}

createTestUser();
