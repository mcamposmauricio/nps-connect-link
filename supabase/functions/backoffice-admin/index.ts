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

        // Generate invite token
        const inviteToken = crypto.randomUUID();

        // Check if user already exists in auth
        const { data: allUsers } = await adminClient.auth.admin.listUsers();
        const existingAuthUser = allUsers?.users?.find((u: any) => u.email === email);

        // Create user_profile with invite_status='pending' and user_id=NULL
        // The user_id will be set when the invite is accepted
        const { error: profileErr } = await adminClient.from("user_profiles").insert({
          user_id: null,
          email,
          display_name: displayName,
          tenant_id: tenantId,
          invite_status: "pending",
          invite_token: inviteToken,
          is_active: true,
        });
        if (profileErr) throw profileErr;

        // Do NOT create user_roles here — role will be created when invite is accepted

        // If user already exists in auth, send them a notification via password reset
        if (existingAuthUser) {
          try {
            await adminClient.auth.resetPasswordForEmail(email, {
              redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth?invite=${inviteToken}`,
            });
          } catch (e) {
            console.error("Warning: could not send notification email:", e);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          inviteToken,
          inviteUrl: `/auth?invite=${inviteToken}`,
          userAlreadyExists: !!existingAuthUser,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "check-email-exists": {
        const { email } = params;
        if (!email) throw new Error("Email required");

        // Check user_profiles for this email
        const { data: profiles } = await adminClient
          .from("user_profiles")
          .select("id, email, display_name, tenant_id, invite_status")
          .eq("email", email)
          .eq("invite_status", "accepted");

        // Get tenant names for existing profiles
        const results = [];
        if (profiles && profiles.length > 0) {
          for (const p of profiles) {
            let tenantName = "Sem plataforma";
            if (p.tenant_id) {
              const { data: tenant } = await adminClient
                .from("tenants")
                .select("name")
                .eq("id", p.tenant_id)
                .maybeSingle();
              if (tenant) tenantName = tenant.name;
            }
            results.push({ ...p, tenant_name: tenantName });
          }
        }

        return new Response(JSON.stringify({
          exists: results.length > 0,
          profiles: results,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "cleanup-orphan-auth-users": {
        const dryRun = params.dry_run !== false; // default true

        // Get all auth users
        const { data: authData, error: authErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        if (authErr) throw authErr;
        const authUsers = authData?.users || [];

        // Get all user_ids from profiles and roles
        const { data: profileUserIds } = await adminClient
          .from("user_profiles")
          .select("user_id")
          .not("user_id", "is", null);
        const { data: roleUserIds } = await adminClient
          .from("user_roles")
          .select("user_id");

        const knownUserIds = new Set<string>();
        profileUserIds?.forEach((p: any) => { if (p.user_id) knownUserIds.add(p.user_id); });
        roleUserIds?.forEach((r: any) => { if (r.user_id) knownUserIds.add(r.user_id); });

        // Never delete the calling master user
        knownUserIds.add(user.id);

        // Find orphans
        const orphans = authUsers.filter((u: any) => !knownUserIds.has(u.id));

        if (dryRun) {
          return new Response(JSON.stringify({
            dry_run: true,
            orphan_count: orphans.length,
            orphans: orphans.map((u: any) => ({
              id: u.id,
              email: u.email,
              created_at: u.created_at,
            })),
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Execute cleanup
        const deleted: string[] = [];
        const errors: string[] = [];
        for (const orphan of orphans) {
          try {
            const { error: delErr } = await adminClient.auth.admin.deleteUser(orphan.id);
            if (delErr) {
              errors.push(`${orphan.email}: ${delErr.message}`);
            } else {
              deleted.push(orphan.email || orphan.id);
            }
          } catch (e: any) {
            errors.push(`${orphan.email}: ${e.message}`);
          }
        }

        return new Response(JSON.stringify({
          dry_run: false,
          deleted_count: deleted.length,
          deleted,
          errors,
        }), {
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
