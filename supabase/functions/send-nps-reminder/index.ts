import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NPSReminderRequest {
  contactName: string;
  contactEmail: string;
  campaignName: string;
  campaignMessage: string;
  npsLink: string;
  companyName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactName, contactEmail, campaignName, campaignMessage, npsLink, companyName }: NPSReminderRequest = await req.json();

    console.log("Sending NPS reminder to:", contactEmail);

    const emailResponse = await resend.emails.send({
      from: companyName ? `${companyName} <onboarding@resend.dev>` : "NPS Survey <onboarding@resend.dev>",
      to: [contactEmail],
      subject: `Lembrete: ${campaignName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Olá, ${contactName}!</h1>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            ${campaignMessage}
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Sua opinião é muito importante para nós. Por favor, clique no botão abaixo para responder nossa pesquisa de satisfação:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${npsLink}" 
               style="background-color: #8B5CF6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
              Responder Pesquisa NPS
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            Este é um e-mail automático. Se você não deseja receber estas mensagens, por favor ignore este e-mail.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-nps-reminder function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
