import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { room_id } = await req.json();

    if (!room_id) {
      return new Response(
        JSON.stringify({ error: "room_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the room to check current assignment status
    const { data: room, error: roomError } = await supabase
      .from("chat_rooms")
      .select("id, status, attendant_id, contact_id, assigned_at")
      .eq("id", room_id)
      .maybeSingle();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: "room_not_found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // If the trigger already assigned it, just return the result
    if (room.status === "active" && room.attendant_id) {
      const { data: attendant } = await supabase
        .from("attendant_profiles")
        .select("display_name")
        .eq("id", room.attendant_id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          assigned: true,
          attendant_name: attendant?.display_name ?? null,
          room_status: room.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Room is still waiting — check if there are ANY eligible attendants
    // (so widget can decide whether to show "all busy" or "waiting for attendant")
    let hasEligibleAttendants = false;

    if (room.contact_id) {
      // Get contact's service category
      const { data: contact } = await supabase
        .from("contacts")
        .select("service_category_id")
        .eq("id", room.contact_id)
        .maybeSingle();

      if (contact?.service_category_id) {
        // Get category-team links with enabled configs
        const { data: catTeams } = await supabase
          .from("chat_category_teams")
          .select(`
            id,
            team_id,
            chat_assignment_configs!inner(enabled, online_only, capacity_limit, allow_over_capacity)
          `)
          .eq("category_id", contact.service_category_id);

        if (catTeams && catTeams.length > 0) {
          for (const ct of catTeams) {
            const config = (ct as any).chat_assignment_configs?.[0];
            if (!config?.enabled) continue;

            // Check if any attendant in this team is eligible
            let query = supabase
              .from("attendant_profiles")
              .select("id")
              .eq("chat_team_members.team_id", ct.team_id);

            const { data: teamMembers } = await supabase
              .from("chat_team_members")
              .select("attendant_id")
              .eq("team_id", ct.team_id);

            if (teamMembers && teamMembers.length > 0) {
              const attendantIds = teamMembers.map((m: any) => m.attendant_id);

              let apQuery = supabase
                .from("attendant_profiles")
                .select("id, status, active_conversations")
                .in("id", attendantIds);

              if (config.online_only) {
                apQuery = apQuery.eq("status", "online");
              }

              const { data: eligibleAttendants } = await apQuery;

              if (eligibleAttendants && eligibleAttendants.length > 0) {
                const hasCapacity = config.allow_over_capacity
                  ? true
                  : eligibleAttendants.some(
                      (a: any) => (a.active_conversations ?? 0) < config.capacity_limit
                    );

                if (hasCapacity) {
                  hasEligibleAttendants = true;
                  break;
                }
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        assigned: false,
        all_busy: !hasEligibleAttendants,
        room_status: room.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in assign-chat-room:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
