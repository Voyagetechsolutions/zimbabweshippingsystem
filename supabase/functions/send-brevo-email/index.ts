
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string | { email: string; name?: string }[];
  templateId?: number;
  subject?: string;
  htmlContent?: string;
  params?: Record<string, any>;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachment?: Array<{ name: string; content: string }>;
  tags?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("BREVO_API_KEY");
    if (!apiKey) {
      throw new Error("BREVO_API_KEY environment variable not set");
    }
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const {data:companyRow,error:companyError}=await supabase.from('app_configuration').select('value').eq('key','company_profile').single();
    if(companyError)throw companyError;
    const company=(companyRow?.value||{}) as Record<string,string>;
    if(!company.name||!company.noreplyEmail)throw new Error('Company email configuration is incomplete');

    const { to, templateId, subject, htmlContent, params, cc, bcc, replyTo, attachment, tags } = await req.json() as EmailRequest;

    if (!to) {
      throw new Error("Recipient email is required");
    }

    // Prepare recipients
    const toArray = Array.isArray(to) 
      ? to 
      : [{ email: to }];

    // Verify that we have either a templateId or both subject and htmlContent
    if (!templateId && (!subject || !htmlContent)) {
      throw new Error("Either templateId or both subject and htmlContent must be provided");
    }

    // Prepare the request body
    const emailData: any = {
      sender: { 
        email: company.noreplyEmail,
        name: company.name
      },
      to: toArray,
    };

    // Add optional fields if provided
    if (templateId) {
      emailData.templateId = templateId;
    }
    if (subject) {
      emailData.subject = subject;
    }
    if (htmlContent) {
      emailData.htmlContent = htmlContent;
    }
    if (params) {
      emailData.params = params;
    }
    if (cc && cc.length > 0) {
      emailData.cc = cc.map(email => ({ email }));
    }
    if (bcc && bcc.length > 0) {
      emailData.bcc = bcc.map(email => ({ email }));
    }
    if (replyTo) {
      emailData.replyTo = { email: replyTo };
    }
    if (attachment && attachment.length > 0) {
      emailData.attachment = attachment;
    }
    if (tags && tags.length > 0) {
      emailData.tags = tags;
    }

    // Send email via Brevo API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify(emailData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Brevo API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("Error sending email:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
};

serve(handler);
