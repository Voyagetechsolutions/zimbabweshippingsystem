
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteNotificationRequest {
  quoteId: string;
  userId: string;
  action: 'new' | 'quoted' | 'accepted' | 'rejected';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId, userId, action }: QuoteNotificationRequest = await req.json();

    if (!quoteId || !userId || !action) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: quoteId, userId, and action are required" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get the quote details
    const { data: quoteData, error: quoteError } = await supabase
      .from('custom_quotes')
      .select('*, profiles:user_id(email, full_name)')
      .eq('id', quoteId)
      .single();
    
    if (quoteError) {
      console.error('Error fetching quote details:', quoteError);
      throw new Error('Could not fetch quote details');
    }

    // Get notification message based on action
    let title: string;
    let message: string;
    
    switch (action) {
      case 'new':
        title = 'New Custom Quote Request';
        message = `Your custom quote request for ${quoteData.category || 'item shipment'} has been received. Our team will review it shortly.`;
        break;
      case 'quoted':
        title = 'Custom Quote Ready';
        message = `Good news! Your custom quote request has been processed. The quoted amount is £${parseFloat(quoteData.quoted_amount).toFixed(2)}. Please log in to view and accept the quote.`;
        break;
      case 'accepted':
        title = 'Custom Quote Accepted';
        message = 'You have accepted the custom quote. Please complete the payment to proceed with your shipment.';
        break;
      case 'rejected':
        title = 'Custom Quote Rejected';
        message = 'Your custom quote has been canceled. Please contact us if you have any questions.';
        break;
      default:
        title = 'Custom Quote Update';
        message = 'There has been an update to your custom quote. Please log in to view the details.';
    }

    // Create a notification in the database
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: title,
        message: message,
        type: 'custom_quote',
        related_id: quoteId,
        is_read: false
      })
      .select('*')
      .single();

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      throw new Error('Failed to create notification');
    }

    // Send email notification
    // This would ideally use a service like Resend, Brevo, etc.
    // For now, we'll just simulate it and log it
    console.log('Would send email to:', quoteData.profiles?.email);
    console.log('Email subject:', title);
    console.log('Email content:', message);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent successfully",
        notification: notification
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in send-quote-notification function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send quote notification" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);
