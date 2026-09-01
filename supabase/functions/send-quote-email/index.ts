
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuoteEmailRequest {
  email: string;
  phone_number: string; 
  quoted_amount: number;
  item_description: string;
  admin_notes?: string;
}

const handler = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, phone_number, quoted_amount, item_description, admin_notes }: QuoteEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    if (!quoted_amount) {
      throw new Error("Quote amount is required");
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: configRows, error: configError } = await supabase
      .from("app_configuration").select("key,value").in("key", ["company_profile", "booking_fees"]);
    if (configError) throw configError;
    const config = Object.fromEntries((configRows || []).map((row) => [row.key, row.value]));
    const company = (config.company_profile || {}) as Record<string, string>;
    const fees = (config.booking_fees || {}) as Record<string, number>;
    if (!company.name || !company.supportEmail || !company.ukPhone || !company.website || !company.noreplyEmail) {
      throw new Error("Company contact configuration is incomplete");
    }

    console.log(`Sending custom quote email to ${email} for £${quoted_amount}`);

    const { data, error } = await resend.emails.send({
      from: `${company.name} <${company.noreplyEmail}>`,
      to: [email],
      subject: "Your Custom Shipping Quote",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h1 style="color: #4CAF50; font-size: 24px;">Your Custom Shipping Quote</h1>
          <p>Dear Customer,</p>
          <p>Thank you for requesting a custom shipping quote. We're pleased to provide you with the following quote:</p>
          
          <div style="background-color: #f8f8f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #333; font-size: 18px;">Quote Details</h2>
            <p><strong>Item Description:</strong> ${item_description}</p>
            <p><strong>Contact Number:</strong> ${phone_number}</p>
            <p><strong>Quoted Amount:</strong> <span style="color: #4CAF50; font-size: 18px; font-weight: bold;">£${quoted_amount.toFixed(2)}</span></p>
            ${admin_notes ? `<p><strong>Additional Information:</strong> ${admin_notes}</p>` : ''}
          </div>
          
          <p>To proceed with this quote, please log in to your account on our website or contact us directly at the phone number below.</p>
          <p>This quote is valid for ${fees.quoteValidityDays || 0} days from the date of this email.</p>
          
          <div style="margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            <p style="color: #666; font-size: 14px;">
              <strong>${company.name}</strong><br>
              Phone: ${company.ukPhone}<br>
              Email: ${company.supportEmail}<br>
              Website: <a href="${company.website}" style="color: #4CAF50;">${company.website.replace(/^https?:\/\//, "")}</a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Quote email sent successfully",
        data
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error sending quote email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
};

serve(handler);
