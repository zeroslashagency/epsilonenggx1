import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role_id: string; // Can be role name or UUID
  employee_code?: string;
  department?: string;
  enable_standalone?: boolean;
  send_invitation?: boolean;
  require_force_change?: boolean;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated and has admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Create client with user's token to verify permissions
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    // Get the calling user's info
    const { data: { user: callingUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if calling user has admin/super admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", callingUser.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Could not verify user role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedRoles = ["Super Admin", "Admin"];
    if (!allowedRoles.includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request body
    const payload: CreateUserPayload = await req.json();

    // Validate required fields
    if (!payload.email || !payload.password || !payload.full_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, full_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve role_id (could be name or UUID)
    let roleId = payload.role_id;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roleId);
    
    if (!isUUID) {
      // Lookup role by name
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from("roles")
        .select("id")
        .eq("name", roleId)
        .single();

      if (roleError || !roleData) {
        // Default to Operator role if not found
        const { data: defaultRole } = await supabaseAdmin
          .from("roles")
          .select("id")
          .eq("name", "Operator")
          .single();
        
        roleId = defaultRole?.id ?? roleId;
      } else {
        roleId = roleData.id;
      }
    }

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile
    const { error: profileInsertError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        email: payload.email,
        full_name: payload.full_name,
        role: payload.role_id, // Store role name for display
        role_badge: payload.role_id,
        employee_code: payload.employee_code ?? null,
        department: payload.department ?? null,
        standalone_attendance: payload.enable_standalone ?? false,
        status: "active",
      });

    if (profileInsertError) {
      // Cleanup: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to create profile: " + profileInsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign role in user_roles table (if using RBAC)
    if (isUUID || roleId !== payload.role_id) {
      const { error: roleAssignError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role_id: roleId,
        });

      if (roleAssignError) {
        console.error("Failed to assign role:", roleAssignError);
        // Don't fail the entire operation for role assignment
      }
    }

    // Log audit trail
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: callingUser.id,
      target_id: authData.user.id,
      action: "user_created",
      meta_json: {
        created_user: {
          email: payload.email,
          full_name: payload.full_name,
          role: payload.role_id,
        },
        created_by: callingUser.email,
        created_at: new Date().toISOString(),
        creation_method: "mobile_app",
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
