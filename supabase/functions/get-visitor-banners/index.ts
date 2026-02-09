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
    const url = new URL(req.url);
    const visitorToken = url.searchParams.get("visitor_token");

    if (!visitorToken) {
      return new Response(JSON.stringify({ banners: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get visitor's contact_id
    const { data: visitor } = await supabase
      .from("chat_visitors")
      .select("contact_id")
      .eq("visitor_token", visitorToken)
      .maybeSingle();

    if (!visitor?.contact_id) {
      return new Response(JSON.stringify({ banners: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active assignments
    const { data: assignments } = await supabase
      .from("chat_banner_assignments")
      .select("id, vote, banner_id, views_count")
      .eq("contact_id", visitor.contact_id)
      .eq("is_active", true);

    if (!assignments || assignments.length === 0) {
      return new Response(JSON.stringify({ banners: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bannerIds = assignments.map((a) => a.banner_id);
    const { data: bannersData } = await supabase
      .from("chat_banners")
      .select("id, content, bg_color, text_color, link_url, link_label, has_voting")
      .in("id", bannerIds)
      .eq("is_active", true);

    if (!bannersData) {
      return new Response(JSON.stringify({ banners: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const banners = assignments
      .map((assignment) => {
        const banner = bannersData.find((b) => b.id === assignment.banner_id);
        if (!banner) return null;
        return {
          assignment_id: assignment.id,
          content: banner.content,
          bg_color: banner.bg_color ?? "#3B82F6",
          text_color: banner.text_color ?? "#FFFFFF",
          link_url: banner.link_url,
          link_label: banner.link_label,
          has_voting: banner.has_voting ?? false,
          vote: assignment.vote,
        };
      })
      .filter(Boolean);

    // Increment views
    for (const a of assignments) {
      await supabase
        .from("chat_banner_assignments")
        .update({ views_count: (a.views_count ?? 0) + 1 })
        .eq("id", a.id);
    }

    return new Response(JSON.stringify({ banners }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
