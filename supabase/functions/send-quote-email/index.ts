
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteEmailRequest {
  quoteId: string;
  amount: string | number;
  notes?: string;
  recipientEmail: string;
  recipientName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId, amount, notes, recipientEmail, recipientName }: QuoteEmailRequest = await req.json();

    if (!quoteId || !amount || !recipientEmail) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: quoteId, amount, and recipientEmail are required" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get the quote details to include in the email
    const { data: quoteData, error: quoteError } = await supabase
      .from('custom_quotes')
      .select('*')
      .eq('id', quoteId)
      .single();
    
    if (quoteError) {
      console.error('Error fetching quote details:', quoteError);
      throw new Error('Could not fetch quote details');
    }

    // Use Brevo to send the email
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY is not set');
    }

    // Format the amount as a string with 2 decimal places if it's a number
    const formattedAmount = typeof amount === 'number' 
      ? amount.toFixed(2) 
      : parseFloat(amount).toFixed(2);

    // Prepare the email data for Brevo
    const emailData = {
      sender: {
        name: "UK to Zimbabwe Shipping",
        email: "info@uktozimbabweshipping.com"
      },
      to: [
        {
          email: recipientEmail,
          name: recipientName
        }
      ],
      subject: "Your Custom Shipping Quote is Ready",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-bottom: 3px solid #4CAF50;">
            <h1 style="color: #333;">Your Custom Quote is Ready</h1>
          </div>
          
          <div style="padding: 20px; background-color: #fff;">
            <p>Hello ${recipientName},</p>
            
            <p>We're pleased to provide you with a custom quote for your shipping request:</p>
            
            <div style="background-color: #f9f9f9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Quote Details</h3>
              <p><strong>Item Description:</strong> ${quoteData.description}</p>
              <p><strong>Quoted Amount:</strong> £${formattedAmount}</p>
              ${notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ''}
            </div>
            
            <p>To proceed with this quote, please log in to your account and select the "Pay Quote" option in your dashboard.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${supabaseUrl}/auth/v1/authorize?provider=magiclink&redirect_to=${encodeURIComponent(`${req.headers.get('origin') || 'https://uktozimbabweshipping.com'}/dashboard?tab=quotes`)}" 
                style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Log In to Your Account
              </a>
            </div>
            
            <p>If you have any questions about this quote, please don't hesitate to contact us.</p>
            
            <p>Thank you for choosing UK to Zimbabwe Shipping for your shipping needs.</p>
            
            <p style="margin-top: 30px;">Best regards,<br>The UK to Zimbabwe Shipping Team</p>
          </div>
          
          <div style="background-color: #333; color: #fff; padding: 15px; text-align: center; font-size: 12px;">
            <p>© 2025 UK to Zimbabwe Shipping. All rights reserved.</p>
            <p>Contact: info@uktozimbabweshipping.com | +44 123 456 7890</p>
          </div>
        </div>
      `
    };

    // Send the email via Brevo's API
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey
      },
      body: JSON.stringify(emailData)
    });

    const brevoData = await brevoResponse.json();

    if (!brevoResponse.ok) {
      console.error('Error from Brevo API:', brevoData);
      throw new Error(`Failed to send email: ${brevoData.message || 'Unknown error'}`);
    }

    console.log('Email sent successfully:', brevoData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Quote email sent successfully",
        messageId: brevoData.messageId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in send-quote-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send quote email" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);
