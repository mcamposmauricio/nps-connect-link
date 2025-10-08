import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Campaign {
  id: string;
  user_id: string;
  name: string;
  message: string;
  cycle_type: 'weekly' | 'biweekly';
  attempts_total: number;
  attempt_current: number;
  next_send: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting automatic campaign processing...');

    // Get campaigns that need to be sent now
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('campaign_type', 'automatic')
      .in('status', ['scheduled', 'live'])
      .lte('next_send', new Date().toISOString());

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    console.log(`Found ${campaigns?.length || 0} campaigns to process`);

    for (const campaign of campaigns || []) {
      console.log(`Processing campaign: ${campaign.id}`);

      // Get contacts that haven't responded yet
      const { data: campaignContacts, error: contactsError } = await supabase
        .from('campaign_contacts')
        .select('contact_id, contacts(*)')
        .eq('campaign_id', campaign.id);

      if (contactsError) {
        console.error(`Error fetching contacts for campaign ${campaign.id}:`, contactsError);
        continue;
      }

      // Get responses to filter out contacts who already responded
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select('contact_id')
        .eq('campaign_id', campaign.id);

      if (responsesError) {
        console.error(`Error fetching responses for campaign ${campaign.id}:`, responsesError);
        continue;
      }

      const respondedContactIds = new Set(responses?.map(r => r.contact_id) || []);

      // Filter contacts who haven't responded
      const eligibleContacts = campaignContacts?.filter(
        cc => !respondedContactIds.has(cc.contact_id)
      ) || [];

      console.log(`Found ${eligibleContacts.length} eligible contacts for campaign ${campaign.id}`);

      // Send emails to eligible contacts
      for (const cc of eligibleContacts) {
        try {
          const contact = cc.contacts as any;
          const { data: linkToken } = await supabase
            .from('campaign_contacts')
            .select('link_token')
            .eq('campaign_id', campaign.id)
            .eq('contact_id', cc.contact_id)
            .single();

          if (!linkToken) {
            console.error(`No link token found for contact ${cc.contact_id}`);
            continue;
          }

          // Get brand settings for the user
          const { data: brandSettings } = await supabase
            .from('brand_settings')
            .select('company_name')
            .eq('user_id', campaign.user_id)
            .single();

          const npsLink = `${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}/nps/${linkToken.link_token}`;

          // Send NPS reminder email
          const { error: sendError } = await supabase.functions.invoke('send-nps-reminder', {
            body: {
              contactName: contact.name,
              contactEmail: contact.email,
              campaignName: campaign.name,
              campaignMessage: campaign.message,
              npsLink,
              companyName: brandSettings?.company_name || 'Meu NPS'
            }
          });

          if (sendError) {
            console.error(`Error sending email to ${contact.email}:`, sendError);
            
            // Record failed send
            await supabase.from('campaign_sends').insert({
              campaign_id: campaign.id,
              contact_id: cc.contact_id,
              attempt: campaign.attempt_current + 1,
              status: 'failed'
            });
          } else {
            console.log(`Email sent successfully to ${contact.email}`);
            
            // Record successful send
            await supabase.from('campaign_sends').insert({
              campaign_id: campaign.id,
              contact_id: cc.contact_id,
              attempt: campaign.attempt_current + 1,
              status: 'sent',
              sent_at: new Date().toISOString()
            });

            // Update campaign_contacts
            await supabase
              .from('campaign_contacts')
              .update({
                email_sent: true,
                email_sent_at: new Date().toISOString()
              })
              .eq('campaign_id', campaign.id)
              .eq('contact_id', cc.contact_id);
          }
        } catch (error) {
          console.error(`Error processing contact ${cc.contact_id}:`, error);
        }
      }

      // Update campaign for next cycle
      const newAttempt = campaign.attempt_current + 1;
      const cycleComplete = newAttempt >= campaign.attempts_total;

      if (cycleComplete) {
        // Mark campaign as completed
        await supabase
          .from('campaigns')
          .update({
            status: 'completed',
            attempt_current: newAttempt,
            next_send: null
          })
          .eq('id', campaign.id);

        console.log(`Campaign ${campaign.id} completed`);
      } else {
        // Calculate next send date
        const daysToAdd = campaign.cycle_type === 'weekly' ? 7 : 15;
        const nextSend = new Date();
        nextSend.setDate(nextSend.getDate() + daysToAdd);

        await supabase
          .from('campaigns')
          .update({
            status: 'live',
            attempt_current: newAttempt,
            next_send: nextSend.toISOString()
          })
          .eq('id', campaign.id);

        console.log(`Campaign ${campaign.id} scheduled for next send: ${nextSend.toISOString()}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCampaigns: campaigns?.length || 0 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in process-automatic-campaigns:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
