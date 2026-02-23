import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch active time-based rules grouped by tenant
    const { data: rules, error: rulesErr } = await supabase
      .from("chat_auto_rules")
      .select("id, rule_type, trigger_minutes, message_content, tenant_id")
      .in("rule_type", ["inactivity_warning", "auto_close", "attendant_absence"])
      .eq("is_enabled", true)
      .not("trigger_minutes", "is", null);

    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group rules by tenant_id
    const rulesByTenant = new Map<string, typeof rules>();
    for (const rule of rules) {
      const tid = rule.tenant_id ?? "__none__";
      if (!rulesByTenant.has(tid)) rulesByTenant.set(tid, []);
      rulesByTenant.get(tid)!.push(rule);
    }

    let totalProcessed = 0;

    for (const [tenantId, tenantRules] of rulesByTenant) {
      // Fetch active/waiting rooms for this tenant with last message info
      const roomQuery = supabase
        .from("chat_rooms")
        .select("id, status, attendant_id")
        .in("status", ["active", "waiting"]);

      if (tenantId !== "__none__") {
        roomQuery.eq("tenant_id", tenantId);
      }

      const { data: rooms, error: roomsErr } = await roomQuery;
      if (roomsErr || !rooms || rooms.length === 0) continue;

      // For each room, get last message info in a single batch
      const roomIds = rooms.map((r) => r.id);

      // Get last message per room (using a query per room is unavoidable without raw SQL, 
      // but we batch the duplicate-check query)
      for (const room of rooms) {
        // Get the last message in this room
        const { data: lastMsgs } = await supabase
          .from("chat_messages")
          .select("id, created_at, sender_type, metadata")
          .eq("room_id", room.id)
          .neq("sender_type", "system")
          .order("created_at", { ascending: false })
          .limit(1);

        if (!lastMsgs || lastMsgs.length === 0) continue;

        const lastMsg = lastMsgs[0];
        const lastMsgTime = new Date(lastMsg.created_at!).getTime();
        const now = Date.now();
        const elapsedMinutes = (now - lastMsgTime) / 60000;

        for (const rule of tenantRules) {
          if (!rule.trigger_minutes || elapsedMinutes < rule.trigger_minutes) continue;

          // Rule-specific eligibility
          if (rule.rule_type === "attendant_absence") {
            // Only for rooms with an attendant, where last message is from visitor
            if (!room.attendant_id || room.status !== "active") continue;
            if (lastMsg.sender_type !== "visitor") continue;
          }

          if (rule.rule_type === "inactivity_warning") {
            // For active rooms only, and only when the attendant spoke last (client didn't reply)
            if (room.status !== "active") continue;
            if (lastMsg.sender_type !== "attendant") continue;
          }

          // Check for duplicate: has this auto_rule already been sent after the last real message?
          const { data: duplicates } = await supabase
            .from("chat_messages")
            .select("id")
            .eq("room_id", room.id)
            .eq("sender_type", "system")
            .gt("created_at", lastMsg.created_at!)
            .limit(1);

          // If there's any system message after the last real message, skip
          // (more precise: check metadata for this specific rule type)
          const { data: exactDuplicates } = await supabase
            .from("chat_messages")
            .select("id, metadata")
            .eq("room_id", room.id)
            .eq("sender_type", "system")
            .gte("created_at", lastMsg.created_at!)
            .order("created_at", { ascending: false });

          const alreadySent = exactDuplicates?.some(
            (m) => m.metadata && (m.metadata as any).auto_rule === rule.rule_type
          );

          if (alreadySent) continue;

          // Insert the automatic message
          await supabase.from("chat_messages").insert({
            room_id: room.id,
            sender_type: "system",
            sender_name: "Sistema",
            content: rule.message_content ?? "",
            message_type: "text",
            metadata: { auto_rule: rule.rule_type },
          });

          totalProcessed++;

          // For auto_close, also close the room
          if (rule.rule_type === "auto_close") {
            await supabase
              .from("chat_rooms")
              .update({
                status: "closed",
                resolution_status: "pending",
                closed_at: new Date().toISOString(),
              })
              .eq("id", room.id);

            // Decrement attendant active_conversations
            if (room.attendant_id) {
              const { data: att } = await supabase
                .from("attendant_profiles")
                .select("active_conversations")
                .eq("id", room.attendant_id)
                .single();

              if (att) {
                await supabase
                  .from("attendant_profiles")
                  .update({
                    active_conversations: Math.max(
                      0,
                      (att.active_conversations ?? 0) - 1
                    ),
                  })
                  .eq("id", room.attendant_id);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ processed: totalProcessed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-chat-auto-rules error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
