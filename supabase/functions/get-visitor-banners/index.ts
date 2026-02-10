import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function validateApiKey(supabase: any, apiKey: string) {
  const keyPrefix = apiKey.substring(0, 12);

  const { data: apiKeyData } = await supabase
    .from("api_keys")
    .select("id, user_id, key_hash, is_active")
    .eq("key_prefix", keyPrefix)
    .eq("is_active", true)
    .maybeSingle();

  if (!apiKeyData) return null;

  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  if (keyHash !== apiKeyData.key_hash) return null;

  // Update last_used_at
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyData.id);

  return apiKeyData;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const visitorToken = url.searchParams.get("visitor_token");
    const apiKey = url.searchParams.get("api_key");
    const externalId = url.searchParams.get("external_id");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let contactId: string | null = null;

    // Path 1: api_key + external_id (new)
    if (apiKey && externalId) {
      const apiKeyData = await validateApiKey(supabase, apiKey);
      if (!apiKeyData) {
        return new Response(JSON.stringify({ banners: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: companyContact } = await supabase
        .from("company_contacts")
        .select("id, company_id")
        .eq("user_id", apiKeyData.user_id)
        .eq("external_id", externalId)
        .maybeSingle();

      if (companyContact) {
        contactId = companyContact.company_id;
      }
    }
    // Path 2: visitor_token (existing)
    else if (visitorToken) {
      const { data: visitor } = await supabase
        .from("chat_visitors")
        .select("contact_id")
        .eq("visitor_token", visitorToken)
        .maybeSingle();

      if (visitor?.contact_id) {
        contactId = visitor.contact_id;
      }
    }

    if (!contactId) {
      return new Response(JSON.stringify({ banners: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active assignments for this contact
    const { data: assignments } = await supabase
      .from("chat_banner_assignments")
      .select("id, vote, banner_id, views_count")
      .eq("contact_id", contactId)
      .eq("is_active", true);

    if (!assignments || assignments.length === 0) {
      return new Response(JSON.stringify({ banners: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bannerIds = assignments.map((a: any) => a.banner_id);
    const { data: bannersData } = await supabase
      .from("chat_banners")
      .select("id, content, content_html, text_align, bg_color, text_color, link_url, link_label, has_voting")
      .in("id", bannerIds)
      .eq("is_active", true);

    if (!bannersData) {
      return new Response(JSON.stringify({ banners: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const banners = assignments
      .map((assignment: any) => {
        const banner = bannersData.find((b: any) => b.id === assignment.banner_id);
        if (!banner) return null;
        return {
          assignment_id: assignment.id,
          content: banner.content,
          content_html: banner.content_html ?? null,
          text_align: banner.text_align ?? "left",
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
