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
    const body = await req.json();
    const { api_key, external_id, name, email, phone, company_id, company_name, custom_data } = body;

    if (!api_key) {
      return new Response(
        JSON.stringify({ error: "api_key is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Validate API key ---
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

    // Get tenant_id
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .maybeSingle();

    const tenantId = profile?.tenant_id || null;

    // Get field definitions for maps_to resolution
    let fieldDefs: any[] = [];
    if (tenantId && custom_data && Object.keys(custom_data).length > 0) {
      const { data: defs } = await supabase
        .from("chat_custom_field_definitions")
        .select("key, maps_to")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);
      fieldDefs = defs || [];
    }

    // If no external_id provided, just return the user_id (owner resolution only)
    // Also handle name+email without external_id
    if (!external_id) {
      if (name && email) {
        // Try to find existing company_contact by email
        const { data: existingCC } = await supabase
          .from("company_contacts")
          .select("id, company_id, name, email")
          .eq("user_id", userId)
          .eq("email", email)
          .maybeSingle();

        if (existingCC) {
          // Find or create visitor linked to this contact
          const visitorResult = await findOrCreateVisitor(supabase, {
            companyContactId: existingCC.id,
            contactId: existingCC.company_id,
            name, email, phone, userId, customData: custom_data,
          });

          return new Response(
            JSON.stringify({
              visitor_token: visitorResult.visitor_token,
              visitor_name: name,
              visitor_email: email,
              contact_id: existingCC.company_id,
              company_contact_id: existingCC.id,
              user_id: userId,
              auto_start: true,
              has_history: visitorResult.has_history,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // No existing contact — return auto_start but no IDs (will be created on room creation)
        return new Response(
          JSON.stringify({
            visitor_token: null,
            user_id: userId,
            auto_start: false,
            needs_form: false,
            has_name_email: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ visitor_token: null, user_id: userId, needs_form: !name || !email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- external_id provided ---

    // Find company_contact by external_id + user_id
    const { data: companyContact } = await supabase
      .from("company_contacts")
      .select("id, name, email, phone, company_id")
      .eq("user_id", userId)
      .eq("external_id", external_id)
      .maybeSingle();

    if (companyContact) {
      // UPSERT: update contact fields if different
      const ccUpdates: Record<string, any> = {};
      if (name && name !== companyContact.name) ccUpdates.name = name;
      if (email && email !== companyContact.email) ccUpdates.email = email;
      if (phone && phone !== companyContact.phone) ccUpdates.phone = phone;

      if (Object.keys(ccUpdates).length > 0) {
        await supabase
          .from("company_contacts")
          .update({ ...ccUpdates, updated_at: new Date().toISOString() })
          .eq("id", companyContact.id);
      }

      // Upsert company (contacts table) if company_id or company_name
      let contactId = companyContact.company_id;
      if (company_id || company_name) {
        contactId = await upsertCompany(supabase, {
          userId, companyId: company_id, companyName: company_name,
          contactId, customData: custom_data, fieldDefs,
        });
      } else if (custom_data && contactId) {
        // Even without company_id/name, update custom_data on existing company
        await applyCustomData(supabase, contactId, custom_data, fieldDefs);
      }

      // Find or create visitor
      const visitorResult = await findOrCreateVisitor(supabase, {
        companyContactId: companyContact.id,
        contactId,
        name: name || companyContact.name,
        email: email || companyContact.email,
        phone: phone || companyContact.phone,
        userId,
        customData: custom_data,
      });

      return new Response(
        JSON.stringify({
          visitor_token: visitorResult.visitor_token,
          visitor_name: name || companyContact.name,
          visitor_email: email || companyContact.email,
          contact_id: contactId,
          company_contact_id: companyContact.id,
          user_id: userId,
          auto_start: true,
          has_history: visitorResult.has_history,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- external_id NOT found in company_contacts ---

    if (name && email) {
      // Create company if needed
      let contactId: string | null = null;
      if (company_id || company_name) {
        contactId = await upsertCompany(supabase, {
          userId, companyId: company_id, companyName: company_name,
          contactId: null, customData: custom_data, fieldDefs,
        });
      }

      // Create company_contact
      const { data: newCC } = await supabase
        .from("company_contacts")
        .insert({
          company_id: contactId || undefined,
          name,
          email,
          phone: phone || null,
          external_id,
          user_id: userId,
        } as any)
        .select("id, company_id")
        .single();

      if (!newCC) {
        return new Response(
          JSON.stringify({ error: "failed_to_create_contact", user_id: userId, needs_form: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      const finalContactId = newCC.company_id || contactId;

      // Create visitor
      const visitorResult = await findOrCreateVisitor(supabase, {
        companyContactId: newCC.id,
        contactId: finalContactId,
        name, email, phone, userId, customData: custom_data,
      });

      // Sync bidirectional link
      if (visitorResult.visitor_id) {
        await supabase
          .from("company_contacts")
          .update({ chat_visitor_id: visitorResult.visitor_id })
          .eq("id", newCC.id);
      }

      return new Response(
        JSON.stringify({
          visitor_token: visitorResult.visitor_token,
          visitor_name: name,
          visitor_email: email,
          contact_id: finalContactId,
          company_contact_id: newCC.id,
          user_id: userId,
          auto_start: true,
          has_history: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // external_id provided but no name+email — need form
    return new Response(
      JSON.stringify({
        visitor_token: null,
        user_id: userId,
        needs_form: true,
        auto_start: false,
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

// --- Helper: Find or create chat_visitor linked to company_contact ---
async function findOrCreateVisitor(
  supabase: any,
  opts: {
    companyContactId: string;
    contactId: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    userId: string;
    customData?: Record<string, any>;
  }
) {
  const { companyContactId, contactId, name, email, phone, userId, customData } = opts;

  // Check existing visitor
  const { data: existing } = await supabase
    .from("chat_visitors")
    .select("id, visitor_token, name, email")
    .eq("company_contact_id", companyContactId)
    .maybeSingle();

  if (existing) {
    // Update visitor with latest data
    const updates: Record<string, any> = {};
    if (name && name !== existing.name) updates.name = name;
    if (email && email !== existing.email) updates.email = email;
    if (phone) updates.phone = phone;
    if (customData && Object.keys(customData).length > 0) {
      updates.metadata = customData;
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("chat_visitors")
        .update(updates)
        .eq("id", existing.id);
    }

    // Check history
    const { count } = await supabase
      .from("chat_rooms")
      .select("id", { count: "exact", head: true })
      .eq("visitor_id", existing.id);

    return {
      visitor_id: existing.id,
      visitor_token: existing.visitor_token,
      has_history: (count || 0) > 0,
    };
  }

  // Create new visitor
  const { data: newVisitor } = await supabase
    .from("chat_visitors")
    .insert({
      name,
      email: email || null,
      phone: phone || null,
      owner_user_id: userId,
      company_contact_id: companyContactId,
      contact_id: contactId,
      ...(customData && Object.keys(customData).length > 0 ? { metadata: customData } : {}),
    })
    .select("id, visitor_token")
    .single();

  if (newVisitor) {
    // Sync bidirectional link
    await supabase
      .from("company_contacts")
      .update({ chat_visitor_id: newVisitor.id })
      .eq("id", companyContactId);
  }

  return {
    visitor_id: newVisitor?.id || null,
    visitor_token: newVisitor?.visitor_token || null,
    has_history: false,
  };
}

// --- Helper: Upsert company (contacts table) ---
async function upsertCompany(
  supabase: any,
  opts: {
    userId: string;
    companyId?: string;
    companyName?: string;
    contactId: string | null;
    customData?: Record<string, any>;
    fieldDefs: any[];
  }
): Promise<string | null> {
  const { userId, companyId, companyName, contactId, customData, fieldDefs } = opts;

  let finalContactId = contactId;

  // Try to find by external_id
  if (companyId && !finalContactId) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("external_id", String(companyId))
      .eq("user_id", userId)
      .eq("is_company", true)
      .maybeSingle();

    if (existing) finalContactId = existing.id;
  }

  // Create if not found
  if (!finalContactId) {
    const { data: newCompany } = await supabase
      .from("contacts")
      .insert({
        name: companyName || `Empresa ${companyId}`,
        trade_name: companyName || null,
        external_id: companyId ? String(companyId) : null,
        is_company: true,
        user_id: userId,
      })
      .select("id")
      .single();

    if (newCompany) finalContactId = newCompany.id;
  } else if (companyName) {
    // Update name if provided
    await supabase
      .from("contacts")
      .update({ name: companyName, trade_name: companyName, updated_at: new Date().toISOString() })
      .eq("id", finalContactId);
  }

  // Apply custom data
  if (finalContactId && customData) {
    await applyCustomData(supabase, finalContactId, customData, fieldDefs);
  }

  return finalContactId;
}

// --- Helper: Apply custom_data using maps_to definitions ---
async function applyCustomData(
  supabase: any,
  contactId: string,
  customData: Record<string, any>,
  fieldDefs: any[]
) {
  const mapsToLookup: Record<string, string> = {};
  for (const def of fieldDefs) {
    if (def.maps_to) mapsToLookup[def.key] = def.maps_to;
  }

  const directUpdate: Record<string, any> = {};
  const customUpdate: Record<string, any> = {};

  // Known direct column mappings (fallback if no field definition)
  const KNOWN_DIRECT: Record<string, string> = {
    mrr: "mrr",
    contract_value: "contract_value",
    company_sector: "company_sector",
    company_document: "company_document",
    health_score: "health_score",
  };

  for (const [key, val] of Object.entries(customData)) {
    // Skip reserved keys
    if (["name", "email", "phone", "company_id", "company_name"].includes(key)) continue;

    const mapsTo = mapsToLookup[key] || KNOWN_DIRECT[key];
    if (mapsTo) {
      directUpdate[mapsTo] = val;
    } else {
      customUpdate[key] = val;
    }
  }

  if (Object.keys(directUpdate).length > 0) {
    directUpdate.updated_at = new Date().toISOString();
    await supabase.from("contacts").update(directUpdate).eq("id", contactId);
  }

  if (Object.keys(customUpdate).length > 0) {
    const { data: current } = await supabase
      .from("contacts")
      .select("custom_fields")
      .eq("id", contactId)
      .single();

    const merged = { ...((current?.custom_fields as Record<string, any>) ?? {}), ...customUpdate };
    await supabase
      .from("contacts")
      .update({ custom_fields: merged, updated_at: new Date().toISOString() })
      .eq("id", contactId);
  }
}
