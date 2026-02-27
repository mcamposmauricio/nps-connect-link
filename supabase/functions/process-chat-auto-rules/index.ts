import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Sequential chain order for main flow rules
const FLOW_ORDER = ["inactivity_warning", "inactivity_warning_2", "auto_close"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch active time-based rules (chain + attendant_absence)
    const { data: rules, error: rulesErr } = await supabase
      .from("chat_auto_rules")
      .select("id, rule_type, trigger_minutes, message_content, tenant_id")
      .in("rule_type", ["inactivity_warning", "inactivity_warning_2", "auto_close", "attendant_absence"])
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
      // Build maps for chain rules and attendant_absence
      const chainRules = new Map<string, (typeof tenantRules)[0]>();
      let absenceRule: (typeof tenantRules)[0] | null = null;

      for (const rule of tenantRules) {
        if (FLOW_ORDER.includes(rule.rule_type as any)) {
          chainRules.set(rule.rule_type, rule);
        } else if (rule.rule_type === "attendant_absence") {
          absenceRule = rule;
        }
      }

      // Fetch active/waiting rooms for this tenant
      const roomQuery = supabase
        .from("chat_rooms")
        .select("id, status, attendant_id")
        .in("status", ["active", "waiting"]);

      if (tenantId !== "__none__") {
        roomQuery.eq("tenant_id", tenantId);
      }

      const { data: rooms, error: roomsErr } = await roomQuery;
      if (roomsErr || !rooms || rooms.length === 0) continue;

      const roomIds = rooms.map((r) => r.id);

      // Fetch ALL messages for these rooms (last 24h to be safe for chain detection)
      const twentyFourHoursAgo = new Date(Date.now() - 86400_000).toISOString();

      const { data: allMessages } = await supabase
        .from("chat_messages")
        .select("id, room_id, created_at, sender_type, metadata")
        .in("room_id", roomIds)
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false });

      // Build per-room message indexes
      const msgsByRoom = new Map<string, typeof allMessages>();
      if (allMessages) {
        for (const msg of allMessages) {
          if (!msgsByRoom.has(msg.room_id)) msgsByRoom.set(msg.room_id, []);
          msgsByRoom.get(msg.room_id)!.push(msg);
        }
      }

      const now = Date.now();

      for (const room of rooms) {
        const roomMsgs = msgsByRoom.get(room.id) ?? [];

        // === ATTENDANT ABSENCE (independent, not part of chain) ===
        if (absenceRule && room.status === "active" && room.attendant_id) {
          const lastNonSystem = roomMsgs.find((m) => m.sender_type !== "system");
          if (lastNonSystem && lastNonSystem.sender_type === "visitor") {
            const elapsed = (now - new Date(lastNonSystem.created_at!).getTime()) / 60000;
            if (elapsed >= absenceRule.trigger_minutes!) {
              const alreadySent = roomMsgs.some(
                (m) =>
                  m.sender_type === "system" &&
                  m.created_at! >= lastNonSystem.created_at! &&
                  (m.metadata as any)?.auto_rule === "attendant_absence"
              );
              if (!alreadySent) {
                await supabase.from("chat_messages").insert({
                  room_id: room.id,
                  sender_type: "system",
                  sender_name: "Sistema",
                  content: absenceRule.message_content ?? "",
                  message_type: "text",
                  metadata: { auto_rule: "attendant_absence" },
                });
                totalProcessed++;
              }
            }
          }
        }

        // === SEQUENTIAL CHAIN PROCESSING ===
        if (chainRules.size === 0) continue;

        // Find chain system messages and last visitor message
        const chainSystemMsgs: Array<{ rule: string; created_at: string }> = [];
        let lastVisitorMsg: { created_at: string } | null = null;
        let lastAttendantMsg: { created_at: string } | null = null;

        for (const msg of roomMsgs) {
          if (msg.sender_type === "system") {
            const autoRule = (msg.metadata as any)?.auto_rule;
            if (autoRule && FLOW_ORDER.includes(autoRule)) {
              chainSystemMsgs.push({ rule: autoRule, created_at: msg.created_at! });
            }
          } else if (msg.sender_type === "visitor" && !lastVisitorMsg) {
            lastVisitorMsg = { created_at: msg.created_at! };
          } else if (msg.sender_type === "attendant" && !lastAttendantMsg) {
            lastAttendantMsg = { created_at: msg.created_at! };
          }
        }

        // Determine the last chain step executed
        // chainSystemMsgs is ordered desc (newest first)
        const lastChainMsg = chainSystemMsgs.length > 0 ? chainSystemMsgs[0] : null;

        // If visitor responded after the last chain message, chain is reset - skip
        if (lastChainMsg && lastVisitorMsg && lastVisitorMsg.created_at > lastChainMsg.created_at) {
          continue;
        }

        // Determine next step
        let nextStep: string | null = null;
        let referenceTime: string | null = null;

        if (!lastChainMsg) {
          // No chain message sent yet -> next is inactivity_warning
          // But only if attendant spoke last and room is active
          if (room.status === "active" && lastAttendantMsg) {
            const lastNonSystem = roomMsgs.find((m) => m.sender_type !== "system");
            if (lastNonSystem && lastNonSystem.sender_type === "attendant") {
              nextStep = "inactivity_warning";
              referenceTime = lastAttendantMsg.created_at;
            }
          }
        } else if (lastChainMsg.rule === "inactivity_warning") {
          nextStep = "inactivity_warning_2";
          referenceTime = lastChainMsg.created_at;
        } else if (lastChainMsg.rule === "inactivity_warning_2") {
          nextStep = "auto_close";
          referenceTime = lastChainMsg.created_at;
        }
        // If lastChainMsg is auto_close, chain is complete

        if (!nextStep || !referenceTime) continue;

        const stepRule = chainRules.get(nextStep);
        if (!stepRule) continue;

        const elapsedMinutes = (now - new Date(referenceTime).getTime()) / 60000;
        if (elapsedMinutes < stepRule.trigger_minutes!) continue;

        // Send the chain message
        await supabase.from("chat_messages").insert({
          room_id: room.id,
          sender_type: "system",
          sender_name: "Sistema",
          content: stepRule.message_content ?? "",
          message_type: "text",
          metadata: { auto_rule: nextStep },
        });

        totalProcessed++;

        // Status changes per step
        if (nextStep === "inactivity_warning") {
          // Move to waiting (pending)
          await supabase
            .from("chat_rooms")
            .update({ status: "waiting" })
            .eq("id", room.id);
        } else if (nextStep === "auto_close") {
          // Close + archive
          await supabase
            .from("chat_rooms")
            .update({
              status: "closed",
              resolution_status: "archived",
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
