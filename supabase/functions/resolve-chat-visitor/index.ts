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
    const { api_key, external_id } = await req.json();

    if (!api_key || !external_id) {
      return new Response(
        JSON.stringify({ error: "api_key and external_id are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate API key - same logic as check-nps-pending
    const keyPrefix = api_key.substring(0, 12);

    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from("api_keys")
      .select("id, user_id, key_hash, is_active")
      .eq("key_prefix", keyPrefix)
      .eq("is_active", true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ visitor_token: null, error: "invalid_api_key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Verify full key hash (SHA-256)
    const encoder = new TextEncoder();
    const data = encoder.encode(api_key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (keyHash !== apiKeyData.key_hash) {
      return new Response(
        JSON.stringify({ visitor_token: null, error: "invalid_api_key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = apiKeyData.user_id;

    // Update last_used_at
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKeyData.id);

    // Find company_contact by external_id + user_id
    const { data: companyContact, error: contactError } = await supabase
      .from("company_contacts")
      .select("id, name, email, company_id")
      .eq("user_id", userId)
      .eq("external_id", external_id)
      .maybeSingle();

    if (contactError || !companyContact) {
      return new Response(
        JSON.stringify({ visitor_token: null, error: "contact_not_found", user_id: userId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if a chat_visitor already exists for this company_contact
    const { data: existingVisitor } = await supabase
      .from("chat_visitors")
      .select("id, visitor_token, name, email")
      .eq("company_contact_id", companyContact.id)
      .maybeSingle();

    if (existingVisitor) {
      return new Response(
        JSON.stringify({
          visitor_token: existingVisitor.visitor_token,
          visitor_name: existingVisitor.name,
          visitor_email: existingVisitor.email,
          company_contact_id: companyContact.id,
          contact_id: companyContact.company_id,
          user_id: userId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new chat_visitor linked to company_contact
    const { data: newVisitor, error: createError } = await supabase
      .from("chat_visitors")
      .insert({
        name: companyContact.name,
        email: companyContact.email || null,
        owner_user_id: userId,
        company_contact_id: companyContact.id,
        contact_id: companyContact.company_id,
      })
      .select("id, visitor_token, name, email")
      .single();

    // Sync bidirectional link
    if (newVisitor) {
      await supabase
        .from("company_contacts")
        .update({ chat_visitor_id: newVisitor.id })
        .eq("id", companyContact.id);
    }

    if (createError || !newVisitor) {
      console.error("Error creating chat visitor:", createError);
      return new Response(
        JSON.stringify({ visitor_token: null, error: "failed_to_create_visitor" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        visitor_token: newVisitor.visitor_token,
        visitor_name: newVisitor.name,
        visitor_email: newVisitor.email,
        company_contact_id: companyContact.id,
        contact_id: companyContact.company_id,
        user_id: userId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in resolve-chat-visitor:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
