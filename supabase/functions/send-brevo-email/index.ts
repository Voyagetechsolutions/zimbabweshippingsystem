
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender?: {
    name: string;
    email: string;
  };
  replyTo?: {
    name: string;
    email: string;
  };
}

const sendEmail = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!BREVO_API_KEY) {
      throw new Error("Brevo API key not configured");
    }

    const { to, subject, htmlContent, textContent, sender, replyTo }: EmailRequest = await req.json();

    // Validate required fields
    if (!to || !Array.isArray(to) || to.length === 0) {
      throw new Error("At least one recipient is required");
    }

    if (!subject) {
      throw new Error("Subject is required");
    }

    if (!htmlContent) {
      throw new Error("HTML content is required");
    }

    // Prepare the request to Brevo API
    const defaultSender = {
      name: "Zimbabwe Shipping",
      email: "noreply@zimbabweshipping.com"
    };

    const defaultReplyTo = {
      name: "Zimbabwe Shipping Support",
      email: "support@zimbabweshipping.com"
    };

    const payload = {
      sender: sender || defaultSender,
      to,
      subject,
      htmlContent,
      textContent: textContent || "",
      replyTo: replyTo || defaultReplyTo
    };

    console.log("Sending email with payload:", JSON.stringify(payload));

    // Send the email through Brevo API
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`Brevo API error: ${response.status} ${JSON.stringify(responseData)}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: responseData.messageId 
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      }
    );

  } catch (error) {
    console.error("Email sending error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
};

serve(sendEmail);
