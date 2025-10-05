import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Gmail API configuration
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN");

// Function to get access token from refresh token
async function getAccessToken(): Promise<string> {
  console.log("Getting Gmail access token...");
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Error getting access token:", error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  console.log("Access token obtained successfully");
  return data.access_token;
}

// Function to create email in RFC 2822 format and encode to base64url
function createEmailMessage(to: string, subject: string, htmlBody: string): string {
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    htmlBody,
  ];
  
  const email = emailLines.join("\r\n");
  
  // Convert to base64url format (replace + with -, / with _, remove = padding)
  const base64 = btoa(unescape(encodeURIComponent(email)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Function to send email via Gmail API
async function sendGmailEmail(to: string, subject: string, htmlBody: string): Promise<string> {
  console.log(`Sending email via Gmail API to: ${to}`);
  
  const accessToken = await getAccessToken();
  const encodedMessage = createEmailMessage(to, subject, htmlBody);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: encodedMessage,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${error}`);
  }

  const data = await response.json();
  console.log("Email sent successfully. Message ID:", data.id);
  return data.id;
}

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

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Olá, ${contactName}!</h1>
        
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          ${campaignMessage}
        </p>
        
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          Sua opinião é muito importante para nós. Por favor, clique no link abaixo para responder nossa pesquisa de satisfação:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <iframe src="${npsLink}" width="100%" height="500" frameborder="0" style="border: none; border-radius: 8px;"></iframe>
        </div>
        
        <p style="color: #999; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
          Este é um e-mail automático. Se você não deseja receber estas mensagens, por favor ignore este e-mail.
        </p>
      </div>
    `;

    const messageId = await sendGmailEmail(
      contactEmail,
      `Lembrete: ${campaignName}`,
      htmlBody
    );

    console.log("Email sent successfully. Message ID:", messageId);

    return new Response(JSON.stringify({ success: true, messageId }), {
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
