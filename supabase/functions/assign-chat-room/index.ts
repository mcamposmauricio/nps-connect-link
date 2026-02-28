import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendWelcomeMessage(supabase: any, roomId: string, tenantId: string | null) {
  if (!tenantId) return;

  // Check if welcome_message rule is enabled for this tenant
  const { data: welcomeRule } = await supabase
    .from("chat_auto_rules")
    .select("id, message_content")
    .eq("tenant_id", tenantId)
    .eq("rule_type", "welcome_message")
    .eq("is_enabled", true)
    .maybeSingle();

  if (!welcomeRule || !welcomeRule.message_content) return;

  // Check if room already has a welcome message
  const { data: existingMsgs } = await supabase
    .from("chat_messages")
    .select("id, metadata")
    .eq("room_id", roomId)
    .eq("sender_type", "system");

  const alreadySent = existingMsgs?.some(
    (m: any) => (m.metadata as any)?.auto_rule === "welcome_message"
  );

  if (alreadySent) return;

  await supabase.from("chat_messages").insert({
    room_id: roomId,
    sender_type: "system",
    sender_name: "Sistema",
    content: welcomeRule.message_content,
    message_type: "text",
    metadata: { auto_rule: "welcome_message" },
  });
}

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

    // Check business hours
    const nowSaoPaulo = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const now = new Date(nowSaoPaulo);
    const dow = now.getDay(); // 0=Sun
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Fetch the room first to get tenant info
    const { data: room, error: roomError } = await supabase
      .from("chat_rooms")
      .select("id, status, attendant_id, contact_id, assigned_at, owner_user_id, tenant_id")
      .eq("id", room_id)
      .maybeSingle();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: "room_not_found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check business hours for this tenant
    let outsideHours = false;
    const { data: bhRows } = await supabase
      .from("chat_business_hours")
      .select("is_active, start_time, end_time, day_of_week")
      .eq("tenant_id", room.tenant_id);

    if (bhRows && bhRows.length > 0) {
      const activeWindow = bhRows.find(
        (bh: any) =>
          bh.day_of_week === dow &&
          bh.is_active === true &&
          bh.start_time <= timeStr &&
          bh.end_time >= timeStr
      );
      outsideHours = !activeWindow;
    }

    // Send welcome message for any new room (regardless of assignment)
    await sendWelcomeMessage(supabase, room_id, room.tenant_id);

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
          outside_hours: outsideHours,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If outside hours, return immediately
    if (outsideHours) {
      return new Response(
        JSON.stringify({
          assigned: false,
          all_busy: false,
          outside_hours: true,
          room_status: room.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Room is still waiting — check if there are ANY eligible attendants
    let hasEligibleAttendants = false;

    if (room.contact_id) {
      // Get contact's service category
      const { data: contact } = await supabase
        .from("contacts")
        .select("service_category_id")
        .eq("id", room.contact_id)
        .maybeSingle();

      // Resolve category: use contact's or fallback to tenant default
      let categoryId = contact?.service_category_id;
      if (!categoryId) {
        const { data: defaultCat } = await supabase
          .from("chat_service_categories")
          .select("id")
          .eq("tenant_id", room.tenant_id)
          .eq("is_default", true)
          .limit(1)
          .maybeSingle();
        categoryId = defaultCat?.id;
      }

      if (categoryId) {
        const { data: catTeams } = await supabase
          .from("chat_category_teams")
          .select(`
            id,
            team_id,
            chat_assignment_configs!inner(enabled, online_only, capacity_limit, allow_over_capacity)
          `)
          .eq("category_id", categoryId);

        if (catTeams && catTeams.length > 0) {
          for (const ct of catTeams) {
            const config = (ct as any).chat_assignment_configs?.[0];
            if (!config?.enabled) continue;

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
        outside_hours: outsideHours,
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
