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
    let tenantId: string | null = null;

    // Path 1: api_key + external_id
    if (apiKey && externalId) {
      const apiKeyData = await validateApiKey(supabase, apiKey);
      if (!apiKeyData) {
        return new Response(JSON.stringify({ banners: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get tenant_id from user
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("tenant_id")
        .eq("user_id", apiKeyData.user_id)
        .maybeSingle();
      tenantId = profile?.tenant_id ?? null;

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
    // Path 2: visitor_token
    else if (visitorToken) {
      const { data: visitor } = await supabase
        .from("chat_visitors")
        .select("contact_id, tenant_id")
        .eq("visitor_token", visitorToken)
        .maybeSingle();

      if (visitor?.contact_id) {
        contactId = visitor.contact_id;
        tenantId = visitor.tenant_id ?? null;
      }
    }

    const now = new Date().toISOString();

    // Build banner query with date/active filters
    let bannerQuery = supabase
      .from("chat_banners")
      .select("id, content, content_html, text_align, bg_color, text_color, link_url, link_label, has_voting, banner_type, priority, max_views, target_all")
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("priority", { ascending: false });

    // If we have a tenant, filter by it
    if (tenantId) {
      bannerQuery = bannerQuery.eq("tenant_id", tenantId);
    }

    const { data: allBanners } = await bannerQuery;
    if (!allBanners || allBanners.length === 0) {
      return new Response(JSON.stringify({ banners: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Separate target_all banners from individually assigned
    const targetAllBanners = allBanners.filter((b: any) => b.target_all);
    const individualBanners = allBanners.filter((b: any) => !b.target_all);

    const result: any[] = [];

    // Process target_all banners — create/find assignments on the fly
    if (contactId && targetAllBanners.length > 0) {
      for (const banner of targetAllBanners) {
        // Check if assignment exists
        let { data: existing } = await supabase
          .from("chat_banner_assignments")
          .select("id, vote, views_count, dismissed_at")
          .eq("banner_id", banner.id)
          .eq("contact_id", contactId)
          .maybeSingle();

        if (existing?.dismissed_at) continue; // permanently dismissed
        if (banner.max_views && existing && existing.views_count >= banner.max_views) continue;

        if (!existing) {
          // Auto-create assignment
          const { data: created } = await supabase
            .from("chat_banner_assignments")
            .insert({ banner_id: banner.id, contact_id: contactId, tenant_id: tenantId })
            .select("id, vote, views_count")
            .single();
          existing = created;
        }

        if (existing) {
          result.push({
            assignment_id: existing.id,
            content: banner.content,
            content_html: banner.content_html ?? null,
            text_align: banner.text_align ?? "left",
            bg_color: banner.bg_color ?? "#3B82F6",
            text_color: banner.text_color ?? "#FFFFFF",
            link_url: banner.link_url,
            link_label: banner.link_label,
            has_voting: banner.has_voting ?? false,
            banner_type: banner.banner_type ?? "info",
            priority: banner.priority ?? 5,
            vote: existing.vote,
          });

          // Increment views
          await supabase
            .from("chat_banner_assignments")
            .update({ views_count: (existing.views_count ?? 0) + 1 })
            .eq("id", existing.id);
        }
      }
    }

    // Process individually assigned banners
    if (contactId && individualBanners.length > 0) {
      const bannerIds = individualBanners.map((b: any) => b.id);
      const { data: assignments } = await supabase
        .from("chat_banner_assignments")
        .select("id, vote, banner_id, views_count, dismissed_at")
        .eq("contact_id", contactId)
        .eq("is_active", true)
        .is("dismissed_at", null)
        .in("banner_id", bannerIds);

      if (assignments) {
        for (const assignment of assignments) {
          const banner = individualBanners.find((b: any) => b.id === assignment.banner_id);
          if (!banner) continue;
          if (banner.max_views && assignment.views_count >= banner.max_views) continue;

          result.push({
            assignment_id: assignment.id,
            content: banner.content,
            content_html: banner.content_html ?? null,
            text_align: banner.text_align ?? "left",
            bg_color: banner.bg_color ?? "#3B82F6",
            text_color: banner.text_color ?? "#FFFFFF",
            link_url: banner.link_url,
            link_label: banner.link_label,
            has_voting: banner.has_voting ?? false,
            banner_type: banner.banner_type ?? "info",
            priority: banner.priority ?? 5,
            vote: assignment.vote,
          });

          // Increment views
          await supabase
            .from("chat_banner_assignments")
            .update({ views_count: (assignment.views_count ?? 0) + 1 })
            .eq("id", assignment.id);
        }
      }
    }

    // Sort by priority desc
    result.sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));

    return new Response(JSON.stringify({ banners: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
