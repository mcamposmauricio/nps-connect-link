import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is master
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: masterCheck } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "master").maybeSingle();

    if (!masterCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: master role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "list-auth-users": {
        const page = params.page || 1;
        const perPage = params.perPage || 50;
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        return new Response(JSON.stringify({ users: data.users, total: data.users.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset-password": {
        const { email } = params;
        if (!email) throw new Error("Email required");
        const { error } = await adminClient.auth.resetPasswordForEmail(email);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: `Reset email sent to ${email}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete-auth-user": {
        const { userId } = params;
        if (!userId) throw new Error("userId required");
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "provision-tenant-admin": {
        const { tenantId, email, displayName } = params;
        if (!tenantId || !email || !displayName) throw new Error("tenantId, email and displayName required");

        // 1. Check if user already exists
        const { data: existingUsers } = await adminClient.auth.admin.listUsers({ perPage: 1 });
        let userId: string;

        // Try to find by email
        const { data: userByEmail } = await adminClient.auth.admin.listUsers();
        const found = userByEmail?.users?.find((u: any) => u.email === email);

        if (found) {
          userId = found.id;
        } else {
          // Create new user
          const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
            email,
            email_confirm: false,
          });
          if (createErr) throw createErr;
          userId = newUser.user.id;
        }

        // 2. Create user_profile
        const { error: profileErr } = await adminClient.from("user_profiles").insert({
          user_id: userId,
          email,
          display_name: displayName,
          tenant_id: tenantId,
          invite_status: "accepted",
          is_active: true,
        });
        if (profileErr) throw profileErr;

        // 3. Create user_role as admin
        const { error: roleErr } = await adminClient.from("user_roles").insert({
          user_id: userId,
          role: "admin",
        });
        // Ignore duplicate role error
        if (roleErr && !roleErr.message?.includes("duplicate")) throw roleErr;

        // 4. Send password reset email so user can set their password
        const { error: resetErr } = await adminClient.auth.resetPasswordForEmail(email);
        if (resetErr) {
          console.error("Warning: could not send reset email:", resetErr.message);
        }

        return new Response(JSON.stringify({ success: true, userId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
